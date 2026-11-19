#!/usr/bin/env node
// Mide cuánto tarda renderizar 60 cuadros (modo normal, 3 núcleos) de cada variante de los decorados genéricos y, como referencia,
// de las escenas de la plantilla de GTA 6 en la MISMA máquina; y el costo fijo sin 3D (arranque + textos + subtítulos).
//   node video3d/pruebas/medir_render.mjs [--repeticiones 2] [--json salida.json]      (tarda ~15 min; no uses la CPU mientras corre)
// Cada medida es una ejecución completa de render.mjs (incluye empaquetar y abrir el navegador, ~10 s fijos). Usa el «render N s» que
// imprime render.mjs (sin el acabado de ffmpeg) y el «total».
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const arg = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const REP = Number(arg('repeticiones', 2)); const salidaJson = arg('json');
const tj = path.join(RAIZ, 'ejemplos/villaluna/tiempos.json'); const T = JSON.parse(fs.readFileSync(tj, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medir-'));
const VARIANTES = [['calle', 'avenida', 'calle-avenida'], ['calle', 'plaza', 'calle-plaza'], ['calle', 'esquina', 'calle-esquina'],
  ['interior', 'mesa', 'interior-mesa'], ['interior', 'ventana', 'interior-ventana'], ['interior', 'estante', 'interior-frente'],
  ['datos', 'barras', 'datos-frente', [3, 5, 8, 6, 10]], ['datos', 'cifra', 'datos-frente', [1250]], ['datos', 'ascenso', 'datos-frente', [2, 4, 3, 7, 9]]];
const cfgVariante = ([decorado, variante, camara, datos]) => ({ version: 1, etiqueta: null, pildoras: ['#FF2E93', '#1FB6FF', '#FF8A1F', '#25C98B'],
  frases: Object.fromEntries(T.frases.map((f) => [f.id, { claves: [] }])),
  tomas: T.frases.flatMap((f, i) => Array.from({ length: i === 0 ? 3 : 2 }, () => ({ frase: f.id, decorado, variante, camara, texto: { txt: 'PRUEBA', color: '#FFFFFF' }, ...(datos ? { datos } : {}) }))) });

const mide = (etq, args, env = {}) => {
  const r = []; for (let i = 0; i < REP; i++) {
    const p = spawnSync(process.execPath, [path.join(RAIZ, 'herramientas/render.mjs'), '--modo', 'normal', '--concurrencia', '3', '--sin-post', '--salida', path.join(tmp, 'x.mp4'), ...args], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 600000 });
    const m = /render (\d+) s · total (\d+) s/.exec(p.stdout);
    if (p.status !== 0 || !m) { console.log(`  ${etq}: FALLÓ (${(p.stdout + p.stderr).slice(-200)})`); r.push({ render: NaN, total: NaN }); continue; }
    r.push({ render: Number(m[1]), total: Number(m[2]) });
  }
  const med = (k) => { const v = r.map((x) => x[k]).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
  const fila = { etq, corridas: r.map((x) => x.render), render: med('render'), total: med('total') };
  console.log(`  ${etq.padEnd(34)} render ${fila.corridas.join(' / ')} s  (mediana ${fila.render} s)`); return fila;
};

console.log(`Máquina: ${os.cpus().length} núcleos, concurrencia 3, modo normal, 60 cuadros, ${REP} repetición(es) por medida\n\nVariantes nuevas (cuadros 0-59 de Villaluna, textos y subtítulos incluidos)`);
const filas = [];
for (const v of VARIANTES) { const f = path.join(tmp, `${v[0]}_${v[1]}.json`); fs.writeFileSync(f, JSON.stringify(cfgVariante(v))); filas.push({ grupo: 'nueva', ...mide(`${v[0]} · ${v[1]}`, ['--frames', '0-59', '--config', f, '--tiempos', tj]) }); }
console.log('\nReferencia sin 3D (REMOTION_SIN3D=1: solo arranque, textos, subtítulos y efectos)');
{ const f = path.join(tmp, 'sin3d.json'); fs.writeFileSync(f, JSON.stringify(cfgVariante(VARIANTES[0]))); filas.push({ grupo: 'sin3d', ...mide('sin 3D', ['--frames', '0-59', '--config', f, '--tiempos', tj], { REMOTION_SIN3D: '1' }) }); }
console.log('\nPlantilla de GTA 6 (60 cuadros desde el inicio de la primera toma de cada decorado)');
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'plantilla/src/video.config.json'), 'utf8')); const TG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'plantilla/src/tiempos.json'), 'utf8'));
const orden = [...new Set(cfg.tomas.map((t) => t.frase))]; const vistos = new Set();
orden.forEach((id, pi) => { const t0 = pi === 0 ? 0 : TG.frases[pi].ini - 0.05; const t1 = pi === orden.length - 1 ? TG.dur : TG.frases[pi + 1].ini - 0.05;
  const propias = cfg.tomas.filter((t) => t.frase === id); propias.forEach((t, k) => { if (k === 0 && !vistos.has(t.decorado)) { vistos.add(t.decorado);
    const ini = Math.round((t0 + (k / propias.length) * (t1 - t0)) * 30); filas.push({ grupo: 'gta', ...mide(`GTA 6 · ${t.decorado} (cuadros ${ini}-${ini + 59})`, ['--frames', `${ini}-${ini + 59}`]) }); } }); });
if (salidaJson) fs.writeFileSync(salidaJson, JSON.stringify({ maquina: { nucleos: os.cpus().length }, repeticiones: REP, filas }, null, 2));
fs.rmSync(tmp, { recursive: true, force: true }); console.log('\nlisto');
