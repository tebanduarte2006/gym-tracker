// audio.js — alarma de fin de descanso.
//
// DOS PROBLEMAS REPORTADOS POR ESTEBAN (2026-09-13), y son distintos:
//
//   A) "muy suave y casi imperceptible con la música y el ruido de un gimnasio,
//       y muy grave". El beep anterior eran dos senoidales puras de 880 y
//       1175 Hz a ganancia 0.35. Una senoidal pura es lo MENOS audible que
//       existe en ruido de banda ancha: toda su energía está en una sola
//       frecuencia y el ruido del gym la tapa entera. Ahora la alarma es un
//       patrón de seis pulsos (3 + pausa + 3) de 2000 Hz CON armónicos — el
//       oído es más sensible entre 2 y 4 kHz y ahí el altavoz del iPhone
//       rinde mejor que en los graves — a fondo de escala.
//
//   B) "si dejo el celular apagado y pasan 5 minutos, no suena hasta que entre
//       a la app". Cierto, y el mecanismo anterior no podía arreglarlo: iOS
//       SUSPENDE el AudioContext al bloquear la pantalla, así que un beep
//       programado en el reloj de Web Audio muere con él. Lo único que iOS sí
//       deja seguir sonando con la pantalla bloqueada es la reproducción de un
//       elemento <audio> (es lo que hace cualquier reproductor de música web).
//
// EL TRUCO, y por qué es así de raro: no se puede "programar" un <audio> para
// dentro de 90 s, porque programar exige que el JS corra a esa hora y el JS
// está congelado. Lo que sí se puede es DARLE YA un clip que dure exactamente
// 90 s de silencio + la alarma al final y ponerlo a reproducir: el reloj que
// cuenta es el del reproductor del sistema, no el nuestro. Por eso aquí se
// genera un WAV en memoria en cada descanso.
//
// COSTES HONESTOS de ese camino, que hay que saber antes de tocarlo:
//   · Mientras dura el descanso la app ocupa el "now playing" de iOS y PUEDE
//     pausar la música que estés oyendo. Por eso es una preferencia
//     (`alarma_fondo`) y se puede apagar.
//   · Sigue sin estar garantizado: si iOS decide matar la reproducción de una
//     PWA en segundo plano, se pierde igual. `alarmWasLost()` detecta ese caso
//     (el cabezal no llegó al tono) y el rest timer suena al volver, sin
//     duplicar cuando sí sonó.
//   · NO escribir en la UI ni en el README que el aviso suena SIEMPRE con la
//     pantalla bloqueada. Es best-effort; la defensa de verdad sigue siendo el
//     Wake Lock (wakelock.js): durante la sesión la pantalla no se apaga sola.

const SR = 16000;          // Hz del WAV generado (2 kHz queda con 8 muestras/ciclo)
const F = 2000;            // fundamental de la alarma
const DUR_PULSO = 0.14;    // s
const PULSOS = [0, 0.22, 0.44, 0.90, 1.12, 1.34];  // 3 + pausa + 3
const LARGO_PATRON = PULSOS[PULSOS.length - 1] + DUR_PULSO + 0.06;
const MAX_SEGUNDOS = 900;  // 15 min: por encima el WAV pesa más que la app entera
const RAMPA = 0.005;       // s de ataque/caída, para que el pulso no chasquee
// Pico real de sin(x) + 0.5·sin(2x) + 0.3·sin(3x), medido (no es 1.8 ni la suma
// de las amplitudes: los tres armónicos no llegan al máximo a la vez). Dividir
// por la suma dejaba la alarma 3 dB por debajo de lo que el clip permite, que
// es precisamente lo que Esteban no oía. 0.95 es el margen para no recortar al
// reconstruir la señal.
const PICO_ONDA = 1.4198;
const GANANCIA = 0.95;

let _ctx = null;
let _el = null;            // <audio> persistente (uno solo: el "permiso" de iOS es suyo)
let _url = null;           // objectURL del clip armado
let _armada = false;       // el <audio> aceptó reproducir el clip
let _tono = 0;             // segundo del clip donde empieza la alarma
let _bendecido = false;    // el <audio> ya sonó una vez dentro de un gesto real
let _fondo = true;         // preferencia `alarma_fondo`

// ─── Generación del clip ──────────────────────────────────────────────────────
// PCM 8 bits sin signo: el silencio es exactamente 128 (silencio digital real,
// no "casi") y pesa la mitad que 16 bits. 90 s ocupan 1.4 MB en memoria durante
// el descanso y se liberan al terminarlo.

