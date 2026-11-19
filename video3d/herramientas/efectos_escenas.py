#!/usr/bin/env python3
"""Añade efectos de sonido sintetizados por escena (y un golpe en cada corte) a audio/efectos.wav.

Se corre DESPUÉS de musica_synthwave.py y desde la carpeta del proyecto:
  python3 herramientas/efectos_escenas.py --cues efectos.json [--config video.config.json] [--tiempos voz/tiempos.json]
                                          [--base audio/efectos.wav] [--salida audio/efectos.wav]

efectos.json: { "p01": [ {"tipo": "lluvia", "nivel": 0.8}, {"tipo": "viento"} ], "p04": [ {"tipo": "sirena"}, {"tipo": "llantas", "n": 4} ] }
  Cada efecto ocupa la frase (desde su inicio hasta el inicio de la siguiente). Opciones: "nivel" (0 a 1, por defecto 0.6),
  "desde" y "hasta" (segundos relativos al inicio de la frase), "n" (cuántos, en llantas y glitch).
  Tipos: lluvia · viento · whoosh · pulso · motor · tension · sirena · llantas · glitch · riser · impacto · cola
--config: si se da, añade además un golpe de bajo en cada corte de toma (mismo reparto de tiempos que la plantilla).
La salida suma los efectos a la base (antes guarda la base en <salida>.base.wav la primera vez) y normaliza el pico a 0.95 como máximo.
No hay nada aleatorio sin semilla: la misma entrada da siempre el mismo audio.
"""
import argparse, json, os, shutil, sys
import numpy as np, soundfile as sf

SR = 44100
TIPOS = ['lluvia', 'viento', 'whoosh', 'pulso', 'motor', 'tension', 'sirena', 'llantas', 'glitch', 'riser', 'impacto', 'cola']

def fallo(msg):
    sys.exit('ERROR: ' + msg)

def lp(x, w):          # paso bajo: media móvil de w muestras
    w = max(1, int(w)); return x if w == 1 else np.convolve(x, np.ones(w) / w, mode='same')

def hp(x, w):          # paso alto: resta el paso bajo
    return x - lp(x, w)

def env_ar(n, a=0.02, r=0.3):
    e = np.ones(n); na = max(1, min(n, int(a * SR))); nr = max(1, min(n, int(r * SR)))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr)[: len(e[-nr:])]; return e

def barrido(rng, n, w0, w1, pasos=12):   # ruido filtrado cuyo tono sube (w0 > w1) o baja
    x = rng.standard_normal(n); out = np.zeros(n); b = np.linspace(0, n, pasos + 1).astype(int)
    for i in range(pasos):
        w = w0 * (w1 / w0) ** (i / (pasos - 1)); out[b[i]:b[i + 1]] = lp(x, w)[b[i]:b[i + 1]]
    return out / (np.max(np.abs(out)) + 1e-9)

# ---------- generadores: reciben (n muestras, nivel, rng, opciones) y devuelven un arreglo mono ----------
def g_lluvia(n, nv, rng, o):
    x = hp(rng.standard_normal(n), 40); x /= np.max(np.abs(x)) + 1e-9
    t = np.arange(n) / SR; x *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.37 * t + 1.1)
    gotas = (rng.random(n) > 0.9993) * rng.standard_normal(n); x += 0.5 * hp(lp(gotas, 3), 30) * 8
    return 0.22 * nv * x * env_ar(n, 0.4, 0.5)

def g_viento(n, nv, rng, o):
    x = lp(rng.standard_normal(n), 900); x /= np.max(np.abs(x)) + 1e-9; t = np.arange(n) / SR
    return 0.35 * nv * x * (0.55 + 0.45 * np.sin(2 * np.pi * 0.21 * t + 0.4)) * env_ar(n, 0.8, 0.8)

def g_whoosh(n, nv, rng, o):
    m = min(n, int(0.9 * SR)); x = barrido(rng, m, 260, 14); e = np.sin(np.linspace(0, np.pi, m)) ** 1.6
    out = np.zeros(n); out[:m] = x * e; return 0.55 * nv * out

def g_pulso(n, nv, rng, o):
    out = np.zeros(n); paso = int(SR / 1.733)
    for i in range(0, n, paso):
        L = min(int(0.3 * SR), n - i); t = np.arange(L) / SR; out[i:i + L] += np.sin(2 * np.pi * 62 * t) * np.exp(-t * 11)
    return 0.4 * nv * out

