import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './comun.mjs';
import { validar } from './validar-guion.mjs';

const dir = path.join(RAIZ, 'guiones');
const guiones = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('schema'));
for (const f of guiones) {
  test(`el guion ${f} es válido`, () => {
    const g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const r = validar(g);
    assert.deepEqual(r.err, []);
    assert.ok(r.total >= 30 && r.total <= 40, `duración ${r.total}`);
  });
}
test('detecta tipo, variante, cámara y transición inexistentes', () => {
  const base = JSON.parse(fs.readFileSync(path.join(dir, guiones[0]), 'utf8'));
  const mal = structuredClone(base);
  mal.escenas[0].tipo = 'no-existe'; mal.escenas[1].variante = 'xx'; mal.escenas[2].camara = 'nada'; mal.escenas[3].transicion = { tipo: 'magia' };
  const r = validar(mal);
  assert.ok(r.err.length >= 4, r.err.join(' | '));
});
test('avisa de duraciones fuera del pulso y de datos sin verificar', () => {
  const g = JSON.parse(fs.readFileSync(path.join(dir, guiones[0]), 'utf8')); g.escenas[1].duracion = 4.3;
  const r = validar(g); assert.ok(r.av.some((a) => a.includes('múltiplo de 0.5')));
});
