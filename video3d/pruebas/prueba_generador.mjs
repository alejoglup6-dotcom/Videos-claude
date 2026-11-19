#!/usr/bin/env node
// Prueba de herramientas/nuevo_video.mjs: el borrador generado es válido, cubre el guion y es reproducible; los errores de uso se rechazan.
//   node video3d/pruebas/prueba_generador.mjs [--con-render]     (--con-render además renderiza 3 cuadros con lo generado; tarda ~30 s)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generar } from '../herramientas/nuevo_video.mjs';
import { validar, leerDecorados, cargarCamaras } from '../herramientas/validar_config.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const PROYECTO = path.join(RAIZ, 'plantilla');
const camaras = cargarCamaras(PROYECTO), decorados = leerDecorados(PROYECTO);
const limpia = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
let fallas = 0; const ok = (c, m, extra = '') => { console.log(`  [${c ? 'OK' : 'FALLA'}] ${m}${!c && extra ? '  → ' + extra : ''}`); if (!c) fallas++; };
const cargar = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), 'utf8'));
const guiones = [['Villaluna (9,8 s, 3 frases)', cargar('ejemplos/villaluna/tiempos.json')], ['GTA 6 (35 s, 6 frases)', cargar('plantilla/src/tiempos.json')]];
const opts = { decorados, camaras, listaDecorados: ['apto', 'bahia'] };

