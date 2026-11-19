"""Escena de relleno procedural (sin dependencias): degradado animado con los colores de la paleta. Sirve para probar el pipeline y como storyboard."""
from pathlib import Path
from .. import efectos, ffutil

def generar(g, e, salida: Path, tmp: Path):
    W, H, fps = g['formato']['ancho'], g['formato']['alto'], g['formato']['fps']; aj = (e.get('ajustes') or {}).get('lavfi', {})
    pal = (g.get('estilo') or {}).get('paleta') or ['#1E0B52', '#E0307A']
    c0, c1 = aj.get('c0', pal[0]).lstrip('#'), aj.get('c1', pal[1 % len(pal)]).lstrip('#')
    ffutil.ffmpeg('-f', 'lavfi', '-i', f"gradients=s={W}x{H}:r={fps}:d={e['duracion']}:c0=0x{c0}:c1=0x{c1}:nb_colors=2:speed={aj.get('velocidad', 0.04)}:type={aj.get('tipo', 'linear')}",
                  '-vf', 'format=yuv420p', *ffutil.INTERMEDIO, salida)
