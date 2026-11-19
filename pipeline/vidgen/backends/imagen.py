"""Escena a partir de una imagen fija (el movimiento lo pone la etapa de efectos: zoom/pan)."""
from pathlib import Path
from .. import efectos, ffutil, guion

def generar(g, e, salida: Path, tmp: Path):
    f = g['formato']
    ffutil.ffmpeg('-loop', 1, '-framerate', f['fps'], '-i', guion.ruta_de(g, e['imagen']), '-t', e['duracion'], '-vf', efectos.normalizar(f['ancho'], f['alto'], f['fps']) + ',format=yuv420p', *ffutil.INTERMEDIO, salida)
