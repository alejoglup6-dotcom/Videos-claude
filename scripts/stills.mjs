// Imágenes sueltas (no es un render del video): una por escena o en los segundos que pidas.
// Uso: node scripts/stills.mjs <guion> [--calidad rapido|normal|alta] [--t 1.5,6,12]   → build/stills/<guion>/t_<seg>.png
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ, prepararProps } from './comun.mjs';
const args = process.argv.slice(2); const nombre = args[0]; const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!nombre) { console.error('Uso: node scripts/stills.mjs <guion> [--calidad ..] [--t a,b,c]'); process.exit(2); }
const guion = prepararProps(nombre, opt('calidad', 'normal'));
let ts = opt('t'); if (ts) ts = ts.split(',').map(Number); else { let t = 0; ts = guion.escenas.map((e) => { const x = t + Math.min(e.duracion * 0.45, 2.2); t += e.duracion; return Number(x.toFixed(2)); }); }
const dir = path.join(RAIZ, 'build/stills', guion.id); fs.mkdirSync(dir, { recursive: true });
const props = path.join(RAIZ, 'build', `${guion.id}.stills.json`); fs.writeFileSync(props, JSON.stringify(guion));
for (const t of ts) {
  const f = Math.round(t * 30); const out = path.join(dir, `t_${t}.png`);
  const r = spawnSync('npx', ['remotion', 'still', 'src/index.ts', 'VideoVertical', out, `--props=${props}`, `--frame=${f}`, '--gl=swangle', '--log=error', '--timeout=180000'], { cwd: RAIZ, stdio: 'inherit' });
  if (r.status !== 0) { console.error('✗ falló el still de t=' + t); process.exit(1); }
  console.log('✔ ' + path.relative(RAIZ, out));
}
