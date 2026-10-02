// Capturas a tamaño iPhone 11 (414×896 @2x, táctil), en modo claro y oscuro, de
// las pantallas principales, con el historial real de data/seed.json.
// Uso:  node scripts/capturas-iphone.mjs [carpeta de salida]
// Sirve el repo solo (no hace falta levantar un servidor). Usa el Playwright
// instalado globalmente (en las sesiones en la nube ya está): NO es una
// dependencia del proyecto. Si tu cambio es en otra pantalla, agrega su captura
// AQUÍ (docs/convenciones.md); no crees otro script.
// Además de las imágenes comprueba, y sale con código 1 si falla: 0 errores de
// consola, 0 desbordes horizontales, la letra Atkinson cargada, ningún texto de
// menos de 11px y ninguna área táctil de menos de 44×44 (docs/diseno-ios.md).
// Repite tres pantallas con el texto del iPhone en "grande" (23px).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = process.argv[2] ?? path.join(tmpdir(), 'capturas-gym-tracker');
mkdirSync(SALIDA, { recursive: true });

const TIPOS = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml'
};
const servidor = createServer(async (req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(cuerpo);
  } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}/`;

function cargarPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch {}
  return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const { chromium, devices } = cargarPlaywright();
const navegador = await chromium.launch();
const informe = [];
const errores = [];

// Controles anotados como excepción a los 44 px (docs/proyecto/progreso.md y
// docs/diseno-ios.md): se les exige el mínimo de Apple, 28×28.
const EXCEPCIONES_44 = '.g-unit-toggle button, .g-pill, .g-tool-btn';

// Misma revisión que Plata (finanzas-ia/scripts/_comun.mjs → auditScreen).
async function revisarPantalla(page, exceptionSelector = "") {
  return page.evaluate((exceptionSelector) => {
    const isVisible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none" && box.bottom > 0 && box.top < innerHeight;
    };
    const describe = (element) => (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
    const floatingLayer = (node) => {
      for (let current = node; current && current !== document.body; current = current.parentElement) {
        if (getComputedStyle(current).position === "fixed") return current;
      }
      return null;
    };
    const smallTargets = [];
    for (const element of document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"]')) {
      if (!isVisible(element) || element.disabled) continue;
      const box = element.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      // Tapado (por ejemplo, detrás del velo de una hoja abierta): hoy no se puede tocar, no se mide.
      const centerHit = document.elementFromPoint(centerX, centerY);
      if (centerHit === null || !(centerHit === element || element.contains(centerHit))) continue;
      const isException = exceptionSelector !== "" && element.matches(exceptionSelector);
      const halfTarget = isException ? 13 : 21; // 28 o 44, con un punto de tolerancia por redondeo de subpíxeles
      const ownLayer = floatingLayer(element);
      const probes = [[centerX - halfTarget, centerY], [centerX + halfTarget, centerY], [centerX, centerY - halfTarget], [centerX, centerY + halfTarget]];
      const reachable = probes.every(([x, y]) => {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true; // el borde de la pantalla también cuenta como área
        const hit = document.elementFromPoint(x, y);
        if (hit === null || hit === element || element.contains(hit) || hit.contains(element)) return true;
        return floatingLayer(hit) !== ownLayer; // debajo de una capa flotante: no es culpa del control
      });
      if (!reachable) smallTargets.push(`${describe(element)} (${Math.round(box.width)}×${Math.round(box.height)})`);
    }
    let smallestFontSize = Infinity;
    let smallestFontText = "";
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (!parent || !walker.currentNode.textContent.trim() || !isVisible(parent)) continue;
      const size = parseFloat(getComputedStyle(parent).fontSize);
      if (size < smallestFontSize) {
        smallestFontSize = size;
        smallestFontText = walker.currentNode.textContent.trim().slice(0, 30);
      }
    }
    return {
      overflowsHorizontally: document.documentElement.scrollWidth > innerWidth,
      smallTargets: [...new Set(smallTargets)],
      smallestFontSize,
      smallestFontText,
    };
  }, exceptionSelector);
}

async function capturar(page, tema, nombre, completa = false) {
  await page.waitForTimeout(450); // deja terminar animaciones de sheets y tarjetas
  const m = await page.evaluate(() => ({
    desborda: document.documentElement.scrollWidth > innerWidth,
    letra: document.fonts.check('16px "Atkinson Hyperlegible Next"')
  }));
  const revision = await revisarPantalla(page, EXCEPCIONES_44);
  await page.screenshot({ path: path.join(SALIDA, `${tema}-${nombre}.png`), fullPage: completa });
  informe.push({ tema, nombre, ...m, ...revision });
}

for (const tema of ['light', 'dark']) {
  const contexto = await navegador.newContext({ ...devices['iPhone 11'], colorScheme: tema, hasTouch: true });
  const page = await contexto.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errores.push(`${tema}: ${m.text()}`); });
  page.on('pageerror', (e) => errores.push(`${tema}: ${e.message}`));

  // Primera apertura: base vacía → ofrece restaurar el seed → migración de músculos.
  await page.goto(BASE);
  await page.waitForSelector('.g-modal', { timeout: 10000 });
  await capturar(page, tema, '01-restaurar');
  await page.click('.g-modal .g-btn-primary');
  await page.waitForSelector('text=Lista de músculos nueva', { timeout: 10000 });
  await page.click('.g-modal .g-btn-primary');
  await page.waitForTimeout(800);
  await capturar(page, tema, '02-entrenar-inicio');

  // Sesión: repetir el primer día de la lista (autollenado).
  await page.click('.g-start-cta');
  await page.waitForSelector('.g-modal .g-list-row', { timeout: 10000 });
  await capturar(page, tema, '03-elegir-dia');
  await page.click('.g-modal .g-list-row');
  await page.waitForSelector('.g-ex-card', { timeout: 10000 });
  await page.waitForTimeout(600);
  await capturar(page, tema, '04-sesion-activa');

  // Abrir una tarjeta y registrar el primer set: propuestos y registrado juntos + descanso.
  await page.click('.g-ex-card .g-ex-head');
  await page.waitForTimeout(500);
  const registrar = await page.$('.g-ex-card.open .g-set-mark');
  if (registrar) await registrar.click();
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.g-ex-card.open')?.scrollIntoView({ block: 'center' }));
  await capturar(page, tema, '05-tarjeta-abierta-descanso');

  await page.click('#tab-btn-ejercicios');
  await page.waitForTimeout(700);
  await capturar(page, tema, '06-ejercicios');
  await page.click('.g-lib .g-list-row');
  await page.waitForTimeout(700);
  await capturar(page, tema, '07-detalle-ejercicio', true);

  await page.click('#tab-btn-progresion');
  await page.waitForTimeout(700);
  await capturar(page, tema, '08-progresion', true);
  const fila = await page.$('.g-prog .g-list-row');
  if (fila) {
    await fila.click();
    await page.waitForSelector('.g-chart-card', { timeout: 5000 }).catch(() => {});
    await capturar(page, tema, '09-progresion-grafica');
  }

  // Ajustes (⚙︎) y Apariencia: forzar el modo contrario al del iPhone tiene que
  // cambiar los colores al instante.
  await page.click('#settings-btn');
  await page.waitForSelector('.g-settings', { timeout: 5000 });
  await capturar(page, tema, '10-ajustes');
  const contrario = tema === 'dark' ? 'Claro' : 'Oscuro';
  await page.click(`.g-segmented button:has-text("${contrario}")`);
  const aplicado = await page.evaluate(() => document.documentElement.dataset.theme);
  if (aplicado !== (tema === 'dark' ? 'light' : 'dark')) errores.push(`${tema}: Apariencia → ${contrario} no cambió el tema (quedó ${aplicado})`);
  await capturar(page, tema, '11-ajustes-forzado');
  await page.click('.g-segmented button:has-text("Automático")');
  await contexto.close();
}

// Texto grande: simula Settings → Display & Brightness → Text Size al máximo
// (23px de cuerpo). Chromium no entiende -apple-system-body: se fija la raíz.
{
  const contexto = await navegador.newContext({ ...devices['iPhone 11'], colorScheme: 'light', hasTouch: true });
  await contexto.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const estilo = document.createElement('style');
      estilo.textContent = 'html { font-size: 23px !important; }';
      document.head.append(estilo);
    });
  });
  const page = await contexto.newPage();
  page.on('pageerror', (e) => errores.push(`texto-grande: ${e.message}`));
  await page.goto(BASE);
  await page.waitForSelector('.g-modal', { timeout: 10000 });
  await page.click('.g-modal .g-btn-primary');
  await page.waitForSelector('text=Lista de músculos nueva', { timeout: 10000 });
  await page.click('.g-modal .g-btn-primary');
  await page.waitForTimeout(800);
  await capturar(page, 'texto-grande', '02-entrenar-inicio');
  await page.click('.g-start-cta');
  await page.waitForSelector('.g-modal .g-list-row', { timeout: 10000 });
  await page.click('.g-modal .g-list-row');
  await page.waitForSelector('.g-ex-card', { timeout: 10000 });
  await page.click('.g-ex-card .g-ex-head');
  await page.waitForTimeout(600);
  await capturar(page, 'texto-grande', '05-tarjeta-abierta');
  await page.click('#tab-btn-progresion');
  await page.waitForTimeout(700);
  await capturar(page, 'texto-grande', '08-progresion');
  await contexto.close();
}

await navegador.close();
servidor.close();
writeFileSync(path.join(SALIDA, 'informe.json'), JSON.stringify({ informe, errores }, null, 2));

const fallas = [
  ...errores.map((e) => `error de consola: ${e}`),
  ...informe.filter((r) => r.desborda).map((r) => `desborde horizontal: ${r.tema}-${r.nombre}`),
  ...informe.filter((r) => !r.letra).map((r) => `letra sin cargar: ${r.tema}-${r.nombre}`),
  ...informe.filter((r) => r.smallestFontSize < 11).map((r) => `texto de ${r.smallestFontSize}px ("${r.smallestFontText}"): ${r.tema}-${r.nombre}`),
  ...informe.flatMap((r) => r.smallTargets.map((t) => `área táctil menor a 44×44: ${t} en ${r.tema}-${r.nombre}`))
];
console.log(`${informe.length} capturas en ${SALIDA}`);
if (fallas.length) { console.log(fallas.join('\n')); process.exit(1); }
console.log('OK: 0 errores de consola, 0 desbordes, letra cargada, texto de 11px o más y áreas táctiles de 44×44 o más.');
