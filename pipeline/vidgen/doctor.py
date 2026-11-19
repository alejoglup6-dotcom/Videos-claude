"""Diagnóstico del entorno: qué está instalado y qué falta para cada backend."""
import platform, shutil, subprocess, sys
from . import config, ffutil

def _ver(cmd, n=1):
    try: return subprocess.run(cmd, capture_output=True, text=True, timeout=30).stdout.strip().splitlines()[0]
    except Exception: return None

def revisar(comfy: bool = True) -> tuple[list[tuple[str, str, str]], bool]:
    """Devuelve ([(estado, nombre, detalle)], todo_lo_obligatorio_ok). estado: OK / FALTA / AVISO / --"""
    r = []; obligatorio_ok = True
    def ok(n, d): r.append(('OK', n, d))
    def falta(n, d): nonlocal obligatorio_ok; obligatorio_ok = False; r.append(('FALTA', n, d))
    def aviso(n, d): r.append(('AVISO', n, d))
    ok('Python', f'{platform.python_version()} ({sys.executable})') if sys.version_info >= (3, 10) else falta('Python', f'{platform.python_version()}: se necesita 3.10 o superior')
    for m in ('requests', 'jsonschema'):
        try: __import__(m); ok(f'módulo {m}', 'instalado')
        except ImportError: falta(f'módulo {m}', 'pip install -r requirements.txt')
    v = _ver([config.FFMPEG, '-version'])
    if not v: falta('ffmpeg', 'no está en el PATH (instálalo o define FFMPEG)')
    else:
        ok('ffmpeg', v.split(' Copyright')[0])
        for f in ('xfade', 'sidechaincompress', 'loudnorm', 'rgbashift', 'tmix', 'lutrgb', 'gradients'):
            (ok if ffutil.filtro_existe(f) else falta)(f'  filtro {f}', 'disponible' if ffutil.filtro_existe(f) else 'este ffmpeg no lo trae')
        (ok if ffutil.filtro_existe('drawtext') else aviso)('  filtro drawtext', 'disponible' if ffutil.filtro_existe('drawtext') else 'sin él no hay textos con ffmpeg (compilar con libfreetype)')
        enc = subprocess.run([config.FFMPEG, '-hide_banner', '-encoders'], capture_output=True, text=True).stdout
        (ok if 'libx264 ' in enc else falta)('  encoder libx264', 'disponible' if 'libx264 ' in enc else 'falta libx264')
    ok('fuente para textos', config.fuente()) if config.fuente() else aviso('fuente para textos', 'ninguna TTF encontrada: define FUENTE=/ruta/fuente.ttf')
    b = config.blender()
    if b: ok('Blender', _ver([b, '--version']) or b)
    else: r.append(('--', 'Blender', 'no encontrado (solo hace falta para el backend blender): define BLENDER o ponlo en el PATH'))
    n = shutil.which('node'); r.append(('OK' if n else '--', 'Node', (_ver(['node', '-v']) or n) if n else 'no encontrado (solo para el kit Remotion de ../video3d)'))
    g = shutil.which('nvidia-smi')
    r.append(('OK' if g else '--', 'GPU NVIDIA', (_ver([g, '--query-gpu=name,memory.total', '--format=csv,noheader']) or 'nvidia-smi sin datos') if g else 'nvidia-smi no encontrado (CPU: válido para pruebas, lento para Blender y ComfyUI)'))
    if comfy:
        try:
            from .comfy_api import ClienteComfy; d = ClienteComfy(timeout=5).estado(); dev = d.get('devices') or [{}]
            ok('ComfyUI', f'{config.COMFY_URL} · {dev[0].get("name", "?")} · VRAM {round(dev[0].get("vram_total", 0) / 2**30, 1)} GB')
        except Exception as ex: r.append(('--', 'ComfyUI', f'{config.COMFY_URL}: {str(ex)[:90]} (solo para los backends comfy_t2v/comfy_i2v)'))
    return r, obligatorio_ok

def imprimir(comfy: bool = True) -> int:
    filas, ok = revisar(comfy)
    for est, n, d in filas: print(f'  [{est:>5}] {n:<22} {d}')
    print('\n' + ('Entorno listo para las etapas básicas.' if ok else 'Faltan requisitos obligatorios (FALTA).')); return 0 if ok else 1
