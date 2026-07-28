// check-syntax.mjs — valida la sintaxis ESM de todo el JS del proyecto.
// Uso: npm run check (o node scripts/check-syntax.mjs). Cross-platform.
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!['node_modules', '.git', 'icons', 'data'].includes(name)) out.push(...jsFiles(p));
    } else if (name.endsWith('.js') || name.endsWith('.mjs')) {
      out.push(p);
    }
  }
  return out;
}

let failed = 0;
for (const f of jsFiles(ROOT)) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    console.log('✓', f.slice(ROOT.length + 1));
  } catch (e) {
    failed++;
    console.error('✗', f.slice(ROOT.length + 1));
    console.error(String(e.stderr));
  }
}
if (failed > 0) {
  console.error(`\n${failed} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}
console.log('\nSintaxis OK en todos los archivos.');
