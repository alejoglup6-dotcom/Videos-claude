"""Mezcla de audio: voz por escena, música global con ducking, música/efectos por escena y normalización a LUFS en dos pasadas."""
import json, re
from pathlib import Path
from . import config, ffutil, guion

SR = 48000
FMT = f'aformat=sample_fmts=fltp:sample_rates={SR}:channel_layouts=stereo'

def _ms(s: float) -> int: return max(0, round(s * 1000))

def _bus(etiquetas: list[str], nombre: str, total: float, partes: list[str]) -> str | None:
    if not etiquetas: return None
    if len(etiquetas) == 1: partes.append(f'[{etiquetas[0]}]apad=whole_dur={total:.3f},atrim=0:{total:.3f}[{nombre}]')
    else: partes.append(''.join(f'[{x}]' for x in etiquetas) + f'amix=inputs={len(etiquetas)}:normalize=0:duration=longest,apad=whole_dur={total:.3f},atrim=0:{total:.3f}[{nombre}]')
    return nombre

def grafo(g: dict, lt: list[dict], total: float, con_stems: bool = False) -> tuple[list[str], str, dict]:
    """Devuelve (argumentos -i, filter_complex, etiquetas de stems)."""
    ent: list[str] = []; partes: list[str] = []; n = 0
    def entrada(ruta) -> int:
        nonlocal n; ent.extend(['-i', str(ruta)]); n += 1; return n - 1
    voz, sfx, emu = [], [], []
    for e, tl in zip(g['escenas'], lt):
        v = e.get('voz') or {}
        if v.get('archivo') and guion.ruta_de(g, v['archivo']).exists():
            i = entrada(guion.ruta_de(g, v['archivo'])); d = _ms(tl['inicio'] + v.get('inicio', 0))
            partes.append(f'[{i}:a]{FMT},adelay={d}|{d}[v{i}]'); voz.append(f'v{i}')
        for s in e.get('sfx', []):
            if not guion.ruta_de(g, s['archivo']).exists(): continue
            i = entrada(guion.ruta_de(g, s['archivo'])); d = _ms(tl['inicio'] + s.get('t', 0))
            partes.append(f"[{i}:a]{FMT},volume={s.get('volumen_db', 0)}dB,adelay={d}|{d}[s{i}]"); sfx.append(f's{i}')
        m = e.get('musica')
        if m and guion.ruta_de(g, m['archivo']).exists():
            i = entrada(guion.ruta_de(g, m['archivo'])); d = _ms(tl['inicio'] + m.get('inicio', 0)); fo = m.get('fade_out', 0.5)
            partes.append(f"[{i}:a]{FMT},afade=t=out:st={max(0, tl['dur'] - fo):.3f}:d={fo:.3f},volume={m.get('volumen_db', -12)}dB,adelay={d}|{d}[m{i}]"); emu.append(f'm{i}')
    mus = (g.get('audio') or {}).get('musica'); mus_et = None
    if mus and guion.ruta_de(g, mus['archivo']).exists():
        i = entrada(guion.ruta_de(g, mus['archivo'])); fi = mus.get('fade_in', 0.4); fo = mus.get('fade_out', 1.2)
        partes.append(f"[{i}:a]{FMT},aloop=loop=-1:size=2147483647,atrim=0:{total:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={fi:.3f},"
                      f"afade=t=out:st={max(0, total - fo):.3f}:d={fo:.3f},volume={mus.get('volumen_db', -18)}dB[mus]"); mus_et = 'mus'
    stems: dict = {}; sobrantes: list[str] = []
    vb = _bus(voz, 'vozb', total, partes); sb = _bus(sfx, 'sfxb', total, partes); eb = _bus(emu, 'emub', total, partes); mix = []
    if vb:
        partes.append('[vozb]asplit=3[voz_mix][voz_sc][voz_stem]'); mix.append('voz_mix'); stems['voz'] = 'voz_stem'
        if not mus_et: sobrantes.append('voz_sc')
    if mus_et:
        if vb and (g.get('audio') or {}).get('ducking', True):
            partes.append('[mus][voz_sc]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=400:makeup=1[musd]'); mus_final = 'musd'
        else: mus_final = 'mus'; sobrantes += ['voz_sc'] if vb else []
        partes.append(f'[{mus_final}]asplit=2[mus_mix][mus_stem]'); mix.append('mus_mix'); stems['musica'] = 'mus_stem'
    if sb: partes.append('[sfxb]asplit=2[sfx_mix][sfx_stem]'); mix.append('sfx_mix'); stems['sfx'] = 'sfx_stem'
    if eb: mix.append(eb)
    if not con_stems: sobrantes += list(stems.values()); stems = {}
    partes += [f'[{x}]anullsink' for x in sobrantes]            # ninguna salida del grafo puede quedar sin conectar
    if not mix:
        ent.extend(['-f', 'lavfi', '-t', f'{total:.3f}', '-i', f'anullsrc=r={SR}:cl=stereo']); partes.append(f'[{n}:a]anull[mezcla]')
    elif len(mix) == 1: partes.append(f'[{mix[0]}]anull[mezcla]')
    else: partes.append(''.join(f'[{x}]' for x in mix) + f'amix=inputs={len(mix)}:normalize=0:duration=longest,atrim=0:{total:.3f}[mezcla]')
    return ent, ';'.join(partes), stems

