#!/usr/bin/env python3
"""Prueba de herramientas/efectos_escenas.py con una base silenciosa (así toda la energía medida es del efecto).
  .venv/bin/python pruebas/prueba_efectos.py      (necesita numpy y soundfile: instalar.sh los trae; sin red, ~10 s)
Comprueba, para los 12 tipos: que caen dentro de su frase y nada fuera, que no saturan, que la forma es la esperada (la subida
crece, el impacto decae), que es reproducible, que pone un golpe en cada corte de toma, que repetir la ejecución no acumula
y que los errores de uso se rechazan.
"""
import json, os, subprocess, sys, tempfile, shutil
import numpy as np, soundfile as sf
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SCRIPT = os.path.join(RAIZ, 'herramientas', 'efectos_escenas.py')
T = json.load(open(os.path.join(RAIZ, 'ejemplos/sueno/tiempos.json'), encoding='utf-8')); CFG = os.path.join(RAIZ, 'ejemplos/sueno/video.config.json')
SR = 44100; fallas = []
def ok(c, m, extra=''):
    print(f"  [{'OK' if c else 'FALLA'}] {m}" + (f'  → {extra}' if (not c and extra) else '')); 
    if not c: fallas.append(m)
tmp = tempfile.mkdtemp(prefix='efx_')
def corre(cues, salida='out.wav', config=None, base=None, extra=()):
    c = os.path.join(tmp, 'cues.json'); json.dump(cues, open(c, 'w'))
    args = [sys.executable, SCRIPT, '--cues', c, '--tiempos', os.path.join(RAIZ, 'ejemplos/sueno/tiempos.json'), '--base', base or os.path.join(tmp, 'base.wav'), '--salida', os.path.join(tmp, salida), *extra]
    if config: args += ['--config', config]
    return subprocess.run(args, capture_output=True, text=True)
def leer(n='out.wav'): x, _ = sf.read(os.path.join(tmp, n), dtype='float32', always_2d=True); return x.mean(1)
def rms(x, a, b): s = x[int(a * SR): int(b * SR)]; return float(np.sqrt(np.mean(s ** 2))) if len(s) else 0.0
sf.write(os.path.join(tmp, 'base.wav'), np.zeros((int(T['dur'] * SR), 2), dtype='float32'), SR)
a0, b0 = 0.0, T['frases'][1]['ini'] - 0.05            # frase p01
print('Cada tipo de efecto, solo, en la frase p01 (base silenciosa)')
TIPOS = ['lluvia', 'viento', 'whoosh', 'pulso', 'motor', 'tension', 'sirena', 'llantas', 'glitch', 'riser', 'impacto', 'cola']
for tp in TIPOS:
    r = corre({'p01': [{'tipo': tp, 'nivel': 1}]}); x = leer() if r.returncode == 0 else np.zeros(1)
    dentro = rms(x, a0, b0); fuera = rms(x, b0 + 0.2, T['dur'])
    ok(r.returncode == 0 and dentro > 0.004 and fuera < 1e-6 and np.max(np.abs(x)) <= 0.951 and np.isfinite(x).all(), f'{tp}: suena dentro de p01 (RMS {dentro:.3f}), silencio fuera, sin saturar', (r.stderr + r.stdout)[-200:])
