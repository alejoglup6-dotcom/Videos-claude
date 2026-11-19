// Voz en off gratis con Piper (modelo es_MX). Ajusta la velocidad para que cada frase quepa en su escena.
// Uso: node scripts/voz-piper.mjs <guion>      Variables: PIPER_PYTHON (por defecto "python3"), PIPER_MODEL (ruta al .onnx)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ, leerGuion } from './comun.mjs';

const duracionWav = (f) => { const b = fs.readFileSync(f); const sr = b.readUInt32LE(24); const bits = b.readUInt16LE(34); const ch = b.readUInt16LE(22); let p = 12; while (p < b.length - 8) { const id = b.toString('ascii', p, p + 4); const sz = b.readUInt32LE(p + 4); if (id === 'data') return sz / (sr * ch * (bits / 8)); p += 8 + sz; } throw new Error('WAV sin bloque data: ' + f); };
const sintetizar = (py, modelo, texto, salida, escala) => {
  const r = spawnSync(py, ['-m', 'piper', '-m', modelo, '-f', salida, '--length-scale', String(escala)], { input: texto, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`Piper falló (${r.status}): ${(r.stderr || '').slice(-400)}`);
};

const nombre = process.argv[2]; if (!nombre) { console.error('Uso: node scripts/voz-piper.mjs <guion>'); process.exit(2); }
const { guion } = leerGuion(nombre);
const py = process.env.PIPER_PYTHON || 'python3'; const modelo = process.env.PIPER_MODEL || path.join(RAIZ, 'modelos/es_MX-claude-high.onnx');
if (!fs.existsSync(modelo)) { console.error(`No encuentro el modelo de voz: ${modelo}\nDescárgalo con el workflow o ver README (sección Voz).`); process.exit(3); }
const dir = path.join(RAIZ, 'public/audio', guion.id, 'voz'); fs.mkdirSync(dir, { recursive: true });
const salida = {};
for (const e of guion.escenas) {
  if (!e.voz?.texto) continue;
  const f = path.join(dir, e.id + '.wav'); const hueco = e.duracion - (e.voz.inicio ?? 0.15) - 0.25;
  let escala = 1.0; sintetizar(py, modelo, e.voz.texto, f, escala); let d = duracionWav(f);
  for (let i = 0; i < 3 && d > hueco; i++) { escala = Math.max(0.6, escala * (hueco / d) * 0.97); sintetizar(py, modelo, e.voz.texto, f, escala.toFixed(3)); d = duracionWav(f); }   // length-scale < 1 = más rápido
  if (d > hueco + 0.05) console.warn(`⚠ ${e.id}: la voz dura ${d.toFixed(2)} s y la escena deja ${hueco.toFixed(2)} s; acorta el texto de voz`);
  salida[e.id] = { archivo: `audio/${guion.id}/voz/${e.id}.wav`, duracion: Number(d.toFixed(3)) };
  console.log(`${e.id}: ${d.toFixed(2)} s (velocidad x${(1 / escala).toFixed(2)})`);
}
fs.writeFileSync(path.join(RAIZ, 'public/audio', guion.id, 'voz.json'), JSON.stringify(salida, null, 2));
