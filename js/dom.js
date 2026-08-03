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
export function toast(msg) {
  const prev = document.querySelector('.toast');
  if (prev) prev.remove();
  if (_toastTimer) clearTimeout(_toastTimer);
  const t = el('div', { class: 'toast' }, [msg]);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  _toastTimer = setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  }, 2500);
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
