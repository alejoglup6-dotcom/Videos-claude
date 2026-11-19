#!/usr/bin/env python3
"""Prueba de herramientas/voz_elevenlabs.py SIN gastar créditos (no toca la API real).

Levanta un servidor HTTP local que imita /v1/text-to-speech/<voz>/with-timestamps (audio mp3 real +
alineación por letra) y apunta el script ahí con ELEVENLABS_BASE_URL. Comprueba:
  A. API respondió y luego falló el procesamiento (un «ffmpeg» falso que falla): las respuestas ya estaban
     guardadas en voz/r_<id>.json y el servidor recibió exactamente 1 llamada por frase.
  B. Al reintentar: 0 llamadas nuevas («usando respuesta guardada») y salen narracion_raw.wav y tiempos.json.
  C. --simulacro: cambiar voz, modelo, idioma, estabilidad, similitud, estilo, velocidad o texto obliga a llamar
     de nuevo; sin cambios no; y el simulacro nunca llama al servidor.
  D. Una llamada real tras cambiar un ajuste vuelve a llamar (el cuerpo enviado trae los ajustes nuevos).
Uso:  python3 video3d/pruebas/prueba_voz_sin_creditos.py        (necesita ffmpeg; no necesita red ni clave)
Sale con código 0 si todo pasa, 1 si algo falla.
"""
import base64, json, os, re, shutil, stat, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SCRIPT = RAIZ / 'herramientas' / 'voz_elevenlabs.py'
CLAVE = 'clave-de-prueba'
VOZ = 'TX3LPaxmHKxFdv7VOQHJ'
GUION = {'frases': [
    {'id': 'p01', 'bloque': 'gancho', 'texto': 'Dicen que un OVNI te roba tres días en GTA seis.'},
    {'id': 'p02', 'bloque': 'desarrollo', 'texto': 'Nadie lo ha podido probar todavía.'}]}
FALLAS = []

def comprueba(ok, msg, extra=''):
    print(f'  [{"OK" if ok else "FALLA"}] {msg}' + (f'  ({extra})' if extra and not ok else ''))
    if not ok: FALLAS.append(msg)

# ---------- servidor falso ----------
class Estado: llamadas = 0; cuerpos = []; claves = []
MP3 = {}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); cuerpo = json.loads(self.rfile.read(n))
        Estado.llamadas += 1; Estado.cuerpos.append((self.path, cuerpo)); Estado.claves.append(self.headers.get('xi-api-key'))
        if not re.fullmatch(r'/v1/text-to-speech/[A-Za-z0-9]+/with-timestamps', self.path.split('?')[0]) or self.headers.get('xi-api-key') != CLAVE:
            self.send_response(401); self.end_headers(); self.wfile.write(b'{"detail":"no autorizado"}'); return
        texto = cuerpo['text']; dur = 0.04 * len(texto) + 0.3
        ini = [round(0.3 + 0.04 * i, 3) for i in range(len(texto))]; fin = [round(t + 0.04, 3) for t in ini]
        r = {'audio_base64': base64.b64encode(MP3['mp3']).decode(),
             'alignment': {'characters': list(texto), 'character_start_times_seconds': ini, 'character_end_times_seconds': fin},
             'normalized_alignment': {'characters': list(texto), 'character_start_times_seconds': ini, 'character_end_times_seconds': fin}}
        data = json.dumps(r).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)

def correr(trabajo, args, path_extra=None, clave=CLAVE, base=None):
    env = {k: v for k, v in os.environ.items() if k.lower() not in ('http_proxy', 'https_proxy', 'all_proxy')}
    env.update({'ELEVENLABS_API_KEY': clave, 'ELEVENLABS_BASE_URL': base, 'NO_PROXY': '127.0.0.1,localhost', 'no_proxy': '127.0.0.1,localhost'})
    if path_extra: env['PATH'] = path_extra + os.pathsep + env['PATH']
    return subprocess.run([sys.executable, '-I', str(SCRIPT), VOZ, '1.1', '--guion', str(trabajo / 'guion.json')] + args,
                          cwd=trabajo, env=env, capture_output=True, text=True, timeout=120)

