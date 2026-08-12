// modals.js — bottom sheets reutilizables.

import { el } from '../dom.js';

// Cuántos sheets hay abiertos: el bloqueo de scroll del body se suelta al
// cerrar el ÚLTIMO, no al cerrar cualquiera.
let _openCount = 0;
let _scrollY = 0;

// iOS Safari IGNORA `overflow:hidden` en el body: el fondo seguía arrastrándose
// bajo el sheet aunque en Chrome de escritorio el bloqueo se veía perfecto (por
// eso pasó la verificación). Lo único que funciona en iOS es sacar el body del
// flujo con `position:fixed`, lo que a cambio salta el scroll al tope — así que
// hay que guardar la posición y devolverla al cerrar.
function lockScroll() {
  _scrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = '-' + _scrollY + 'px';
  document.body.classList.add('g-modal-open');
}

function unlockScroll() {
  document.body.classList.remove('g-modal-open');
  document.body.style.top = '';
  window.scrollTo(0, _scrollY);
}

function closeOverlay(overlay) {
  if (!overlay || !overlay.isConnected) return;
  overlay.remove();
  _openCount = Math.max(0, _openCount - 1);
  if (_openCount === 0) unlockScroll();
}

export function openOverlay(modalEl) {
  const overlay = el('div', { class: 'g-modal-overlay' }, [modalEl]);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay(overlay);
  });
  document.body.appendChild(overlay);
  // Solo el PRIMER sheet fija el scroll: si un sheet abre otro encima (crear
  // ejercicio desde "Agregar ejercicio"), releer `window.scrollY` con el body ya
  // fijado devolvería 0 y al cerrar todo saltaría al tope de la pantalla.
  if (_openCount === 0) lockScroll();
  _openCount++;
  return overlay;
}

// Crea el sheet estándar: handle + título + botón cerrar.
// Devuelve { modal, open(), close(), lock(btn, fn) }.
export function sheet(title) {
  const modal = el('div', { class: 'g-modal' });
  modal.appendChild(el('div', { class: 'g-modal-handle' }));
  const closeBtn = el('button', { class: 'g-modal-close', type: 'button' }, ['✕']);
  modal.appendChild(el('div', { class: 'g-modal-head' }, [
    el('div', { class: 'g-modal-title' }, [title]),
    closeBtn
  ]));
  let overlay = null;
  const api = {
    modal,
    open() { overlay = openOverlay(modal); return overlay; },
    close() { closeOverlay(overlay); overlay = null; }
  };
  closeBtn.addEventListener('click', () => api.close());
  return api;
}

// Envuelve un handler de click para que un doble toque rápido no lo dispare dos
// veces mientras el trabajo asíncrono está en vuelo. Sin esto, dos toques
// seguidos en "Comenzar entrenamiento" creaban DOS sesiones.
export function once(btn, handler) {
  let busy = false;
  btn.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    let result;
    try {
      result = handler();
    } finally {
      const unlock = () => { busy = false; btn.disabled = false; };
      if (result && typeof result.then === 'function') result.then(unlock, unlock);
      else unlock();
    }
  });
  return btn;
}

export function confirmRow(label, value) {
  return el('div', { class: 'g-confirm-row' }, [
    el('span', {}, [label]),
    el('b', {}, [value])
  ]);
}

// Confirmación simple: mensaje + Sí / Cancelar.
export function confirmAction(titulo, msg, onConfirm, opts = {}) {
  const s = sheet(titulo);
  s.modal.appendChild(el('div', { class: 'g-modal-body' }, [msg]));
  const ok = el('button', {
    class: 'g-btn-primary',
    type: 'button',
    style: opts.destructive ? 'background:var(--red);color:#fff;' : null
  }, [opts.okLabel || 'Sí, continuar']);
  ok.addEventListener('click', () => { s.close(); onConfirm(); });
  const cancel = el('button', { class: 'g-btn-secondary', type: 'button' }, ['Cancelar']);
  cancel.addEventListener('click', () => s.close());
  s.modal.appendChild(ok);
  s.modal.appendChild(cancel);
  s.open();
}

// Lista de sugerencias con filtro accent-insensitive (autocomplete).
// getItems: () => string[] · onPick: (valor) => void
export function attachSuggest(input, suggEl, getItems, onPick, normalize) {
  function render(term) {
    while (suggEl.firstChild) suggEl.removeChild(suggEl.firstChild);
    const t = (term || '').trim();
    if (!t) { suggEl.style.display = 'none'; return; }
    const tKey = normalize(t);
    const filtered = getItems().filter((n) => normalize(n).indexOf(tKey) >= 0);
    if (filtered.length === 0) { suggEl.style.display = 'none'; return; }
    filtered.slice(0, 8).forEach((n) => {
      const item = el('button', { class: 'g-suggest-row', type: 'button' }, [n]);
      item.addEventListener('click', () => {
        onPick(n);
        suggEl.style.display = 'none';
      });
      suggEl.appendChild(item);
    });
    suggEl.style.display = '';
  }
  suggEl.style.display = 'none';
  input.addEventListener('input', () => render(input.value));
}
