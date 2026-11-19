// Mide el tiempo de pared de N cuadros de la escena 3 con una lista fija de piezas y una concurrencia dada.
// Uso: node scripts/medir-conc.mjs <guion> '["acera-2","edif-small"]' <concurrencia> [cuadros]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderFrames, selectComposition } from '@remotion/renderer';
import { RAIZ, prepararProps } from './comun.mjs';
const [nombre, activar, conc, n = '36'] = process.argv.slice(2); const N = Number(n);
const g = prepararProps(nombre, 'normal'); const e3 = structuredClone(process.env.ESC ? g.escenas.find((x) => x.id === process.env.ESC) : g.escenas.find((x) => x.tipo === 'vice' && x.variante === 'calle'));
delete e3.voz; delete e3.sfx; e3.duracion = 6; if (!process.env.ESC) e3.config = { activar: JSON.parse(activar) };
const guion = { ...g, escenas: [e3], audio: undefined, _voces: {}, _version: 'medicion', ...(process.env.SINGRANO ? { grano: false } : {}), ...(process.env.CAL ? { _calidad: process.env.CAL } : {}) };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conc-'));
const serveUrl = await bundle({ entryPoint: path.join(RAIZ, 'src/index.ts'), onProgress: () => {} });
const composition = await selectComposition({ serveUrl, id: 'VideoVertical', inputProps: guion });
const t0 = Date.now(); const ms = [];
await renderFrames({ composition, serveUrl, inputProps: guion, frameRange: [20, 20 + N - 1], imageFormat: 'jpeg', jpegQuality: 80, outputDir: tmp, concurrency: Number(conc), chromiumOptions: { gl: 'swangle' }, timeoutInMilliseconds: 240000, onStart: () => {}, onFrameUpdate: (_d, _i, t) => ms.push(t) });
const s = ((Date.now() - t0) / 1000); ms.sort((a, b) => a - b);
console.log(`RESULTADO concurrencia=${conc} cuadros=${N} pared=${s.toFixed(1)} s  (${(s / N).toFixed(2)} s/cuadro de pared) · mediana por cuadro=${(ms[Math.floor(ms.length / 2)] / 1000).toFixed(2)} s · piezas=${activar}`);
fs.rmSync(tmp, { recursive: true, force: true });
