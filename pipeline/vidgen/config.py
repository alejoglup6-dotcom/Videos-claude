"""Rutas y herramientas externas. Todo se puede cambiar con variables de entorno (nada va escrito a mano)."""
import os, shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent               # carpeta pipeline/
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
FFPROBE = os.environ.get('FFPROBE', 'ffprobe')
COMFY_URL = os.environ.get('COMFY_URL', 'http://127.0.0.1:8188').rstrip('/')    # ComfyUI local o en la nube (RunPod, Vast.ai...)
BUILD = Path(os.environ.get('VIDGEN_BUILD', RAIZ / 'build'))     # intermedios (ignorado por git)
SALIDA = Path(os.environ.get('VIDGEN_SALIDA', RAIZ / 'salida'))  # videos finales (ignorado por git)

def blender() -> str | None:
    """Ejecutable de Blender: variable BLENDER, o 'blender' en el PATH."""
    b = os.environ.get('BLENDER')
    if b: return b if Path(b).exists() or shutil.which(b) else None
    return shutil.which('blender')

def fuente() -> str | None:
    """Fuente TTF para drawtext: variable FUENTE, la del kit (OFL) o una del sistema."""
    # primero fuentes bold estáticas; la del kit (BigShouldersDisplay) es variable y FFmpeg usa su instancia más fina (sale hueca)
    candidatas = [os.environ.get('FUENTE'), '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
                  '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf', RAIZ.parent / 'video3d/plantilla/public/fuentes/BigShouldersDisplay.ttf']
    for c in candidatas:
        if c and Path(c).exists(): return str(c)
    return None
