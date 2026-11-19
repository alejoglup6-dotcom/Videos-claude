#!/usr/bin/env node
// Prueba de herramientas/validar_config.mjs: la configuración buena pasa limpia y cada defecto conocido produce su mensaje.
//   node video3d/pruebas/prueba_validador.mjs      (sin red, sin render; sale con código 1 si algo falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validar, leerDecorados, leerUsaDatos, cargarCamaras } from '../herramientas/validar_config.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const PROYECTO = path.join(RAIZ, 'plantilla');
const camaras = cargarCamaras(PROYECTO), decorados = leerDecorados(PROYECTO), usaDatos = leerUsaDatos(PROYECTO);
const cfg0 = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ejemplos/villaluna/video.config.json'), 'utf8'));
const tie0 = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ejemplos/villaluna/tiempos.json'), 'utf8'));
const clona = (x) => JSON.parse(JSON.stringify(x));
let fallas = 0;
const ok = (c, m, extra = '') => { console.log(`  [${c ? 'OK' : 'FALLA'}] ${m}${!c && extra ? '  → ' + extra : ''}`); if (!c) fallas++; };

console.log('Configuraciones buenas');
for (const [n, c, t] of [['Villaluna', cfg0, tie0], ['GTA 6', JSON.parse(fs.readFileSync(path.join(PROYECTO, 'src/video.config.json'), 'utf8')), JSON.parse(fs.readFileSync(path.join(PROYECTO, 'src/tiempos.json'), 'utf8'))]]) {
  const r = validar(c, t, { camaras, decorados, usaDatos }); ok(!r.errores.length && !r.avisos.length, `${n}: 0 errores y 0 avisos`, [...r.errores, ...r.avisos].join(' | '));
}

