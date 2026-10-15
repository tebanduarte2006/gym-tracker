// movilidad.js — rutina de movilidad guiada, paso a paso (se abre desde el
// inicio de Entrenar). Ver docs/rutas/movilidad.md.
//
// · La rutina sale de data/movilidad.json (la edita un agente, no la app).
// · Un paso por pantalla: animación en bucle, dosis grande, instrucciones
//   cortas y "Siguiente". Hecha para seguirla con el teléfono en el piso.
// · El progreso vive en memoria (`_run`): salir con ‹ o cambiar de pestaña NO
//   lo pierde, y el inicio ofrece continuar. Así no hace falta confirmar la
//   salida (docs/diseno-ios.md, D10). Si iOS mata la app, se empieza de nuevo:
//   son minutos, no datos.
// · Al terminar solo se guarda el día (`movilidad_dias`). Nada de sesiones ni
//   sets: no cuenta para PR, volumen ni gráficas.

import { el, clear, toast, guard } from '../dom.js';
import { prefGet, prefSet } from '../db.js';
import { fmtDuration } from '../format.js';
import { MOBILITY_PREF, addMobilityDay, buildSteps, dosisText, estimateMinutes } from '../mobility.js';
import { beep } from '../audio.js';
import { keepAwake, releaseAwake } from '../wakelock.js';
import { backButton } from './icons.js';
import { once } from './modals.js';

let _rutina = null;        // data/movilidad.json ya leído (una vez por apertura)
let _run = null;           // { pasos, i } mientras la rutina está a medias
let _timer = null;         // { fin (timestamp), id } del cronómetro del paso

function loadRoutine() {
  if (_rutina) return Promise.resolve(_rutina);
  return fetch('./data/movilidad.json')
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => { _rutina = data; return data; });
}

// Para el botón del inicio: "continuar" en vez de "empezar".
export function mobilityProgress() {
  return _run ? { paso: _run.i + 1, total: _run.pasos.length } : null;
}

// Entrada. `onExit` vuelve al inicio de Entrenar. Devuelve una promesa que
// resuelve con la pantalla ya pintada (convención de los render*).
export function renderMobility(panel, onExit) {
  clear(panel);
  stopTimer();
  const wrap = el('div', { class: 'g-start' });
  const back = backButton();
  back.addEventListener('click', () => { releaseAwake(); onExit(); });
  wrap.appendChild(back);
  panel.appendChild(wrap);

  return guard(loadRoutine(), 'cargando la rutina de movilidad').then((rutina) => {
    const pasos = buildSteps(rutina);
    wrap.appendChild(el('h2', { class: 'g-detail-title', style: 'margin-left:4px;' }, [rutina.nombre || 'Movilidad']));
    wrap.appendChild(el('div', { class: 'g-mob-sub' }, [
      rutina.ejercicios.length + ' ejercicios · ' + rutina.vueltas +
      (Number(rutina.vueltas) === 1 ? ' vuelta' : ' vueltas') + ' · unos ' + estimateMinutes(rutina) + ' min'
    ]));

    const lista = el('div', { class: 'g-mob-list' });
    rutina.ejercicios.forEach((e, i) => {
      lista.appendChild(el('div', { class: 'g-mob-row' }, [
        el('div', { class: 'g-mob-row-n' }, [String(i + 1)]),
        el('div', { class: 'g-mob-row-text' }, [
          el('div', { class: 'g-recent-name' }, [e.nombre]),
          el('div', { class: 'g-recent-sub' }, [e.zona + ' · ' + dosisText(e.dosis)])
        ])
      ]));
    });
    wrap.appendChild(lista);

    const enCurso = _run && _run.pasos.length === pasos.length;
    const cta = el('button', { class: 'g-start-cta', type: 'button' }, [
      enCurso ? 'Continuar · paso ' + (_run.i + 1) + ' de ' + pasos.length : 'Empezar'
    ]);
    cta.addEventListener('click', () => {
      if (!enCurso) _run = { pasos, i: 0 };
      keepAwake();
      renderStep(panel, onExit);
    });
    wrap.appendChild(cta);

    if (enCurso) {
      const reiniciar = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Empezar de nuevo']);
      reiniciar.addEventListener('click', () => {
        _run = { pasos, i: 0 };
        keepAwake();
        renderStep(panel, onExit);
      });
      wrap.appendChild(reiniciar);
    }

    if (rutina.fuente) wrap.appendChild(el('div', { class: 'g-mob-source' }, ['Basada en: ' + rutina.fuente + '.']));
  });
}

