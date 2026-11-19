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
export const SFX = ['impacto', 'riser_corto', 'riser', 'whoosh', 'glitch', 'suave', 'ping'];
