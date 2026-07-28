// modals.js — bottom sheets reutilizables.

import { el } from '../dom.js';

export function openOverlay(modalEl) {
  const overlay = el('div', { class: 'g-modal-overlay' }, [modalEl]);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}

// Crea el sheet estándar: handle + título + botón cerrar.
// Devuelve { modal, overlay abrir con open(), close }.
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
    close() { if (overlay) overlay.remove(); }
  };
  closeBtn.addEventListener('click', () => api.close());
  return api;
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