function texto(dv, off, str) {
  for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i));
}

function crearWav(segundos, conTono) {
  const s = Number(segundos);
  if (!isFinite(s) || s < 0 || s > MAX_SEGUNDOS) return null;
  const muestras = Math.round((s + (conTono ? LARGO_PATRON : 0)) * SR);
  if (muestras <= 0) return null;

  const buf = new ArrayBuffer(44 + muestras);
  const dv = new DataView(buf);
  texto(dv, 0, 'RIFF');
  dv.setUint32(4, 36 + muestras, true);
  texto(dv, 8, 'WAVE');
  texto(dv, 12, 'fmt ');
  dv.setUint32(16, 16, true);      // tamaño del bloque fmt
  dv.setUint16(20, 1, true);       // PCM
  dv.setUint16(22, 1, true);       // mono
  dv.setUint32(24, SR, true);
  dv.setUint32(28, SR, true);      // byteRate = SR × 1 canal × 1 byte
  dv.setUint16(32, 1, true);       // blockAlign
  dv.setUint16(34, 8, true);       // bits por muestra
  texto(dv, 36, 'data');
  dv.setUint32(40, muestras, true);

  const pcm = new Uint8Array(buf, 44);
  pcm.fill(128);
  if (!conTono) return new Uint8Array(buf);

  const inicioTono = Math.round(s * SR);
  const n = Math.round(DUR_PULSO * SR);
  const rampa = Math.max(1, Math.round(RAMPA * SR));
  PULSOS.forEach((offset) => {
    const desde = inicioTono + Math.round(offset * SR);
    for (let i = 0; i < n; i++) {
      const idx = desde + i;
      if (idx >= muestras) break;
      const t = i / SR;
      // Fundamental + 2º + 3er armónico: un tono con armónicos atraviesa el
      // ruido de banda ancha de un gimnasio; una senoidal pura no.
      const w = (Math.sin(2 * Math.PI * F * t) +
                 0.5 * Math.sin(4 * Math.PI * F * t) +
                 0.3 * Math.sin(6 * Math.PI * F * t)) / PICO_ONDA * GANANCIA;
      const env = i < rampa ? i / rampa : (n - i < rampa ? (n - i) / rampa : 1);
      const v = Math.round(128 + w * env * 127);
      pcm[idx] = v < 0 ? 0 : (v > 255 ? 255 : v);
    }
  });
  return new Uint8Array(buf);
}

// Exportado SOLO para poder testearlo en Node (no toca DOM ni Web Audio).
export function buildAlarmWav(segundos) {
  return crearWav(segundos, true);
}

// Dónde empieza la alarma dentro del clip, en segundos. Lo usa el test.
export const ALARM_PATTERN_SEC = LARGO_PATRON;

// ─── Web Audio: la alarma inmediata (app en primer plano) ─────────────────────
function getCtx() {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();
  return _ctx;
}

let _onda = null;
function getOnda(ctx) {
  // Misma forma de onda que el WAV (fundamental + 2 armónicos), para que la
  // alarma suene IGUAL venga por donde venga. Una alarma que cambia de timbre
  // según el camino interno se oye como dos alarmas distintas.
  if (!_onda) {
    _onda = ctx.createPeriodicWave(
      new Float32Array([0, 1, 0.5, 0.3]),
      new Float32Array([0, 0, 0, 0])
    );
  }
  return _onda;
}

function pulso(ctx, at) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.setPeriodicWave(getOnda(ctx));
  osc.frequency.value = F;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(GANANCIA, at + RAMPA);
  gain.gain.setValueAtTime(GANANCIA, at + DUR_PULSO - RAMPA);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + DUR_PULSO);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + DUR_PULSO + 0.02);
}

// Suena YA. Es la alarma cuando la app está delante, y el respaldo cuando el
// clip de fondo se perdió.
export function beep() {
  const ctx = getCtx();
  if (!ctx) return;
  const go = () => PULSOS.forEach((o) => pulso(ctx, ctx.currentTime + o));
  if (ctx.state !== 'running') ctx.resume().then(go).catch(() => {});
  else go();
  if (navigator.vibrate) navigator.vibrate([120, 80, 120, 80, 120]); // Android
}

