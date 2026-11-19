#!/usr/bin/env node
// Valida un video.config.json contra los tiempos de la voz ANTES de renderizar (un render completo tarda minutos).
//   node herramientas/validar_config.mjs [--config ruta] [--tiempos ruta] [--ejemplo villaluna] [--proyecto ruta]
// Sin opciones valida plantilla/src/video.config.json con plantilla/src/tiempos.json.
// ERROR = el render fallaría o saldría mal; AVISO = probablemente no es lo que quieres. Código de salida 1 si hay errores.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cargarProps } from './props.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const limpia = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const esNum = (x) => typeof x === 'number' && Number.isFinite(x);
const esV3 = (v) => Array.isArray(v) && v.length === 3 && v.every(esNum);

// Lee del registro DECORADOS de decorados.tsx qué decorados y variantes existen (una línea por decorado).
export function leerDecorados(proyecto) {
  const txt = fs.readFileSync(path.join(proyecto, 'src', 'escena3d', 'decorados.tsx'), 'utf8');
  const bloque = txt.slice(txt.indexOf('export const DECORADOS'));
  const out = {};
  for (const m of bloque.matchAll(/^\s{2}(\w+): \{ variantes: \[([^\]]*)\]/gm)) out[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  if (!Object.keys(out).length) throw new Error('No pude leer el registro DECORADOS de decorados.tsx');
  return out;
}
// Decorados que leen "datos": [números] de la toma (los marca usaDatos: true en el registro).
export function leerUsaDatos(proyecto) {
  const txt = fs.readFileSync(path.join(proyecto, 'src', 'escena3d', 'decorados.tsx'), 'utf8');
  return new Set([...txt.slice(txt.indexOf('export const DECORADOS')).matchAll(/^\s{2}(\w+): \{ variantes: \[[^\]]*\], usaDatos: true/gm)].map((m) => m[1]));
}
// Cuántos números pide cada variante de un decorado con datos: [mínimo, máximo].
const REGLAS_DATOS = { barras: [1, 10], cifra: [1, 1], ascenso: [2, 12] };

export function validar(config, tiempos, { camaras, decorados, usaDatos = new Set(), minToma = 0.6 }) {
  const errores = []; const avisos = [];
  const E = (m) => errores.push(m); const A = (m) => avisos.push(m);
  if (!config || typeof config !== 'object') { E('La configuración no es un objeto JSON.'); return { errores, avisos }; }
  if (config.version !== 1) E(`"version" debe ser 1 (es ${JSON.stringify(config.version)}).`);
  if (!esNum(tiempos?.dur) || tiempos.dur <= 0) E('tiempos.json: "dur" debe ser un número mayor que 0.');
  if (!Array.isArray(tiempos?.frases) || !tiempos.frases.length) { E('tiempos.json: falta la lista "frases".'); return { errores, avisos }; }
  const frasesT = tiempos.frases;
  frasesT.forEach((f, i) => {
    if (!Array.isArray(f.palabras) || !f.palabras.length) return E(`tiempos.json: la frase ${f.id} no tiene palabras.`);
    for (let k = 1; k < f.palabras.length; k++) if (!(f.palabras[k].s >= f.palabras[k - 1].s)) { E(`tiempos.json: en ${f.id} los tiempos de las palabras no crecen (palabra ${k + 1}).`); break; }
    if (i && !(f.ini > frasesT[i - 1].ini)) E(`tiempos.json: la frase ${f.id} empieza antes que la anterior.`);
  });
  if (!Array.isArray(config.pildoras) || !config.pildoras.length) E('"pildoras" debe ser una lista con al menos un color.');
  else config.pildoras.forEach((c, i) => { if (!HEX.test(c)) E(`pildoras[${i}]: «${c}» no es un color #RRGGBB.`); });
  if (!Array.isArray(config.tomas) || !config.tomas.length) { E('"tomas" debe ser una lista con al menos una toma.'); return { errores, avisos }; }
  const tomas = config.tomas; const idsT = frasesT.map((f) => f.id);

  // --- tomas ---
  tomas.forEach((t, i) => {
    const n = `toma ${i}`;
    if (!idsT.includes(t.frase)) E(`${n}: la frase «${t.frase}» no existe en tiempos.json (hay: ${idsT.join(', ')}).`);
    if (!(t.decorado in decorados)) E(`${n}: el decorado «${t.decorado}» no existe (hay: ${Object.keys(decorados).join(', ')}).`);
    else {
      const v = decorados[t.decorado];
      if (t.variante !== undefined) {
        if (!v.length) E(`${n}: el decorado «${t.decorado}» no tiene variantes y la toma pide «${t.variante}».`);
        else if (!v.includes(t.variante)) E(`${n}: el decorado «${t.decorado}» no tiene la variante «${t.variante}» (hay: ${v.join(', ')}).`);
      }
    }
    if (usaDatos.has(t.decorado)) {
      const [mn, mx] = REGLAS_DATOS[t.variante ?? Object.keys(REGLAS_DATOS)[0]] ?? [1, 12];
      if (!Array.isArray(t.datos)) E(`${n}: el decorado «${t.decorado}» necesita "datos": [números] (${mn === mx ? mn : mn + ' a ' + mx} valor(es) para «${t.variante ?? 'barras'}»).`);
      else if (!t.datos.every((x) => esNum(x) && x >= 0)) E(`${n}: "datos" solo admite números ≥ 0.`);
      else if (t.datos.length < mn || t.datos.length > mx) E(`${n}: «${t.variante ?? 'barras'}» pide ${mn === mx ? mn : mn + ' a ' + mx} valor(es) en "datos" y hay ${t.datos.length}.`);
      else if (t.variante === 'cifra' && t.datos[0] > 99999999) E(`${n}: la cifra ${t.datos[0]} no cabe en pantalla (máximo 8 dígitos).`);
    } else if (t.datos !== undefined) A(`${n}: el decorado «${t.decorado}» no usa "datos"; se ignorarán.`);
    if (typeof t.camara === 'string') {
      const c = camaras[t.camara];
      if (!c) E(`${n}: la cámara «${t.camara}» no existe en camaras.json (hay: ${Object.keys(camaras).join(', ')}).`);
      else if (c.para && t.decorado in decorados && !c.para.includes(t.decorado)) A(`${n}: la cámara «${t.camara}» está pensada para ${c.para.join('/')} y se usa con «${t.decorado}»; puede encuadrar mal.`);
    } else if (t.camara && typeof t.camara === 'object') {
      if (!esV3(t.camara.pos)) E(`${n}: camara.pos debe ser [x, y, z] numérico.`);
      if (!esV3(t.camara.mira)) E(`${n}: camara.mira debe ser [x, y, z] numérico.`);
      if (!esNum(t.camara.fov) || t.camara.fov < 10 || t.camara.fov > 120) E(`${n}: camara.fov debe estar entre 10 y 120 (es ${t.camara.fov}).`);
      if (!esNum(t.camara.empuje) || t.camara.empuje < 0) E(`${n}: camara.empuje debe ser un número ≥ 0.`);
    } else E(`${n}: falta "camara" (un nombre de camaras.json o {pos, mira, fov, empuje}).`);
    if (!t.texto || typeof t.texto.txt !== 'string' || !t.texto.txt.trim()) E(`${n}: texto.txt vacío o ausente.`);
    else if (t.texto.txt.length > 20) A(`${n}: el texto «${t.texto.txt}» es largo (${t.texto.txt.length} letras); se encogerá mucho para caber.`);
    if (t.texto && !HEX.test(t.texto.color ?? '')) E(`${n}: texto.color «${t.texto?.color}» no es un color #RRGGBB.`);
    if (t.texto?.tam !== undefined && (!esNum(t.texto.tam) || t.texto.tam < 30 || t.texto.tam > 300)) E(`${n}: texto.tam debe ser un número entre 30 y 300 (es ${JSON.stringify(t.texto.tam)}).`);
    if (t.texto?.sub !== undefined && (typeof t.texto.sub !== 'string' || !t.texto.sub.trim())) E(`${n}: texto.sub debe ser un texto no vacío (o quitarlo).`);
  });

  // --- orden y cobertura de frases (crearTomas asigna las frases de tiempos.json en el orden en que aparecen) ---
  const orden = []; tomas.forEach((t) => { if (!orden.includes(t.frase)) orden.push(t.frase); });
  const cerradas = new Set();
  tomas.forEach((t, i) => { if (i && t.frase !== tomas[i - 1].frase) cerradas.add(tomas[i - 1].frase); if (cerradas.has(t.frase)) E(`toma ${i}: la frase «${t.frase}» reaparece separada de sus otras tomas (deben ir juntas).`); });
  idsT.forEach((id) => { if (!orden.includes(id)) E(`la frase «${id}» de tiempos.json no tiene ninguna toma: quedaría sin imagen propia.`); });
  const mismoOrden = orden.length === idsT.length && orden.every((id, i) => id === idsT[i]);
  if (!mismoOrden && orden.every((id) => idsT.includes(id)) && idsT.every((id) => orden.includes(id))) E(`el orden de las frases en las tomas (${orden.join(', ')}) no coincide con el de tiempos.json (${idsT.join(', ')}).`);

  // --- duración de cada toma (mismo reparto que crearTomas) ---
  if (mismoOrden && esNum(tiempos.dur)) orden.forEach((id, pi) => {
    const t0 = pi === 0 ? 0 : frasesT[pi].ini - 0.05; const t1 = pi === orden.length - 1 ? tiempos.dur : frasesT[pi + 1].ini - 0.05;
    const n = tomas.filter((t) => t.frase === id).length; const d = (t1 - t0) / n;
    if (d <= 0) E(`frase «${id}»: no hay tiempo para sus ${n} toma(s).`);
    else if (d < minToma) A(`frase «${id}»: ${n} toma(s) de ${d.toFixed(2)} s cada una; menos de ${minToma} s se siente como un parpadeo (baja el número de tomas).`);
  });

  // --- etiqueta ---
  const q = config.etiqueta;
  if (q !== null && q !== undefined) {
    if (typeof q.txt !== 'string' || !q.txt.trim()) E('etiqueta.txt vacío (usa null si no quieres etiqueta).');
    const d = q.desdeToma ?? 0, h = q.hastaToma ?? tomas.length - 1;
    for (const [k, v] of [['desdeToma', d], ['hastaToma', h]]) if (!Number.isInteger(v) || v < 0 || v >= tomas.length) E(`etiqueta.${k} = ${v} no es una toma válida (0 a ${tomas.length - 1}).`);
    if (Number.isInteger(d) && Number.isInteger(h) && d > h) E(`etiqueta: desdeToma (${d}) es mayor que hastaToma (${h}).`);
  } else if (q === undefined) A('Falta "etiqueta" (usa null para no mostrar ninguna).');

  // --- palabras clave de los subtítulos ---
  for (const [id, v] of Object.entries(config.frases ?? {})) {
    const f = frasesT.find((x) => x.id === id);
    if (!f) { E(`frases.${id}: no existe en tiempos.json.`); continue; }
    if (!Array.isArray(v?.claves)) { E(`frases.${id}.claves debe ser una lista.`); continue; }
    const pal = new Set(f.palabras.map((p) => limpia(p.w)));
    for (const c of v.claves) {
      if (c !== limpia(c)) A(`frases.${id}: la clave «${c}» debe ir en minúsculas y sin signos (sería «${limpia(c)}»); así nunca coincide.`);
      else if (!pal.has(c)) A(`frases.${id}: la clave «${c}» no aparece en la frase; no se resaltará.`);
    }
  }
  idsT.forEach((id) => { if (!config.frases?.[id]?.claves?.length) A(`frases.${id}: sin palabras clave; sus subtítulos no llevarán píldoras de color.`); });
  return { errores, avisos };
}

export function cargarCamaras(proyecto) { return JSON.parse(fs.readFileSync(path.join(proyecto, 'src', 'camaras.json'), 'utf8')); }

// ---------- línea de comandos ----------
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const a = process.argv.slice(2); const arg = (n) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  const proyecto = path.resolve(arg('proyecto') || process.env.VIDEO3D_PROYECTO || path.join(AQUI, '..', 'plantilla'));
  const { config, tiempos } = cargarProps({ config: arg('config'), tiempos: arg('tiempos'), ejemplo: arg('ejemplo') }, proyecto, path.join(AQUI, '..'));
  const { errores, avisos } = validar(config, tiempos, { camaras: cargarCamaras(proyecto), decorados: leerDecorados(proyecto), usaDatos: leerUsaDatos(proyecto) });
  for (const m of errores) console.log('  ERROR ' + m);
  for (const m of avisos) console.log('  AVISO ' + m);
  console.log(`${config.tomas?.length ?? 0} toma(s) · ${errores.length} error(es) · ${avisos.length} aviso(s)${errores.length ? ' → NO renderizar todavía' : ' → listo para renderizar'}`);
  process.exit(errores.length ? 1 : 0);
}
