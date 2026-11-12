// icons.js — iconos SVG line-style (estética SF Symbols), sin dependencias.

import { el } from '../dom.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  if (attrs) Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  return e;
}

function makeIcon(opts) {
  opts = opts || {};
  const svg = svgEl('svg', {
    width: String(opts.size || 22),
    height: String(opts.size || 22),
    viewBox: '0 0 24 24',
    fill: opts.fill || 'none',
    stroke: opts.color || 'currentColor',
    'stroke-width': String(opts.stroke != null ? opts.stroke : 1.6),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
  if (opts.class) svg.setAttribute('class', opts.class);
  (opts.paths || []).forEach((d) => svg.appendChild(svgEl('path', { d })));
  (opts.extras || []).forEach((fn) => fn(svg, svgEl));
  return svg;
}

export const ICON = {
  dumbbell: (o = {}) => makeIcon({ ...o, paths: ['M6.5 6v12M3 9v6M17.5 6v12M21 9v6M6.5 12h11'] }),
  chevronDown: (o = {}) => makeIcon({ ...o, paths: ['M6 9l6 6 6-6'] }),
  chevronLeft: (o = {}) => makeIcon({ ...o, paths: ['M15 6l-6 6 6 6'] }),
  check: (o = {}) => makeIcon({ ...o, stroke: o.stroke != null ? o.stroke : 2.4, paths: ['M5 12.5l4.5 4.5L19 7.5'] }),
  search: (o = {}) => makeIcon({
    ...o,
    paths: ['M16 16l4 4'],
    extras: [(svg, mk) => svg.appendChild(mk('circle', { cx: '11', cy: '11', r: '6.5', fill: 'none', stroke: 'currentColor' }))]
  }),
  clock: (o = {}) => makeIcon({
    ...o,
    paths: ['M12 7.5V12l3 2'],
    extras: [(svg, mk) => svg.appendChild(mk('circle', { cx: '12', cy: '12', r: '8.5', fill: 'none', stroke: 'currentColor' }))]
  }),
  trash: (o = {}) => makeIcon({ ...o, paths: ['M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.500 7M10 10.5v5.5M14 10.5v5.5'] }),
  trophy: (o = {}) => makeIcon({ ...o, paths: ['M8 4.500h8v5a4 4 0 01-8 0v-5zM8 6H5v1.500a3 3 0 003 3M16 6h3v1.500a3 3 0 01-3 3M12 13.500v3.500M8.500 19.500h7M9.500 17h5'] }),
  play: (o = {}) => makeIcon({ ...o, fill: 'currentColor', stroke: 0, paths: ['M8 5.5v13a.8.8 0 001.2.7l10.300-6.500a.8.8 0 000-1.400L9.2 4.800A.8.8 0 008 5.500z'] }),
  flame: (o = {}) => makeIcon({ ...o, paths: ['M12 3.500c.500 3.500 4.500 5 4.500 9.500a4.500 4.500 0 01-9 0c0-1.800.800-3 1.800-4 .2 1.500 1 2.300 1.700 2.500C10.500 8.500 11 6 12 3.500z'] }),
  heart: (o = {}) => makeIcon({
    ...o,
    paths: ['M12 20s-7-4.5-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.5-9 9-9 9z']
  })
};

// Botón Volver de las pantallas internas: un círculo con ‹, sin texto, como en
// iOS 26 (Apple: "don't use a text label that says Back", docs/diseno-ios.md).
// VoiceOver lo lee como "Atrás". Mismo patrón que Plata.
export function backButton() {
  return el('button', { class: 'g-back-inline', type: 'button', 'aria-label': 'Atrás' }, [
    ICON.chevronLeft({ size: 20, stroke: 2.4 })
  ]);
}
