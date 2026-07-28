// progresion.js — Tab 3: hero semanal, progresión por ejercicio, cardio, datos.
// TODOS los cálculos usan solo sets Done (stats.js). PR doble: peso y reps.

import { el, clear, toast, guard } from '../dom.js';
import { dbGetAll, dbBulkImport } from '../db.js';
import { fmtWeight, fmtDateShort, fmtDateLong, fmtInt, kgToLbs } from '../format.js';
import {
  isCountable, weightPR, repsPR, epley1RM, sessionTs, sessionRows, markRunningPRs
} from '../stats.js';
import { normalizeBackup, buildExport } from '../importer.js';
import { sheet, confirmRow } from './modals.js';
import { buildCardioRow } from './entrenar.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderProgresion(panel) {
  clear(panel);
  const wrap = el('div', { class: 'g-prog' });
  const heroSlot = el('div', {});
  wrap.appendChild(heroSlot);
  wrap.appendChild(el('div', { class: 'g-section-label' }, ['EJERCICIOS · TAP PARA VER PROGRESIÓN']));
  const listSlot = el('div', {});
  wrap.appendChild(listSlot);
  const noHistSlot = el('div', {});
  wrap.appendChild(noHistSlot);
  const cardioSlot = el('div', {});
  wrap.appendChild(cardioSlot);

  wrap.appendChild(el('div', { class: 'g-section-label' }, ['DATOS']));
  const eiWrap = el('div', { class: 'g-export-row' });
  const exportBtn = el('button', { class: 'g-secondary-btn', type: 'button' }, ['📤 Exportar']);
  exportBtn.addEventListener('click', exportData);
  const importBtn = el('button', { class: 'g-secondary-btn', type: 'button' }, ['📥 Importar']);
  importBtn.addEventListener('click', () => importData(panel));
  eiWrap.appendChild(exportBtn);
  eiWrap.appendChild(importBtn);
  wrap.appendChild(eiWrap);
  panel.appendChild(wrap);

  guard(Promise.all([dbGetAll('ejercicios'), dbGetAll('sets'), dbGetAll('sesiones'), dbGetAll('cardio')]), 'cargando progresión')
    .then(([ejercicios, sets, sesiones, cardio]) => {
      const sesMap = {};
      sesiones.forEach((s) => { sesMap[s.id] = s; });

      if (ejercicios.length === 0) {
        listSlot.appendChild(el('div', { class: 'g-empty-card' }, ['Sin ejercicios. Crea uno desde la pestaña Ejercicios.']));
        return;
      }

      const realSets = sets.filter((s) => {
        const ses = sesMap[s.sesion_id];
        return isCountable(s) && ses && ses.finalizada === true;
      });

      // Hero: récord de la semana
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekSets = realSets.filter((s) => sessionTs(sesMap[s.sesion_id]) >= weekAgo);
      const weekBest = weightPR(weekSets);
      if (weekBest) {
        const ejBest = ejercicios.find((e) => e.id === weekBest.ejercicio_id);
        if (ejBest) {
          const ejWeekRows = sessionRows(
            realSets.filter((s) => s.ejercicio_id === ejBest.id && sessionTs(sesMap[s.sesion_id]) >= weekAgo),
            sesMap
          );
          heroSlot.appendChild(buildHero(panel, ejBest, weekBest, ejWeekRows));
        }
      }

      // Lista con/sin historial
      const withData = [];
      const noData = [];
      ejercicios.forEach((ej) => {
        const setsEj = realSets.filter((s) => s.ejercicio_id === ej.id);
        if (setsEj.length === 0) { noData.push(ej); return; }
        const pr = weightPR(setsEj);
        const sesIds = new Set(setsEj.map((s) => s.sesion_id));
        const lastTs = Math.max(...[...sesIds].map((id) => sessionTs(sesMap[id])));
        withData.push({ ej, pr, lastTs, sesionCount: sesIds.size });
      });
      withData.sort((a, b) => b.lastTs - a.lastTs);

      if (withData.length > 0) {
        const card = el('div', { class: 'g-list-card' });
        withData.forEach((item) => card.appendChild(buildRow(panel, item.ej, item.pr, item.sesionCount)));
        listSlot.appendChild(card);
      } else {
        listSlot.appendChild(el('div', { class: 'g-empty-card' }, ['Aún no hay ejercicios con historial.']));
      }
      if (noData.length > 0) {
        noHistSlot.appendChild(el('div', { class: 'g-section-label dim' }, ['SIN HISTORIAL']));
        const dimCard = el('div', { class: 'g-list-card dim' });
        noData.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((ej) => {
          dimCard.appendChild(buildRow(panel, ej, null, 0));
        });
        noHistSlot.appendChild(dimCard);
      }

      // Cardio: resumen por tipo
      const cardioFin = cardio.filter((c) => sesMap[c.sesion_id] && sesMap[c.sesion_id].finalizada === true);
      if (cardioFin.length > 0) {
        cardioSlot.appendChild(el('div', { class: 'g-section-label' }, ['CARDIO']));
        const byTipo = {};
        cardioFin.forEach((c) => { (byTipo[c.tipo] = byTipo[c.tipo] || []).push(c); });
        const card = el('div', { class: 'g-list-card' });
        Object.keys(byTipo).sort().forEach((tipo) => {
          const arr = byTipo[tipo].sort((a, b) => sessionTs(sesMap[b.sesion_id]) - sessionTs(sesMap[a.sesion_id]));
          const totalMin = arr.reduce((s, c) => s + (Number(c.duracion_min) || 0), 0);
          const last = arr[0];
          const meta = [];
          if (last.velocidad_kmh != null) meta.push(last.velocidad_kmh + ' km/h');
          if (last.inclinacion != null) meta.push('incl. ' + last.inclinacion);
          card.appendChild(el('div', { class: 'g-list-row', style: 'cursor:default;' }, [
            el('div', {}, [
              el('div', { class: 'g-list-name' }, ['🏃 ' + tipo]),
              el('div', { class: 'g-list-sub' }, [
                'Última: ' + last.duracion_min + ' min' + (meta.length ? ' · ' + meta.join(' · ') : '') +
                ' · ' + fmtDateShort(sesMap[last.sesion_id].fecha)
              ])
            ]),
            el('span', { class: 'g-list-pr' }, [arr.length + '× · ' + totalMin + ' min'])
          ]));
        });
        cardioSlot.appendChild(card);
      }
    });
}

