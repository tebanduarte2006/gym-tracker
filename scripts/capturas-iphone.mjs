// Capturas a tamaño iPhone 11 (414×896 @2x, táctil), en modo claro y oscuro, de
// las pantallas principales, con el historial real de data/seed.json.
// Uso:  node scripts/capturas-iphone.mjs [carpeta de salida]
// Sirve el repo solo (no hace falta levantar un servidor). Usa el Playwright
// instalado globalmente (en las sesiones en la nube ya está): NO es una
// dependencia del proyecto. Si tu cambio es en otra pantalla, agrega su captura
// AQUÍ (docs/convenciones.md); no crees otro script.
// Además de las imágenes comprueba, y sale con código 1 si falla: 0 errores de
// consola, 0 desbordes horizontales y la letra Atkinson cargada.
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

async function capturar(page, tema, nombre, completa = false) {
  await page.waitForTimeout(450); // deja terminar animaciones de sheets y tarjetas
  const m = await page.evaluate(() => ({
    desborda: document.documentElement.scrollWidth > innerWidth,
    letra: document.fonts.check('16px "Atkinson Hyperlegible Next"')
  }));
  await page.screenshot({ path: path.join(SALIDA, `${tema}-${nombre}.png`), fullPage: completa });
  informe.push({ tema, nombre, ...m });
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
  await contexto.close();
}

await navegador.close();
servidor.close();
writeFileSync(path.join(SALIDA, 'informe.json'), JSON.stringify({ informe, errores }, null, 2));

const fallas = [
  ...errores.map((e) => `error de consola: ${e}`),
  ...informe.filter((r) => r.desborda).map((r) => `desborde horizontal: ${r.tema}-${r.nombre}`),
  ...informe.filter((r) => !r.letra).map((r) => `letra sin cargar: ${r.tema}-${r.nombre}`)
];
console.log(`${informe.length} capturas en ${SALIDA}`);
if (fallas.length) { console.log(fallas.join('\n')); process.exit(1); }
console.log('OK: 0 errores de consola, 0 desbordes, letra cargada.');