function renderStep(panel, onExit) {
  stopTimer();
  clear(panel);
  window.scrollTo(0, 0);
  const { pasos, i } = _run;
  const paso = pasos[i];
  const e = paso.ejercicio;
  const vueltas = pasos[pasos.length - 1].vuelta;
  const porVuelta = pasos.length / vueltas;

  const wrap = el('div', { class: 'g-start g-mob-step' });
  const back = backButton();
  // Volver a la portada de la rutina, que ofrece continuar: no se pierde nada.
  back.addEventListener('click', () => renderMobility(panel, onExit));

  const barra = el('div', { class: 'g-mob-bar-fill' });
  barra.style.width = Math.round(((i + 1) / pasos.length) * 100) + '%';
  wrap.appendChild(el('div', { class: 'g-mob-top' }, [
    back,
    el('div', { class: 'g-mob-progress' }, [
      el('div', { class: 'g-mob-progress-l' }, [
        'VUELTA ' + paso.vuelta + ' DE ' + vueltas + ' · ' + paso.posicion + ' DE ' + porVuelta
      ]),
      el('div', { class: 'g-mob-bar', role: 'progressbar', 'aria-valuemin': '1',
        'aria-valuemax': String(pasos.length), 'aria-valuenow': String(i + 1) }, [barra])
    ])
  ]));

  // Una sola imagen a la vez: el iPhone 11 tiene poca memoria y una animación
  // que no se ve no tiene por qué estar decodificada.
  if (e.animacion) {
    wrap.appendChild(el('div', { class: 'g-mob-media' }, [
      el('img', { src: './' + e.animacion, alt: e.nombre, decoding: 'async' })
    ]));
  } else {
    wrap.appendChild(el('div', { class: 'g-mob-media g-mob-media-empty' }, ['Sin animación todavía']));
  }

  wrap.appendChild(el('div', { class: 'g-mob-zone' }, [e.zona]));
  wrap.appendChild(el('h2', { class: 'g-mob-name' }, [e.nombre]));
  // Con tiempo, el cronómetro ES la dosis: una fila menos para que quepa
  // entero encima de los botones sin tener que bajar.
  if (e.dosis && e.dosis.tipo === 'tiempo') wrap.appendChild(buildTimer(Number(e.dosis.segundos)));
  else wrap.appendChild(el('div', { class: 'g-mob-dose' }, [dosisText(e.dosis)]));

  const ol = el('ol', { class: 'g-mob-cues' });
  e.pasos.forEach((t) => ol.appendChild(el('li', {}, [t])));
  wrap.appendChild(ol);

  const ultimo = i === pasos.length - 1;
  const anterior = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Anterior']);
  if (i === 0) anterior.disabled = true;
  anterior.addEventListener('click', () => { _run.i = Math.max(0, i - 1); renderStep(panel, onExit); });
  const siguiente = el('button', { class: 'g-btn-primary', type: 'button' }, [ultimo ? 'Terminar' : 'Siguiente']);
  if (ultimo) once(siguiente, () => finish(onExit));
  else siguiente.addEventListener('click', () => { _run.i = i + 1; renderStep(panel, onExit); });
  wrap.appendChild(el('div', { class: 'g-mob-nav' }, [anterior, siguiente]));

  panel.appendChild(wrap);
}

// Cronómetro del paso con tiempo: cuenta contra un timestamp fijo (lección 2),
// no descontando un setInterval. Al llegar a cero suena la alarma del descanso.
function buildTimer(segundos) {
  const cifra = el('div', { class: 'g-mob-timer-num', 'aria-live': 'polite' }, [fmtDuration(segundos * 1000)]);
  const btn = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Iniciar ' + segundos + ' s']);
  const pintar = () => {
    const resta = Math.max(0, _timer.fin - Date.now());
    cifra.textContent = fmtDuration(Math.ceil(resta / 1000) * 1000);
    if (resta <= 0) {
      stopTimer();
      cifra.textContent = 'Listo';
      btn.textContent = 'Repetir ' + segundos + ' s';
      beep();
    }
  };
  btn.addEventListener('click', () => {
    stopTimer();
    _timer = { fin: Date.now() + segundos * 1000, id: setInterval(pintar, 250) };
    btn.textContent = 'Reiniciar';
    pintar();
  });
  return el('div', { class: 'g-mob-timer' }, [cifra, btn]);
}

function stopTimer() {
  if (_timer) clearInterval(_timer.id);
  _timer = null;
}

function finish(onExit) {
  stopTimer();
  return guard(
    prefGet(MOBILITY_PREF, []).then((dias) => prefSet(MOBILITY_PREF, addMobilityDay(dias, Date.now()))),
    'guardando la movilidad'
  ).then(() => {
    _run = null;
    releaseAwake();
    toast('Movilidad registrada');
    onExit();
  }).catch(() => {}); // el error ya se mostró (guard) y el botón vuelve a quedar activo
}
