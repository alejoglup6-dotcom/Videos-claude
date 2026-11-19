#!/usr/bin/env node
// Genera un video.config.json BORRADOR a partir de voz/tiempos.json: reparte las tomas por duración, elige decorados y
// cámaras de la biblioteca y saca textos y palabras clave del propio guion. Después lo validas y lo retocas a mano.
//   node herramientas/nuevo_video.mjs [--tiempos voz/tiempos.json] [--salida video.config.json] [--decorados apto,bahia]
//        [--toma-seg 1.8] [--etiqueta "100% FICCIÓN"] [--forzar] [--proyecto ruta]
// --decorados: lista (se reparte una por frase, en rotación). Con un decorado que tiene variantes, las tomas recorren sus variantes.
// No sobrescribe un archivo existente sin --forzar. Al terminar ejecuta el validador.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar, leerDecorados, cargarCamaras } from './validar_config.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DECORADOS_POR_DEFECTO = 'apto,bahia';
const PALETA = ['#FFFFFF', '#FFE86A', '#FF4FA8', '#44E6FF', '#7CFF3A'];
const PILDORAS = ['#FF2E93', '#1FB6FF', '#FF8A1F', '#25C98B'];
const SIN_PESO = new Set('para pero como esta este esto esos esas unos unas sobre entre desde hasta cuando donde porque también tiene tienen todo todos todas cada otro otra otros otras sido está están'.split(' '));
const limpia = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const MIN_TOMA = 0.7;

// Función pura (la usa la prueba): devuelve { config, resumen }.
export function generar(tiempos, { decorados, camaras, listaDecorados, tomaSeg = 1.8, etiqueta = null }) {
  for (const d of listaDecorados) if (!(d in decorados)) throw new Error(`El decorado «${d}» no existe (hay: ${Object.keys(decorados).join(', ')}).`);
  const F = tiempos.frases; const tomas = []; const frases = {}; const resumen = []; let colorI = 0; let camI = 0;
  F.forEach((f, pi) => {
    const t0 = pi === 0 ? 0 : f.ini - 0.05; const t1 = pi === F.length - 1 ? tiempos.dur : F[pi + 1].ini - 0.05;
    const dur = t1 - t0; const n = Math.max(1, Math.min(Math.round(dur / tomaSeg), Math.floor(dur / MIN_TOMA)));
    const dec = listaDecorados[pi % listaDecorados.length]; const vars = decorados[dec];
    const cams = Object.keys(camaras).filter((k) => (camaras[k].para ?? []).includes(dec));
    if (!cams.length) throw new Error(`No hay cámaras para el decorado «${dec}» en camaras.json (agrega una con "para": ["${dec}"]).`);
    // palabras con peso: las más largas del guion, en orden de aparición para desempatar
    const cand = f.palabras.map((p, i) => ({ w: p.w.replace(/[.,:;¿?¡!…"]/g, ''), l: limpia(p.w), i }))
      .filter((p) => p.l.length >= 4 && !SIN_PESO.has(p.l)).sort((a, b) => b.l.length - a.l.length || a.i - b.i);
    const usar = cand.length ? cand : [{ w: f.palabras[0].w.replace(/[.,:;¿?¡!…"]/g, ''), l: limpia(f.palabras[0].w), i: 0 }];
    frases[f.id] = { claves: [...new Set(usar.slice(0, 3).map((p) => p.l))] };
    for (let k = 0; k < n; k++) {
      const t = { frase: f.id, decorado: dec };
      if (vars.length) t.variante = vars[k % vars.length];
      t.camara = cams[camI++ % cams.length];
      t.texto = { txt: usar[k % usar.length].w.toUpperCase(), color: PALETA[colorI++ % PALETA.length] };
      tomas.push(t);
    }
    resumen.push({ id: f.id, decorado: dec, tomas: n, seg: +(dur / n).toFixed(2) });
  });
  const config = { version: 1, titulo: 'Borrador generado: retócalo', etiqueta: etiqueta ? { txt: etiqueta } : null, pildoras: PILDORAS, frases, tomas };
  return { config, resumen };
}

const compacto = (obj) => JSON.stringify(obj, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, a) => '[' + a.replace(/\s*\n\s*/g, ' ') + ']') + '\n';

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const a = process.argv.slice(2); const arg = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
  const fallo = (m) => { console.error('ERROR: ' + m); process.exit(2); };
  const proyecto = path.resolve(arg('proyecto', process.env.VIDEO3D_PROYECTO || path.join(AQUI, '..', 'plantilla')));
  const rt = path.resolve(arg('tiempos', 'voz/tiempos.json')); const salida = path.resolve(arg('salida', 'video.config.json'));
  if (!fs.existsSync(rt)) fallo(`no existe ${rt}. Genera antes la voz (voz_elevenlabs.py) o usa --tiempos ruta.`);
  if (fs.existsSync(salida) && !a.includes('--forzar')) fallo(`${salida} ya existe; usa --forzar para sobrescribirlo (se pierde lo que tenga).`);
  const tomaSeg = Number(arg('toma-seg', 1.8)); if (!(tomaSeg >= 0.8 && tomaSeg <= 6)) fallo('--toma-seg debe estar entre 0.8 y 6 (segundos por toma).');
  let tiempos; try { tiempos = JSON.parse(fs.readFileSync(rt, 'utf8')); } catch (e) { fallo(`${rt} no es JSON válido: ${e.message}`); }
  if (!Array.isArray(tiempos.frases) || !tiempos.frases.length || !(tiempos.dur > 0)) fallo(`${rt} no parece un tiempos.json (faltan "dur" o "frases").`);
  const camaras = cargarCamaras(proyecto), decorados = leerDecorados(proyecto);
  let r; try { r = generar(tiempos, { decorados, camaras, listaDecorados: arg('decorados', DECORADOS_POR_DEFECTO).split(',').map((s) => s.trim()).filter(Boolean), tomaSeg, etiqueta: arg('etiqueta') || null }); } catch (e) { fallo(e.message); }
  fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, compacto(r.config));
  console.log(`Borrador escrito en ${salida}`); for (const x of r.resumen) console.log(`  ${x.id}: ${x.decorado} · ${x.tomas} toma(s) de ${x.seg} s`);
  const v = validar(r.config, tiempos, { camaras, decorados });
  for (const m of v.errores) console.log('  ERROR ' + m); for (const m of v.avisos) console.log('  AVISO ' + m);
  console.log(`Validación: ${v.errores.length} error(es), ${v.avisos.length} aviso(s). Siguiente: retoca textos y cámaras, y renderiza con  node herramientas/render.mjs --config ${path.relative(process.cwd(), salida) || salida} --tiempos ${path.relative(process.cwd(), rt) || rt}`);
  process.exit(v.errores.length ? 1 : 0);
}
