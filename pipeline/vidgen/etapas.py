"""Etapas del pipeline. Cada una se puede ejecutar sola; las caras (escenas, efectos, textos) se saltan si su huella no cambió."""
import hashlib, json, time
from pathlib import Path
from . import audio, config, efectos, exportar, ffutil, guion, textos, unir
from .backends import blender as bk_blender, comfy as bk_comfy, imagen as bk_imagen, lavfi as bk_lavfi

BACKENDS = {'lavfi': bk_lavfi, 'imagen': bk_imagen, 'blender': bk_blender, 'comfy_t2v': bk_comfy, 'comfy_i2v': bk_comfy}

def carpeta(g, sub: str = '') -> Path:
    p = config.BUILD / g['proyecto'] / sub; p.mkdir(parents=True, exist_ok=True); return p

def _huella(*partes) -> str:
    return hashlib.sha1(json.dumps(partes, sort_keys=True, default=str, ensure_ascii=False).encode()).hexdigest()[:16]

def _archivo_sello(g, e) -> str:
    r = e.get('imagen'); p = guion.ruta_de(g, r) if r else None
    return f'{r}:{p.stat().st_mtime_ns}' if p and p.exists() else str(r)

def _seleccion(g, solo):
    ids = [e['id'] for e in g['escenas']]
    if solo:
        malos = [s for s in solo if s not in ids]
        if malos: raise guion.ErrorGuion([f'Escena(s) inexistente(s): {", ".join(malos)} (hay: {", ".join(ids)})'])
    return [e for e in g['escenas'] if not solo or e['id'] in solo]

def _etapa_clip(g, sub, entrada_sub, huella_fn, hacer, solo, forzar, nombre):
    out = []; d = carpeta(g, sub)
    for e in _seleccion(g, solo):
        destino = d / f'{e["id"]}.mp4'; sello = d / f'{e["id"]}.huella'; entrada = carpeta(g, entrada_sub) / f'{e["id"]}.mp4' if entrada_sub else None
        h = _huella(huella_fn(g, e), (carpeta(g, entrada_sub) / f'{e["id"]}.huella').read_text() if entrada_sub and (carpeta(g, entrada_sub) / f'{e["id"]}.huella').exists() else '')
        if entrada and not entrada.exists(): raise ffutil.ErrorFFmpeg(f'Falta {entrada}: ejecuta antes la etapa anterior para la escena {e["id"]}.')
        if destino.exists() and sello.exists() and sello.read_text() == h and not forzar:
            print(f'  {nombre} {e["id"]}: sin cambios (huella igual; --forzar para rehacer)'); out.append(destino); continue
        t0 = time.time(); hacer(g, e, entrada, destino); sello.write_text(h); out.append(destino)
        print(f'  {nombre} {e["id"]}: {e["duracion"]} s en {time.time() - t0:.1f} s')
    return out

def escenas(g, solo=None, forzar=False):
    tmp = carpeta(g, 'tmp')
    return _etapa_clip(g, 'escenas', None, lambda g, e: (e['backend'], e['duracion'], e.get('prompt_visual'), e.get('prompt_negativo'), _archivo_sello(g, e), e.get('camara'), e.get('ajustes'), g['formato'], (g.get('estilo') or {}).get('paleta')),
                       lambda g, e, ent, dest: BACKENDS[e['backend']].generar(g, e, dest, tmp), solo, forzar, 'escena')

def efectos_etapa(g, solo=None, forzar=False):
    return _etapa_clip(g, 'efectos', 'escenas', lambda g, e: (e['duracion'], e.get('movimiento'), e.get('efectos'), g['formato']),
                       lambda g, e, ent, dest: efectos.aplicar_escena(ent, dest, e, g['formato']), solo, forzar, 'efectos')

def textos_etapa(g, solo=None, forzar=False):
    tmp = carpeta(g, 'txt')
    return _etapa_clip(g, 'textos', 'efectos', lambda g, e: (e['duracion'], e.get('texto'), g['formato']),
                       lambda g, e, ent, dest: textos.aplicar(ent, dest, e, g['formato'], tmp), solo, forzar, 'texto')

def _clips(g, sub='textos'):
    cl = [carpeta(g, sub) / f'{e["id"]}.mp4' for e in g['escenas']]
    falta = [c.name for c in cl if not c.exists()]
    if falta: raise ffutil.ErrorFFmpeg(f'Faltan clips en {sub}/: {", ".join(falta)}. Ejecuta las etapas anteriores (escenas, efectos, textos).')
    return cl

def unir_etapa(g):
    ruta = carpeta(g) / 'unido.mp4'; lt = unir.unir(g, _clips(g), ruta); (carpeta(g) / 'linea_tiempo.json').write_text(json.dumps(lt, indent=1)); return ruta, lt

def _lt_real(g):
    ruta = carpeta(g) / 'linea_tiempo.json'
    if not ruta.exists(): raise ffutil.ErrorFFmpeg('Falta build/<proyecto>/linea_tiempo.json: ejecuta antes la etapa unir.')
    lt = json.loads(ruta.read_text()); return lt, lt[-1]['inicio'] + lt[-1]['dur']

def audio_etapa(g, stems=None):
    lt, total = _lt_real(g); ruta = carpeta(g) / 'audio.wav'; m = audio.mezclar(g, lt, total, ruta, Path(stems) if stems else None); return ruta, m

def exportar_etapa(g, perfil='tiktok'):
    return exportar.exportar(carpeta(g) / 'unido.mp4', carpeta(g) / 'audio.wav', config.SALIDA / f'{g["proyecto"]}.mp4', perfil)

def todo(g, perfil='tiktok', forzar=False, solo=None):
    t0 = time.time(); medidas = {}
    for nombre, fn in (('escenas', lambda: escenas(g, solo, forzar)), ('efectos', lambda: efectos_etapa(g, solo, forzar)), ('textos', lambda: textos_etapa(g, solo, forzar)),
                       ('unir', lambda: unir_etapa(g)), ('audio', lambda: audio_etapa(g)), ('exportar', lambda: exportar_etapa(g, perfil))):
        t = time.time(); print(f'[{nombre}]'); r = fn(); medidas[nombre] = round(time.time() - t, 1)
    print(f'[listo] {config.SALIDA / (g["proyecto"] + ".mp4")}  ({time.time() - t0:.1f} s: ' + ', '.join(f'{k} {v}' for k, v in medidas.items()) + ')')
    return config.SALIDA / f'{g["proyecto"]}.mp4', medidas
