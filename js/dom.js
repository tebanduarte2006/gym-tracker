// dom.js — helpers de DOM. Sin innerHTML para contenido: todo texto entra
// como TextNode (la vieja app tenía un backdoor `html:` — aquí no existe).

export function el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null) return;
      if (k === 'class') e.className = v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v);
    });
  }
  if (children) {
    children.forEach((c) => {
      if (c == null || c === '') return;
      e.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c))
        : c);
    });
  }
  return e;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

let _toastTimer = null;

// `accion` opcional: { label, onAction }. Convierte el toast en el patrón de
// deshacer de Apple — una acción destructiva de un solo toque (borrar un set en
// mitad de una serie) no debería exigir un diálogo de confirmación, pero
// tampoco puede ser irreversible por un roce con el pulgar.
export function toast(msg, accion) {
  const prev = document.querySelector('.toast');
  if (prev) prev.remove();
  if (_toastTimer) clearTimeout(_toastTimer);

  const t = el('div', { class: 'toast' }, [el('span', { class: 'toast-msg' }, [msg])]);
  const hide = () => {
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  };

  let vida = 2500;
  if (accion && accion.label && typeof accion.onAction === 'function') {
    const btn = el('button', { class: 'toast-action', type: 'button' }, [accion.label]);
    btn.addEventListener('click', () => { hide(); accion.onAction(); });
    t.appendChild(btn);
    vida = 6000; // hay que darle tiempo real de reaccionar y apuntar el dedo
  }

  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  _toastTimer = setTimeout(hide, vida);
}

// Toda promesa de datos que alimente UI pasa por aquí: error visible, no
// pantalla en blanco silenciosa (bug sistémico de la app vieja).
export function guard(promise, contexto) {
  return promise.catch((err) => {
    console.error('[gym-tracker]', contexto, err);
    toast('Error: ' + contexto);
    // Marca para que main.js silencie el "unhandled rejection": el error YA se
    // reportó al usuario y se registró en consola. Se re-lanza para cortar la
    // cadena (nadie debe seguir pintando con datos que no llegaron).
    if (err && typeof err === 'object') {
      try { err._gymHandled = true; } catch { /* objeto congelado */ }
    }
    throw err;
  });
}
