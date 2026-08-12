// icons.js — iconos SVG line-style (estética SF Symbols), sin dependencias.

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
  heart: (o = {}) => makeIcon({
    ...o,
    paths: ['M12 20s-7-4.5-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.5-9 9-9 9z']
  })
};
