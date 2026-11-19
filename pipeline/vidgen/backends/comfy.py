"""Backends de ComfyUI: comfy_t2v (texto→video) y comfy_i2v (imagen→video) con Wan 2.1. Los workflows son JSON en formato API (comfy/workflows/)."""
import hashlib, json
from pathlib import Path
from .. import config, efectos, ffutil, guion
from ..comfy_api import ClienteComfy, ErrorComfy, parchear

WORKFLOWS = {'comfy_t2v': 'wan21_t2v_1.3B.api.json', 'comfy_i2v': 'wan21_i2v_14B.api.json'}
FPS_MODELO = 16                                    # Wan 2.1 genera a 16 fps

def cuadros(dur: float, fps: int = FPS_MODELO) -> int:
    """Wan necesita 4n+1 cuadros; hasta 81 (≈5 s a 16 fps) es lo entrenado."""
    return max(9, min(81, 4 * round(dur * fps / 4) + 1))

TRAVELLING = {'dolly_in': 'slow dolly in', 'dolly_out': 'slow dolly out', 'orbita': 'smooth orbiting camera move', 'grua': 'crane shot rising up', 'mano_alzada': 'handheld camera', 'travelling': 'tracking shot', 'fija': 'static camera'}

def prompt_con_camara(prompt: str, cam: dict | None) -> str:
    if not cam: return prompt
    extra = [TRAVELLING.get(cam.get('tipo', ''), ''), f"{cam['lente_mm']}mm lens" if cam.get('lente_mm') else '', f"shallow depth of field, f/{cam['apertura_f']}" if cam.get('apertura_f') and cam['apertura_f'] <= 4 else '']
    return prompt + ', ' + ', '.join(x for x in extra if x)

def cambios(g, e, imagen_subida: str | None = None) -> dict:
    aj = (e.get('ajustes') or {}).get('comfy', {}); seed = aj.get('seed', int(hashlib.sha1(e['id'].encode()).hexdigest()[:12], 16))
    c = {'PROMPT_POSITIVO': {'text': prompt_con_camara(e['prompt_visual'], e.get('camara'))},
         'SAMPLER': {'seed': seed, **{k: aj[k] for k in ('steps', 'cfg') if k in aj}}, 'GUARDAR': {'filename_prefix': f'video/vidgen_{g["proyecto"]}_{e["id"]}'}}
    if e.get('prompt_negativo'): c['PROMPT_NEGATIVO'] = {'text': e['prompt_negativo']}
    dims = {'width': aj.get('ancho', 480), 'height': aj.get('alto', 832), 'length': aj.get('cuadros', cuadros(e['duracion']))}
    if e['backend'] == 'comfy_t2v': c['LATENTE'] = {**dims, 'batch_size': 1}
    else: c['ANIMAR_IMAGEN'] = {**dims}; c['IMAGEN_ENTRADA'] = {'image': imagen_subida}
    if 'modelo' in aj: c['MODELO'] = {'unet_name': aj['modelo']}
    return c

def generar(g, e, salida: Path, tmp: Path):
    aj = (e.get('ajustes') or {}).get('comfy', {}); ruta_wf = Path(aj['workflow']) if aj.get('workflow') else config.RAIZ / 'comfy/workflows' / WORKFLOWS[e['backend']]
    wf = json.loads(ruta_wf.read_text(encoding='utf-8')); cli = ClienteComfy()
    sub = cli.subir_imagen(guion.ruta_de(g, e['imagen'])) if e['backend'] == 'comfy_i2v' else None
    crudo = cli.generar(parchear(wf, cambios(g, e, sub)), Path(tmp) / f'{e["id"]}_comfy', timeout=aj.get('timeout', 3600))
    f = g['formato']; dur_clip = ffutil.duracion(crudo); falta = max(0.0, e['duracion'] - dur_clip)
    filtro = efectos.normalizar(f['ancho'], f['alto'], f['fps']) + (f',tpad=stop_mode=clone:stop_duration={falta:.3f}' if falta > 0.02 and aj.get('si_corto', 'congelar') == 'congelar' else '')
    ffutil.ffmpeg('-i', crudo, '-vf', filtro + ',format=yuv420p', '-t', e['duracion'], *ffutil.INTERMEDIO, salida)
