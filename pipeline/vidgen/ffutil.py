"""Llamadas a ffmpeg/ffprobe con errores legibles."""
import json, re, subprocess
from pathlib import Path
from . import config

class ErrorFFmpeg(RuntimeError): pass

def ejecutar(cmd: list) -> subprocess.CompletedProcess:
    cmd = [str(c) for c in cmd]
    try: r = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError: raise ErrorFFmpeg(f'No encuentro «{cmd[0]}». Instálalo o define FFMPEG/FFPROBE (ver README).')
    if r.returncode != 0:
        cola = '\n'.join(r.stderr.strip().splitlines()[-12:])
        raise ErrorFFmpeg(f'{Path(cmd[0]).name} falló (código {r.returncode}):\n{cola}\nComando: {" ".join(cmd)[:600]}')
    return r

def ffmpeg(*args) -> None:
    ejecutar([config.FFMPEG, '-hide_banner', '-y', '-loglevel', 'error', *args])

def sonda(ruta) -> dict:
    return json.loads(ejecutar([config.FFPROBE, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', ruta]).stdout)

def duracion(ruta) -> float:
    return float(sonda(ruta)['format']['duration'])

def video_info(ruta) -> dict:
    v = next(s for s in sonda(ruta)['streams'] if s['codec_type'] == 'video')
    n, d = (v.get('r_frame_rate') or '0/1').split('/'); fps = float(n) / float(d or 1)
    return {'ancho': int(v['width']), 'alto': int(v['height']), 'fps': fps, 'codec': v['codec_name'], 'perfil': v.get('profile'), 'pix_fmt': v.get('pix_fmt')}

def tiene_audio(ruta) -> bool:
    return any(s['codec_type'] == 'audio' for s in sonda(ruta)['streams'])

def transiciones_disponibles() -> list[str]:
    """Nombres reales de transiciones de xfade según el ffmpeg instalado (no una lista inventada)."""
    txt = ejecutar([config.FFMPEG, '-hide_banner', '-h', 'filter=xfade']).stdout
    return re.findall(r'^\s{4,}([a-z0-9]+)\s+\d+\s', txt, re.M)

def filtro_existe(nombre: str) -> bool:
    return re.search(rf'^ [TSC.]+ +{re.escape(nombre)} ', ejecutar([config.FFMPEG, '-hide_banner', '-filters']).stdout, re.M) is not None

# parámetros comunes para clips intermedios (casi sin pérdida, rápidos)
INTERMEDIO = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-an']
