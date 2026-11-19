import json, sys, os, numpy as np, soundfile as sf, subprocess
os.makedirs('audio', exist_ok=True)   # carpeta de salida (ignorada por git)
SR = 44100
T = json.load(open('voz/tiempos.json')); dur = T['dur']
bpm = 104; beat = 60 / bpm
n = int(dur * SR); rng = np.random.default_rng(1984)
def nota(m): return 440 * 2 ** ((m - 69) / 12)
def saw(f, t): return 2 * ((f * t) % 1) - 1
def sq(f, t): return np.sign(np.sin(2 * np.pi * f * t))
def env(l, a=0.005, r=0.1):
    e = np.ones(l); na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr)[: len(e[-nr:])]; return e
def poner(buf, x, t0, g=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[: j - i] * g
mus = np.zeros(n); fx = np.zeros(n)
prog = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]  # Am F C G
barras = int(dur / (4 * beat)) + 2
for b in range(barras):
    raiz, acorde = prog[b % 4]; t0 = b * 4 * beat
    # pad
    L = int(4 * beat * SR); t = np.arange(L) / SR
    pad = sum(saw(nota(m) * (1 + d), t) for m in acorde for d in (-0.006, 0.006)) * 0.045
    pad *= env(L, 0.3, 0.4); poner(mus, pad, t0, 0.8)
    # bajo en corcheas con corte
    for k in range(8):
        tt = t0 + k * beat / 2; ln = int(beat / 2 * SR * 0.9); t = np.arange(ln) / SR
        poner(mus, (saw(nota(raiz), t) * 0.5 + sq(nota(raiz - 12), t) * 0.25) * env(ln, 0.003, 0.08) * 0.38, tt)
    # arpegio en semicorcheas
    for k in range(16):
        tt = t0 + k * beat / 4; m = acorde[[0, 1, 2, 1][k % 4]] + (12 if (k // 4) % 2 else 0); ln = int(beat / 4 * SR * 0.85); t = np.arange(ln) / SR
        poner(mus, sq(nota(m + 12), t) * env(ln, 0.002, 0.05) * 0.06, tt)
    # batería
    for k in range(4):
        tt = t0 + k * beat
        ln = int(0.22 * SR); t = np.arange(ln) / SR
        poner(mus, np.sin(2 * np.pi * (50 + 110 * np.exp(-t * 28)) * t) * np.exp(-t * 14) * 0.9, tt)  # bombo
        if k % 2 == 1:
            ln = int(0.2 * SR); t = np.arange(ln) / SR
            poner(mus, (rng.standard_normal(ln) * 0.5 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 18) * 0.6, tt)  # caja
    for k in range(8):
        ln = int(0.05 * SR); poner(mus, rng.standard_normal(ln) * np.exp(-np.arange(ln) / SR * 70) * 0.13, t0 + k * beat / 2 + beat / 4)  # hi-hat
# golpes de bajo en cada dato (inicio de cada frase menos la primera) + impacto en el gancho
inicios = [0.0] + [f['ini'] for f in T['frases'][1:]]
for k, ti in enumerate(inicios):
    ti = max(0, ti - 0.04); ln = int(0.9 * SR); t = np.arange(ln) / SR
    boom = np.sin(2 * np.pi * (38 + 90 * np.exp(-t * 9)) * t) * np.exp(-t * 3.2) * 1.0
    boom += np.sin(2 * np.pi * 76 * t) * np.exp(-t * 6) * 0.4
    poner(fx, boom * 0.9, ti)
    if k:  # subida corta antes del dato
        lr = int(0.35 * SR); t2 = np.arange(lr) / SR
        poner(fx, rng.standard_normal(lr) * np.linspace(0, 1, lr) ** 2 * 0.12, ti - 0.35)
# entrada y salida
mus *= np.minimum(1, np.arange(n) / (0.4 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.2 * SR))
def guarda(x, nombre):
    x = np.tanh(x * 1.1) * 0.8
    sf.write('audio/_tmp.wav', np.stack([x, np.roll(x, 40)], 1), SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'audio/_tmp.wav', '-af', 'lowpass=f=9000' if nombre == 'musica' else 'anull', f'audio/{nombre}.wav'], check=True)
guarda(mus, 'musica'); guarda(fx, 'efectos')
os.remove('audio/_tmp.wav')
print('musica', dur, 's, 104 bpm, La menor, golpes en', [round(i, 1) for i in inicios])
