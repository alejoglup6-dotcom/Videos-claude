import json, sys, base64, subprocess, urllib.request, urllib.error, os
voz_id = sys.argv[1]; veloc = float(sys.argv[2]) if len(sys.argv) > 2 else 1.1
guion = json.load(open('guion.json'))
PAUSA = {'gancho': 0.0, 'desarrollo': 0.4, 'giro': 0.4, 'cierre': 0.35}
textos = [f['texto'] for f in guion['frases']]
frases = []; t0 = 0.0; wavs = []
for i, f in enumerate(guion['frases']):
    cuerpo = {'text': f['texto'], 'model_id': 'eleven_multilingual_v2', 'language_code': 'es',
              'voice_settings': {'stability': 0.35, 'similarity_boost': 0.8, 'style': 0.55, 'use_speaker_boost': True, 'speed': veloc}}
    if i > 0: cuerpo['previous_text'] = textos[i - 1]
    if i < len(textos) - 1: cuerpo['next_text'] = textos[i + 1]
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voz_id}/with-timestamps?output_format=mp3_44100_128',
                                 data=json.dumps(cuerpo).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    cache = f'voz/r_{f["id"]}.json'
    try:
        r = json.load(open(cache)) if os.path.exists(cache) else json.load(urllib.request.urlopen(req, timeout=120))
        json.dump(r, open(cache, 'w'))
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:400]); sys.exit(1)
    mp3 = f'voz/p_{f["id"]}.mp3'; open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
    al = r['alignment']; ch = al['characters']; ini = al['character_start_times_seconds']; fin = al['character_end_times_seconds']
    texto = ''.join(ch)
    # recorta el silencio inicial
    off = ini[0]
    pausa = PAUSA.get(f.get('bloque'), 0.3) if i > 0 else 0.0
    pos = 0; palabras = []
    for w in f['texto'].split():
        k = texto.index(w, pos); pos = k + len(w)
        palabras.append({'w': w, 's': round(t0 + pausa + ini[k] - off, 3), 'e': round(t0 + pausa + fin[k + len(w) - 1] - off, 3)})
    dur = fin[-1] - off + 0.06
    frases.append({'id': f['id'], 'texto': f['texto'], 'ini': palabras[0]['s'], 'fin': palabras[-1]['e'], 'palabras': palabras, 'oido': f['texto']})
    wavs.append((mp3, off, pausa, dur)); t0 += pausa + dur
    print(f['id'], round(palabras[0]['s'], 2), round(palabras[-1]['e'], 2), flush=True)
# une con pausas
partes = []
for k, (mp3, off, pausa, dur) in enumerate(wavs):
    w = f'voz/p_{k}.wav'
    cortado = ['-ss', str(max(0, off)), '-t', str(dur), '-i', mp3]
    if pausa > 0:
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-t', str(pausa), '-i', 'anullsrc=r=44100:cl=mono'] + cortado + ['-filter_complex', '[1:a]aresample=44100,aformat=channel_layouts=mono[a];[0:a][a]concat=n=2:v=0:a=1', '-ar', '44100', '-ac', '1', w]
    else:
        cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + cortado + ['-ar', '44100', '-ac', '1', w]
    subprocess.run(cmd, check=True); partes.append(w)
open('voz/lista.txt', 'w').write(''.join(f"file '{os.path.abspath(p)}'\n" for p in partes))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'voz/lista.txt', '-c', 'copy', 'voz/narracion_raw.wav'], check=True)
tot = round(t0 + 0.4, 2)
json.dump({'dur': tot, 'frases': frases}, open('voz/tiempos.json', 'w'), ensure_ascii=False, indent=1)
print('total', tot)
