"""Ayudantes de las pruebas: clips sintéticos y mediciones con ffmpeg (sin dependencias extra)."""
import json, re, subprocess, sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from vidgen import config, ffutil

W, H, FPS = 360, 640, 30

def clip_rejilla(ruta, dur=2.0, ancho=W, alto=H):
    """Rejilla blanca estática sobre negro: cualquier zoom, pan o temblor se nota al comparar cuadros."""
    ffutil.ffmpeg('-f', 'lavfi', '-i', f'color=c=black:s={ancho}x{alto}:r={FPS}:d={dur},drawgrid=w=40:h=40:t=2:c=white', '-c:v', 'libx264', '-crf', '8', '-pix_fmt', 'yuv420p', ruta)

def clip_cuadro(ruta, dur=2.0, ancho=W, alto=H, lado=100):
    """Cuadrado blanco centrado sobre negro: su ancho y su posición medidos dan el zoom y el pan reales."""
    x, y = (ancho - lado) // 2, (alto - lado) // 2
    ffutil.ffmpeg('-f', 'lavfi', '-i', f'color=c=black:s={ancho}x{alto}:r={FPS}:d={dur},drawbox=x={x}:y={y}:w={lado}:h={lado}:color=white:t=fill', '-c:v', 'libx264', '-crf', '8', '-pix_fmt', 'yuv420p', ruta)

def caja_blanca(video, t, ancho=W, alto=H) -> tuple[int, int, int, int]:
    """(ancho, alto, x, y) de la región clara (>127) en el instante t, medida sobre el fotograma en gris. Exacta, sin dependencias."""
    r = subprocess.run([config.FFMPEG, '-hide_banner', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', str(video), '-frames:v', '1', '-vf', 'format=gray', '-f', 'rawvideo', '-'], capture_output=True)
    d = r.stdout
    if len(d) != ancho * alto: raise AssertionError(f'fotograma inesperado: {len(d)} bytes')
    xs, ys = [], []
    for y in range(alto):
        fila = d[y * ancho:(y + 1) * ancho]
        if max(fila) > 127:
            ys.append(y); xs += [i for i, v in enumerate(fila) if v > 127]
    if not xs: raise AssertionError('no hay región clara en el cuadro')
    return (max(xs) - min(xs) + 1, max(ys) - min(ys) + 1, min(xs), min(ys))

def clip_color(ruta, color, dur=2.0, ancho=W, alto=H):
    ffutil.ffmpeg('-f', 'lavfi', '-i', f'color=c={color}:s={ancho}x{alto}:r={FPS}:d={dur}', '-c:v', 'libx264', '-crf', '8', '-pix_fmt', 'yuv420p', ruta)

def cuadro(video, t, destino):
    ffutil.ffmpeg('-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', destino); return destino

def ssim(a, b) -> float:
    r = subprocess.run([config.FFMPEG, '-hide_banner', '-nostats', '-i', a, '-i', b, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-'], capture_output=True, text=True)
    return float(re.search(r' All:([0-9.]+)', r.stderr).group(1))

def psnr(a, b) -> float:
    r = subprocess.run([config.FFMPEG, '-hide_banner', '-nostats', '-i', a, '-i', b, '-lavfi', '[0:v][1:v]psnr', '-f', 'null', '-'], capture_output=True, text=True)
    v = re.search(r'average:([a-z0-9.]+)', r.stderr).group(1); return float('inf') if v == 'inf' else float(v)

def luma_media(video, t) -> float:
    r = subprocess.run([config.FFMPEG, '-hide_banner', '-nostats', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-'], capture_output=True, text=True)
    return float(re.search(r'signalstats\.YAVG=([0-9.]+)', r.stdout).group(1))

def tono(ruta, frecuencia=440, dur=1.0, amplitud=0.5):
    """Seno de amplitud pico `amplitud` (la fuente sine de lavfi trae 1/8 por defecto: se multiplica por 8)."""
    ffutil.ffmpeg('-f', 'lavfi', '-i', f'sine=f={frecuencia}:d={dur}:sample_rate=48000', '-af', f'volume={amplitud * 8}', '-ac', '2', '-c:a', 'pcm_s16le', ruta)

def rms_ventana(wav, a, b) -> float:
    """RMS (lineal) del tramo [a, b] s de un wav, medido con astats."""
    r = subprocess.run([config.FFMPEG, '-hide_banner', '-nostats', '-ss', f'{a:.3f}', '-t', f'{b - a:.3f}', '-i', wav, '-af', 'astats=metadata=1:reset=0,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], capture_output=True, text=True)
    v = re.findall(r'RMS_level=(-?[0-9.]+|-inf)', r.stdout)
    if not v or v[-1] == '-inf': return 0.0
    return 10 ** (float(v[-1]) / 20)

def lufs(wav_o_video) -> tuple[float, float]:
    r = subprocess.run([config.FFMPEG, '-hide_banner', '-nostats', '-i', wav_o_video, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    i = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', r.stderr)[-1]); tp = float(re.findall(r'Peak:\s+(-?[0-9.]+) dBFS', r.stderr)[-1]); return i, tp

class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix='vidgen_t_'); self.tmp = Path(self._tmp.name)
    def tearDown(self): self._tmp.cleanup()
