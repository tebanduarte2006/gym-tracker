// ajustes.js — Hoja de Ajustes (botón ⚙︎ junto al título). Reúne lo que no es
// entrenar ni progresión: apariencia, descanso global, alarma, datos y versión.
// Antes la alarma, los datos y la versión vivían al final de Progresión, donde
// no pegaban (pedido de Esteban, 2026-10-02). Es UNA hoja, como Ajustes de
// Plata; lo que abre otra hoja (importar) cierra esta primero: Apple pide una
// sola hoja a la vez (docs/diseno-ios.md).

import { el, toast, guard } from '../dom.js';
import { dbGetAll, dbBulkImport, prefGet, prefSet } from '../db.js';
import { normalizeBackup, buildExport } from '../importer.js';
import { sheet, confirmRow, once } from './modals.js';
import { APP_VERSION, swVersion, forceUpdateCheck } from '../swupdate.js';
import { beep, setBackgroundAlarm } from '../audio.js';
import { THEME_LABELS, readThemePreference, saveThemePreference } from '../theme.js';

// `onDataImported`: lo pasa main.js para repintar la pestaña visible después de
// importar un backup (antes lo hacía Progresión consigo misma).
export function openSettings({ onDataImported } = {}) {
  const s = sheet('Ajustes');
  s.modal.classList.add('g-settings');

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Apariencia']));
  s.modal.appendChild(buildAppearanceControl());
  s.modal.appendChild(el('div', { class: 'g-settings-foot' }, [
    'Automático sigue el modo de tu iPhone. Claro u Oscuro lo fijan en esta app, sin importar el iPhone.'
  ]));

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Descanso por defecto']));
  s.modal.appendChild(buildGlobalRestCard());
  s.modal.appendChild(el('div', { class: 'g-settings-foot' }, [
    'Para los ejercicios que no tienen un descanso propio. El de cada ejercicio se cambia en su tarjeta (⏱).'
  ]));

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Alarma de descanso']));
  s.modal.appendChild(buildAlarmCard());

  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Datos']));
  const eiWrap = el('div', { class: 'g-export-row' });
  const exportBtn = el('button', { class: 'g-secondary-btn', type: 'button' }, ['Exportar']);
  exportBtn.addEventListener('click', exportData);
  const importBtn = el('button', { class: 'g-secondary-btn', type: 'button' }, ['Importar']);
  importBtn.addEventListener('click', () => { s.close(); importData(onDataImported); });
  eiWrap.appendChild(exportBtn);
  eiWrap.appendChild(importBtn);
  s.modal.appendChild(eiWrap);

  // Versión + actualización manual. Sin esto no había forma de saber qué
  // versión estabas corriendo, que es justo lo que vuelve indiagnosticable un
  // "no se actualizó": el banner puede no salir simplemente porque ya estabas
  // al día, y se ve idéntico a estar trabado en la versión vieja.
  s.modal.appendChild(el('div', { class: 'g-modal-sub' }, ['Versión']));
  const verLine = el('div', { class: 'g-version-line' }, ['Versión ' + APP_VERSION]);
  swVersion().then((sw) => {
    if (!sw) { verLine.textContent = 'Versión ' + APP_VERSION + ' · sin service worker'; return; }
    const servida = String(sw).replace('gymtracker-', '');
    verLine.textContent = servida === APP_VERSION
      ? 'Versión ' + APP_VERSION + ' · al día'
      : 'Versión ' + APP_VERSION + ' · el service worker sirve ' + servida + ' ⚠️';
  });
  const updBtn = el('button', { class: 'g-secondary-btn', type: 'button', style: 'width:100%;' }, ['Buscar actualización']);
  once(updBtn, () => {
    toast('Buscando…');
    return forceUpdateCheck().then((r) => {
      if (r === 'actualizando') toast('Instalando versión nueva…');
      else if (r === 'al-dia') toast('Ya tienes la última versión');
      else toast('Service worker no disponible');
    });
  });
  s.modal.appendChild(updBtn);
  s.modal.appendChild(verLine);

  s.open();
}

// ─── Apariencia ───────────────────────────────────────────────────────────────
// Control segmentado de tres opciones, igual que Ajustes → Apariencia de Plata.
// Lo elegido se marca invirtiendo texto y fondo (regla 2 de interfaz-y-diseno.md:
// seleccionar no es acento).
function buildAppearanceControl() {
  const control = el('div', { class: 'g-segmented', role: 'radiogroup', 'aria-label': 'Apariencia' });
  let current = readThemePreference();
  const buttons = Object.keys(THEME_LABELS).map((option) => {
    const button = el('button', { type: 'button', role: 'radio' }, [THEME_LABELS[option]]);
    button.addEventListener('click', () => {
      current = option;
      saveThemePreference(option);
      paint();
    });
    control.appendChild(button);
    return { option, button };
  });
  const paint = () => buttons.forEach(({ option, button }) => {
    button.classList.toggle('active', option === current);
    button.setAttribute('aria-checked', option === current ? 'true' : 'false');
  });
  paint();
  return control;
}

