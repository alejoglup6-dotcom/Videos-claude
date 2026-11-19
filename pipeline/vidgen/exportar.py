"""Exportación final H.264 + AAC optimizada para TikTok, Reels y Shorts."""
from pathlib import Path
from . import ffutil

PERFILES = {
    'prueba':  dict(crf=24, preset='veryfast', maxrate='8M',  bufsize='16M', audio='128k'),
    'tiktok':  dict(crf=18, preset='slow',     maxrate='14M', bufsize='28M', audio='192k'),
    'reels':   dict(crf=18, preset='slow',     maxrate='14M', bufsize='28M', audio='192k'),
    'shorts':  dict(crf=17, preset='slow',     maxrate='16M', bufsize='32M', audio='192k'),
}

def comando(video, audio, salida, perfil='tiktok') -> list:
    p = PERFILES[perfil]
    return ['-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0',
            '-c:v', 'libx264', '-preset', p['preset'], '-crf', p['crf'], '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p',
            '-maxrate', p['maxrate'], '-bufsize', p['bufsize'], '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
            '-movflags', '+faststart', '-c:a', 'aac', '-b:a', p['audio'], '-ar', 48000, '-ac', 2, '-shortest', salida]

def exportar(video, audio, salida, perfil='tiktok') -> Path:
    salida = Path(salida); salida.parent.mkdir(parents=True, exist_ok=True)
    ffutil.ffmpeg(*comando(video, audio, salida, perfil)); return salida
