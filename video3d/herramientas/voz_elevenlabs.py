#!/usr/bin/env python3
"""Narración por frase con ElevenLabs (tiempos exactos por letra, pausas por bloque).

Uso (desde la carpeta del proyecto, donde está guion.json):
  ELEVENLABS_API_KEY=... python3 herramientas/voz_elevenlabs.py <voice_id> [velocidad=1.1] [--simulacro] [--guion ruta.json]

Orden de seguridad (para no perder créditos):
  1. Valida todo SIN llamar a la API: clave, voice_id, guion, ffmpeg, carpeta voz/.
  2. Por cada frase: si voz/r_<id>.json existe y el texto no cambió, lo reutiliza («usando respuesta guardada»).
     Si no, llama a la API y escribe la respuesta COMPLETA en voz/r_<id>.json antes de procesarla.
  3. Solo después decodifica el audio y une los archivos.
--simulacro: valida y muestra cuántos caracteres se gastarían, sin llamar a la API.
Clave: variable de entorno ELEVENLABS_API_KEY (nunca en archivos ni en el repo).
"""
import json, sys, re, base64, shutil, subprocess, urllib.request, urllib.error, os

def fallo(msg):
    sys.exit('ERROR (no se llamó a la API): ' + msg)

# ---------- 1. validación previa (sin red) ----------
args = sys.argv[1:]
simulacro = '--simulacro' in args
args = [a for a in args if a != '--simulacro']
ruta_guion = 'guion.json'
if '--guion' in args:
    i = args.index('--guion')
    if i + 1 >= len(args): fallo('--guion necesita una ruta.')
    ruta_guion = args[i + 1]; del args[i:i + 2]
if not args or not args[0].strip(): fallo('falta el voice_id. Uso: voz_elevenlabs.py <voice_id> [velocidad] [--simulacro]')
voz_id = args[0].strip()
if not re.fullmatch(r'[A-Za-z0-9]{10,40}', voz_id): fallo(f'voice_id con formato raro: {voz_id!r}')
try: veloc = float(args[1]) if len(args) > 1 else 1.1
except ValueError: fallo(f'velocidad no válida: {args[1]!r}')
if not 0.7 <= veloc <= 1.2: fallo(f'la velocidad debe estar entre 0.7 y 1.2 (recibí {veloc}).')

CLAVE = os.environ.get('ELEVENLABS_API_KEY', '')
if not CLAVE and not simulacro: fallo('falta la variable de entorno ELEVENLABS_API_KEY.')
if not CLAVE: print('aviso: ELEVENLABS_API_KEY no está definida (en simulacro no hace falta, pero sí para la ejecución real).')

try: guion = json.load(open(ruta_guion, encoding='utf-8'))
except FileNotFoundError: fallo(f'no encuentro {ruta_guion} (ejecuta desde la carpeta del proyecto o usa --guion).')
except json.JSONDecodeError as e: fallo(f'{ruta_guion} no es JSON válido: {e}')
frs = guion.get('frases') if isinstance(guion, dict) else None
if not isinstance(frs, list) or not frs: fallo(f'{ruta_guion} necesita una lista "frases" no vacía.')
ids = set()
for n, f in enumerate(frs, 1):
    if not isinstance(f, dict): fallo(f'frase {n}: debe ser un objeto con id, bloque y texto.')
    if not isinstance(f.get('id'), str) or not re.fullmatch(r'[A-Za-z0-9_-]+', f['id']): fallo(f'frase {n}: "id" debe ser texto de letras, números, _ o -.')
    if f['id'] in ids: fallo(f'frase {n}: id repetido {f["id"]!r}.')
    ids.add(f['id'])
    if not isinstance(f.get('texto'), str) or not f['texto'].strip(): fallo(f'frase {f["id"]}: "texto" vacío.')
    if f['texto'] != f['texto'].strip(): fallo(f'frase {f["id"]}: el texto tiene espacios al inicio o al final.')
    if 'bloque' in f and not isinstance(f['bloque'], str): fallo(f'frase {f["id"]}: "bloque" debe ser texto.')
if not shutil.which('ffmpeg'): fallo('ffmpeg no está en el PATH.')
try: os.makedirs('voz', exist_ok=True)
except OSError as e: fallo(f'no pude crear la carpeta voz/: {e}')