def g_motor(n, nv, rng, o):
    t = np.arange(n) / SR; f0 = np.linspace(o.get('rpm0', 36), o.get('rpm1', 36), n) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))
    fase = 2 * np.pi * np.cumsum(f0) / SR; x = sum(np.sin(k * fase) / k for k in (1, 2, 3, 4, 5)) + 0.2 * lp(rng.standard_normal(n), 30)
    x = np.tanh(1.8 * x) * (0.8 + 0.2 * np.sin(2 * np.pi * f0 * 0.25 * t)); return 0.3 * nv * x / 1.3 * env_ar(n, 0.3, 0.4)

def g_tension(n, nv, rng, o):
    t = np.arange(n) / SR; f = np.linspace(82, 150, n); fase = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(fase) + 0.5 * np.sin(1.5 * fase) + 0.25 * np.sin(2 * fase + 0.7); return 0.22 * nv * x * np.linspace(0.2, 1, n) * env_ar(n, 0.5, 0.4)

def g_sirena(n, nv, rng, o):
    t = np.arange(n) / SR; x = np.zeros(n)
    for ph, f_c, lfo in ((0.0, 1000, 0.55), (1.3, 880, 0.47)):
        f = f_c + 380 * np.sin(2 * np.pi * lfo * t + ph); fase = 2 * np.pi * np.cumsum(f) / SR; x += np.tanh(3 * np.sin(fase))
    return 0.16 * nv * lp(x, 4) / 2 * env_ar(n, 0.3, 0.3)

def g_llantas(n, nv, rng, o):
    out = np.zeros(n); k = int(o.get('n', 3))
    for i in range(k):
        L = int(rng.uniform(0.25, 0.5) * SR); p = int(rng.uniform(0.05, 0.85) * max(1, n - L));
        if p + L > n: L = n - p
        if L < 100: continue
        x = hp(lp(rng.standard_normal(L), 6), 40) * np.sin(np.linspace(0, np.pi, L)) ** 0.6; out[p:p + L] += x
    return 0.5 * nv * out / (np.max(np.abs(out)) + 1e-9)

