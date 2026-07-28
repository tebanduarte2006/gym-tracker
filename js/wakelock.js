// wakelock.js — mantiene la pantalla encendida durante la sesión activa.
// Es la respuesta honesta al "widget de timer": una PWA en iOS no puede tener
// widgets ni correr en background; lo que SÍ puede es impedir que la pantalla
// se bloquee mientras entrenas, para que el cronómetro y el rest timer sigan
// vivos y el beep suene. Soportado en iOS Safari 16.4+.

let _lock = null;
let _wanted = false;

async function acquire() {
  if (!('wakeLock' in navigator)) return;
  try {
    _lock = await navigator.wakeLock.request('screen');
    _lock.addEventListener('release', () => { _lock = null; });
  } catch {
    _lock = null; // batería baja o política del SO: no es fatal
  }
}

export function keepAwake() {
  _wanted = true;
  acquire();
}

export function releaseAwake() {
  _wanted = false;
  if (_lock) { _lock.release().catch(() => {}); _lock = null; }
}

// iOS suelta el lock al ir a background; lo re-pedimos al volver.
document.addEventListener('visibilitychange', () => {
  if (_wanted && document.visibilityState === 'visible' && !_lock) acquire();
});
