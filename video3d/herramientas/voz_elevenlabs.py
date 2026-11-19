#!/usr/bin/env python3
"""Narración por frase con ElevenLabs (tiempos exactos por letra, pausas por bloque).

Uso (desde la carpeta del proyecto, donde está guion.json):
  ELEVENLABS_API_KEY=... python3 herramientas/voz_elevenlabs.py <voice_id> [velocidad=1.1] [--simulacro] [--guion ruta.json]
      [--modelo ID] [--idioma es] [--estabilidad 0.35] [--similitud 0.8] [--estilo 0.55] [--reutilizar-sin-meta]

Orden de seguridad (para no perder créditos):
  1. Valida todo SIN llamar a la API: clave, voice_id, guion, ffmpeg, carpeta voz/.
  2. Por cada frase: si voz/r_<id>.json existe y el texto no cambió, lo reutiliza («usando respuesta guardada»).
     Si no, llama a la API y escribe la respuesta COMPLETA en voz/r_<id>.json antes de procesarla.
  3. Solo después decodifica el audio y une los archivos.
--simulacro: valida y muestra cuántos caracteres se gastarían, sin llamar a la API.
Clave: variable de entorno ELEVENLABS_API_KEY (nunca en archivos ni en el repo).
ELEVENLABS_BASE_URL: dirección base de la API (por defecto https://api.elevenlabs.io); sirve para pruebas con un servidor local.
Rangos (se validan antes de llamar): velocidad 0.7-1.2; estabilidad, similitud y estilo 0-1.
Si existe voz/r_<id>.json pero no su .meta.json, NO se reutiliza: no se puede saber con qué voz y ajustes se generó.
Se detiene con un aviso; solo se reutiliza con --reutilizar-sin-meta (bajo tu responsabilidad).
La respuesta guardada solo se reutiliza si coinciden texto, voz, modelo, idioma y todos los ajustes de voz (voz/r_<id>.meta.json).
"""
import json, sys, re, base64, shutil, subprocess, urllib.request, urllib.error, os

def fallo(msg):
    sys.exit('ERROR (no se llamó a la API): ' + msg)

# ---------- 1. validación previa (sin red) ----------
args = sys.argv[1:]
simulacro = '--simulacro' in args
sin_meta_ok = '--reutilizar-sin-meta' in args
args = [a for a in args if a not in ('--simulacro', '--reutilizar-sin-meta')]
ruta_guion = 'guion.json'
if '--guion' in args:
    i = args.index('--guion')
    if i + 1 >= len(args): fallo('--guion necesita una ruta.')
    ruta_guion = args[i + 1]; del args[i:i + 2]
AJUSTES_VOZ = {'stability': 0.35, 'similarity_boost': 0.8, 'style': 0.55, 'use_speaker_boost': True}
MODELO = 'eleven_multilingual_v2'; IDIOMA = 'es'
OPCIONES = {'--estabilidad': 'stability', '--similitud': 'similarity_boost', '--estilo': 'style', '--modelo': 'model_id', '--idioma': 'language_code'}
for flag, clave_aj in OPCIONES.items():
    if flag in args:
        i = args.index(flag)
        if i + 1 >= len(args): fallo(f'{flag} necesita un valor.')
        v = args[i + 1]; del args[i:i + 2]
        if clave_aj == 'model_id': MODELO = v
        elif clave_aj == 'language_code': IDIOMA = v
        else:
            try: AJUSTES_VOZ[clave_aj] = float(v)
            except ValueError: fallo(f'{flag}: valor no numérico {v!r}')
            if not 0.0 <= AJUSTES_VOZ[clave_aj] <= 1.0: fallo(f'{flag} debe estar entre 0 y 1 (recibí {v}).')
if not MODELO.strip() or not IDIOMA.strip(): fallo('--modelo e --idioma no pueden estar vacíos.')
if not args or not args[0].strip(): fallo('falta el voice_id. Uso: voz_elevenlabs.py <voice_id> [velocidad] [--simulacro]')
voz_id = args[0].strip()
if not re.fullmatch(r'[A-Za-z0-9]{10,40}', voz_id): fallo(f'voice_id con formato raro: {voz_id!r}')
try: veloc = float(args[1]) if len(args) > 1 else 1.1
except ValueError: fallo(f'velocidad no válida: {args[1]!r}')
if not 0.7 <= veloc <= 1.2: fallo(f'la velocidad debe estar entre 0.7 y 1.2 (recibí {veloc}).')

