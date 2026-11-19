import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
guion = json.load(open(sys.argv[1])); voz = sys.argv[2]; veloc = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
pipe = KPipeline(lang_code='e', repo_id='hexgrad/Kokoro-82M')
SR = 24000
partes = []; info = []
for f in guion['frases']:
    audio = np.concatenate([np.asarray(a, dtype=np.float32) for _, _, a in pipe(f['texto'], voice=voz, speed=veloc)])
    # recorta silencios largos de los extremos
    nz = np.where(np.abs(audio) > 0.01)[0]
    if len(nz): audio = audio[max(0, nz[0] - 600): nz[-1] + 900]
    partes.append(audio); info.append(f['id'])
    print(f['id'], round(len(audio) / SR, 2), 's', flush=True)
pausa = {'gancho': 0.12, 'desarrollo': 0.16, 'giro': 0.2, 'cierre': 0.2}
out = []; marcas = []; t = 0.0
for f, a in zip(guion['frases'], partes):
    marcas.append({'id': f['id'], 'ini': t, 'fin': t + len(a) / SR})
    out.append(a); t += len(a) / SR
    p = pausa.get(f.get('bloque'), 0.15); out.append(np.zeros(int(p * SR), dtype=np.float32)); t += p
wav = np.concatenate(out)
sf.write('voz/narracion_k.wav', wav, SR)
json.dump(marcas, open('voz/marcas_k.json', 'w'))
print('total', round(len(wav) / SR, 2))