def _finito(x) -> bool:
    try: return abs(float(x)) != float('inf')
    except (TypeError, ValueError): return False

def _medir(wav, objetivo: float, tp: float, lra: float) -> dict:
    r = ffutil.ejecutar([config.FFMPEG, '-hide_banner', '-nostats', '-i', wav, '-af', f'loudnorm=I={objetivo}:TP={tp}:LRA={lra}:print_format=json', '-f', 'null', '-'])
    return json.loads(re.findall(r'\{[^{}]*\}', r.stderr)[-1])

def mezclar(g: dict, lt: list[dict], total: float, salida, stems_dir: Path | None = None) -> dict:
    """Mezcla y normaliza. Devuelve las medidas de loudnorm. Con stems_dir guarda voz/música/sfx por separado (para pruebas y depuración)."""
    salida = Path(salida); salida.parent.mkdir(parents=True, exist_ok=True)
    objetivo = (g.get('audio') or {}).get('lufs', -14.0); tp, lra = -1.5, 11.0
    ent, fc, stems = grafo(g, lt, total, con_stems=stems_dir is not None)
    previo = salida.with_suffix('.previo.wav')
    cmd = [*ent, '-filter_complex', fc, '-map', '[mezcla]', '-c:a', 'pcm_f32le', '-ar', SR, '-ac', 2, previo]
    if stems_dir:
        stems_dir = Path(stems_dir); stems_dir.mkdir(parents=True, exist_ok=True)
        for nombre, et in stems.items(): cmd += ['-map', f'[{et}]', '-c:a', 'pcm_f32le', '-ar', SR, '-ac', 2, stems_dir / f'{nombre}.wav']
    ffutil.ffmpeg(*cmd)
    m = _medir(previo, objetivo, tp, lra)                   # pasada 1: medir
    if not all(_finito(m[k]) for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset')):   # pista silenciosa: no hay nada que normalizar
        ffutil.ffmpeg('-i', previo, '-c:a', 'pcm_s16le', '-ar', SR, '-ac', 2, salida); previo.unlink(missing_ok=True); return m
    ln = (f"loudnorm=I={objetivo}:TP={tp}:LRA={lra}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    ffutil.ffmpeg('-i', previo, '-af', ln + ',aresample=48000', '-c:a', 'pcm_s16le', '-ar', SR, '-ac', 2, salida)   # pasada 2: aplicar
    previo.unlink(missing_ok=True)
    return m