def g_glitch(n, nv, rng, o):
    out = np.zeros(n); k = int(o.get('n', 3)); pos = np.linspace(0, max(0, n - int(0.3 * SR)), k).astype(int)
    for p in pos:
        L = int(0.22 * SR); base = np.round(rng.standard_normal(int(0.03 * SR)) * 3) / 3; x = np.tile(base, L // len(base) + 1)[:L] * (rng.random(L) > 0.15)
        x *= np.sign(np.sin(np.arange(L) * 0.37)); L2 = min(L, n - p); out[p:p + L2] += x[:L2] * np.linspace(1, 0.2, L2)
    return 0.3 * nv * out

def g_riser(n, nv, rng, o):
    x = barrido(rng, n, 400, 6, pasos=24) * np.linspace(0, 1, n) ** 2; return 0.5 * nv * x

def g_impacto(n, nv, rng, o):
    m = min(n, int(1.6 * SR)); t = np.arange(m) / SR; boom = np.sin(2 * np.pi * (34 + 70 * np.exp(-t * 7)) * t) * np.exp(-t * 2.6)
    ruido = lp(rng.standard_normal(m), 12) * np.exp(-t * 14) * 0.6; out = np.zeros(n); out[:m] = boom + ruido; return 0.9 * nv * out

def g_cola(n, nv, rng, o):
    t = np.arange(n) / SR; x = lp(rng.standard_normal(n), 60) * np.exp(-t * 1.6); return 0.3 * nv * x / (np.max(np.abs(x)) + 1e-9)

GEN = dict(lluvia=g_lluvia, viento=g_viento, whoosh=g_whoosh, pulso=g_pulso, motor=g_motor, tension=g_tension, sirena=g_sirena, llantas=g_llantas,
           glitch=g_glitch, riser=g_riser, impacto=g_impacto, cola=g_cola)
def tramos(tiempos):
    F = tiempos['frases']; out = {}
    for i, f in enumerate(F):
        a = 0.0 if i == 0 else f['ini'] - 0.05; b = tiempos['dur'] if i == len(F) - 1 else F[i + 1]['ini'] - 0.05
        out[f['id']] = (a, b)
    return out

def cortes(config, tiempos):
    """Instantes de inicio de cada toma (mismo reparto que crearTomas en la plantilla)."""
    tr = tramos(tiempos); orden = []
    for t in config['tomas']:
        if t['frase'] not in orden: orden.append(t['frase'])
    res = []
    for id in orden:
        a, b = tr[id]; n = sum(1 for t in config['tomas'] if t['frase'] == id)
        res += [a + (b - a) * k / n for k in range(n)]
    return res

def golpe(rng):
    L = int(0.3 * SR); t = np.arange(L) / SR; return (np.sin(2 * np.pi * (46 + 40 * np.exp(-t * 18)) * t) * np.exp(-t * 11) + 0.12 * lp(rng.standard_normal(L), 8) * np.exp(-t * 40))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cues', required=True); ap.add_argument('--config'); ap.add_argument('--tiempos', default='voz/tiempos.json')
    ap.add_argument('--base', default='audio/efectos.wav'); ap.add_argument('--salida', default='audio/efectos.wav'); ap.add_argument('--semilla', type=int, default=1984)
    a = ap.parse_args()
    for ruta, que in ((a.cues, 'los efectos'), (a.tiempos, 'los tiempos'), (a.base, 'el audio base')):
        if not os.path.exists(ruta): fallo(f'no existe {que}: {ruta}')
    try: cues = json.load(open(a.cues, encoding='utf-8')); tiempos = json.load(open(a.tiempos, encoding='utf-8'))
    except json.JSONDecodeError as e: fallo(f'JSON inválido: {e}')
    config = json.load(open(a.config, encoding='utf-8')) if a.config else None
    if not isinstance(cues, dict): fallo('efectos.json debe ser un objeto {frase: [efectos]}')
    tr = tramos(tiempos)
    for id, lista in cues.items():
        if id not in tr: fallo(f'la frase «{id}» de {a.cues} no existe en {a.tiempos} (hay: {", ".join(tr)})')
        if not isinstance(lista, list): fallo(f'«{id}» debe ser una lista de efectos')
        for e in lista:
            if e.get('tipo') not in GEN: fallo(f'«{id}»: tipo de efecto «{e.get("tipo")}» desconocido (hay: {", ".join(TIPOS)})')
            if not (0 <= e.get('nivel', 0.6) <= 1): fallo(f'«{id}»: "nivel" debe estar entre 0 y 1')
    base, sr = sf.read(a.base, dtype='float32', always_2d=True)
    if sr != SR: fallo(f'{a.base} debe estar a {SR} Hz (está a {sr})')
    respaldo = a.salida + '.base.wav'
    if a.salida == a.base:
        if not os.path.exists(respaldo): shutil.copy(a.base, respaldo)
        base, _ = sf.read(respaldo, dtype='float32', always_2d=True)       # siempre se suma sobre la base original: repetible
    rng = np.random.default_rng(a.semilla); N = base.shape[0]; extra = np.zeros(N); resumen = []
    def pon(x, t0):
        i = int(max(0, t0) * SR); j = min(N, i + len(x));
        if i < N and j > i: extra[i:j] += x[: j - i]
    for id, lista in cues.items():
        a0, b0 = tr[id]
        for e in lista:
            d = e.get('desde', 0.0); h = e.get('hasta', b0 - a0); t0 = a0 + d; t1 = min(a0 + h, b0)
            if t1 <= t0: fallo(f'«{id}»: el efecto «{e["tipo"]}» tiene "desde" >= "hasta"')
            n = int((t1 - t0) * SR); x = GEN[e['tipo']](n, e.get('nivel', 0.6), rng, e)
            pon(x, t0)
            resumen.append(f'{id} {e["tipo"]} {t0:.2f}-{t1:.2f} s')
    nc = 0
    if config:
        for t in cortes(config, tiempos)[1:]: pon(golpe(rng) * 0.55, t - 0.03); nc += 1
    mezcla = base + np.stack([extra, np.roll(extra, 30)], 1)[:, : base.shape[1]] if base.shape[1] == 2 else base + extra[:, None]
    pico = np.max(np.abs(mezcla)); mezcla = mezcla * (0.95 / pico) if pico > 0.95 else mezcla
    sf.write(a.salida, mezcla.astype('float32'), SR)
    print(f'{a.salida}: {N / SR:.2f} s · {len(resumen)} efecto(s) de escena + {nc} golpe(s) de corte · pico {np.max(np.abs(mezcla)):.2f}')
    for r in resumen: print('  ' + r)

if __name__ == '__main__':
    main()