function buildRow(panel, ej, pr, sesionCount) {
  const subStr = pr
    ? sesionCount + (sesionCount === 1 ? ' sesión · PR ' : ' sesiones · PR ') + fmtWeight(pr.peso) + ' × ' + pr.reps
    : ((ej.musculos || []).join(' · ') || 'sin músculo');
  const row = el('button', { class: 'g-list-row', type: 'button' }, [
    el('div', {}, [
      el('div', { class: 'g-list-name' }, [ej.nombre]),
      el('div', { class: 'g-list-sub' }, [subStr])
    ]),
    el('span', { class: 'g-list-arrow' }, ['›'])
  ]);
  row.addEventListener('click', () => renderDetail(panel, ej));
  return row;
}

function buildHero(panel, ej, prSet, rows) {
  const lbs = kgToLbs(prSet.peso);
  const oneRM = epley1RM(lbs || 0, prSet.reps);
  const hero = el('div', { class: 'g-prog-hero' });
  hero.appendChild(el('div', { class: 'g-prog-hero-label' }, ['RÉCORD DE LA SEMANA']));
  hero.appendChild(el('div', { class: 'g-prog-hero-name' }, [ej.nombre]));
  hero.appendChild(el('div', { class: 'g-prog-hero-num' }, [
    el('span', { class: 'g-prog-hero-big' }, [String(lbs != null ? lbs : '—')]),
    el('span', { class: 'g-prog-hero-unit' }, ['lbs × ' + prSet.reps])
  ]));
  hero.appendChild(el('div', { class: 'g-prog-hero-sub' }, ['1RM est. ' + oneRM + ' lbs · fórmula Epley']));

  if (rows.length >= 2) {
    const W = 280, H = 48;
    const pesos = rows.map((r) => kgToLbs(r.maxPesoKg) || 0);
    let minY = Math.min(...pesos) - 2;
    let maxY = Math.max(...pesos) + 2;
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'g-prog-spark');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    const pts = pesos.map((p, i) => ({
      x: (i / (pesos.length - 1)) * W,
      y: H - ((p - minY) / (maxY - minY)) * H
    }));
    const lineD = pts.map((p, i) => (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    const area = document.createElementNS(SVG_NS, 'path');
    area.setAttribute('d', lineD + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z');
    area.setAttribute('fill', 'rgba(255,159,10,0.18)');
    svg.appendChild(area);
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', lineD);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#FF9F0A');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(line);
    hero.appendChild(svg);
    hero.appendChild(el('div', { class: 'g-prog-hero-axis' }, [
      el('span', {}, ['Hace 7 d']),
      el('span', {}, ['Hoy'])
    ]));
  }
  hero.style.cursor = 'pointer';
  hero.addEventListener('click', () => renderDetail(panel, ej));
  return hero;
}

function renderDetail(panel, ej) {
  clear(panel);
  const wrap = el('div', { class: 'g-detail-screen' });
  const back = el('button', { class: 'g-back-inline', type: 'button' }, ['Progresión']);
  back.addEventListener('click', () => renderProgresion(panel));
  wrap.appendChild(back);
  wrap.appendChild(el('h2', { class: 'g-detail-title' }, [ej.nombre]));
  wrap.appendChild(el('div', { class: 'g-detail-sub' }, [
    (ej.tipo || 'Sin tipo') + ' · ' + ((ej.musculos || []).join(' · ') || 'sin músculo')
  ]));
  panel.appendChild(wrap);

  guard(Promise.all([dbGetAll('sets'), dbGetAll('sesiones')]), 'cargando detalle').then(([allSets, sesiones]) => {
    const sesMap = {};
    sesiones.forEach((s) => { sesMap[s.id] = s; });
    const sets = allSets.filter((s) => {
      const ses = sesMap[s.sesion_id];
      return s.ejercicio_id === ej.id && isCountable(s) && ses && ses.finalizada === true;
    });
    if (sets.length === 0) {
      wrap.appendChild(el('div', { class: 'g-empty-card', style: 'margin:0 16px;' }, ['Sin sesiones registradas para este ejercicio.']));
      return;
    }

    // PR peso + PR reps
    const prW = weightPR(sets);
    const prR = repsPR(sets);
    const prLbs = kgToLbs(prW.peso) || 0;
    const oneRM = epley1RM(prLbs, prW.reps);
    const prSesion = sesMap[prW.sesion_id];

    const prCard = el('div', { class: 'g-pr-card' });
    prCard.appendChild(el('div', { class: 'g-pr-card-label' }, ['🏆 PERSONAL RECORD']));
    prCard.appendChild(el('div', { class: 'g-pr-card-value' }, [
      el('span', { class: 'g-pr-num' }, [String(prLbs)]),
      el('span', { class: 'g-pr-unit' }, ['lbs × ' + prW.reps])
    ]));
    const metaLines = [
      (prSesion && prSesion.fecha ? fmtDateLong(prSesion.fecha) : 'fecha desconocida') + ' · 1RM est. ' + oneRM + ' lbs · Epley'
    ];
    if (prR && (prR.id !== prW.id)) {
      metaLines.push('Más reps: ' + prR.reps + ' × ' + fmtWeight(prR.peso) + ' lbs');
    }
    prCard.appendChild(el('div', { class: 'g-pr-card-meta' }, [metaLines.join('  ·  ')]));
    wrap.appendChild(prCard);

    // Filas por sesión + PRs corrientes
    const rows = markRunningPRs(sessionRows(sets, sesMap));
    const last10 = rows.slice(-10);

    wrap.appendChild(buildChart(last10));

    wrap.appendChild(el('div', { class: 'g-section-label', style: 'padding-left:20px;' }, [
      'ÚLTIMAS ' + last10.length + (last10.length === 1 ? ' SESIÓN' : ' SESIONES')
    ]));
    const listWrap = el('div', { style: 'padding:0 16px;' });
    last10.slice().reverse().forEach((row) => listWrap.appendChild(buildSessionDetails(row)));
    wrap.appendChild(listWrap);
  });
}

function buildChart(rows) {
  const card = el('div', { class: 'g-chart-card' });
  card.appendChild(el('div', { class: 'g-section-label', style: 'padding:0 0 10px;' }, [
    'PESO MÁX · ÚLTIMAS ' + rows.length + (rows.length === 1 ? ' SESIÓN' : ' SESIONES')
  ]));
  if (rows.length === 0) {
    card.appendChild(el('div', { style: 'color:var(--t3);font-size:13px;padding:20px 0;text-align:center;' }, ['Sin datos.']));
    return card;
  }
  const W = 320, H = 120, padX = 14, padY = 14;
  const pesos = rows.map((r) => kgToLbs(r.maxPesoKg) || 0);
  let minP = Math.min(...pesos);
  let maxP = Math.max(...pesos);
  if (minP === maxP) { minP = Math.max(0, minP - 1); maxP += 1; }
  const range = maxP - minP;
  const step = rows.length > 1 ? (W - 2 * padX) / (rows.length - 1) : 0;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('preserveAspectRatio', 'none');
  [0, 0.5, 1].forEach((t) => {
    const y = padY + (1 - t) * (H - 2 * padY);
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', padX); line.setAttribute('x2', W - padX);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    line.setAttribute('stroke-dasharray', '2 4');
    svg.appendChild(line);
  });
  const pts = rows.map((r, i) => {
    const p = kgToLbs(r.maxPesoKg) || 0;
    return {
      x: rows.length === 1 ? W / 2 : padX + i * step,
      y: padY + (1 - (range === 0 ? 0.5 : (p - minP) / range)) * (H - 2 * padY),
      row: r
    };
  });
  if (pts.length > 1) {
    const lineD = 'M ' + pts.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L ');
    const area = document.createElementNS(SVG_NS, 'path');
    area.setAttribute('d', lineD + ' L ' + pts[pts.length - 1].x.toFixed(1) + ' ' + (H - padY) + ' L ' + pts[0].x.toFixed(1) + ' ' + (H - padY) + ' Z');
    area.setAttribute('fill', 'rgba(255,159,10,0.18)');
    svg.appendChild(area);
    const ln = document.createElementNS(SVG_NS, 'path');
    ln.setAttribute('d', lineD);
    ln.setAttribute('fill', 'none');
    ln.setAttribute('stroke', '#FF9F0A');
    ln.setAttribute('stroke-width', '2');
    ln.setAttribute('stroke-linecap', 'round');
    ln.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(ln);
  }
  pts.forEach((p) => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 3);
    c.setAttribute('fill', '#FF9F0A');
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = fmtDateShort(p.row.sesion ? p.row.sesion.fecha : null) + ': ' + (kgToLbs(p.row.maxPesoKg) || 0) + ' lbs';
    c.appendChild(title);
    svg.appendChild(c);
  });
  card.appendChild(svg);
  card.appendChild(el('div', { class: 'g-chart-axis' }, [
    el('span', {}, [fmtDateShort(rows[0].sesion ? rows[0].sesion.fecha : null)]),
    el('span', { class: 'g-chart-axis-mid' }, ['min ' + Math.round(minP) + ' / máx ' + Math.round(maxP) + ' lbs']),
    el('span', {}, [fmtDateShort(rows[rows.length - 1].sesion ? rows[rows.length - 1].sesion.fecha : null)])
  ]));
  return card;
}

