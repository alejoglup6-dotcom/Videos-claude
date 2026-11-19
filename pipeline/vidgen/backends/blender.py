"""Render 3D con Blender en modo headless: blender -b -P blender/escena_neon.py -- --params params.json  → PNG → clip."""
import hashlib, json, os, shutil, subprocess
from pathlib import Path
from .. import config, efectos, ffutil

class ErrorBlender(RuntimeError): pass

def parametros(g, e) -> dict:
    f = g['formato']; aj = (e.get('ajustes') or {}).get('blender', {}); cam = dict(e.get('camara') or {})
    p = {'ancho': f['ancho'], 'alto': f['alto'], 'fps': aj.get('fps_render', f['fps']), 'duracion': e['duracion'],
         'semilla': int(hashlib.sha1(e['id'].encode()).hexdigest()[:6], 16) % 1000, 'samples': aj.get('samples', 48), 'escala': aj.get('escala', 1.0),
         'camara': {'tipo': {'fija': 'fija'}.get(cam.get('tipo'), cam.get('tipo', 'dolly_in')), 'lente_mm': cam.get('lente_mm', 28), 'apertura_f': cam.get('apertura_f', 2.8)},
         'gpu': aj.get('gpu', os.environ.get('VIDGEN_GPU') == '1')}
    pal = (g.get('estilo') or {}).get('paleta')
    if pal: p['paleta'] = pal
    for k in ('lluvia', 'auto', 'personajes', 'niebla', 'exposicion', 'motion_blur', 'primer_cuadro', 'ultimo_cuadro'):
        if k in aj: p[k] = aj[k]
    return p

def generar(g, e, salida: Path, tmp: Path):
    exe = config.blender()
    if not exe: raise ErrorBlender('No encuentro Blender. Instálalo (4.5 LTS probado) y pon su ruta en BLENDER o en el PATH (ver README).')
    tmp = Path(tmp); frames = tmp / f'{e["id"]}_frames'; shutil.rmtree(frames, ignore_errors=True); frames.mkdir(parents=True)
    p = parametros(g, e); p['salida'] = str(frames); pj = tmp / f'{e["id"]}_blender.json'; pj.write_text(json.dumps(p), encoding='utf-8')
    r = subprocess.run([exe, '-b', '-P', str(config.RAIZ / 'blender/escena_neon.py'), '--', '--params', str(pj)], capture_output=True, text=True)
    if r.returncode != 0 or 'VIDGEN_BLENDER_OK' not in r.stdout:
        cola = '\n'.join((r.stdout + r.stderr).strip().splitlines()[-15:]); raise ErrorBlender(f'Blender falló (código {r.returncode}):\n{cola}')
    png = sorted(frames.glob('frame_*.png'))
    if not png: raise ErrorBlender('Blender terminó sin escribir cuadros.')
    f = g['formato']; fps_r = p['fps']; filtro = efectos.normalizar(f['ancho'], f['alto'], f['fps'])
    if (e.get('ajustes') or {}).get('blender', {}).get('interpolar'): filtro = filtro.replace(f"fps={f['fps']}", f"minterpolate=fps={f['fps']}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
    ffutil.ffmpeg('-framerate', fps_r, '-start_number', int(png[0].stem.split('_')[1]), '-i', frames / 'frame_%04d.png', '-vf', filtro + ',format=yuv420p', '-t', e['duracion'], *ffutil.INTERMEDIO, salida)
