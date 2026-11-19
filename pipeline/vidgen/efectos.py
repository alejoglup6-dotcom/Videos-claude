"""Efectos de video con filtros reales de FFmpeg. Cada función devuelve texto de filtro; nada se ejecuta aquí salvo aplicar_escena()."""
from pathlib import Path
from . import ffutil

CURVAS = {'lineal': '{x}', 'ease_in': 'pow({x},3)', 'ease_out': '(1-pow(1-{x},3))', 'ease_in_out': '(0.5-0.5*cos(PI*{x}))'}

def _f(v) -> str:
    return f'{v:.5g}'

def normalizar(W: int, H: int, fps: int) -> str:
    """Llena el cuadro 9:16 sin deformar (recorta lo que sobre) y fija los fps."""
    return f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1,fps={fps}'

def zoom_pan(W, H, dur, zoom=None, pan=None) -> str | None:
    """Zoom y pan continuos con curva de aceleración. Usa scale(eval=frame)+crop: más limpio que zoompan en video."""
    if not zoom and not pan: return None
    z0, z1 = (zoom or {}).get('desde', 1.0), (zoom or {}).get('hasta', 1.0)
    x = f'min(t/{_f(dur)},1)'; p = CURVAS[(zoom or {}).get('curva', 'ease_out')].format(x=x)
    z = f'({_f(z0)}+({_f(z1)}-{_f(z0)})*{p})'
    dx, dy = (pan or {}).get('dx', 0.0), (pan or {}).get('dy', 0.0)
    return (f"scale=w='{W}*{z}':h='{H}*{z}':eval=frame:flags=bicubic,"
            f"crop={W}:{H}:x='(iw-{W})/2+{_f(dx)}*{W}*({p}-0.5)':y='(ih-{H})/2+{_f(dy)}*{H}*({p}-0.5)'")

def _ventana(t, dur, periodo=None) -> str:
    t0 = t or 0.0
    if periodo: return f'gte(t,{_f(t0)})*lt(mod(t-{_f(t0)},{_f(periodo)}),{_f(dur)})'
    return f'between(t,{_f(t0)},{_f(t0 + dur)})'

def shake(W, H, amp, t=None, dur=None) -> str:
    """Temblor de cámara: sube un poco la escala y recorta con un desplazamiento de senos. Con t y dur es un golpe que decae."""
    A = amp * W
    env = '1' if t is None else f'between(t,{_f(t)},{_f(t + dur)})*(1-(t-{_f(t)})/{_f(dur)})'
    return (f"scale=iw*{_f(1 + 4 * amp)}:ih*{_f(1 + 4 * amp)}:flags=bicubic,"
            f"crop={W}:{H}:x='(iw-{W})/2+{_f(A)}*{env}*(sin(t*43)+0.6*sin(t*97+1.3))':y='(ih-{H})/2+{_f(A)}*{env}*(cos(t*51)+0.6*sin(t*83+0.7))'")

def glitch(intensidad=0.5, t=0.0, dur=0.25, periodo=None) -> str:
    a = max(1, round(intensidad * 24)); en = _ventana(t, dur, periodo)
    return (f"rgbashift=rh=-{a}:bh={a}:gv={max(1, a // 2)}:edge=smear:enable='{en}',"
            f"noise=alls={max(5, round(intensidad * 80))}:allf=t:enable='{en}'")

def flash(intensidad=0.9, t=0.0, dur=0.15) -> str:
    """Destello blanco en el instante t que decae rápido (eq con brillo por cuadro)."""
    k = 3.0 / max(dur, 0.02)
    return f"eq=brightness='min(1,{_f(intensidad)}*exp(-{_f(k)}*(t-{_f(t)})))*gte(t,{_f(t)})':eval=frame"

def motion_blur(intensidad=0.5) -> str:
    return "tmix=frames=3:weights='1 2 1'" if intensidad <= 0.5 else "tmix=frames=5:weights='1 2 3 2 1'"

def aberracion(intensidad=0.5) -> str:
    a = max(1, round(intensidad * 6)); return f'rgbashift=rh=-{a}:bh={a}'

def zoom_punch(W, H, intensidad=0.5, t=0.0, dur=0.3) -> str:
    z = f"(1+{_f(intensidad * 0.16)}*exp(-{_f(8 / max(dur, 0.05))}*(t-{_f(t)}))*gte(t,{_f(t)}))"
    return f"scale=w='{W}*{z}':h='{H}*{z}':eval=frame:flags=bicubic,crop={W}:{H}"