function buildSessionDetails(row) {
  const details = el('details', { class: 'g-session-row' });
  const summary = el('summary', { class: 'g-session-summary' });
  const routine = (row.sesion && row.sesion.routine_type) || '';
  const volLbs = Math.round(kgToLbs(row.volumenKg) || 0);
  const nameLine = el('div', { class: 'g-list-name' }, [fmtDateLong(row.sesion ? row.sesion.fecha : null)]);
  if (routine) {
    nameLine.appendChild(document.createTextNode(' · '));
    nameLine.appendChild(el('span', { style: 'color:var(--accent);' }, [routine]));
  }
  summary.appendChild(el('div', {}, [
    nameLine,
    el('div', { class: 'g-list-sub' }, [
      'Mejor: ' + fmtWeight(row.bestSet.peso) + ' × ' + row.bestSet.reps + ' · Vol: ' + fmtInt(volLbs)
    ])
  ]));
  summary.appendChild(el('span', { class: 'g-session-chev' }, ['›']));
  details.appendChild(summary);

  const body = el('div', { class: 'g-session-sets' });
  row.sets.forEach((s, i) => {
    const srow = el('div', { class: 'g-session-set-row' }, [
      el('span', { class: 'g-set-n' }, ['Set ' + (i + 1)]),
      el('span', {}, [
        el('b', {}, [fmtWeight(s.peso)]), ' lbs × ', el('b', {}, [String(s.reps)])
      ])
    ]);
    if (s._isPR) srow.appendChild(el('span', { class: 'g-pr-badge' }, ['🏆 PR']));
    body.appendChild(srow);
  });
  details.appendChild(body);
  return details;
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

function importData(panel) {
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
          renderProgresion(panel);
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
