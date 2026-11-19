import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const leerGuion = (nombre) => {
  const f = nombre.endsWith('.json') ? path.resolve(nombre) : path.join(RAIZ, 'guiones', nombre + '.json');
  if (!fs.existsSync(f)) throw new Error(`No existe el guion: ${f}. Guiones disponibles: ${fs.readdirSync(path.join(RAIZ, 'guiones')).filter((x) => x.endsWith('.json') && !x.includes('schema')).join(', ')}`);
  return { ruta: f, guion: JSON.parse(fs.readFileSync(f, 'utf8')) };
};
// extrae los nombres válidos del código fuente (así el validador nunca se desincroniza del registro)
export const catalogo = () => {
  const esc = fs.readFileSync(path.join(RAIZ, 'src/scenes/index.tsx'), 'utf8');
  const tipos = {};
  for (const m of esc.matchAll(/^\s{2}(\w+): \{ variantes: \[([^\]]*)\]/gm)) tipos[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const cam = fs.readFileSync(path.join(RAIZ, 'src/camaras.ts'), 'utf8');
  const camaras = [...cam.matchAll(/'([a-z0-9-]+)': c\(/g)].map((x) => x[1]);
  const th = fs.readFileSync(path.join(RAIZ, 'src/themes/index.ts'), 'utf8');
  const temas = [...th.matchAll(/^\s{2}'([a-z0-9-]+)': \{ nombre/gm)].map((x) => x[1]);
  return { tipos, camaras, temas };
};
export const TRANSICIONES = ['corte', 'flash', 'zoom', 'whip', 'glitch', 'fade', 'slide', 'camara_rapida'];
export const ESTILOS = ['slam', 'letras', 'glitch', 'neon', 'escribir'];
export const ELEMENTOS = ['lluvia', 'particulas', 'neon', 'lineas_velocidad'];
export const SFX = ['impacto', 'riser_corto', 'riser', 'whoosh', 'glitch', 'suave', 'ping', 'motor', 'agua', 'rugido', 'chirrido', 'cierre'];

import { execFileSync } from 'node:child_process';
/** Hash corto del commit (en Actions: GITHUB_SHA). Un «+» al final significa que hay cambios sin confirmar. */
export const versionGit = () => {
  try {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
    const sha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
    const sucio = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: RAIZ, encoding: 'utf8' }).trim() !== '';
    return sha + (sucio ? '+' : '');
  } catch { return 'sin-git'; }
};
/** Guion + voz (ElevenLabs ya generada si existe; si no, Piper) + calidad + versión = props que recibe Remotion. */
export const prepararProps = (nombre, calidad) => {
  const { guion } = leerGuion(nombre);
  const el = path.join(RAIZ, 'public/voces', guion.id, 'voz.json'); const pi = path.join(RAIZ, 'public/audio', guion.id, 'voz.json');
  if (fs.existsSync(el)) {
    const m = JSON.parse(fs.readFileSync(el, 'utf8')); guion._vozProveedor = `${m.proveedor} (${m.voz})`; guion._voces = {};
    for (const [id, x] of Object.entries(m.escenas)) guion._voces[id] = { archivo: m.archivo, duracion: x.duracion, desde: x.desde, hasta: x.hasta, palabras: x.palabras };
  } else if (fs.existsSync(pi)) { guion._vozProveedor = 'Piper'; guion._voces = JSON.parse(fs.readFileSync(pi, 'utf8')); }
  for (const x of Object.values(guion._voces ?? {})) if (!fs.existsSync(path.join(RAIZ, 'public', x.archivo))) throw new Error(`Falta el audio de voz ${x.archivo}`);
  if (guion.audio?.musica?.generar && !fs.existsSync(path.join(RAIZ, 'public/audio', guion.id, 'musica.wav'))) throw new Error('Falta la música: ejecuta antes node scripts/generar-audio.mjs ' + guion.id);
  guion._calidad = calidad; guion._version = versionGit();
  return guion;
};
