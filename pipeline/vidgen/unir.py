"""Une los clips con transiciones reales de FFmpeg (xfade) o corte directo (concat) y aplica el look final."""
from pathlib import Path
from . import efectos, ffutil, guion

def grafo(n_clips: int, lt: list[dict], look: str) -> str:
    """lt = línea de tiempo calculada con las duraciones reales de los clips."""
    if n_clips == 1: acc, partes, acc_dur = '0:v', [], lt[0]['dur']
    else:
        partes, acc, acc_dur = [], '0:v', lt[0]['dur']
        for k in range(1, n_clips):
            prev, d, tipo = lt[k - 1], lt[k - 1]['trans'], lt[k - 1]['tipo_trans']
            if d > 0:
                partes.append(f'[{acc}][{k}:v]xfade=transition={tipo}:duration={d:.4f}:offset={acc_dur - d:.4f}[v{k}]'); acc_dur += lt[k]['dur'] - d
            else:
                partes.append(f'[{acc}][{k}:v]concat=n=2:v=1:a=0[v{k}]'); acc_dur += lt[k]['dur']
            acc = f'v{k}'
    cola = (look + ',' if look else '') + 'format=yuv420p'
    partes.append(f'[{acc}]{cola}[final]')
    return ';'.join(partes)

def unir(g: dict, clips: list[Path], salida: Path) -> list[dict]:
    reales = {e['id']: ffutil.duracion(c) for e, c in zip(g['escenas'], clips)}
    lt, total = guion.linea_tiempo(g, reales)
    estilo = g.get('estilo') or {}
    lut = str(guion.ruta_de(g, estilo['lut'])) if estilo.get('lut') else None
    entradas = [x for c in clips for x in ('-i', c)]
    ffutil.ffmpeg(*entradas, '-filter_complex', grafo(len(clips), lt, efectos.look_final(estilo, lut)), '-map', '[final]', '-r', g['formato']['fps'], *ffutil.INTERMEDIO, salida)
    return lt
