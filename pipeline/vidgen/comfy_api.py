"""Cliente mínimo de la API HTTP de ComfyUI (local o remota). Endpoints usados, todos de ComfyUI: GET /system_stats, GET /object_info,
POST /upload/image, POST /prompt, GET /history/{prompt_id}, GET /view. Se sondea /history (no hace falta WebSocket)."""
import copy, json, time, uuid
from pathlib import Path
import requests
from . import config

class ErrorComfy(RuntimeError): pass
EXT_VIDEO = ('.mp4', '.webm', '.mov', '.mkv', '.gif', '.webp')

class ClienteComfy:
    def __init__(self, url: str | None = None, timeout: float = 30.0):
        self.url = (url or config.COMFY_URL).rstrip('/'); self.timeout = timeout; self.client_id = str(uuid.uuid4())

    def _pedir(self, metodo: str, ruta: str, **kw) -> requests.Response:
        try: return requests.request(metodo, self.url + ruta, timeout=kw.pop('timeout', self.timeout), **kw)
        except requests.ConnectionError: raise ErrorComfy(f'No hay ComfyUI en {self.url}. Arráncalo (python main.py --listen) o define COMFY_URL.')
        except requests.Timeout: raise ErrorComfy(f'ComfyUI no respondió en {self.timeout:.0f} s ({metodo} {ruta})')

    def estado(self) -> dict:
        r = self._pedir('GET', '/system_stats'); r.raise_for_status(); return r.json()

    def nodos_disponibles(self) -> dict:
        r = self._pedir('GET', '/object_info', timeout=120); r.raise_for_status(); return r.json()

    def subir_imagen(self, ruta) -> str:
        ruta = Path(ruta)
        with open(ruta, 'rb') as fh: r = self._pedir('POST', '/upload/image', files={'image': (ruta.name, fh)}, data={'overwrite': 'true', 'type': 'input'})
        if r.status_code != 200: raise ErrorComfy(f'No pude subir {ruta.name}: HTTP {r.status_code} {r.text[:200]}')
        return r.json()['name']

    def encolar(self, workflow: dict) -> str:
        r = self._pedir('POST', '/prompt', json={'prompt': workflow, 'client_id': self.client_id})
        if r.status_code != 200:
            try: d = r.json()
            except ValueError: d = {}
            ne = d.get('node_errors') or {}
            det = '; '.join(f'nodo {n} ({v.get("class_type")}): ' + ', '.join(e.get('message', '') + (f' [{e["extra_info"]["input_name"]}]' if e.get('extra_info', {}).get('input_name') else '') for e in v.get('errors', [])) for n, v in ne.items())
            raise ErrorComfy(f'ComfyUI rechazó el workflow (HTTP {r.status_code}): {(d.get("error") or {}).get("message", r.text[:200])}. {det}'.strip())
        return r.json()['prompt_id']

    def esperar(self, prompt_id: str, timeout: float = 1800, intervalo: float = 2.0, dormir=time.sleep, reloj=time.monotonic) -> dict:
        t0 = reloj()
        while True:
            r = self._pedir('GET', f'/history/{prompt_id}'); r.raise_for_status(); h = r.json()
            if prompt_id in h:
                e = h[prompt_id]; st = e.get('status') or {}
                if st.get('status_str') == 'error':
                    msgs = [m for m in st.get('messages', []) if m and m[0] == 'execution_error']
                    raise ErrorComfy('La ejecución falló en ComfyUI: ' + (json.dumps(msgs[-1][1], ensure_ascii=False)[:400] if msgs else 'sin detalle'))
                if e.get('outputs') or st.get('completed'): return e
            if reloj() - t0 > timeout: raise ErrorComfy(f'Tiempo agotado ({timeout:.0f} s) esperando {prompt_id}')
            dormir(intervalo)

    @staticmethod
    def archivos_salida(entrada_historial: dict) -> list[dict]:
        """Todos los archivos que reporta cualquier nodo de salida (images, gifs, videos, audio...)."""
        out = []
        for nodo, salidas in (entrada_historial.get('outputs') or {}).items():
            for clave, lista in salidas.items():
                if isinstance(lista, list):
                    out += [{**it, 'nodo': nodo, 'clave': clave} for it in lista if isinstance(it, dict) and 'filename' in it]
        return out

    def descargar(self, item: dict, destino) -> Path:
        destino = Path(destino); destino.parent.mkdir(parents=True, exist_ok=True)
        r = self._pedir('GET', '/view', params={'filename': item['filename'], 'subfolder': item.get('subfolder', ''), 'type': item.get('type', 'output')}, stream=True, timeout=300)
        if r.status_code != 200: raise ErrorComfy(f'No pude descargar {item["filename"]}: HTTP {r.status_code}')
        with open(destino, 'wb') as fh:
            for trozo in r.iter_content(1 << 20): fh.write(trozo)
        return destino

    def generar(self, workflow: dict, destino, timeout: float = 1800, **kw) -> Path:
        pid = self.encolar(workflow); hist = self.esperar(pid, timeout, **kw)
        videos = [a for a in self.archivos_salida(hist) if a['filename'].lower().endswith(EXT_VIDEO)]
        if not videos: raise ErrorComfy(f'El workflow terminó pero no devolvió video. Salidas: {self.archivos_salida(hist)}')
        return self.descargar(videos[0], Path(destino).with_suffix(Path(videos[0]['filename']).suffix))

def parchear(workflow: dict, cambios: dict) -> dict:
    """Devuelve una copia del workflow (formato API) con los valores cambiados. Los nodos se buscan por su TÍTULO (_meta.title), no por número."""
    wf = copy.deepcopy(workflow)
    for titulo, entradas in cambios.items():
        nodos = [n for n in wf.values() if (n.get('_meta') or {}).get('title') == titulo]
        if not nodos: raise ErrorComfy(f'El workflow no tiene ningún nodo titulado «{titulo}» (hay: {sorted({(n.get("_meta") or {}).get("title") for n in wf.values()})})')
        for n in nodos:
            for k, v in entradas.items():
                if k not in n['inputs']: raise ErrorComfy(f'El nodo «{titulo}» ({n["class_type"]}) no tiene la entrada «{k}» (tiene: {sorted(n["inputs"])})')
                n['inputs'][k] = v
    return wf