print('\nForma')
x = leer() if corre({'p01': [{'tipo': 'riser', 'nivel': 1}]}).returncode == 0 else None
ok(x is not None and rms(x, b0 * 0.75, b0) > 2 * rms(x, 0, b0 * 0.25) + 1e-6, 'riser: la energía crece hacia el final')
x = leer() if corre({'p01': [{'tipo': 'impacto', 'nivel': 1}]}).returncode == 0 else None
ok(x is not None and rms(x, 0, 0.5) > 5 * rms(x, 1.7, 2.2) + 1e-6, 'impacto: la energía está al inicio y decae')
x = leer() if corre({'p01': [{'tipo': 'whoosh', 'nivel': 1}]}).returncode == 0 else None
ok(x is not None and rms(x, 0.05, 0.85) > 5 * rms(x, 1.0, 2.0) + 1e-6, 'whoosh: dura menos de un segundo')
x = leer() if corre({'p01': [{'tipo': 'lluvia', 'nivel': 1, 'desde': 1.0, 'hasta': 2.0}]}).returncode == 0 else None
ok(x is not None and rms(x, 1.2, 1.9) > 0.004 and rms(x, 0, 0.9) < 1e-6 and rms(x, 2.1, 4) < 1e-6, '"desde" y "hasta" acotan el efecto (1,0 a 2,0 s)')
x1 = leer() if corre({'p01': [{'tipo': 'motor', 'nivel': 0.2}]}).returncode == 0 else None; x2 = leer() if corre({'p01': [{'tipo': 'motor', 'nivel': 1}]}).returncode == 0 else None
ok(x1 is not None and x2 is not None and rms(x2, 0.5, 3) > 3 * rms(x1, 0.5, 3), '"nivel" escala el volumen (1,0 suena más de 3 veces lo de 0,2)')
print('\nReproducible y sin acumular')
c = {'p01': [{'tipo': 'lluvia'}, {'tipo': 'sirena'}], 'p03': [{'tipo': 'glitch', 'n': 3}]}
corre(c, 'a.wav'); corre(c, 'b.wav'); ok(np.array_equal(leer('a.wav'), leer('b.wav')), 'misma entrada, mismo audio')
b2 = os.path.join(tmp, 'b2.wav'); shutil.copy(os.path.join(tmp, 'base.wav'), b2); sf.write(b2, np.full((int(T['dur'] * SR), 2), 0.01, dtype='float32'), SR)
r1 = corre(c, 'b2.wav', base=b2); p1 = leer('b2.wav').copy(); r2 = corre(c, 'b2.wav', base=b2); p2 = leer('b2.wav')
ok(r1.returncode == 0 and r2.returncode == 0 and np.array_equal(p1, p2) and os.path.exists(b2 + '.base.wav'), 'ejecutarlo dos veces sobre el mismo archivo no acumula (guarda la base en .base.wav)')
print('\nGolpe en cada corte de toma')
cfg = json.load(open(CFG, encoding='utf-8')); orden = []
[orden.append(t['frase']) for t in cfg['tomas'] if t['frase'] not in orden]
cortes = []
for i, id in enumerate(orden):
    a = 0 if i == 0 else T['frases'][i]['ini'] - 0.05; b = T['dur'] if i == len(orden) - 1 else T['frases'][i + 1]['ini'] - 0.05; n = sum(1 for t in cfg['tomas'] if t['frase'] == id); cortes += [a + (b - a) * k / n for k in range(n)]
r = corre({}, config=CFG); x = leer() if r.returncode == 0 else np.zeros(1)
ok(r.returncode == 0 and f'{len(cortes) - 1} golpe(s) de corte' in r.stdout, f'informa {len(cortes) - 1} golpes (tomas − 1)', r.stdout[-150:])
sin_golpe = [t for t in cortes[1:] if rms(x, t - 0.03, t + 0.25) < 0.01]; ok(not sin_golpe, 'hay energía de golpe en cada uno de los cortes', f'sin golpe en {[round(t, 2) for t in sin_golpe]}')
entre = [(a + b) / 2 for a, b in zip(cortes[1:], cortes[2:]) if b - a > 1.2]; ok(all(rms(x, m - 0.1, m + 0.1) < 1e-6 for m in entre), 'y silencio entre un corte y otro')
print('\nErrores de uso')
for nombre, cues, msg in [('tipo desconocido', {'p01': [{'tipo': 'trueno'}]}, 'desconocido'), ('frase inexistente', {'p99': [{'tipo': 'lluvia'}]}, 'no existe'),
                         ('nivel fuera de rango', {'p01': [{'tipo': 'lluvia', 'nivel': 2}]}, 'nivel'), ('desde >= hasta', {'p01': [{'tipo': 'lluvia', 'desde': 3, 'hasta': 2}]}, 'desde')]:
    r = corre(cues, 'err.wav'); ok(r.returncode != 0 and msg in (r.stderr + r.stdout) and not os.path.exists(os.path.join(tmp, 'err.wav')), f'{nombre}: error claro y sin archivo a medias', (r.stderr + r.stdout)[-150:])
r = corre({'p01': [{'tipo': 'lluvia'}]}, base=os.path.join(tmp, 'no_existe.wav')); ok(r.returncode != 0 and 'no existe' in r.stderr, 'audio base inexistente: error claro')
shutil.rmtree(tmp, ignore_errors=True)
print('\n' + ('TODO OK' if not fallas else f'FALLARON {len(fallas)} comprobación(es)')); sys.exit(1 if fallas else 0)