// [nombre, cómo se rompe, tipo esperado, texto del mensaje]
const casos = [
  ['frase que no existe en tiempos.json', (c) => { c.tomas[0].frase = 'zzz'; }, 'E', 'no existe en tiempos.json'],
  ['decorado inexistente', (c) => { c.tomas[0].decorado = 'castillo'; }, 'E', 'el decorado «castillo» no existe'],
  ['variante inexistente', (c) => { c.tomas[0].variante = 'volar'; }, 'E', 'no tiene la variante «volar»'],
  ['variante en un decorado sin variantes', (c) => { c.tomas[2].variante = 'x'; }, 'E', 'no tiene variantes'],
  ['cámara con nombre inexistente', (c) => { c.tomas[0].camara = 'no-existe'; }, 'E', 'la cámara «no-existe» no existe'],
  ['cámara objeto sin pos', (c) => { c.tomas[1].camara = { mira: [0, 1, 2], fov: 50, empuje: 1 }; }, 'E', 'camara.pos'],
  ['fov fuera de rango', (c) => { c.tomas[1].camara = { pos: [0, 1, 2], mira: [0, 1, 0], fov: 200, empuje: 1 }; }, 'E', 'camara.fov'],
  ['empuje negativo', (c) => { c.tomas[1].camara = { pos: [0, 1, 2], mira: [0, 1, 0], fov: 50, empuje: -1 }; }, 'E', 'camara.empuje'],
  ['toma sin cámara', (c) => { delete c.tomas[3].camara; }, 'E', 'falta "camara"'],
  ['texto vacío', (c) => { c.tomas[0].texto.txt = '  '; }, 'E', 'texto.txt vacío'],
  ['color de texto inválido', (c) => { c.tomas[0].texto.color = 'rojo'; }, 'E', 'texto.color'],
  ['texto.tam fuera de rango', (c) => { c.tomas[0].texto.tam = 500; }, 'E', 'texto.tam debe ser'],
  ['texto.tam que no es número', (c) => { c.tomas[0].texto.tam = 'grande'; }, 'E', 'texto.tam debe ser'],
  ['subtítulo del texto vacío', (c) => { c.tomas[0].texto.sub = ''; }, 'E', 'texto.sub'],
  ['píldora con color inválido', (c) => { c.pildoras[1] = 'azul'; }, 'E', 'pildoras[1]'],
  ['sin píldoras', (c) => { c.pildoras = []; }, 'E', '"pildoras"'],
  ['versión distinta de 1', (c) => { c.version = 2; }, 'E', '"version" debe ser 1'],
  ['sin tomas', (c) => { c.tomas = []; }, 'E', '"tomas" debe ser una lista'],
  ['una frase sin ninguna toma', (c) => { c.tomas = c.tomas.filter((t) => t.frase !== 'p03'); }, 'E', 'no tiene ninguna toma'],
  ['tomas de una frase separadas', (c) => { c.tomas.splice(2, 0, c.tomas.splice(5, 1)[0]); }, 'E', 'reaparece separada'],
  ['frases en distinto orden que tiempos.json', (c) => { c.tomas = [...c.tomas.filter((t) => t.frase === 'p02'), ...c.tomas.filter((t) => t.frase === 'p01'), ...c.tomas.filter((t) => t.frase === 'p03')]; }, 'E', 'no coincide con el de tiempos.json'],
  ['etiqueta con toma fuera de rango', (c) => { c.etiqueta.hastaToma = 99; }, 'E', 'etiqueta.hastaToma'],
  ['etiqueta con desde > hasta', (c) => { c.etiqueta.desdeToma = 5; c.etiqueta.hastaToma = 2; }, 'E', 'es mayor que hastaToma'],
  ['etiqueta sin texto', (c) => { c.etiqueta.txt = ''; }, 'E', 'etiqueta.txt vacío'],
  ['claves de una frase que no existe', (c) => { c.frases.p99 = { claves: ['x'] }; }, 'E', 'frases.p99'],
  ['claves que no es una lista', (c) => { c.frases.p01.claves = 'gatos'; }, 'E', 'claves debe ser una lista'],
  ['palabras de tiempos.json que no avanzan', (c, t) => { t.frases[0].palabras[2].s = 0; }, 'E', 'no crecen'],
  ['duración 0 en tiempos.json', (c, t) => { t.dur = 0; }, 'E', '"dur" debe ser'],
  ['tiempos.json sin frases', (c, t) => { t.frases = []; }, 'E', 'falta la lista "frases"'],
  ['clave con mayúsculas o signos', (c) => { c.frases.p02.claves.push('Gatos!'); }, 'A', 'minúsculas y sin signos'],
  ['clave que no está en la frase', (c) => { c.frases.p02.claves.push('dragon'); }, 'A', 'no aparece en la frase'],
  ['frase sin claves', (c) => { c.frases.p03.claves = []; }, 'A', 'sin palabras clave'],
  ['tomas demasiado cortas', (c) => { const t = c.tomas.find((x) => x.frase === 'p02'); for (let i = 0; i < 8; i++) c.tomas.splice(c.tomas.indexOf(t), 0, clona(t)); }, 'A', 'parpadeo'],
  ['cámara pensada para otro decorado', (c) => { c.tomas[2].camara = 'torre-suelo'; }, 'A', 'está pensada para torre'],
  ['texto muy largo', (c) => { c.tomas[0].texto.txt = 'UN TEXTO LARGUISIMO DE VERDAD'; }, 'A', 'es largo'],
  ['sin la clave "etiqueta"', (c) => { delete c.etiqueta; }, 'A', 'Falta "etiqueta"'],
  // decorado «datos»: la base es una toma de cifra válida
  ['datos: falta la lista', (c) => { Object.assign(c.tomas[0], DATOS_OK); delete c.tomas[0].datos; }, 'E', 'necesita "datos"'],
  ['datos: la cifra pide exactamente 1 valor', (c) => { Object.assign(c.tomas[0], DATOS_OK); c.tomas[0].datos = [1, 2]; }, 'E', 'pide 1 valor'],
  ['datos: demasiadas barras (11)', (c) => { Object.assign(c.tomas[0], DATOS_OK, { variante: 'barras' }); c.tomas[0].datos = Array.from({ length: 11 }, (_, i) => i + 1); }, 'E', 'pide 1 a 10 valor'],
  ['datos: el ascenso pide al menos 2 puntos', (c) => { Object.assign(c.tomas[0], DATOS_OK, { variante: 'ascenso' }); c.tomas[0].datos = [5]; }, 'E', 'pide 2 a 12 valor'],
  ['datos: números negativos', (c) => { Object.assign(c.tomas[0], DATOS_OK); c.tomas[0].datos = [-3]; }, 'E', 'solo admite números'],
  ['datos: un valor que no es número', (c) => { Object.assign(c.tomas[0], DATOS_OK); c.tomas[0].datos = ['mil']; }, 'E', 'solo admite números'],
  ['datos: cifra de más de 8 dígitos', (c) => { Object.assign(c.tomas[0], DATOS_OK); c.tomas[0].datos = [123456789]; }, 'E', 'no cabe en pantalla'],
  ['datos en un decorado que no los usa', (c) => { c.tomas[0].datos = [1, 2, 3]; }, 'A', 'no usa "datos"'],
];
const DATOS_OK = { decorado: 'datos', variante: 'cifra', camara: 'datos-frente', datos: [1250] };
{ const c = clona(cfg0); Object.assign(c.tomas[0], DATOS_OK); const r = validar(c, tie0, { camaras, decorados, usaDatos }); ok(!r.errores.length && !r.avisos.length, 'una toma de datos válida (cifra 1250) pasa limpia', [...r.errores, ...r.avisos].join(' | ')); }
console.log('\nDefectos (cada uno debe producir su mensaje)');
for (const [nombre, rompe, tipo, msg] of casos) {
  const c = clona(cfg0), t = clona(tie0); rompe(c, t);
  let r; try { r = validar(c, t, { camaras, decorados, usaDatos }); } catch (e) { ok(false, nombre, 'el validador se cayó: ' + e.message); continue; }
  const lista = tipo === 'E' ? r.errores : r.avisos;
  const acierta = lista.some((m) => m.includes(msg));
  ok(acierta && (tipo === 'A' || r.errores.length > 0), `${tipo === 'E' ? 'ERROR' : 'AVISO'}: ${nombre}`, `esperaba «${msg}»; salió: ${[...r.errores, ...r.avisos].join(' | ') || '(nada)'}`);
  if (tipo === 'A') ok(r.errores.length === 0, `   y un aviso no es un error (${nombre})`, r.errores.join(' | '));
}

console.log('\nLínea de comandos (código de salida)');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'val-')); const rota = clona(cfg0); rota.tomas[0].decorado = 'castillo';
fs.writeFileSync(path.join(tmp, 'rota.json'), JSON.stringify(rota)); fs.writeFileSync(path.join(tmp, 'buena.json'), JSON.stringify(cfg0));
const cli = (cfg) => spawnSync(process.execPath, [path.join(RAIZ, 'herramientas/validar_config.mjs'), '--config', path.join(tmp, cfg), '--tiempos', path.join(RAIZ, 'ejemplos/villaluna/tiempos.json')], { encoding: 'utf8' });
let r = cli('buena.json'); ok(r.status === 0 && r.stdout.includes('listo para renderizar'), 'configuración buena: código 0 y «listo para renderizar»', r.stdout.slice(-200));
r = cli('rota.json'); ok(r.status === 1 && r.stdout.includes('NO renderizar'), 'configuración rota: código 1 y «NO renderizar todavía»', `código ${r.status}`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + (fallas ? `FALLARON ${fallas} comprobación(es)` : 'TODO OK')); process.exit(fallas ? 1 : 0);
