import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAlarmWav, ALARM_PATTERN_SEC } from '../js/audio.js';

// El clip de la alarma se genera a mano, byte a byte, porque es lo único que
// puede sonar con la pantalla bloqueada en iOS (ver js/audio.js). Un WAV mal
// formado no da error: simplemente no suena — el fallo más caro posible en un
// aviso. Por eso se valida la cabecera entera y la forma del audio.
const SR = 16000;

function leerTexto(bytes, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[off + i]);
  return s;
}

function leerU32(bytes, off) {
  return bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24);
}

test('buildAlarmWav: cabecera RIFF/WAVE válida y coherente con los datos', () => {
  const w = buildAlarmWav(10);
  assert.ok(w instanceof Uint8Array);
  assert.equal(leerTexto(w, 0, 4), 'RIFF');
  assert.equal(leerTexto(w, 8, 4), 'WAVE');
  assert.equal(leerTexto(w, 12, 4), 'fmt ');
  assert.equal(leerTexto(w, 36, 4), 'data');
  const datos = leerU32(w, 40);
  assert.equal(w.length, 44 + datos, 'el tamaño real no coincide con el declarado');
  assert.equal(leerU32(w, 4), 36 + datos, 'el chunkSize de RIFF miente');
  // PCM · mono · 16 kHz · 8 bits
  assert.equal(w[20] | (w[21] << 8), 1);
  assert.equal(w[22] | (w[23] << 8), 1);
  assert.equal(leerU32(w, 24), SR);
  assert.equal(w[34] | (w[35] << 8), 8);
});

test('buildAlarmWav: silencio exacto hasta el segundo pedido, y tono después', () => {
  const segundos = 5;
  const w = buildAlarmWav(segundos);
  const pcm = w.subarray(44);

  // Todo lo anterior al tono tiene que ser silencio DIGITAL (128 en PCM 8 bits
  // sin signo). Si se colara ruido, la app estaría emitiendo audio audible
  // durante todo el descanso.
  const corte = segundos * SR;
  for (let i = 0; i < corte; i++) {
    if (pcm[i] !== 128) assert.fail('muestra ' + i + ' no es silencio: ' + pcm[i]);
  }

  // Y después tiene que haber señal de verdad, cerca de fondo de escala: una
  // alarma a media ganancia es la que Esteban no oía en el gimnasio.
  const cola = pcm.subarray(corte);
  let pico = 0;
  cola.forEach((v) => { pico = Math.max(pico, Math.abs(v - 128)); });
  assert.ok(pico > 115, 'el tono suena demasiado bajo (pico ' + pico + ')');

  // La duración total es el descanso + el patrón, no más: el clip no puede
  // seguir ocupando el reproductor del sistema una vez sonó.
  const esperado = Math.round((segundos + ALARM_PATTERN_SEC) * SR);
  assert.equal(pcm.length, esperado);
});

test('buildAlarmWav: rechaza duraciones imposibles en vez de reservar memoria', () => {
  assert.equal(buildAlarmWav(-1), null);
  assert.equal(buildAlarmWav(NaN), null);
  assert.equal(buildAlarmWav(99999), null); // 27 horas de WAV en RAM
  assert.equal(buildAlarmWav('largo'), null);
});

test('buildAlarmWav: un descanso de 90s cabe en memoria sin disparates', () => {
  const w = buildAlarmWav(90);
  // 16 kHz × 1 byte × ~91.5 s ≈ 1.5 MB. Si alguien sube la tasa de muestreo o
  // los bits por muestra sin pensarlo, este test lo frena.
  assert.ok(w.length < 2 * 1024 * 1024, 'el clip pesa ' + w.length + ' bytes');
});