for (const [nombre, T] of guiones) {
  console.log(`\n${nombre}`);
  const { config, resumen } = generar(T, opts); const v = validar(config, T, { camaras, decorados });
  ok(!v.errores.length && !v.avisos.length, 'el borrador pasa el validador sin errores ni avisos', [...v.errores, ...v.avisos].join(' | '));
  ok(T.frases.every((f) => config.tomas.some((t) => t.frase === f.id)), 'cada frase tiene al menos una toma');
  ok(resumen.every((r) => r.seg >= 0.7), 'ninguna toma dura menos de 0,7 s', JSON.stringify(resumen.map((r) => r.seg)));
  ok(config.tomas.every((t) => t.texto.txt.trim() && /^#[0-9A-F]{6}$/i.test(t.texto.color)), 'todas las tomas tienen texto y color');
  ok(T.frases.every((f) => (config.frases[f.id]?.claves ?? []).length > 0 && config.frases[f.id].claves.every((c) => f.palabras.some((p) => limpia(p.w) === c))), 'las palabras clave salen de cada frase');
  ok(JSON.stringify(generar(T, opts).config) === JSON.stringify(config), 'es reproducible (misma entrada, mismo resultado)');
  const corto = generar(T, { ...opts, tomaSeg: 4 }).config.tomas.length;
  ok(corto < config.tomas.length, `--toma-seg 4 da menos tomas que 1,8 (${corto} < ${config.tomas.length})`);
  const conVar = generar(T, { ...opts, listaDecorados: ['torre'] }); const vv = validar(conVar.config, T, { camaras, decorados });
  ok(!vv.errores.length && conVar.config.tomas.every((t) => ['base', 'cima', 'lanza', 'splat'].includes(t.variante)), 'con un decorado con variantes («torre») recorre sus variantes y valida', vv.errores.join(' | '));
}

console.log('\nErrores de uso');
const T = guiones[0][1];
const lanza = (f) => { try { f(); return null; } catch (e) { return e.message; } };
let m = lanza(() => generar(T, { ...opts, listaDecorados: ['castillo'] })); ok(m && m.includes('no existe'), 'decorado inexistente → error', m);
m = lanza(() => generar(T, { ...opts, listaDecorados: ['ciudad'] })); ok(m && m.includes('No hay cámaras'), 'decorado sin cámaras en camaras.json → error claro', m);

console.log('\nLínea de comandos');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-')); const tj = path.join(RAIZ, 'ejemplos/villaluna/tiempos.json'); const sal = path.join(tmp, 'v.config.json');
const cli = (...args) => spawnSync(process.execPath, [path.join(RAIZ, 'herramientas/nuevo_video.mjs'), ...args], { encoding: 'utf8', cwd: tmp });
let r = cli('--tiempos', tj, '--salida', sal, '--etiqueta', 'PRUEBA'); ok(r.status === 0 && fs.existsSync(sal), 'genera el archivo (código 0)', r.stdout + r.stderr);
const gen = JSON.parse(fs.readFileSync(sal, 'utf8')); ok(gen.etiqueta?.txt === 'PRUEBA' && gen.tomas.length > 0, 'el archivo trae la etiqueta pedida y tomas');
fs.writeFileSync(sal, '{"a":1}'); r = cli('--tiempos', tj, '--salida', sal); ok(r.status === 2 && r.stderr.includes('ya existe') && fs.readFileSync(sal, 'utf8') === '{"a":1}', 'no sobrescribe un archivo existente (código 2) y lo deja intacto');
r = cli('--tiempos', tj, '--salida', sal, '--forzar'); ok(r.status === 0 && JSON.parse(fs.readFileSync(sal, 'utf8')).version === 1, 'con --forzar sí lo sobrescribe');
r = cli('--tiempos', path.join(tmp, 'noexiste.json'), '--salida', path.join(tmp, 'x.json')); ok(r.status === 2 && r.stderr.includes('no existe'), 'tiempos inexistente → código 2');
fs.writeFileSync(path.join(tmp, 'roto.json'), '{"frases":['); r = cli('--tiempos', path.join(tmp, 'roto.json'), '--salida', path.join(tmp, 'x.json')); ok(r.status === 2 && r.stderr.includes('no es JSON'), 'tiempos con JSON roto → código 2');
fs.writeFileSync(path.join(tmp, 'vacio.json'), '{"dur":3}'); r = cli('--tiempos', path.join(tmp, 'vacio.json'), '--salida', path.join(tmp, 'x.json')); ok(r.status === 2 && r.stderr.includes('no parece un tiempos.json'), 'tiempos sin frases → código 2');
r = cli('--tiempos', tj, '--salida', path.join(tmp, 'x.json'), '--toma-seg', '0.1'); ok(r.status === 2 && r.stderr.includes('--toma-seg'), '--toma-seg fuera de rango → código 2');
r = cli('--tiempos', tj, '--salida', path.join(tmp, 'x.json'), '--decorados', 'castillo'); ok(r.status === 2 && r.stderr.includes('no existe'), '--decorados con un nombre inexistente → código 2');
ok(!fs.existsSync(path.join(tmp, 'x.json')), 'ninguno de los usos erróneos dejó un archivo a medias');

if (process.argv.includes('--con-render')) {
  console.log('\nRender de lo generado (3 cuadros)');
  fs.writeFileSync(sal, '', 'utf8'); cli('--tiempos', tj, '--salida', sal, '--forzar');
  const png = (n) => path.join(tmp, `c${n}.png`);
  r = spawnSync(process.execPath, [path.join(PROYECTO, 'cuadros.mjs'), `10:${png(10)},120:${png(120)},280:${png(280)}`, '--config', sal, '--tiempos', tj], { encoding: 'utf8', env: { ...process.env, REMOTION_ESCALA3D: '0.5', REMOTION_AA: '0' }, cwd: PROYECTO });
  ok(r.status === 0, 'cuadros.mjs termina bien con la configuración generada', (r.stdout + r.stderr).slice(-300));
  for (const n of [10, 120, 280]) ok(fs.existsSync(png(n)) && fs.statSync(png(n)).size > 50000, `cuadro ${n}: imagen generada y no vacía`, fs.existsSync(png(n)) ? fs.statSync(png(n)).size + ' bytes' : 'no existe');
  if (process.env.GUARDAR_CUADROS) for (const n of [10, 120, 280]) fs.copyFileSync(png(n), path.join(process.env.GUARDAR_CUADROS, `gen_c${n}.png`));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + (fallas ? `FALLARON ${fallas} comprobación(es)` : 'TODO OK')); process.exit(fallas ? 1 : 0);
