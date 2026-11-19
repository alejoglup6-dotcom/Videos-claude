"""Carga, validación y línea de tiempo del guion JSON."""
import json
from pathlib import Path
import jsonschema
from . import config, ffutil

ESQUEMA = config.RAIZ / 'guion' / 'guion.schema.json'

class ErrorGuion(ValueError):
    def __init__(self, errores): self.errores = errores; super().__init__('\n'.join(errores))

def _ruta(e) -> str:
    out = ''
    for p in e.absolute_path: out += f'[{p}]' if isinstance(p, int) else (f'.{p}' if out else str(p))
    return out or '(raíz)'

def cargar(ruta) -> dict:
    ruta = Path(ruta)
    try: g = json.loads(ruta.read_text(encoding='utf-8'))
    except FileNotFoundError: raise ErrorGuion([f'No existe el guion: {ruta}'])
    except json.JSONDecodeError as e: raise ErrorGuion([f'{ruta} no es JSON válido: {e}'])
    esq = json.loads(ESQUEMA.read_text(encoding='utf-8'))
    errs = sorted(jsonschema.Draft202012Validator(esq).iter_errors(g), key=lambda e: list(map(str, e.absolute_path)))
    if errs: raise ErrorGuion([f'{_ruta(e)}: {e.message}' for e in errs])
    g['_base'] = str(ruta.resolve().parent)          # las rutas de archivos del guion son relativas a su carpeta
    return g

def ruta_de(g: dict, rel: str) -> Path:
    p = Path(rel); return p if p.is_absolute() else Path(g['_base']) / p

def linea_tiempo(g: dict, duraciones: dict | None = None) -> tuple[list[dict], float]:
    """Inicio/fin de cada escena en el video final. La transición de una escena es HACIA la siguiente y solapa ambas."""
    esc = g['escenas']; out = []; t = 0.0
    for i, e in enumerate(esc):
        dur = (duraciones or {}).get(e['id'], e['duracion'])
        tr = e.get('transicion') or {}
        d_tr = 0.0
        if i < len(esc) - 1 and tr.get('tipo', 'fade') != 'corte':
            sig = (duraciones or {}).get(esc[i + 1]['id'], esc[i + 1]['duracion'])
            d_tr = max(0.0, min(tr.get('duracion', 0.4), dur / 2, sig / 2))
        out.append({'id': e['id'], 'inicio': t, 'dur': dur, 'trans': d_tr, 'tipo_trans': (tr.get('tipo', 'fade') if d_tr else 'corte')})
        t += dur - d_tr
    return out, t

def validar(g: dict, estricto: bool = False) -> tuple[list[str], list[str]]:
    errores, avisos = [], []
    ids = [e['id'] for e in g['escenas']]
    for i in sorted({x for x in ids if ids.count(x) > 1}): errores.append(f'id de escena repetido: «{i}»')
    validas = set(ffutil.transiciones_disponibles()) | {'corte'}
    for e in g['escenas']:
        t = (e.get('transicion') or {}).get('tipo')
        if t and t not in validas: errores.append(f'{e["id"]}: la transición «{t}» no existe en este ffmpeg (hay: {", ".join(sorted(validas))})')
        tx = e.get('texto') or {}
        if tx and tx.get('fin', e['duracion']) > e['duracion'] + 1e-6: avisos.append(f'{e["id"]}: el texto termina ({tx["fin"]} s) después de la escena ({e["duracion"]} s)')
        if e['backend'] in ('imagen', 'comfy_i2v') and not e.get('imagen'): errores.append(f'{e["id"]}: el backend {e["backend"]} necesita "imagen"')
        if e['backend'] in ('blender', 'comfy_t2v', 'comfy_i2v', 'lavfi') and not e.get('prompt_visual') and e['backend'].startswith('comfy'): errores.append(f'{e["id"]}: el backend {e["backend"]} necesita "prompt_visual"')
        refs = [e.get('imagen')] + [(e.get('voz') or {}).get('archivo'), (e.get('musica') or {}).get('archivo')] + [s['archivo'] for s in e.get('sfx', [])]
        for r in filter(None, refs):
            if not ruta_de(g, r).exists(): (errores if estricto else avisos).append(f'{e["id"]}: no existe el archivo «{r}»')
    m = ((g.get('audio') or {}).get('musica') or {}).get('archivo')
    if m and not ruta_de(g, m).exists(): (errores if estricto else avisos).append(f'audio.musica: no existe el archivo «{m}»')
    lut = (g.get('estilo') or {}).get('lut')
    if lut and not ruta_de(g, lut).exists(): errores.append(f'estilo.lut: no existe «{lut}»')
    _, total = linea_tiempo(g)
    if not 30 <= total <= 40: avisos.append(f'duración total {total:.1f} s: fuera del rango de 30 a 40 s')
    return errores, avisos
