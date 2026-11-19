#!/usr/bin/env python3
"""Comprueba un workflow (formato API) contra el /object_info de TU servidor ComfyUI: clases de nodo, nombres de entradas y valores de lista
(los nombres de modelo, VAE, encoder... que no estén instalados salen aquí, antes de gastar GPU).
    python comfy/verificar_nodos.py [workflow.json ...]          (por defecto: los dos que trae el pipeline)
Usa COMFY_URL (por defecto http://127.0.0.1:8188). Sale con código 1 si encuentra problemas."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from vidgen import config
from vidgen.comfy_api import ClienteComfy, ErrorComfy

def opciones(decl) -> list | None:
    """Lista de valores permitidos de una entrada de tipo combo, o None si no es combo (soporta ['COMBO', {'options': [...]}] y [[...], {}])."""
    if not isinstance(decl, list) or not decl: return None
    if isinstance(decl[0], list): return decl[0]
    if decl[0] == 'COMBO' and len(decl) > 1 and isinstance(decl[1], dict): return decl[1].get('options')
    return None

def verificar(workflow: dict, info: dict) -> list[str]:
    problemas = []
    for nid, nodo in workflow.items():
        cls = nodo['class_type']; titulo = (nodo.get('_meta') or {}).get('title', cls)
        if cls not in info: problemas.append(f'nodo {nid} «{titulo}»: la clase {cls} no existe en este ComfyUI (¿versión antigua? actualízalo)'); continue
        decl = {**(info[cls].get('input') or {}).get('required', {}), **(info[cls].get('input') or {}).get('optional', {})}
        for nombre, valor in nodo['inputs'].items():
            if nombre not in decl: problemas.append(f'nodo {nid} «{titulo}» ({cls}): la entrada «{nombre}» no existe (tiene: {", ".join(sorted(decl))})'); continue
            if isinstance(valor, list) and len(valor) == 2 and isinstance(valor[0], str): continue          # enlace a otro nodo
            op = opciones(decl[nombre])
            if op is not None and valor not in op:
                problemas.append(f'nodo {nid} «{titulo}» ({cls}): «{nombre}» = {valor!r} no está entre los disponibles {op[:8]}{"…" if len(op) > 8 else ""}')
        for nombre in (info[cls].get('input') or {}).get('required', {}):
            if nombre not in nodo['inputs']: problemas.append(f'nodo {nid} «{titulo}» ({cls}): falta la entrada obligatoria «{nombre}»')
    return problemas

def main(argv):
    rutas = [Path(a) for a in argv] or sorted((config.RAIZ / 'comfy/workflows').glob('*.api.json'))
    try: info = ClienteComfy().nodos_disponibles()
    except ErrorComfy as e: print(f'ERROR: {e}'); return 2
    mal = 0
    for r in rutas:
        p = verificar(json.loads(r.read_text(encoding='utf-8')), info); mal += len(p)
        print(f'{r.name}: ' + ('OK' if not p else f'{len(p)} problema(s)')); [print('  -', x) for x in p]
    return 1 if mal else 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
