// audio.js — beep del rest timer vía Web Audio.
// navigator.vibrate NO existe en iOS Safari (bug heredado: la app vieja
// "avisaba" con vibración que jamás sonó en el iPhone). Web Audio sí funciona,
// con la condición de crear/reanudar el AudioContext tras un gesto del usuario.
//
// LÍMITE REAL DE iOS, documentado para que ningún agente vuelva a prometerlo:
// con la app en background o la pantalla bloqueada, iOS suspende el
// AudioContext y congela los timers de JS. Por eso el beep se PROGRAMA por
// adelantado en el reloj del AudioContext (`scheduleBeep`) en vez de dispararse
// al vencer: si el contexto sigue corriendo, suena a la hora exacta aunque el
// JS esté congelado. Si iOS lo suspende igual, se pierde — y para eso existe
// `scheduleWasLost()`, para que el rest timer avise al menos al volver, sin
// sonar doble en el caso normal.
// La defensa de verdad contra esto es el Wake Lock (wakelock.js): durante una
// sesión activa la pantalla no se apaga sola.

let _ctx = null;
let _scheduled = [];        // nodos con start() en el futuro, cancelables
let _scheduleLost = false;  // el contexto se suspendió con un beep pendiente

function getCtx() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
    _ctx.addEventListener('statechange', () => {
      // 'interrupted' es específico de Safari (llamada entrante, lock, etc.).
      if (_scheduled.length > 0 && _ctx.state !== 'running') _scheduleLost = true;
    });
  }
  return _ctx;
}

// Llamar una vez: engancha el primer gesto para desbloquear el audio en iOS.
export function installAudioUnlock() {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state !== 'running') ctx.resume();
    document.removeEventListener('touchend', unlock);
    document.removeEventListener('pointerup', unlock);
  };
  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('pointerup', unlock, { passive: true });
}

function tone(ctx, freq, start, dur) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
  return osc;
}

function pair(ctx, at) {
  return [tone(ctx, 880, at, 0.18), tone(ctx, 1174.66, at + 0.22, 0.28)];
}

// Doble nota corta, estilo timer de Apple. Suena YA.
export function beep() {
  const ctx = getCtx();
  if (!ctx) return;
  const go = () => pair(ctx, ctx.currentTime);
  if (ctx.state !== 'running') ctx.resume().then(go).catch(() => {});
  else go();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Android, por si acaso
}

// Programa el beep para dentro de `seconds`. Best-effort: es lo único que puede
// sonar con la pantalla apagada, y aun así iOS puede matarlo.
export function scheduleBeep(seconds) {
  cancelScheduledBeep();
  const ctx = getCtx();
  if (!ctx || !(seconds > 0)) return;
  const arm = () => {
    _scheduleLost = false;
    _scheduled = pair(ctx, ctx.currentTime + seconds);
    _scheduled.forEach((osc) => {
      osc.addEventListener('ended', () => {
        _scheduled = _scheduled.filter((o) => o !== osc);
      });
    });
  };
  if (ctx.state !== 'running') ctx.resume().then(arm).catch(() => {});
  else arm();
}

export function cancelScheduledBeep() {
  _scheduled.forEach((osc) => { try { osc.stop(); } catch { /* ya terminó */ } });
  _scheduled = [];
  _scheduleLost = false;
}

// ¿Se perdió el beep programado porque iOS suspendió el audio? El rest timer lo
// consulta al vencer para decidir si dispara uno inmediato (y no sonar doble).
export function scheduleWasLost() {
  return _scheduleLost || !_ctx || _ctx.state !== 'running';
}
