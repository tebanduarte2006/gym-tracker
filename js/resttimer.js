// resttimer.js — rest timer basado en TIMESTAMP, no en decrementos.
// Bug heredado: la app vieja restaba 1 a un contador con setInterval; iOS
// congela esos timers con la pantalla bloqueada o la app en background y el
// conteo quedaba falso. Aquí el fin es un instante fijo (endTs) y el display
// solo se recalcula contra Date.now(): siempre exacto, aunque iOS congele.

import { beep, scheduleBeep, cancelScheduledBeep, scheduleWasLost } from './audio.js';

let _endTs = null;
let _totalSec = 0;
let _intervalId = null;
let _onTick = null;   // (remainingSec, totalSec) => void
let _onEnd = null;    // () => void

function tick() {
  if (_endTs == null) return;
  const remaining = Math.max(0, Math.ceil((_endTs - Date.now()) / 1000));
  if (_onTick) _onTick(remaining, _totalSec);
  if (remaining <= 0) {
    const end = _onEnd;
    // Si el beep programado sí sonó (contexto vivo), no repetirlo. Si iOS lo
    // mató mientras la app estaba en background, sonar ahora al volver.
    const perdido = scheduleWasLost();
    stopRest();
    if (perdido) beep();
    if (end) end();
  }
}

export function startRest(seconds) {
  clearInterval(_intervalId);
  _totalSec = seconds;
  _endTs = Date.now() + seconds * 1000;
  scheduleBeep(seconds);
  _intervalId = setInterval(tick, 250);
  tick();
}

export function stopRest() {
  clearInterval(_intervalId);
  _intervalId = null;
  _endTs = null;
  cancelScheduledBeep();
}

export function restActive() {
  return _endTs != null;
}

export function restState() {
  if (_endTs == null) return null;
  return { remaining: Math.max(0, Math.ceil((_endTs - Date.now()) / 1000)), total: _totalSec };
}

// La UI del tab Entrenar se re-renderiza; re-engancha sus callbacks aquí.
export function bindRestUI(onTick, onEnd) {
  _onTick = onTick;
  _onEnd = onEnd;
  if (_endTs != null) tick();
}

// Si la app vuelve de background con el timer ya vencido, dispara al instante.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _endTs != null) tick();
});
