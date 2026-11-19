#!/usr/bin/env node
// Prueba de render de los decorados cinemáticos (vice, mapa, persecucion, atardecer, fondo) y todas sus variantes.
//   node video3d/pruebas/prueba_decorados_cine.mjs      (renderiza ~20 cuadros solo en 3D, ~1 min; necesita instalar.sh hecho)
// Comprueba: la configuración valida; cada variante renderiza una imagen no vacía (salvo «fondo · negro», que debe ser casi negra);
// las variantes de un mismo decorado se ven distintas; lo que se mueve cambia entre el 25 % y el 80 % de la toma; y una
// variante inexistente hace fallar el render.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validar, leerDecorados, leerUsaDatos, cargarCamaras } from '../herramientas/validar_config.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const PROYECTO = path.join(RAIZ, 'plantilla');
const tj = path.join(RAIZ, 'ejemplos/sueno/tiempos.json'); const T = JSON.parse(fs.readFileSync(tj, 'utf8'));
const camaras = cargarCamaras(PROYECTO), decorados = leerDecorados(PROYECTO), usaDatos = leerUsaDatos(PROYECTO);
let fallas = 0; const ok = (c, m, extra = '') => { console.log(`  [${c ? 'OK' : 'FALLA'}] ${m}${!c && extra ? '  → ' + extra : ''}`); if (!c) fallas++; };
const V = [['p01', 'vice', 'aerea', 'vice-aerea'], ['p01', 'vice', 'calle', 'vice-calle'], ['p01', 'vice', 'playa', 'vice-playa'],
  ['p02', 'mapa', 'costa', 'mapa-costa'], ['p02', 'mapa', 'ciudad', 'mapa-ciudad'], ['p02', 'mapa', 'pantano', 'mapa-pantano'], ['p03', 'mapa', 'carreteras', 'mapa-carreteras'],
  ['p03', 'persecucion', 'detras', 'persecucion-detras'], ['p03', 'persecucion', 'lateral', 'persecucion-lateral'], ['p03', 'persecucion', 'giro', 'persecucion-alta'],
  ['p04', 'atardecer', 'orbita', 'atardecer-aerea'], ['p04', 'atardecer', 'helicoptero', 'atardecer-heli'], ['p04', 'atardecer', 'costa', 'atardecer-costa'],
  ['p05', 'fondo', 'particulas', 'fondo-frente'], ['p05', 'fondo', 'negro', 'fondo-frente'],
  ['p06', 'vice', 'aerea', 'vice-aerea-lateral'], ['p07', 'persecucion', 'detras', 'persecucion-detras']];
const tomas = V.map(([frase, decorado, variante, camara]) => ({ frase, decorado, variante, camara, texto: { txt: 'PRUEBA', color: '#FFFFFF' } }));
const config = { version: 1, titulo: 'prueba de decorados cine', etiqueta: null, pildoras: ['#FF2E93'], frases: Object.fromEntries(T.frases.map((f) => [f.id, { claves: [] }])), tomas };
const v = validar(config, T, { camaras, decorados, usaDatos });
ok(!v.errores.length, 'la configuración de prueba valida sin errores', v.errores.join(' | '));
const esperado = { vice: 3, mapa: 4, persecucion: 3, atardecer: 3, fondo: 2 };
ok(Object.entries(esperado).every(([d, n]) => decorados[d]?.length === n), 'el registro trae los 5 decorados con sus variantes (3, 4, 3, 3, 2)');

