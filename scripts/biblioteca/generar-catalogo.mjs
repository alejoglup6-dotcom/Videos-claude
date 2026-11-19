// Genera los metadatos JSON de cada modelo de la biblioteca y public/modelos/catalogo.json, y VALIDA que cada modelo tenga archivo, licencia y fuente.
// Uso: node scripts/biblioteca/generar-catalogo.mjs        (sale con error si falta algo)
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../comun.mjs';

const BASE = path.join(RAIZ, 'public/modelos');
const CC0 = 'CC0 1.0 Universal (dominio público)';
const PACKS = {
  ubc: { licencia: CC0, licencia_archivo: 'licencias/quaternius-universal-base-characters_License_Standard.txt', fuente: 'Quaternius — Universal Base Characters (versión Standard gratuita) · https://quaternius.itch.io/universal-base-characters · https://quaternius.com/packs/universalbasecharacters.html' },
  ual: { licencia: CC0, licencia_archivo: 'licencias/quaternius-universal-animation-library_License.txt', fuente: 'Quaternius — Universal Animation Library (Standard) · https://quaternius.itch.io/universal-animation-library' },
  dt: { licencia: CC0, licencia_archivo: 'licencias/quaternius-downtown-city-megakit_License_Standard.txt', fuente: 'Quaternius — Downtown City MegaKit (versión Standard gratuita) · https://quaternius.itch.io/downtown-city-megakit' },
  cars: { licencia: CC0, licencia_archivo: 'licencias/quaternius-lowpoly-cars_License.txt', fuente: 'Quaternius — LowPoly Cars (Realistic Car Pack, nov. 2018) · https://quaternius.itch.io/lowpoly-cars' },
  street: { licencia: CC0, licencia_archivo: 'licencias/quaternius-lowpoly-modular-street_CC0.txt', fuente: 'Quaternius — LowPoly Modular Street · https://quaternius.itch.io/lowpoly-modular-street' },
  trees: { licencia: CC0, licencia_archivo: 'licencias/quaternius-textured-stylized-trees_License.txt', fuente: 'Quaternius — Textured LowPoly Trees (Textured Stylized Trees, mayo 2020) · https://quaternius.itch.io/textured-lowpoly-trees' },
};
const ATRIB = 'No requerida (CC0). Crédito de cortesía: Quaternius (https://quaternius.com).';
// [carpeta, nombre, extensión, tipo, pack, notas]
const M = [
  ['personajes', 'Superhero_Male_FullBody', 'gltf', 'personaje', 'ubc', 'Cuerpo masculino orgánico con esqueleto humanoide (65 huesos), manos y rostro. Viene en ropa interior: la ropa se colorea por código (src/three/Personaje.tsx). Proporciones «Superhero» (anchas).'],
  ['personajes', 'Superhero_Female_FullBody', 'gltf', 'personaje', 'ubc', 'Cuerpo femenino orgánico con esqueleto humanoide, manos y rostro. Viene en ropa interior: la ropa se colorea por código.'],
  ['personajes', 'Hair_SimpleParted', 'gltf', 'personaje', 'ubc', 'Peinado (malla estática). Se coloca sobre la cabeza del personaje masculino.'],
  ['personajes', 'Hair_Beard', 'gltf', 'personaje', 'ubc', 'Barba (malla estática).'],
  ['personajes', 'Hair_Long', 'gltf', 'personaje', 'ubc', 'Peinado largo (malla estática) para el personaje femenino.'],
  ['animaciones', 'caminar-y-reposo', 'glb', 'animacion', 'ual', 'Clips: Walk_Loop, Walk_Formal_Loop, Idle_Loop, Idle_Talking_Loop, Jog_Fwd_Loop. Solo animación (sin malla); los huesos tienen los mismos nombres que los de Universal Base Characters.'],
  ['autos', 'Taxi', 'glb', 'auto', 'cars', 'Low-poly con carrocería, ventanas, ruedas y faros. Convertido de OBJ/MTL a GLB (colores planos → PBR). Lleva un letrero genérico «TAXI», sin marca.'],
  ['autos', 'SportsCar', 'glb', 'auto', 'cars', 'Deportivo low-poly. Convertido de OBJ/MTL a GLB.'],
  ['autos', 'SportsCar2', 'glb', 'auto', 'cars', 'Deportivo low-poly. Convertido de OBJ/MTL a GLB.'],
  ['autos', 'NormalCar1', 'glb', 'auto', 'cars', 'Sedán low-poly. Convertido de OBJ/MTL a GLB.'],
  ['autos', 'NormalCar2', 'glb', 'auto', 'cars', 'Compacto low-poly. Convertido de OBJ/MTL a GLB.'],
  ['autos', 'SUV', 'glb', 'auto', 'cars', 'SUV low-poly. Convertido de OBJ/MTL a GLB.'],
  ['autos', 'Cop', 'glb', 'auto', 'cars', 'Patrulla genérica (sin escudos ni marcas). Convertida de OBJ/MTL a GLB. El «Cop SUV» del pack es exclusivo de Patreon y no se incluye.'],
  ['edificios', 'Building_Small_1', 'gltf', 'edificio', 'dt', 'Edificio completo de ladrillo con ventanas, interiores falsos, escalera de incendios y detalles. ~18 000 triángulos: usar de 1 a 3 cerca de la cámara.'],
  ['edificios', 'Building_Medium_2_001', 'gltf', 'edificio', 'dt', 'Edificio completo mediano con ventanas e interiores. ~25 600 triángulos: usar solo como protagonista.'],
  ['props', 'Streetlight_Single', 'glb', 'prop', 'street', 'Farola. Mide ~1 m: escala sugerida 5. Convertida de OBJ a GLB.'],
  ['props', 'Streetlight_Double', 'glb', 'prop', 'street', 'Farola doble. Escala sugerida 5.'],
  ['props', 'Streetlight_Triple', 'glb', 'prop', 'street', 'Farola triple. Escala sugerida 5.'],
  ['props', 'TrafficLight', 'glb', 'prop', 'street', 'Semáforo. Escala sugerida 5.'],
  ['props', 'TrafficLight_2', 'glb', 'prop', 'street', 'Semáforo con brazo. Escala sugerida 5.'],
  ['props', 'Sign_Stop', 'glb', 'prop', 'street', 'Señal de alto genérica (sin texto de marca). Escala sugerida 5.'],
  ['props', 'Sign_NoParking', 'glb', 'prop', 'street', 'Señal de no estacionar. Escala sugerida 5.'],
  ['props', 'Sign_Triangle', 'glb', 'prop', 'street', 'Señal triangular. Escala sugerida 5.'],
  ['props', 'Tree_1', 'glb', 'prop', 'trees', 'Árbol low-poly (colores planos; las texturas del pack no se usan).'],
  ['props', 'Tree_3', 'glb', 'prop', 'trees', 'Árbol low-poly.'],
  ['props', 'Birch_1', 'glb', 'prop', 'trees', 'Abedul low-poly.'],
  ['props', 'Pine_1', 'glb', 'prop', 'trees', 'Pino low-poly.'],
  ['props', 'Prop_ACUnit', 'gltf', 'prop', 'dt', 'Unidad de aire acondicionado (136 triángulos).'],
  ['props', 'Prop_Bollard', 'gltf', 'prop', 'dt', 'Bolardo.'],
  ['props', 'Prop_Drain', 'gltf', 'prop', 'dt', 'Alcantarilla de calle (10 triángulos).'],
  ['props', 'Prop_ManholeCover', 'gltf', 'prop', 'dt', 'Tapa de registro.'],
  ['props', 'Prop_Planter_Single', 'gltf', 'prop', 'dt', 'Jardinera.'],
  ['props', 'Sidewalk_Straight_3m', 'gltf', 'prop', 'dt', 'Acera recta de 3 m con bordillo.'],
  ['props', 'Sidewalk_Corner_Round_3m', 'gltf', 'prop', 'dt', 'Esquina de acera redondeada.'],
  ['props', 'Sidewalk_NoCurb_3m', 'gltf', 'prop', 'dt', 'Acera sin bordillo.'],
  ['props', 'Street_2Lane', 'gltf', 'prop', 'dt', 'Tramo de calle de 2 carriles con acera.'],
  ['props', 'Decal_Crosswalk', 'gltf', 'prop', 'dt', 'Calcomanía de paso de peatones (2 triángulos).'],
];
const DESCARTADOS = [
  { nombre: 'Building_Large_2', motivo: 'Demasiado pesado: ~45 000 triángulos y 3,3 MB de geometría. Incumple la regla de rendimiento (render ≤ 10 min).', pack: 'dt' },
  { nombre: 'Modular Character Outfits - Fantasy (Peasant, Ranger)', motivo: 'Licencia CC0 verificada, pero es ropa medieval/fantasía y el pack pesa 294 MB; no encaja con una ciudad moderna.', pack: 'quaternius.itch.io/modular-character-outfits-fantasy' },
  { nombre: 'Kenney (kenney.nl), Poly Pizza, GitHub', motivo: 'Los sitios bloquean la descarga automática (HTTP 403) en este entorno; no se usó nada que no se pudiera verificar.' },
  { nombre: 'Quaternius en Google Drive', motivo: 'Drive devolvió «Quota exceeded»; se usaron las copias de itch.io del mismo autor.' },
];
const trianguloGltf = (ruta) => {
  const b = fs.readFileSync(ruta); let j;
  if (ruta.endsWith('.glb')) { const l = b.readUInt32LE(12); j = JSON.parse(b.toString('utf8', 20, 20 + l)); } else j = JSON.parse(b.toString('utf8'));
  let t = 0; for (const m of j.meshes ?? []) for (const p of m.primitives) if (p.indices !== undefined) t += j.accessors[p.indices].count / 3;
  return { t: Math.round(t), imgs: (j.images ?? []).map((i) => i.uri).filter(Boolean), bins: (j.buffers ?? []).map((x) => x.uri).filter(Boolean) };
};
const mb = (x) => Math.round((x / 1e6) * 1000) / 1000;
const errores = []; const catalogo = []; let total = 0;
for (const [car, nombre, ext, tipo, pk, notas] of M) {
  const rel = `${car}/${nombre}.${ext}`; const f = path.join(BASE, rel);
  if (!fs.existsSync(f)) { errores.push('Falta el archivo ' + rel); continue; }
  const P = PACKS[pk]; if (!fs.existsSync(path.join(BASE, P.licencia_archivo))) errores.push('Falta la licencia ' + P.licencia_archivo);
  const info = nombre === 'caminar-y-reposo' ? { t: 0, imgs: [], bins: [] } : trianguloGltf(f);
  let peso = fs.statSync(f).size; for (const b of info.bins) if (!b.startsWith('data:')) peso += fs.statSync(path.join(path.dirname(f), b)).size;
  let pesoTex = 0; const tex = [...new Set(info.imgs)]; for (const i of tex) { const r = path.join(path.dirname(f), i); if (fs.existsSync(r)) pesoTex += fs.statSync(r).size; else errores.push(`${rel}: falta la textura ${i}`); }
  const meta = { nombre, tipo, archivo: rel, licencia: P.licencia, licencia_archivo: P.licencia_archivo, fuente: P.fuente, peso_mb: mb(peso), atribucion: ATRIB, uso_permitido: true, notas, triangulos: info.t, texturas: tex, peso_texturas_mb: mb(pesoTex) };
  if (!P.fuente || !P.licencia) errores.push(rel + ': sin fuente o licencia');
  fs.writeFileSync(path.join(BASE, car, nombre + '.json'), JSON.stringify(meta, null, 2) + '\n'); catalogo.push(meta); total += peso;
}
// peso real total de la biblioteca en disco (modelos + texturas compartidas + miniaturas)
const pesoDir = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? pesoDir(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
const totalDisco = mb(pesoDir(BASE));
fs.writeFileSync(path.join(BASE, 'catalogo.json'), JSON.stringify({ generado: new Date().toISOString().slice(0, 10), total_modelos: catalogo.length, peso_total_mb: totalDisco, descartados: DESCARTADOS, modelos: catalogo }, null, 2) + '\n');
const porTipo = {}; for (const m of catalogo) porTipo[m.tipo] = (porTipo[m.tipo] ?? 0) + 1;
console.log(`${catalogo.length} modelos`, porTipo, `· peso total en disco ${totalDisco} MB`);
if (errores.length) { console.error('✗ ' + errores.join('\n✗ ')); process.exit(1); }
