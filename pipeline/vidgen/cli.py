"""Línea de comandos:  python -m vidgen <etapa> guion.json [opciones]"""
import argparse, sys, time
from . import doctor, etapas, guion, ffutil, exportar
from .comfy_api import ErrorComfy
from .backends.blender import ErrorBlender

def main(argv=None):
    ap = argparse.ArgumentParser(prog='vidgen', description='Pipeline modular de video vertical 9:16')
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('doctor', help='revisa qué está instalado').add_argument('--sin-comfy', action='store_true')
    for nombre, ayuda in (('validar', 'valida el guion'), ('escenas', 'genera los clips base (lavfi, imagen, blender, comfy)'), ('efectos', 'zoom, pan, shake, glitch, flash, bloom...'),
                          ('textos', 'textos animados'), ('unir', 'une con transiciones y look final'), ('audio', 'mezcla voz, música, sfx, ducking, LUFS'),
                          ('exportar', 'MP4 H.264 final'), ('todo', 'todas las etapas en orden')):
        p = sub.add_parser(nombre, help=ayuda); p.add_argument('guion')
        if nombre in ('escenas', 'efectos', 'textos', 'todo'): p.add_argument('--solo', help='ids separados por coma'); p.add_argument('--forzar', action='store_true', help='ignora las huellas y rehace')
        if nombre in ('exportar', 'todo'): p.add_argument('--perfil', choices=sorted(exportar.PERFILES), default='tiktok')
        if nombre == 'validar': p.add_argument('--estricto', action='store_true', help='los archivos que faltan son errores')
        if nombre == 'audio': p.add_argument('--stems', help='carpeta donde guardar voz/música/sfx por separado')
    a = ap.parse_args(argv)
    if a.cmd == 'doctor': return doctor.imprimir(not a.sin_comfy)
    try:
        g = guion.cargar(a.guion); solo = a.solo.split(',') if getattr(a, 'solo', None) else None; forzar = getattr(a, 'forzar', False)
        if a.cmd == 'validar':
            errs, avs = guion.validar(g, a.estricto)
            for m in errs: print('  ERROR', m)
            for m in avs: print('  AVISO', m)
            _, total = guion.linea_tiempo(g); print(f'{len(g["escenas"])} escena(s) · {total:.1f} s · {len(errs)} error(es) · {len(avs)} aviso(s)'); return 1 if errs else 0
        errs, _ = guion.validar(g)
        if errs: print('El guion tiene errores (python -m vidgen validar):'); [print('  ERROR', m) for m in errs]; return 1
        if a.cmd == 'escenas': etapas.escenas(g, solo, forzar)
        elif a.cmd == 'efectos': etapas.efectos_etapa(g, solo, forzar)
        elif a.cmd == 'textos': etapas.textos_etapa(g, solo, forzar)
        elif a.cmd == 'unir': r, lt = etapas.unir_etapa(g); print(f'  {r} ({lt[-1]["inicio"] + lt[-1]["dur"]:.2f} s)')
        elif a.cmd == 'audio': r, m = etapas.audio_etapa(g, a.stems); print(f'  {r} (medido antes de normalizar: {m["input_i"]} LUFS)')
        elif a.cmd == 'exportar': print(f'  {etapas.exportar_etapa(g, a.perfil)}')
        elif a.cmd == 'todo': etapas.todo(g, a.perfil, forzar, solo)
    except (guion.ErrorGuion, ffutil.ErrorFFmpeg, ErrorComfy, ErrorBlender) as e:
        print(f'ERROR: {e}', file=sys.stderr); return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