def bloom_partes(intensidad=0.5, umbral=175, radio=18) -> str:
    """Resplandor: aísla las zonas claras, las desenfoca y las suma en modo 'screen'. Devuelve un trozo de grafo con entradas [IN] y salida [OUT]."""
    lut = f"lutrgb=r='if(gt(val,{umbral}),val,0)':g='if(gt(val,{umbral}),val,0)':b='if(gt(val,{umbral}),val,0)'"
    return f"[IN]split[ba][bb];[bb]{lut},gblur=sigma={radio}[bc];[ba][bc]blend=all_mode=screen:all_opacity={_f(0.25 + 0.6 * intensidad)}[OUT]"

def grafo_escena(e: dict, fmt: dict) -> str:
    """Grafo filter_complex que lleva [0:v] a [out] aplicando movimiento y efectos de la escena."""
    W, H, fps, dur = fmt['ancho'], fmt['alto'], fmt['fps'], e['duracion']
    mov = e.get('movimiento') or {}
    pasos: list = [normalizar(W, H, fps)]
    zp = zoom_pan(W, H, dur, mov.get('zoom'), mov.get('pan'))
    if zp: pasos.append(zp)
    if mov.get('shake'): pasos.append(shake(W, H, mov['shake']))
    for ef in e.get('efectos', []):
        d = {'tipo': ef} if isinstance(ef, str) else ef
        tipo, inten, t = d['tipo'], d.get('intensidad', 0.5), d.get('t')
        if tipo == 'shake':
            amp = 0.004 + 0.03 * inten                                  # con "t" es un golpe que decae; sin "t", un temblor continuo
            pasos.append(shake(W, H, amp, t, d.get('duracion', 0.4)) if t is not None else shake(W, H, amp))
        elif tipo == 'glitch': pasos.append(glitch(inten, t or 0.0, d.get('duracion', 0.25), d.get('periodo')))
        elif tipo == 'flash': pasos.append(flash(d.get('intensidad', 0.9), t or 0.0, d.get('duracion', 0.15)))
        elif tipo == 'motion_blur': pasos.append(motion_blur(inten))
        elif tipo == 'aberracion': pasos.append(aberracion(inten))
        elif tipo == 'zoom_punch': pasos.append(zoom_punch(W, H, inten, t or 0.0, d.get('duracion', 0.3)))
        elif tipo == 'bloom': pasos.append(('bloom', inten))
    partes, cur, n, lineal = [], '0:v', 0, []
    def vaciar():
        nonlocal cur, n, lineal
        if lineal: n += 1; partes.append(f'[{cur}]' + ','.join(lineal) + f'[n{n}]'); cur = f'n{n}'; lineal = []
    for p in pasos:
        if isinstance(p, tuple):
            vaciar(); n += 1; partes.append(bloom_partes(p[1]).replace('[IN]', f'[{cur}]').replace('[ba]', f'[ba{n}]').replace('[bb]', f'[bb{n}]').replace('[bc]', f'[bc{n}]').replace('[OUT]', f'[n{n}]')); cur = f'n{n}'
        else: lineal.append(p)
    lineal.append('format=yuv420p'); vaciar()
    partes[-1] = partes[-1].rsplit('[', 1)[0] + '[out]'
    return ';'.join(partes)

def aplicar_escena(entrada, salida, e: dict, fmt: dict) -> None:
    ffutil.ffmpeg('-i', entrada, '-filter_complex', grafo_escena(e, fmt), '-map', '[out]', '-t', _f(e['duracion']), *ffutil.INTERMEDIO, salida)

# ---------- look global (se aplica una sola vez sobre el video unido) ----------
LOOKS = {
    'neutro': '',
    'neon_nocturno': "eq=contrast=1.12:saturation=1.3:gamma=0.95,colorbalance=rs=-0.04:gs=-0.02:bs=0.08:rm=0.02:bm=0.05:rh=0.10:gh=-0.03:bh=-0.02,curves=all='0/0 0.2/0.14 0.6/0.62 1/1'",
    'calido_atardecer': "eq=contrast=1.08:saturation=1.2,colorbalance=rs=0.06:bs=-0.05:rm=0.05:bm=-0.03:rh=0.08:bh=-0.06",
    'frio_cinematografico': "eq=contrast=1.1:saturation=1.05,colorbalance=rs=-0.06:bs=0.08:rm=-0.02:bm=0.04:rh=0.07:gh=0.02:bh=-0.05",
}

def look_final(estilo: dict | None, base_lut: str | None = None) -> str:
    """Cadena de filtros del look final: color, LUT .cube opcional, viñeta y grano."""
    estilo = estilo or {}; f = []
    if LOOKS.get(estilo.get('look', 'neutro')): f.append(LOOKS[estilo['look']])
    if base_lut: f.append(f"lut3d=file='{Path(base_lut).as_posix()}'")
    if estilo.get('vineta'): f.append('vignette=angle=PI/5')
    if estilo.get('grano'): f.append(f"noise=alls={int(estilo['grano'])}:allf=t+u")
    return ','.join(f)
