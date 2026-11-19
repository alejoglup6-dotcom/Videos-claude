"""Servidor ComfyUI simulado (solo los endpoints que usa el pipeline) para probar el cliente sin GPU. NO ejecuta modelos."""
import json, subprocess, tempfile, threading, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
sys_path = None
from util import config, ffutil

class Estado:
    def __init__(self, video, modo='ok', polls_vacios=0, info=None):
        self.video, self.modo, self.polls_vacios, self.info = video, modo, polls_vacios, info or {}; self.prompts, self.subidas, self.consultas, self.vistas = [], [], 0, []

def crear(estado: Estado):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def _json(self, cod, obj):
            d = json.dumps(obj).encode(); self.send_response(cod); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(d))); self.end_headers(); self.wfile.write(d)
        def do_GET(self):
            u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
            if u.path == '/system_stats': return self._json(200, {'devices': [{'name': 'GPU simulada', 'vram_total': 24 * 2**30}]})
            if u.path == '/object_info': return self._json(200, estado.info)
            if u.path.startswith('/history/'):
                pid = u.path.rsplit('/', 1)[1]; estado.consultas += 1
                if estado.consultas <= estado.polls_vacios: return self._json(200, {})
                if estado.modo == 'error_ejecucion': return self._json(200, {pid: {'outputs': {}, 'status': {'status_str': 'error', 'completed': False, 'messages': [['execution_error', {'node_id': '3', 'exception_message': 'CUDA out of memory'}]]}}})
                if estado.modo == 'sin_video': return self._json(200, {pid: {'outputs': {'9': {'images': [{'filename': 'a.png', 'subfolder': '', 'type': 'output'}]}}, 'status': {'status_str': 'success', 'completed': True}}})
                return self._json(200, {pid: {'outputs': {'50': {'images': [{'filename': 'vidgen_00001_.mp4', 'subfolder': 'video', 'type': 'output'}], 'animated': [True]}}, 'status': {'status_str': 'success', 'completed': True}}})
            if u.path == '/view':
                estado.vistas.append({k: v[0] for k, v in q.items()}); d = Path(estado.video).read_bytes()
                self.send_response(200); self.send_header('Content-Type', 'video/mp4'); self.send_header('Content-Length', str(len(d))); self.end_headers(); self.wfile.write(d); return
            self._json(404, {})
        def do_POST(self):
            n = int(self.headers.get('Content-Length', 0)); cuerpo = self.rfile.read(n); u = urllib.parse.urlparse(self.path)
            if u.path == '/prompt':
                d = json.loads(cuerpo)
                if estado.modo == 'rechaza': return self._json(400, {'error': {'type': 'prompt_outputs_failed_validation', 'message': 'Prompt outputs failed validation'}, 'node_errors': {'37': {'class_type': 'UNETLoader', 'errors': [{'message': 'Value not in list', 'extra_info': {'input_name': 'unet_name'}}]}}})
                estado.prompts.append(d); return self._json(200, {'prompt_id': f'pid-{len(estado.prompts)}', 'number': len(estado.prompts), 'node_errors': {}})
            if u.path == '/upload/image':
                estado.subidas.append({'tipo': self.headers.get('Content-Type', '')[:20], 'bytes': len(cuerpo), 'cuerpo': cuerpo[:400]}); return self._json(200, {'name': 'subida_entrada.png', 'subfolder': '', 'type': 'input'})
            self._json(404, {})
    return H

class Servidor:
    def __init__(self, estado): self.estado = estado; self.http = ThreadingHTTPServer(('127.0.0.1', 0), crear(estado)); self.url = f'http://127.0.0.1:{self.http.server_address[1]}'
    def __enter__(self): threading.Thread(target=self.http.serve_forever, daemon=True).start(); return self
    def __exit__(self, *a): self.http.shutdown(); self.http.server_close()
