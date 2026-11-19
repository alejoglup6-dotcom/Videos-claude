#!/usr/bin/env node
// Render rápido con modos y acabado (grano + viñeta) en ffmpeg.
//   node herramientas/render.mjs --modo borrador|normal|final [--frames 0-59] [--salida salida/render.mp4] [--sin-post] [--concurrencia N]
// borrador: 540×960 y 3D al 50 % (≈4× más rápido, para revisar movimiento y tiempos)
// normal:   1080×1920, 3D al 75 % sin antialias (el texto y los efectos van a resolución completa)
// final:    1080×1920, 3D al 100 % con antialias
import { spawnSync, spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';

const a = process.argv.slice(2); const arg = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const modo = arg('modo', 'normal'); const frames = arg('frames', ''); const salida = arg('salida', 'salida/render.mp4');
const post = !a.includes('--sin-post');
const cores = os.cpus().length; const conc = Number(arg('concurrencia', Math.max(1, cores - 1)));
const M = { borrador: { esc: '0.5', aa: '0', scale: '0.5' }, normal: { esc: '0.75', aa: '0', scale: '1' }, final: { esc: '1', aa: '1', scale: '1' } }[modo];
if (!M) { console.error('modo: borrador | normal | final'); process.exit(2); }
const nav = process.env.NAVEGADOR || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
fs.mkdirSync(salida.split('/').slice(0, -1).join('/') || '.', { recursive: true });
const bruto = post ? salida.replace(/\.mp4$/, '_bruto.mp4') : salida;
const args = ['remotion', 'render', 'src/index.ts', 'Video', bruto, '--codec', 'h264', '--crf', '18', '--color-space=bt709', '--muted', '--gl=swangle', `--concurrency=${conc}`, `--scale=${M.scale}`];
if (frames) args.push(`--frames=${frames}`); if (nav) args.push(`--browser-executable=${nav}`);
const env = { ...process.env, REMOTION_ESCALA3D: M.esc, REMOTION_AA: M.aa };
const t0 = Date.now();
console.log(`modo ${modo} · 3D ${Number(M.esc) * 100}% · concurrencia ${conc}${frames ? ' · cuadros ' + frames : ''}`);
const p = spawn('npx', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
let ult = 0; const pasa = (b) => { const s = b.toString(); const m = [...s.matchAll(/Rendered (\d+)\/(\d+)/g)].pop(); if (m && Date.now() - ult > 15000) { ult = Date.now(); console.log(`  ${m[1]}/${m[2]} cuadros · ${((Date.now() - t0) / 1000).toFixed(0)} s`); } };
p.stdout.on('data', pasa); p.stderr.on('data', pasa);
p.on('close', (code) => {
  if (code) { console.error('Falló el render (código ' + code + ')'); process.exit(code); }
  const tr = (Date.now() - t0) / 1000;
  if (post) {
    // acabado: viñeta suave + grano fino (gratis en ffmpeg; en el navegador costaba ~13 s de cada 44)
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', bruto, '-vf', 'vignette=PI/4.6,noise=alls=3:allf=t', '-c:v', 'libx264', '-crf', '20', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', salida]);
    if (r.status) { console.error('Falló el acabado'); process.exit(1); }
  }
  console.log(`listo: ${salida} · render ${tr.toFixed(0)} s · total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
});
