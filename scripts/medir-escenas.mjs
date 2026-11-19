// Mide el costo de render por escena (segundos por cuadro) y estima el tiempo del video completo.
// Para cada escena renderiza dos tramos cortos (8 y 28 cuadros) y calcula la pendiente: así se descuenta el arranque del navegador.
// Uso: node scripts/medir-escenas.mjs <guion> [--calidad normal]      (no genera el MP4 final)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ, prepararProps } from './comun.mjs';
import { lineaTiempoJS } from './tiempos.mjs';

const nombre = process.argv[2]; const ci = process.argv.indexOf('--calidad'); const calidad = ci > 0 ? process.argv[ci + 1] : 'normal';
if (!nombre) { console.error('Uso: node scripts/medir-escenas.mjs <guion> [--calidad normal]'); process.exit(2); }
const guion = prepararProps(nombre, calidad); const tl = lineaTiempoJS(guion);
const props = path.join(RAIZ, 'build', `${guion.id}.medir.json`); fs.mkdirSync(path.join(RAIZ, 'build'), { recursive: true }); fs.writeFileSync(props, JSON.stringify(guion));
const tiempo = (a, b) => {
  const t0 = Date.now();
  const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', 'VideoVertical', path.join(RAIZ, 'build/medir.mp4'), `--props=${props}`, `--frames=${a}-${b}`, '--gl=swangle', '--codec=h264', '--crf=28', '--image-format=jpeg', '--muted', '--log=error', '--overwrite', '--timeout=180000'], { cwd: RAIZ, stdio: 'ignore' });
  if (r.status !== 0) throw new Error('falló el render de prueba');
  return (Date.now() - t0) / 1000;
};
let total = 0; const filas = [];
for (const s of tl) {
  const mid = Math.round((s.f0 + s.f1) / 2) - 14; const corto = tiempo(mid, mid + 7), largo = tiempo(mid, mid + 27); const spf = Math.max(0.05, (largo - corto) / 20);
  const frames = s.f1 - s.f0; total += spf * frames; filas.push({ id: s.escena.id, frames, spf: Number(spf.toFixed(2)), est: Number((spf * frames).toFixed(0)) });
  console.log(`${s.escena.id.padEnd(18)} ${String(frames).padStart(4)} cuadros  ${spf.toFixed(2)} s/cuadro  ≈ ${(spf * frames).toFixed(0)} s`);
}
console.log(`\nEstimación de render (sin arranque ni codificación): ${total.toFixed(0)} s = ${(total / 60).toFixed(1)} min  · cuadros: ${filas.reduce((a, f) => a + f.frames, 0)}`);
fs.writeFileSync(path.join(RAIZ, 'build', `${guion.id}.medicion.json`), JSON.stringify({ calidad, total_s: Math.round(total), escenas: filas }, null, 2));