// ─── <audio>: la alarma que puede sobrevivir a la pantalla bloqueada ──────────
function getEl() {
  if (_el) return _el;
  if (typeof document === 'undefined') return null;
  _el = document.createElement('audio');
  _el.preload = 'auto';
  _el.volume = 1;
  // `playsinline` + estar en el DOM: iOS es más fiable reanudando en segundo
  // plano un elemento que existe de verdad en la página.
  _el.setAttribute('playsinline', '');
  _el.setAttribute('aria-hidden', 'true');
  _el.style.display = 'none';
  document.body.appendChild(_el);
  return _el;
}

// Un `play()` fuera de un gesto del usuario lo bloquea iOS. Y `startRest()` se
// llama DENTRO de un `.then()` de IndexedDB, o sea ya fuera del gesto. La salida
// estándar: hacer sonar el elemento una vez dentro de un gesto real (con un clip
// de silencio de 50 ms) para que quede autorizado el resto de la vida de la
// página. Por eso hay UN solo elemento y se le cambia el `src`, en vez de crear
// uno por descanso.
function bendecir() {
  if (_bendecido || _armada) return;
  // Con la alarma de fondo apagada NO se toca el reproductor del sistema ni
  // para bendecir: reproducir aunque sean 50 ms de silencio le quita la sesión
  // de audio a lo que estés oyendo. Apagar la preferencia tiene que significar
  // exactamente eso, no "casi".
  if (!_fondo) return;
  const a = getEl();
  if (!a) return;
  const data = crearWav(0.05, false);
  if (!data) return;
  const url = URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
  a.src = url;
  const p = a.play();
  const limpiar = () => { try { a.pause(); } catch { /* da igual */ } URL.revokeObjectURL(url); };
  if (p && typeof p.then === 'function') {
    p.then(() => { _bendecido = true; limpiar(); }).catch(limpiar);
  } else {
    _bendecido = true;
    limpiar();
  }
}

// Llamar una vez al arrancar: engancha los gestos que desbloquean el audio en
// iOS. Los listeners se quedan (son pasivos y baratos): si el primer intento
// falló, el siguiente toque lo vuelve a intentar.
export function installAudioUnlock() {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    bendecir();
  };
  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('pointerup', unlock, { passive: true });
}

// Preferencia `alarma_fondo`: si está apagada, la alarma solo suena con la app
// delante (Web Audio) y nunca se toca el reproductor del sistema.
export function setBackgroundAlarm(on) {
  _fondo = on !== false;
  if (!_fondo) cancelAlarm();
}

export function backgroundAlarmEnabled() {
  return _fondo;
}

// Arma la alarma para dentro de `segundos`. Devuelve true si quedó armada.
export function scheduleAlarm(segundos) {
  cancelAlarm();
  if (!_fondo) return false;
  const a = getEl();
  if (!a) return false;
  const data = crearWav(segundos, true);
  if (!data) return false;

  _url = URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
  _tono = Number(segundos);
  a.src = _url;
  const pedido = Date.now();
  let p;
  try { p = a.play(); } catch { return false; }
  if (p && typeof p.then === 'function') {
    p.then(() => {
      _armada = true;
      // Cargar el clip y arrancar cuesta unos milisegundos, y ese retraso se
      // acumularía entero al final: la alarma sonaría tarde. Se adelanta el
      // cabezal lo que se tardó en empezar.
      const tardado = (Date.now() - pedido) / 1000;
      if (tardado > 0.15 && tardado < _tono) {
        try { a.currentTime = tardado; } catch { /* no siempre se puede */ }
      }
    }).catch(() => { _armada = false; });
  } else {
    _armada = true;
  }
  return true;
}

export function cancelAlarm() {
  const a = _el;
  if (a) {
    try { a.pause(); a.removeAttribute('src'); a.load(); } catch { /* nada que parar */ }
  }
  if (_url) { URL.revokeObjectURL(_url); _url = null; }
  _armada = false;
  _tono = 0;
}

// ¿El clip de fondo NO llegó a sonar? El rest timer lo consulta al vencer para
// decidir si dispara la alarma inmediata — y para no sonar dos veces cuando el
// clip sí sonó. Se mira el cabezal del reproductor, que es un hecho observable,
// en vez de adivinar el estado del AudioContext.
export function alarmWasLost() {
  if (!_fondo || !_armada) return true;
  const a = _el;
  if (!a) return true;
  if (a.ended) return false;                  // sonó entero
  if (a.paused) return true;                  // iOS lo paró por el camino
  return a.currentTime < _tono - 0.5;         // congelado: nunca llegó al tono
}