def main():
    if not shutil.which('ffmpeg'): sys.exit('Esta prueba necesita ffmpeg en el PATH.')
    tmp = Path(tempfile.mkdtemp(prefix='prueba_voz_'))
    try:
        MP3['mp3'] = b''
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=f=300:d=3', '-b:a', '64k', str(tmp / 'tono.mp3')], check=True)
        MP3['mp3'] = (tmp / 'tono.mp3').read_bytes()
        trabajo = tmp / 'proyecto'; trabajo.mkdir()
        (trabajo / 'guion.json').write_text(json.dumps(GUION, ensure_ascii=False), encoding='utf-8')
        srv = ThreadingHTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{srv.server_address[1]}'; print(f'Servidor de prueba en {base} (no es la API real)')

        # fake ffmpeg: existe en el PATH (pasa la validación previa) pero falla al usarlo
        falso = tmp / 'bin_falso'; falso.mkdir(); f = falso / 'ffmpeg'
        f.write_text('#!/bin/sh\necho "ffmpeg falso: fallo forzado" >&2\nexit 1\n'); f.chmod(f.stat().st_mode | stat.S_IEXEC)

        print('\nA. La API responde y luego falla el procesamiento')
        r = correr(trabajo, [], path_extra=str(falso), base=base)
        comprueba(r.returncode != 0, 'el script termina con error (fallo forzado)', f'código {r.returncode}')
        comprueba(Estado.llamadas == 2, 'el servidor recibió 2 llamadas (1 por frase)', f'recibió {Estado.llamadas}')
        for fid in ('p01', 'p02'):
            ruta = trabajo / 'voz' / f'r_{fid}.json'
            ok = ruta.exists()
            if ok:
                try: j = json.loads(ruta.read_text()); ok = bool(j['audio_base64']) and ''.join(j['alignment']['characters']) == next(x['texto'] for x in GUION['frases'] if x['id'] == fid)
                except Exception: ok = False
            comprueba(ok, f'voz/r_{fid}.json estaba escrito, completo y legible antes del fallo')
            comprueba((trabajo / 'voz' / f'r_{fid}.meta.json').exists(), f'voz/r_{fid}.meta.json escrito')
        comprueba(not (trabajo / 'voz' / 'narracion_raw.wav').exists(), 'no quedó narracion_raw.wav (el fallo fue real)')
        comprueba(all(c == CLAVE for c in Estado.claves), 'la clave viajó en el encabezado xi-api-key')

        print('\nB. Reintento con ffmpeg real: debe reutilizar la respuesta guardada')
        antes = Estado.llamadas
        r = correr(trabajo, [], base=base)
        comprueba(r.returncode == 0, 'el reintento termina bien', (r.stdout + r.stderr)[-300:])
        comprueba(Estado.llamadas == antes, '0 llamadas nuevas al servidor', f'{Estado.llamadas - antes} nuevas')
        comprueba(r.stdout.count('usando respuesta guardada') >= 2, 'imprime «usando respuesta guardada» por cada frase')
        comprueba('llamadas a la API: 0' in r.stdout, 'informa «llamadas a la API: 0»')
        raw = trabajo / 'voz' / 'narracion_raw.wav'; tj = trabajo / 'voz' / 'tiempos.json'
        comprueba(raw.exists() and tj.exists(), 'se generaron narracion_raw.wav y tiempos.json')
        if tj.exists():
            t = json.loads(tj.read_text()); ps = [p for fr in t['frases'] for p in fr['palabras']]
            comprueba(len(t['frases']) == 2 and all(a['s'] < b['s'] for a, b in zip(ps, ps[1:])), 'tiempos.json: 2 frases con palabras en orden creciente')
        if raw.exists():
            d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(raw)], capture_output=True, text=True).stdout)
            comprueba(d > 2, f'narracion_raw.wav dura {d:.2f} s')

        print('\nC. --simulacro: qué obliga a volver a llamar')
        antes = Estado.llamadas
        def simula(args, esperadas, nombre):
            r = correr(trabajo, args + ['--simulacro'], base=base)
            m = re.search(r'(\d+) llamada\(s\)', r.stdout)
            comprueba(r.returncode == 0 and m and int(m.group(1)) == esperadas, f'{nombre}: {esperadas} llamada(s) prevista(s)', (r.stdout + r.stderr)[:200])
        simula([], 0, 'sin cambios')
        simula(['--estabilidad', '0.5'], 2, 'cambia stability')
        simula(['--similitud', '0.7'], 2, 'cambia similarity_boost')
        simula(['--estilo', '0.2'], 2, 'cambia style')
        simula(['--modelo', 'eleven_turbo_v2_5'], 2, 'cambia model_id')
        simula(['--idioma', 'en'], 2, 'cambia language_code')
        env = dict(os.environ, ELEVENLABS_API_KEY=CLAVE, ELEVENLABS_BASE_URL=base, NO_PROXY='127.0.0.1')
        r = subprocess.run([sys.executable, '-I', str(SCRIPT), VOZ, '1.0', '--guion', str(trabajo / 'guion.json'), '--simulacro'], cwd=trabajo, env=env, capture_output=True, text=True)
        m = re.search(r'(\d+) llamada\(s\)', r.stdout); comprueba(m and int(m.group(1)) == 2, 'cambia speed (1.1 → 1.0): 2 llamada(s) prevista(s)')
        r = subprocess.run([sys.executable, '-I', str(SCRIPT), 'AAAAAAAAAAAAAAAAAAAA', '1.1', '--guion', str(trabajo / 'guion.json'), '--simulacro'], cwd=trabajo, env=env, capture_output=True, text=True)
        m = re.search(r'(\d+) llamada\(s\)', r.stdout); comprueba(m and int(m.group(1)) == 2, 'cambia la voz: 2 llamada(s) prevista(s)')
        g2 = json.loads(json.dumps(GUION)); g2['frases'][1]['texto'] = 'Nadie lo ha podido probar todavía, dicen.'
        (trabajo / 'guion2.json').write_text(json.dumps(g2, ensure_ascii=False), encoding='utf-8')
        r = subprocess.run([sys.executable, '-I', str(SCRIPT), VOZ, '1.1', '--guion', str(trabajo / 'guion2.json'), '--simulacro'], cwd=trabajo, env=env, capture_output=True, text=True)
        m = re.search(r'(\d+) llamada\(s\)', r.stdout); comprueba(m and int(m.group(1)) == 1, 'cambia el texto de una frase: 1 llamada prevista (solo esa)')
        comprueba(Estado.llamadas == antes, 'el simulacro nunca llamó al servidor', f'{Estado.llamadas - antes} llamadas')

        print('\nD. Llamada real tras cambiar un ajuste')
        antes = Estado.llamadas
        r = correr(trabajo, ['--estabilidad', '0.5'], base=base)
        comprueba(r.returncode == 0 and Estado.llamadas == antes + 2, 'vuelve a llamar (2 llamadas nuevas)', (r.stdout + r.stderr)[-200:])
        cuerpo = Estado.cuerpos[-1][1]
        comprueba(cuerpo['voice_settings']['stability'] == 0.5 and cuerpo['model_id'] == 'eleven_multilingual_v2' and cuerpo['language_code'] == 'es' and cuerpo['voice_settings']['speed'] == 1.1,
                  'el cuerpo enviado trae stability 0.5, modelo, idioma y velocidad')
        meta = json.loads((trabajo / 'voz' / 'r_p01.meta.json').read_text())
        comprueba(meta['voice_settings']['stability'] == 0.5 and {'voz_id', 'texto', 'model_id', 'language_code', 'voice_settings'} <= set(meta)
                  and {'stability', 'similarity_boost', 'style', 'speed'} <= set(meta['voice_settings']), 'r_p01.meta.json trae voz, texto, modelo, idioma y los 4 ajustes')
        antes = Estado.llamadas
        r = correr(trabajo, ['--estabilidad', '0.5'], base=base)
        comprueba(r.returncode == 0 and Estado.llamadas == antes, 'con los mismos ajustes nuevos, otra vez 0 llamadas')
        srv.shutdown()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('\n' + ('TODO OK' if not FALLAS else f'FALLARON {len(FALLAS)} comprobación(es)'))
    sys.exit(1 if FALLAS else 0)

main()
