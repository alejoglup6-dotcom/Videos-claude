// Genera las miniaturas (PNG 256x256) de todos los modelos del catálogo y una hoja con etiquetas.
// Uso: node scripts/biblioteca/miniaturas.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ } from '../comun.mjs';

const BASE = path.join(RAIZ, 'public/modelos'); const cat = JSON.parse(fs.readFileSync(path.join(BASE, 'catalogo.json'), 'utf8'));
const modelos = cat.modelos.filter((m) => m.tipo !== 'animacion'); const columnas = 7, celda = 256;
fs.mkdirSync(path.join(RAIZ, 'build'), { recursive: true });
const render = (etiquetas, salida) => {
  const props = path.join(RAIZ, 'build/miniaturas.props.json'); fs.writeFileSync(props, JSON.stringify({ modelos: modelos.map((m) => ({ nombre: m.nombre, archivo: m.archivo })), columnas, celda, etiquetas }));
  const r = spawnSync('npx', ['remotion', 'still', 'src/index.ts', 'Miniaturas', salida, `--props=${props}`, '--frame=0', '--gl=swangle', '--log=error', '--timeout=120000'], { cwd: RAIZ, stdio: 'inherit' });
  if (r.status !== 0) { console.error('✗ falló el render de miniaturas'); process.exit(1); }
};
const hoja = path.join(RAIZ, 'build/hoja-limpia.png'); render(false, hoja); render(true, path.join(BASE, 'miniaturas-hoja.png'));
const py = `import sys,os\nfrom PIL import Image\nim=Image.open(sys.argv[1]); c=${columnas}; s=${celda}\nfor i,(car,n) in enumerate(${JSON.stringify(modelos.map((m) => [m.archivo.split('/')[0], m.nombre]))}):\n    x,y=(i%c)*s,(i//c)*s; im.crop((x,y,x+s,y+s)).save(os.path.join(${JSON.stringify(BASE)},car,n+'.png'),optimize=True)\n`;
const r = spawnSync('python3', ['-I', '-c', py, hoja], { stdio: 'inherit' }); if (r.status !== 0) process.exit(1);
console.log(`✔ ${modelos.length} miniaturas + public/modelos/miniaturas-hoja.png`);
