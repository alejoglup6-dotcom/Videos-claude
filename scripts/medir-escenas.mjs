// Mide el costo de render de CADA escena y estima el tiempo del video completo (con 1 proceso de render, el caso más predecible).
// Acorta cada escena a 16 cuadros y las renderiza seguidas en una sola sesión, registrando el tiempo real de cada cuadro (onFrameUpdate):
//   · costo estable = mediana de los cuadros 4-16 de cada escena (s/cuadro)
//   · carga inicial = lo que cuestan los 3 primeros cuadros por encima del costo estable (modelos, texturas, compilación de shaders)
// Estimación = Σ(cuadros reales × costo estable) + Σ carga inicial + arranque fijo (navegador + empaquetado + codificación + audio).
// Uso: node scripts/medir-escenas.mjs <guion> [--calidad normal] [--fijo 40]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderFrames, selectComposition } from '@remotion/renderer';
import { RAIZ, prepararProps } from './comun.mjs';
import { lineaTiempoJS } from './tiempos.mjs';

const a = process.argv.slice(2); const nombre = a[0]; const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
if (!nombre) { console.error('Uso: node scripts/medir-escenas.mjs <guion> [--calidad normal] [--fijo 40]'); process.exit(2); }
const calidad = opt('calidad', 'normal'); const FIJO = Number(opt('fijo', '40')); const C = 16;
const g = prepararProps(nombre, calidad); const tl = lineaTiempoJS(g);
const corto = { ...g, escenas: g.escenas.map((e) => ({ ...e, duracion: C / 30, voz: undefined })), audio: undefined, _voces: {}, _version: 'medicion' };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-'));
const serveUrl = await bundle({ entryPoint: path.join(RAIZ, 'src/index.ts'), onProgress: () => {} });
const composition = await selectComposition({ serveUrl, id: 'VideoVertical', inputProps: corto });
const N = g.escenas.length * C; const ms = new Array(N).fill(0); const t0 = Date.now();
await renderFrames({ composition, serveUrl, inputProps: corto, frameRange: [0, N - 1], imageFormat: 'jpeg', jpegQuality: 80, outputDir: tmp, concurrency: 1, chromiumOptions: { gl: 'swangle' }, timeoutInMilliseconds: 240000, onStart: () => {}, onFrameUpdate: (_d, i, t) => { ms[i] = t; } });
const med = (x) => { const s = [...x].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
let total = FIJO; const filas = [];
tl.forEach((s, i) => { const fr = ms.slice(i * C, (i + 1) * C); const est = med(fr.slice(3)) / 1000; const carga = Math.max(0, fr.slice(0, 3).reduce((x, y) => x + y, 0) / 1000 - 3 * est); const frames = s.f1 - s.f0; const sec = est * frames + carga; total += sec; filas.push({ escena: s.escena.id, cuadros: frames, 's/cuadro': Number(est.toFixed(3)), 'carga inicial (s)': Number(carga.toFixed(1)), 'total escena (s)': Number(sec.toFixed(0)) }); });
console.table(filas);
console.log(`Medición: ${((Date.now() - t0) / 1000).toFixed(0)} s · ESTIMACIÓN del video completo (1 proceso, calidad ${calidad}, incl. ${FIJO} s fijos): ${total.toFixed(0)} s = ${(total / 60).toFixed(1)} min`);
fs.mkdirSync(path.join(RAIZ, 'build'), { recursive: true }); fs.writeFileSync(path.join(RAIZ, 'build', `${g.id}.medicion.json`), JSON.stringify({ calidad, fijo_s: FIJO, total_s: Math.round(total), escenas: filas }, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