// ─── Descanso global ──────────────────────────────────────────────────────────
// La misma preferencia (`rest_default`) y los mismos límites (10–3600 s) que la
// hoja de descanso de cada ejercicio (openRestModal en ejercicios.js).
function buildGlobalRestCard() {
  const card = el('div', { class: 'g-list-card g-settings-card' });
  const input = el('input', {
    class: 'g-modal-input g-settings-input', type: 'number', inputmode: 'numeric',
    placeholder: '90', 'aria-label': 'Segundos de descanso por defecto'
  });
  guard(prefGet('rest_default', 90), 'descanso por defecto').then((d) => { input.value = String(d); });
  const save = el('button', { class: 'g-secondary-btn', type: 'button' }, ['Guardar']);
  once(save, () => {
    const v = parseInt(String(input.value || '').trim(), 10);
    if (!(v >= 10 && v <= 3600)) { toast('Entre 10 y 3600 segundos'); return null; }
    return guard(prefSet('rest_default', v), 'guardando descanso global').then(() => {
      toast('Descanso por defecto: ' + v + 's');
    });
  });
  card.appendChild(el('div', { class: 'g-settings-rest' }, [input, el('span', { class: 'g-settings-unit' }, ['s']), save]));
  return card;
}

// ─── Alarma de descanso ───────────────────────────────────────────────────────
// Dos controles y ninguno es decorativo. El de PROBAR existe porque el volumen
// de una alarma no se puede evaluar en la sala: hay que oírla en el gimnasio,
// con su música, antes de confiarle un descanso. El interruptor existe porque
// sonar con la pantalla bloqueada tiene un precio real — la app ocupa el
// reproductor del sistema durante el descanso y puede pausar tu música. Ver
// js/audio.js para el mecanismo y sus límites.
function buildAlarmCard() {
  const card = el('div', { class: 'g-list-card g-settings-card' });

  const estado = el('div', { class: 'g-list-sub' }, ['Cargando…']);
  const toggleRow = el('button', { class: 'g-list-row', type: 'button' }, [
    el('div', {}, [
      el('div', { class: 'g-list-name' }, ['Sonar con la pantalla bloqueada']),
      estado
    ]),
    el('span', { class: 'g-list-pr' }, ['—'])
  ]);
  const valor = toggleRow.lastChild;

  let activo = true;
  const pintar = () => {
    valor.textContent = activo ? 'Sí' : 'No';
    estado.textContent = activo
      ? 'Puede pausar tu música mientras dura el descanso.'
      : 'La alarma solo suena con la app abierta.';
  };

  guard(prefGet('alarma_fondo', true), 'preferencia de alarma').then((v) => {
    activo = v !== false;
    setBackgroundAlarm(activo);
    pintar();
  });

  toggleRow.addEventListener('click', () => {
    activo = !activo;
    pintar();
    setBackgroundAlarm(activo);
    guard(prefSet('alarma_fondo', activo), 'guardando preferencia');
  });
  card.appendChild(toggleRow);

  const probar = el('button', { class: 'g-list-row', type: 'button' }, [
    el('div', {}, [
      el('div', { class: 'g-list-name' }, ['Probar la alarma']),
      el('div', { class: 'g-list-sub' }, ['Súbele el volumen al teléfono antes.'])
    ]),
    el('span', { class: 'g-list-arrow' }, ['▶'])
  ]);
  probar.addEventListener('click', () => beep());
  card.appendChild(probar);

  return card;
}

// ─── Export / Import ──────────────────────────────────────────────────────────
function exportData() {
  guard(Promise.all([
    dbGetAll('sesiones'), dbGetAll('ejercicios'), dbGetAll('sets'),
    dbGetAll('cardio'), dbGetAll('preferencias')
  ]), 'exportando').then(([sesiones, ejercicios, sets, cardio, preferencias]) => {
    const payload = buildExport({ sesiones, ejercicios, sets, cardio, preferencias });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gym-tracker-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup descargado');
  });
}

function importData(onDataImported) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.remove();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let norm;
      try {
        norm = normalizeBackup(JSON.parse(e.target.result));
      } catch (err) {
        toast(err.message || 'Archivo no válido');
        return;
      }
      const s = sheet('Importar backup');
      s.modal.appendChild(el('div', { class: 'g-confirm-summary' }, [
        confirmRow('Versión', 'v' + norm.version),
        confirmRow('Sesiones', String(norm.sesiones.length)),
        confirmRow('Ejercicios', String(norm.ejercicios.length)),
        confirmRow('Sets', String(norm.sets.length)),
        confirmRow('Cardio', String(norm.cardio.length))
      ]));
      if (norm.warnings.length > 0) {
        s.modal.appendChild(el('div', { class: 'g-confirm-warn' }, [norm.warnings.join(' · ')]));
      }
      s.modal.appendChild(el('div', { class: 'g-modal-body' }, [
        'Los registros con el mismo ID se sobrescribirán. Los demás datos no se tocan.'
      ]));
      const ok = el('button', { class: 'g-btn-primary', type: 'button' }, ['Importar']);
      ok.addEventListener('click', () => {
        s.close();
        guard(dbBulkImport(norm), 'importando').then(() => {
          toast(norm.sesiones.length + ' sesiones, ' + norm.ejercicios.length + ' ejercicios, ' + norm.sets.length + ' sets importados');
          if (onDataImported) onDataImported();
        });
      });
      const cancel = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Cancelar']);
      cancel.addEventListener('click', () => s.close());
      s.modal.appendChild(ok);
      s.modal.appendChild(cancel);
      s.open();
    };
    reader.readAsText(file);
  });
  fileInput.click();
}
