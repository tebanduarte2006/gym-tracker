// audio.js — beep del rest timer vía Web Audio.
// navigator.vibrate NO existe en iOS Safari (bug heredado: la app vieja
// "avisaba" con vibración que jamás sonó en el iPhone). Web Audio sí funciona,
// con la condición de crear/reanudar el AudioContext tras un gesto del usuario.

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  }
  return _ctx;
}

// Llamar una vez: engancha el primer gesto para desbloquear el audio en iOS.
export function installAudioUnlock() {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
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
}

// Doble nota corta, estilo timer de Apple.
export function beep() {
  const ctx = getCtx();
  if (!ctx) return;
  const go = () => {
    const t = ctx.currentTime;
    tone(ctx, 880, t, 0.18);
    tone(ctx, 1174.66, t + 0.22, 0.28);
  };
  if (ctx.state === 'suspended') ctx.resume().then(go).catch(() => {});
  else go();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Android, por si acaso
}
