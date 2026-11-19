#!/usr/bin/env node
// Prueba de render de los decorados genéricos (calle, interior, datos) y todas sus variantes.
//   node video3d/pruebas/prueba_decorados.mjs      (renderiza ~15 cuadros solo en 3D, ~40 s; necesita instalar.sh hecho)
// Comprueba: la configuración valida; cada variante renderiza una imagen no vacía y con contraste; las variantes de un mismo
// decorado se ven distintas; las escenas de datos cambian entre el inicio y el final de la toma; y una variante inexistente
// hace fallar el render con un mensaje claro (en vez de dibujar otra cosa en silencio).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validar, leerDecorados, leerUsaDatos, cargarCamaras } from '../herramientas/validar_config.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const PROYECTO = path.join(RAIZ, 'plantilla');
const tj = path.join(RAIZ, 'ejemplos/villaluna/tiempos.json'); const T = JSON.parse(fs.readFileSync(tj, 'utf8'));
const camaras = cargarCamaras(PROYECTO), decorados = leerDecorados(PROYECTO), usaDatos = leerUsaDatos(PROYECTO);
let fallas = 0; const ok = (c, m, extra = '') => { console.log(`  [${c ? 'OK' : 'FALLA'}] ${m}${!c && extra ? '  → ' + extra : ''}`); if (!c) fallas++; };
const txt = (c) => ({ txt: 'PRUEBA', color: '#FFFFFF', ...c });
const tomas = [
  ['p01', 'calle', 'avenida', 'calle-avenida'], ['p01', 'calle', 'plaza', 'calle-plaza'], ['p01', 'calle', 'esquina', 'calle-esquina'],
  ['p02', 'interior', 'mesa', 'interior-mesa'], ['p02', 'interior', 'ventana', 'interior-ventana'], ['p02', 'interior', 'estante', 'interior-frente'],
  ['p03', 'datos', 'barras', 'datos-frente', [3, 5, 8, 6, 10]], ['p03', 'datos', 'cifra', 'datos-frente', [1250]], ['p03', 'datos', 'ascenso', 'datos-frente', [2, 4, 3, 7, 9]],
].map(([frase, decorado, variante, camara, datos]) => ({ frase, decorado, variante, camara, texto: txt({}), ...(datos ? { datos } : {}) }));
const config = { version: 1, titulo: 'prueba de decorados', etiqueta: null, pildoras: ['#FF2E93'], frases: Object.fromEntries(T.frases.map((f) => [f.id, { claves: [] }])), tomas };

const v = validar(config, T, { camaras, decorados, usaDatos });
ok(!v.errores.length, 'la configuración de prueba valida sin errores', v.errores.join(' | '));
ok(['calle', 'interior', 'datos'].every((d) => d in decorados) && decorados.calle.length === 3 && decorados.interior.length === 3 && decorados.datos.length === 3 && usaDatos.has('datos'), 'el registro trae los 3 decorados con 3 variantes cada uno y «datos» usa datos');

// instantes a renderizar: mitad de cada toma; y 25 % y 80 % de las de datos (el latigazo de cámara ocupa los primeros y últimos ~0,14 s)
const orden = [...new Set(tomas.map((t) => t.frase))]; const pedidos = [];
orden.forEach((id, pi) => {
  const t0 = pi === 0 ? 0 : T.frases[pi].ini - 0.05; const t1 = pi === orden.length - 1 ? T.dur : T.frases[pi + 1].ini - 0.05;
  const propias = tomas.filter((t) => t.frase === id); const n = propias.length;
  propias.forEach((t, k) => { const a = t0 + (k / n) * (t1 - t0), b = t0 + ((k + 1) / n) * (t1 - t0);
    const mk = (u) => Math.round((a + u * (b - a)) * 30);
    pedidos.push({ t, etq: 'mid', frame: mk(0.5) }); if (t.decorado === 'datos') { pedidos.push({ t, etq: 'ini', frame: mk(0.25) }); pedidos.push({ t, etq: 'fin', frame: mk(0.8) }); } });
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dec-'));
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
  const f = ruta(p); const existe = fs.existsSync(f) && fs.statSync(f).size > 30000;
  const s = existe ? stats(f) : null;
  ok(existe && s.max - s.min >= 60 && s.avg > 15 && s.avg < 240, `${p.t.decorado} · ${p.t.variante}: ${existe ? `${(fs.statSync(f).size / 1024).toFixed(0)} KB, luma ${s.min}-${s.max}, media ${s.avg.toFixed(0)}` : 'no se generó'}`);
}
console.log('\nLas variantes de un mismo decorado se ven distintas (SSIM bajo)');
for (const d of ['calle', 'interior', 'datos']) {
  const vs = tomas.filter((t) => t.decorado === d).map((t) => t.variante);
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const s = ssim(ruta({ t: { decorado: d, variante: vs[i] }, etq: 'mid' }), ruta({ t: { decorado: d, variante: vs[j] }, etq: 'mid' })); ok(s < 0.93, `${d}: ${vs[i]} vs ${vs[j]}: SSIM ${s.toFixed(3)}`); }
}
console.log('\nLos datos se animan (inicio vs final de la toma)');
for (const t of tomas.filter((x) => x.decorado === 'datos')) { const s = ssim(ruta({ t, etq: 'ini' }), ruta({ t, etq: 'fin' })); ok(s < 0.97, `datos · ${t.variante}: SSIM ${s.toFixed(3)} entre el 25 % y el 80 % de la toma (fuera del latigazo de cámara)`); }

console.log('\nUna variante inexistente hace fallar el render con mensaje claro');
const mala = JSON.parse(JSON.stringify(config)); mala.tomas[0].variante = 'volar'; fs.writeFileSync(path.join(tmp, 'mala.json'), JSON.stringify(mala));
r = spawnSync(process.execPath, [path.join(PROYECTO, 'cuadros.mjs'), `10:${path.join(tmp, 'mala.png')}`, '--config', path.join(tmp, 'mala.json'), '--tiempos', tj], { encoding: 'utf8', env, cwd: PROYECTO });
ok(r.status !== 0 && /no tiene la variante «volar»/.test(r.stdout + r.stderr), 'render con variante «volar»: falla y dice qué variantes hay', `código ${r.status}; ${(r.stdout + r.stderr).slice(-250)}`);

if (process.env.GUARDAR_CUADROS) for (const p of pedidos) fs.copyFileSync(ruta(p), path.join(process.env.GUARDAR_CUADROS, path.basename(ruta(p))));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + (fallas ? `FALLARON ${fallas} comprobación(es)` : 'TODO OK')); process.exit(fallas ? 1 : 0);
