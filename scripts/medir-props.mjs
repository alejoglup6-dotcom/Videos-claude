// Banco de pruebas de costo: mide cuánto suma cada prop a la escena 3 (calle), en una sola sesión de render.
// Alterna variantes cada W cuadros (config.secuencia del guion) y registra el tiempo REAL de cada cuadro (onFrameUpdate), con 1 solo proceso.
// Cada variante: los 2 primeros cuadros incluyen su carga/compilación (se informan aparte) y los siguientes dan el costo estable.
// Uso: node scripts/medir-props.mjs <guion> <variantes.json> [salida.json]
//   variantes.json = { "cuadros": 12, "base": ["acera-2"], "variantes": { "nombre": ["acera-2","edif-small"], ... } }
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderFrames, selectComposition } from '@remotion/renderer';
import { RAIZ, prepararProps } from './comun.mjs';

const [nombre, varFile, salida] = process.argv.slice(2);
if (!nombre || !varFile) { console.error('Uso: node scripts/medir-props.mjs <guion> <variantes.json> [salida.json]'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(varFile, 'utf8')); const W = cfg.cuadros ?? 12; const nombres = ['base', ...Object.keys(cfg.variantes)];
const secuencia = [cfg.base ?? [], ...Object.values(cfg.variantes)];
const g = prepararProps(nombre, 'normal');
const e3 = structuredClone(g.escenas.find((x) => x.tipo === 'vice' && x.variante === 'calle'));
delete e3.voz; delete e3.sfx; e3.duracion = Math.ceil((secuencia.length * W) / 30) + 1; e3.config = { secuencia, cuadros: W };
const guion = { ...g, escenas: [e3], audio: undefined, _voces: {}, _version: 'medicion' };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medir-'));
console.log('Empaquetando…'); const serveUrl = await bundle({ entryPoint: path.join(RAIZ, 'src/index.ts'), onProgress: () => {} });
const composition = await selectComposition({ serveUrl, id: 'VideoVertical', inputProps: guion });
const N = secuencia.length * W; const ms = new Array(N).fill(0);
console.log(`Midiendo ${nombres.length} variantes × ${W} cuadros con 1 proceso (${N} cuadros)…`);
const t0 = Date.now();
await renderFrames({ composition, serveUrl, inputProps: guion, frameRange: [0, N - 1], imageFormat: 'jpeg', jpegQuality: 80, outputDir: tmp, concurrency: 1, chromiumOptions: { gl: 'swangle' }, timeoutInMilliseconds: 240000, onStart: () => {}, onFrameUpdate: (_d, i, t) => { ms[i] = t; } });
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const filas = nombres.map((n, v) => { const fr = ms.slice(v * W, (v + 1) * W); const estable = med(fr.slice(3)) / 1000; const carga = Math.max(0, (fr[0] + fr[1]) / 1000 - 2 * estable); return { variante: n, activar: secuencia[v], s_por_cuadro: Number(estable.toFixed(3)), carga_s: Number(carga.toFixed(1)) }; });
const base = filas[0];
for (const f of filas) { f.delta_105_s = Number(((f.s_por_cuadro - base.s_por_cuadro) * 105).toFixed(1)); }
console.table(filas.map((f) => ({ variante: f.variante, 's/cuadro': f.s_por_cuadro, 'Δ por 105 cuadros (s)': f.delta_105_s, 'carga inicial (s)': f.carga_s })));
console.log(`Total medición: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (salida) fs.writeFileSync(salida, JSON.stringify(filas, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
