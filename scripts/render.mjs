// Renderiza un guion a MP4 (H.264, 1080x1920, 30 fps) y lo normaliza (-14 LUFS) con faststart.
// Uso: node scripts/render.mjs <guion> [--calidad rapido|normal|alta] [--frames 0-60] [--salida out/x.mp4] [--concurrencia N]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ, leerGuion } from './comun.mjs';
import { validar } from './validar-guion.mjs';

const args = process.argv.slice(2); const nombre = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!nombre) { console.error('Uso: node scripts/render.mjs <guion> [--calidad rapido|normal|alta] [--frames a-b] [--salida ruta] [--concurrencia N]'); process.exit(2); }
const calidad = opt('calidad', 'normal'); if (!['rapido', 'normal', 'alta'].includes(calidad)) { console.error('calidad debe ser rapido, normal o alta'); process.exit(2); }
const { guion } = leerGuion(nombre);
const v = validar(guion); v.av.forEach((a) => console.log('⚠ ' + a)); if (v.err.length) { v.err.forEach((e) => console.error('✗ ' + e)); process.exit(1); }

const vozJson = path.join(RAIZ, 'public/audio', guion.id, 'voz.json');
if (fs.existsSync(vozJson)) guion._voces = JSON.parse(fs.readFileSync(vozJson, 'utf8'));
for (const [id, x] of Object.entries(guion._voces ?? {})) if (!fs.existsSync(path.join(RAIZ, 'public', x.archivo))) { console.error(`Falta el audio de voz ${x.archivo}`); process.exit(1); }
if (guion.audio?.musica?.generar && !fs.existsSync(path.join(RAIZ, 'public/audio', guion.id, 'musica.wav'))) { console.error('Falta la música: ejecuta antes node scripts/generar-audio.mjs ' + guion.id); process.exit(1); }
guion._calidad = calidad;

fs.mkdirSync(path.join(RAIZ, 'build'), { recursive: true }); fs.mkdirSync(path.join(RAIZ, 'out'), { recursive: true });
const props = path.join(RAIZ, 'build', `${guion.id}.props.json`); fs.writeFileSync(props, JSON.stringify(guion));
const crudo = path.join(RAIZ, 'build', `${guion.id}.crudo.mp4`); const final = path.resolve(opt('salida', path.join(RAIZ, 'out', `${guion.id}.mp4`)));
const run = (cmd, a) => { const r = spawnSync(cmd, a, { stdio: 'inherit', cwd: RAIZ }); if (r.status !== 0) { console.error(`\n✗ Falló: ${cmd} ${a.slice(0, 3).join(' ')}… (código ${r.status})`); process.exit(r.status || 1); } };

const t0 = Date.now();
const ra = ['remotion', 'render', 'src/index.ts', 'VideoVertical', crudo, `--props=${props}`, '--gl=swangle', '--codec=h264', '--crf=20', '--pixel-format=yuv420p', '--image-format=jpeg', '--jpeg-quality=92', '--color-space=bt709', '--log=info'];
if (opt('concurrencia')) ra.push(`--concurrency=${opt('concurrencia')}`);
if (opt('frames')) ra.push(`--frames=${opt('frames')}`);
run('npx', ra);
console.log(`\nRender crudo: ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// normalización de volumen (2 pasadas loudnorm, objetivo -14 LUFS para redes) + faststart; el video no se vuelve a codificar
const ff = (a) => spawnSync('npx', ['remotion', 'ffmpeg', ...a], { encoding: 'utf8', cwd: RAIZ });
const an = ff(['-hide_banner', '-i', crudo, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-vn', '-f', 'null', '-']);
const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(an.stderr || '');
let af = 'loudnorm=I=-14:TP=-1.5:LRA=11';
const j = m ? JSON.parse(m[0]) : null;
if (j && Number.isFinite(Number(j.input_i)) && Number(j.input_i) > -70) { af = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`; }
else console.warn('⚠ No pude medir el volumen (audio casi mudo o muy corto); uso loudnorm de una pasada');
run('npx', ['remotion', 'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', crudo, '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', final]);
console.log(`\n✔ ${final}  (${(fs.statSync(final).size / 1e6).toFixed(1)} MB, total ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