const orden = [...new Set(tomas.map((t) => t.frase))]; const pedidos = [];
orden.forEach((id, pi) => {
  const t0 = pi === 0 ? 0 : T.frases[pi].ini - 0.05; const t1 = pi === orden.length - 1 ? T.dur : T.frases[pi + 1].ini - 0.05;
  const propias = tomas.filter((t) => t.frase === id); const n = propias.length;
  propias.forEach((t, k) => { const a = t0 + (k / n) * (t1 - t0), b = t0 + ((k + 1) / n) * (t1 - t0); const mk = (u) => Math.round((a + u * (b - a)) * 30);
    const principal = !pedidos.some((p) => p.t.decorado === t.decorado && p.t.variante === t.variante);
    if (principal) { pedidos.push({ t, etq: 'mid', frame: mk(0.5) }); pedidos.push({ t, etq: 'ini', frame: mk(0.25) }); pedidos.push({ t, etq: 'fin', frame: mk(0.8) }); } });
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cine-'));
const ruta = (p) => path.join(tmp, `${p.t.decorado}_${p.t.variante}_${p.etq}.png`);
fs.writeFileSync(path.join(tmp, 'cfg.json'), JSON.stringify(config));
const env = { ...process.env, REMOTION_ESCALA3D: '0.5', REMOTION_AA: '0', REMOTION_SIN: 'txt,sub,grano,vel,estela,glitch,fuga,ab' };
const t0 = Date.now();
let r = spawnSync(process.execPath, [path.join(PROYECTO, 'cuadros.mjs'), pedidos.map((p) => `${p.frame}:${ruta(p)}`).join(','), '--config', path.join(tmp, 'cfg.json'), '--tiempos', tj], { encoding: 'utf8', env, cwd: PROYECTO });
ok(r.status === 0, `cuadros.mjs renderizó ${pedidos.length} cuadros (${((Date.now() - t0) / 1000).toFixed(0)} s)`, (r.stdout + r.stderr).slice(-300));
const stats = (f) => { const o = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-'], { encoding: 'utf8' }).stdout;
  const g = (k) => Number((o.match(new RegExp(`signalstats.${k}=([0-9.]+)`)) || [])[1]); return { min: g('YMIN'), max: g('YMAX'), avg: g('YAVG') }; };
const ssim = (a, b) => { const o = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', a, '-i', b, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-'], { encoding: 'utf8' }).stderr; return Number((o.match(/ All:([0-9.]+)/) || [])[1]); };
console.log('\nCada variante: imagen no vacía y con contraste');
for (const p of pedidos.filter((x) => x.etq === 'mid')) {
  const f = ruta(p); const existe = fs.existsSync(f) && fs.statSync(f).size > 5000; const s = existe ? stats(f) : null; const negro = p.t.decorado === 'fondo' && p.t.variante === 'negro';
  const bueno = existe && (negro ? s.avg < 25 && s.max > 40 : s.max - s.min >= 50 && s.avg > 12 && s.avg < 240);
  ok(bueno, `${p.t.decorado} · ${p.t.variante}: ${existe ? `${(fs.statSync(f).size / 1024).toFixed(0)} KB, luma ${s.min}-${s.max}, media ${s.avg.toFixed(0)}` : 'no se generó'}`);
}
console.log('\nLas variantes de un mismo decorado se ven distintas (SSIM bajo)');
for (const d of Object.keys(esperado)) {
  const vs = V.filter((x) => x[1] === d).map((x) => x[2]).filter((x, i, a) => a.indexOf(x) === i);
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const s = ssim(ruta({ t: { decorado: d, variante: vs[i] }, etq: 'mid' }), ruta({ t: { decorado: d, variante: vs[j] }, etq: 'mid' })); ok(s < 0.95, `${d}: ${vs[i]} vs ${vs[j]}: SSIM ${s.toFixed(3)}`); }
}
console.log('\nLo que se mueve cambia dentro de la toma (25 % vs 80 %, fuera del latigazo)');
for (const [d, vv] of [['vice', 'aerea'], ['vice', 'calle'], ['mapa', 'ciudad'], ['mapa', 'carreteras'], ['persecucion', 'detras'], ['atardecer', 'orbita'], ['atardecer', 'helicoptero'], ['fondo', 'particulas']]) {
  const t = { decorado: d, variante: vv }; const s = ssim(ruta({ t, etq: 'ini' }), ruta({ t, etq: 'fin' })); ok(s < 0.985, `${d} · ${vv}: SSIM ${s.toFixed(3)}`);
}
console.log('\nUna variante inexistente hace fallar el render con mensaje claro');
const mala = JSON.parse(JSON.stringify(config)); mala.tomas[0].variante = 'volar'; fs.writeFileSync(path.join(tmp, 'mala.json'), JSON.stringify(mala));
r = spawnSync(process.execPath, [path.join(PROYECTO, 'cuadros.mjs'), `10:${path.join(tmp, 'mala.png')}`, '--config', path.join(tmp, 'mala.json'), '--tiempos', tj], { encoding: 'utf8', env, cwd: PROYECTO });
ok(r.status !== 0 && /no tiene la variante «volar»/.test(r.stdout + r.stderr), 'render con variante «volar»: falla y dice qué variantes hay', `código ${r.status}`);
if (process.env.GUARDAR_CUADROS) for (const p of pedidos) fs.copyFileSync(ruta(p), path.join(process.env.GUARDAR_CUADROS, path.basename(ruta(p))));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + (fallas ? `FALLARON ${fallas} comprobación(es)` : 'TODO OK')); process.exit(fallas ? 1 : 0);