AJUSTES = {'model_id': MODELO, 'language_code': IDIOMA, 'voice_settings': {**AJUSTES_VOZ, 'speed': veloc}}
BASE = os.environ.get('ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io').rstrip('/')
if not re.fullmatch(r'https?://[^\s/]+(/[^\s]*)?', BASE): fallo(f'ELEVENLABS_BASE_URL no es una dirección http(s) válida: {BASE!r}')
if BASE != 'https://api.elevenlabs.io': print(f'aviso: usando un servidor distinto del oficial: {BASE}')
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
    if not os.path.exists(meta_ruta(f)):
        return (r, 'sin metadatos, reutilizada por --reutilizar-sin-meta') if sin_meta_ok else (None, 'BLOQUEADA')
    if True:
        try: m = json.load(open(meta_ruta(f), encoding='utf-8'))
        except json.JSONDecodeError: return None, 'metadatos dañados'
        if 'voice_settings' not in m:                      # metadatos de la versión anterior: solo voz y velocidad
            if m.get('voz_id') != voz_id or m.get('veloc') != veloc: return None, 'cambió la voz o la velocidad'
        else:
            esperado = {'voz_id': voz_id, **AJUSTES}; dif = []
            for k, v in esperado.items():
                if k == 'voice_settings':
                    dif += [f'voice_settings.{kk}' for kk in sorted(set(v) | set(m.get(k, {}))) if m.get(k, {}).get(kk) != v.get(kk)]
                elif m.get(k) != v: dif.append(k)
            if dif: return None, 'cambió: ' + ', '.join(dif)
    return r, 'ok'

plan = [(f,) + cache_valida(f) for f in frs]
bloqueadas = [f for f, r, m in plan if r is None and m == 'BLOQUEADA']
a_gastar = sum(len(f['texto']) for f, r, m in plan if r is None and m != 'BLOQUEADA')
nuevas = sum(1 for _, r, m in plan if r is None and m != 'BLOQUEADA')
print(f'{len(frs)} frase(s) · voz {voz_id} · velocidad {veloc} · {nuevas} llamada(s) a la API · {a_gastar} caracteres a gastar')
for f, r, motivo in plan:
    if r is not None: est = 'usando respuesta guardada' + (' (SIN METADATOS, por --reutilizar-sin-meta)' if motivo.startswith('sin metadatos') else '')
    elif motivo == 'BLOQUEADA': est = 'BLOQUEADA: respuesta guardada SIN metadatos'
    else: est = f'llamará a la API ({motivo})'
    print(f'  {f["id"]}: {est} · {len(f["texto"])} caracteres')
if bloqueadas:
    ids = ', '.join(f['id'] for f in bloqueadas)
    print(f'\nDETENIDO (no se llamó a la API): hay respuesta guardada sin metadatos para: {ids}.\n'
          f'  Existe voz/r_<id>.json pero no su .meta.json, así que no se puede comprobar con qué voz y ajustes se generó.\n'
          f'  Opciones: borrar o mover esa respuesta para generarla de nuevo (gasta créditos), o reutilizarla bajo tu\n'
          f'  responsabilidad con --reutilizar-sin-meta.')
    sys.exit(1)
if simulacro:
    print('SIMULACRO: todo válido; no se llamó a la API ni se escribió nada.'); sys.exit(0)

# ---------- 2. respuestas: se guardan completas ANTES de procesarlas ----------
llamadas = 0; respuestas = {}
for i, (f, r, _) in enumerate(plan):
    if r is not None:
        print(f'{f["id"]}: usando respuesta guardada' + (' (sin metadatos)' if os.path.exists(meta_ruta(f)) is False else ''), flush=True); respuestas[f['id']] = r; continue
    cuerpo = {'text': f['texto'], **json.loads(json.dumps(AJUSTES))}
    if i > 0: cuerpo['previous_text'] = textos[i - 1]
    if i < len(textos) - 1: cuerpo['next_text'] = textos[i + 1]
    req = urllib.request.Request(f'{BASE}/v1/text-to-speech/{voz_id}/with-timestamps?output_format=mp3_44100_128',
                                 data=json.dumps(cuerpo).encode(), headers={'Content-Type': 'application/json', 'xi-api-key': CLAVE}, method='POST')
    llamadas += 1
    try: crudo = urllib.request.urlopen(req, timeout=120).read()
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode(errors='replace')[:400]); sys.exit(1)
    except (urllib.error.URLError, TimeoutError) as e:
        print('Error de red:', e); sys.exit(1)
    tmp = cache_ruta(f) + '.tmp'
    open(tmp, 'wb').write(crudo); os.replace(tmp, cache_ruta(f))      # respuesta completa, tal cual llegó
    json.dump({'voz_id': voz_id, 'texto': f['texto'], **json.loads(json.dumps(AJUSTES))}, open(meta_ruta(f), 'w', encoding='utf-8'), ensure_ascii=False)
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
