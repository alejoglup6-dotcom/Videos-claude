"""Textos grandes animados con drawtext (alternativa sin Node). Para tipografía avanzada ver el backend Remotion del kit video3d (pendiente)."""
import textwrap
from pathlib import Path
from . import config, ffutil

def _esc(ruta: str) -> str:
    return str(Path(ruta).as_posix()).replace(':', r'\:')

def filtros(e: dict, fmt: dict, carpeta_tmp: Path) -> list[str]:
    tx = e.get('texto')
    if not tx: return []
    fuente = config.fuente()
    if not fuente: raise ffutil.ErrorFFmpeg('No encuentro una fuente TTF para drawtext. Define FUENTE=/ruta/fuente.ttf')
    W, H, dur = fmt['ancho'], fmt['alto'], e['duracion']
    S = max(12, round(tx.get('tam', 0.07) * H)); t0 = tx.get('inicio', 0.15); t1 = min(tx.get('fin', dur - 0.15), dur)
    color = '0x' + tx.get('color', '#FFFFFF').lstrip('#'); estilo = tx.get('estilo', 'slam')
    y0 = {'arriba': 0.14, 'centro': 0.36, 'abajo': 0.66}[tx.get('posicion', 'centro')] * H
    ancho_car = max(6, int(0.88 * W / (S * 0.64)))
    lineas = textwrap.wrap(tx['contenido'], ancho_car) or [tx['contenido']]
    entrada = f'min(1,max(0,(t-{t0:.3f})/0.06))'; salida = f'min(1,max(0,({t1:.3f}-t)/0.12))'
    if estilo == 'slam': tam = f"{S}*(1+0.45*exp(-16*max(t-{t0:.3f},0)))"; alfa = f'{entrada}*{salida}'
    elif estilo == 'pop': tam = f"{S}*(0.35+0.65*(1-exp(-14*max(t-{t0:.3f},0)))+0.12*exp(-10*max(t-{t0:.3f},0)))"; alfa = f'{entrada}*{salida}'
    else: tam = str(S); alfa = f'min(1,max(0,(t-{t0:.3f})/0.35))*{salida}'
    carpeta_tmp.mkdir(parents=True, exist_ok=True); out = []
    for i, l in enumerate(lineas):
        arch = carpeta_tmp / f'{e["id"]}_{i}.txt'; arch.write_text(l, encoding='utf-8')
        out.append(f"drawtext=fontfile='{_esc(fuente)}':textfile='{_esc(arch)}':fontsize='{tam}':fontcolor={color}:alpha='{alfa}':"
                   f"borderw={max(2, round(S * 0.07))}:bordercolor=black@0.85:shadowx=3:shadowy=3:shadowcolor=black@0.55:"
                   f"x=(w-text_w)/2:y={y0 + i * S * 1.15:.1f}:enable='between(t,{t0:.3f},{t1:.3f})'")
    return out

def aplicar(entrada, salida, e: dict, fmt: dict, carpeta_tmp: Path) -> None:
    f = filtros(e, fmt, carpeta_tmp)
    if not f: ffutil.ffmpeg('-i', entrada, '-c', 'copy', salida); return
    ffutil.ffmpeg('-i', entrada, '-vf', ','.join(f) + ',format=yuv420p', *ffutil.INTERMEDIO, salida)