PAUSA = {'gancho': 0.0, 'desarrollo': 0.4, 'giro': 0.4, 'cierre': 0.35}
textos = [f['texto'] for f in frs]

def cache_ruta(f): return f'voz/r_{f["id"]}.json'
def meta_ruta(f): return f'voz/r_{f["id"]}.meta.json'

def cache_valida(f):
    """Devuelve (respuesta, motivo). respuesta es None si hay que llamar a la API."""
    ruta = cache_ruta(f)
    if not os.path.exists(ruta): return None, 'no hay respuesta guardada'
    try:
        r = json.load(open(ruta, encoding='utf-8'))
        if ''.join(r['alignment']['characters']) != f['texto']: return None, 'el texto de la frase cambió'
        if not r.get('audio_base64'): return None, 'la respuesta guardada no trae audio'
    except (json.JSONDecodeError, KeyError, TypeError): return None, 'la respuesta guardada está dañada'
    if os.path.exists(meta_ruta(f)):
        try:
            m = json.load(open(meta_ruta(f), encoding='utf-8'))
            if m.get('voz_id') != voz_id or m.get('veloc') != veloc: return None, 'cambió la voz o la velocidad'
        except json.JSONDecodeError: return None, 'metadatos dañados'
    return r, 'ok'

plan = [(f,) + cache_valida(f) for f in frs]
a_gastar = sum(len(f['texto']) for f, r, _ in plan if r is None)
nuevas = sum(1 for _, r, _ in plan if r is None)
print(f'{len(frs)} frase(s) · voz {voz_id} · velocidad {veloc} · {nuevas} llamada(s) a la API · {a_gastar} caracteres a gastar')
for f, r, motivo in plan:
    print(f'  {f["id"]}: {"usando respuesta guardada" if r else "llamará a la API (" + motivo + ")"} · {len(f["texto"])} caracteres')
if simulacro:
    print('SIMULACRO: todo válido; no se llamó a la API ni se escribió nada.'); sys.exit(0)

# ---------- 2. respuestas: se guardan completas ANTES de procesarlas ----------
llamadas = 0; respuestas = {}
for i, (f, r, _) in enumerate(plan):
    if r is not None:
        print(f'{f["id"]}: usando respuesta guardada', flush=True); respuestas[f['id']] = r; continue
    cuerpo = {'text': f['texto'], 'model_id': 'eleven_multilingual_v2', 'language_code': 'es',
              'voice_settings': {'stability': 0.35, 'similarity_boost': 0.8, 'style': 0.55, 'use_speaker_boost': True, 'speed': veloc}}
    if i > 0: cuerpo['previous_text'] = textos[i - 1]
    if i < len(textos) - 1: cuerpo['next_text'] = textos[i + 1]
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voz_id}/with-timestamps?output_format=mp3_44100_128',
                                 data=json.dumps(cuerpo).encode(), headers={'Content-Type': 'application/json', 'xi-api-key': CLAVE}, method='POST')
    llamadas += 1
    try: crudo = urllib.request.urlopen(req, timeout=120).read()
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode(errors='replace')[:400]); sys.exit(1)
    except (urllib.error.URLError, TimeoutError) as e:
        print('Error de red:', e); sys.exit(1)
    tmp = cache_ruta(f) + '.tmp'
    open(tmp, 'wb').write(crudo); os.replace(tmp, cache_ruta(f))      # respuesta completa, tal cual llegó
    json.dump({'voz_id': voz_id, 'veloc': veloc, 'texto': f['texto']}, open(meta_ruta(f), 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{f["id"]}: respuesta guardada en {cache_ruta(f)} ({len(crudo)} bytes)', flush=True)
    r, motivo = cache_valida(f)
    if r is None: print(f'La respuesta quedó guardada pero no sirve ({motivo}). Revisa {cache_ruta(f)}.'); sys.exit(1)
    respuestas[f['id']] = r
print(f'llamadas a la API: {llamadas}')

# ---------- 3. procesar (aquí un fallo ya no cuesta créditos) ----------
frases = []; t0 = 0.0; wavs = []
for i, f in enumerate(frs):
    r = respuestas[f['id']]
    mp3 = f'voz/p_{f["id"]}.mp3'; open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
    al = r['alignment']; ch = al['characters']; ini = al['character_start_times_seconds']; fin = al['character_end_times_seconds']
    texto = ''.join(ch)
    off = ini[0]                                                       # recorta el silencio inicial
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
