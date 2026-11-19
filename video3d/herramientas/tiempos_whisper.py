import json, sys, re
import os, pathlib
# Carpeta de modelos: variable MODELOS_DIR (por defecto video3d/modelos, ignorada por git)
MODELOS = pathlib.Path(os.environ.get('MODELOS_DIR') or pathlib.Path(__file__).resolve().parent.parent / 'modelos')
from faster_whisper import WhisperModel
import soundfile as sf, numpy as np
guion = json.load(open('guion.json')); marcas = json.load(open('voz/marcas_k.json'))
wav, sr = sf.read('voz/narracion_k.wav', dtype='float32')
m = WhisperModel(str(MODELOS / 'whisper' / 'large-v3-turbo'), device='cpu', compute_type='int8')
out = []
for f, mk in zip(guion['frases'], marcas):
    seg = wav[int(mk['ini'] * sr): int(mk['fin'] * sr)]
    segs, _ = m.transcribe(seg, language='es', word_timestamps=True)
    ws = [w for s in segs for w in s.words]
    oido = ''.join(w.word for w in ws).strip()
    pal = f['texto'].split()
    dur = mk['fin'] - mk['ini']
    if len(ws) == len(pal):
        pw = [{'w': p, 's': round(mk['ini'] + w.start, 3), 'e': round(mk['ini'] + w.end, 3)} for p, w in zip(pal, ws)]
        modo = 'whisper'
    else:
        a0 = mk['ini'] + (ws[0].start if ws else 0); a1 = mk['ini'] + (ws[-1].end if ws else dur)
        pesos = [max(2, len(re.sub(r'\W', '', p))) + (3 if p[-1] in ',.:?' else 0) for p in pal]
        tot = sum(pesos); t = a0; pw = []
        for p, pe in zip(pal, pesos):
            d = (a1 - a0) * pe / tot; pw.append({'w': p, 's': round(t, 3), 'e': round(t + d, 3)}); t += d
        modo = 'proporcional'
    out.append({'id': f['id'], 'texto': f['texto'], 'ini': round(mk['ini'], 3), 'fin': round(mk['fin'], 3), 'palabras': pw, 'oido': oido})
    print(f['id'], modo, '|', oido)
dur = round(marcas[-1]['fin'] + 0.5, 2)
json.dump({'dur': dur, 'frases': out}, open('voz/tiempos.json', 'w'), ensure_ascii=False, indent=1)
print('dur', dur)
