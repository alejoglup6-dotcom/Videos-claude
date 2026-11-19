import json, os, unittest
from pathlib import Path
from unittest import mock
from util import Base, W, H, FPS, config, ffutil, clip_color
from mock_comfy import Estado, Servidor
from vidgen import comfy_api, guion
from vidgen.backends import comfy as bk
sys_ = __import__('sys'); sys_.path.insert(0, str(config.RAIZ / 'comfy'))
import verificar_nodos

WF = {n: json.loads((config.RAIZ / 'comfy/workflows' / n).read_text(encoding='utf-8')) for n in ('wan21_t2v_1.3B.api.json', 'wan21_i2v_14B.api.json')}
def info_falso(modelos_ok=True):
    """object_info mínimo con las clases y entradas reales de los workflows (derivado de ellos), opcionalmente sin los modelos instalados."""
    info = {}
    for wf in WF.values():
        for n in wf.values():
            ent = info.setdefault(n['class_type'], {'input': {'required': {}}})['input']['required']
            for k, v in n['inputs'].items():
                if isinstance(v, list) and len(v) == 2 and isinstance(v[0], str): ent[k] = ['MODEL', {}]
                elif k in ('unet_name', 'clip_name', 'vae_name', 'type', 'device', 'weight_dtype', 'sampler_name', 'scheduler', 'format', 'codec', 'crop', 'image'):
                    previo = ent.get(k, [[]])[0]; ent[k] = [(previo + [v]) if modelos_ok else ['otro.safetensors']]      # acumula los valores de todos los workflows
                else: ent[k] = ['INT', {}]
    return info
def esc(backend='comfy_t2v', **kw): return {'id': 'e1', 'duracion': 2.0, 'backend': backend, 'prompt_visual': 'neon street at night', 'camara': {'tipo': 'dolly_in', 'lente_mm': 35, 'apertura_f': 2.8}, **kw}
G = {'proyecto': 'p', 'formato': {'ancho': 270, 'alto': 480, 'fps': 30}, 'escenas': [], '_base': '.'}

class TestComfy(Base):
    def setUp(self):
        super().setUp(); self.video = self.tmp / 'modelo.mp4'
        ffutil.ffmpeg('-f', 'lavfi', '-i', 'testsrc2=s=480x832:r=16:d=2.06', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', self.video)       # 33 cuadros a 16 fps, como entrega Wan
    def srv(self, **kw): return Servidor(Estado(self.video, info=info_falso(), **kw))

    # ---- workflows ----
    def test_cuadros_siempre_4n_mas_1_y_entre_9_y_81(self):
        for d in (0.3, 0.5, 1, 2, 3.3, 5, 9, 30):
            n = bk.cuadros(d); self.assertEqual((n - 1) % 4, 0, d); self.assertTrue(9 <= n <= 81, d)
        self.assertEqual(bk.cuadros(2.0), 33); self.assertEqual(bk.cuadros(5.0), 81)
    def test_workflows_son_un_grafo_consistente(self):
        for nombre, wf in WF.items():
            for nid, nodo in wf.items():
                self.assertIn('class_type', nodo); self.assertIn('title', nodo['_meta'])
                for k, v in nodo['inputs'].items():
                    if isinstance(v, list): self.assertIn(v[0], wf, f'{nombre}: {nid}.{k} apunta a un nodo inexistente'); self.assertIsInstance(v[1], int)
    def test_los_titulos_que_parchea_el_backend_existen(self):
        for backend, nombre in (('comfy_t2v', 'wan21_t2v_1.3B.api.json'), ('comfy_i2v', 'wan21_i2v_14B.api.json')):
            comfy_api.parchear(WF[nombre], bk.cambios(G, esc(backend, imagen='x.png'), 'sub.png'))
    def test_parchear_cambia_una_copia_y_no_el_original(self):
        original = json.dumps(WF['wan21_t2v_1.3B.api.json']); nuevo = comfy_api.parchear(WF['wan21_t2v_1.3B.api.json'], {'PROMPT_POSITIVO': {'text': 'hola'}, 'LATENTE': {'width': 320}})
        self.assertEqual(json.dumps(WF['wan21_t2v_1.3B.api.json']), original); self.assertEqual(nuevo['6']['inputs']['text'], 'hola'); self.assertEqual(nuevo['40']['inputs']['width'], 320)
    def test_parchear_rechaza_titulos_y_entradas_inexistentes(self):
        with self.assertRaisesRegex(comfy_api.ErrorComfy, 'ningún nodo titulado «NOPE»'): comfy_api.parchear(WF['wan21_t2v_1.3B.api.json'], {'NOPE': {'a': 1}})
        with self.assertRaisesRegex(comfy_api.ErrorComfy, 'no tiene la entrada «ancho»'): comfy_api.parchear(WF['wan21_t2v_1.3B.api.json'], {'LATENTE': {'ancho': 1}})
    def test_el_prompt_lleva_pistas_de_camara(self):
        p = bk.prompt_con_camara('city', {'tipo': 'orbita', 'lente_mm': 35, 'apertura_f': 2.0}); self.assertIn('orbiting', p); self.assertIn('35mm', p); self.assertIn('f/2.0', p)
        self.assertEqual(bk.prompt_con_camara('city', None), 'city')

    # ---- verificador contra /object_info ----
    def test_verificador_acepta_un_servidor_con_todo_instalado(self):
        for wf in WF.values(): self.assertEqual(verificar_nodos.verificar(wf, info_falso()), [])
    def test_verificador_detecta_modelos_que_faltan(self):
        p = verificar_nodos.verificar(WF['wan21_t2v_1.3B.api.json'], info_falso(modelos_ok=False)); self.assertTrue(any('wan2.1_t2v_1.3B_fp16.safetensors' in x for x in p), p)
    def test_verificador_detecta_clase_inexistente_y_entrada_inexistente_y_obligatoria_ausente(self):
        i = info_falso(); del i['WanImageToVideo']; self.assertTrue(any('WanImageToVideo' in x and 'no existe en este ComfyUI' in x for x in verificar_nodos.verificar(WF['wan21_i2v_14B.api.json'], i)))
        i = info_falso(); i['KSampler']['input']['required'].pop('cfg'); self.assertTrue(any('«cfg» no existe' in x for x in verificar_nodos.verificar(WF['wan21_t2v_1.3B.api.json'], i)))
        i = info_falso(); i['KSampler']['input']['required']['extra_obligatoria'] = ['INT', {}]; self.assertTrue(any('falta la entrada obligatoria «extra_obligatoria»' in x for x in verificar_nodos.verificar(WF['wan21_t2v_1.3B.api.json'], i)))
    def test_verificador_entiende_el_formato_combo_nuevo(self):
        self.assertEqual(verificar_nodos.opciones(['COMBO', {'options': ['a', 'b']}]), ['a', 'b']); self.assertEqual(verificar_nodos.opciones([['a']]), ['a']); self.assertIsNone(verificar_nodos.opciones(['INT', {}]))

    # ---- cliente contra el servidor simulado ----
    def test_estado_y_nodos(self):
        with self.srv() as s: c = comfy_api.ClienteComfy(s.url); self.assertEqual(c.estado()['devices'][0]['name'], 'GPU simulada'); self.assertIn('KSampler', c.nodos_disponibles())
    def test_sin_servidor_el_error_dice_como_arrancarlo(self):
        with self.assertRaisesRegex(comfy_api.ErrorComfy, 'No hay ComfyUI en.*COMFY_URL'): comfy_api.ClienteComfy('http://127.0.0.1:9', timeout=2).estado()
    def test_workflow_rechazado_muestra_el_nodo_y_la_entrada(self):
        with self.srv(modo='rechaza') as s, self.assertRaisesRegex(comfy_api.ErrorComfy, r'nodo 37 \(UNETLoader\).*Value not in list.*unet_name'): comfy_api.ClienteComfy(s.url).encolar(WF['wan21_t2v_1.3B.api.json'])
    def test_error_de_ejecucion_se_reporta(self):
        with self.srv(modo='error_ejecucion') as s, self.assertRaisesRegex(comfy_api.ErrorComfy, 'CUDA out of memory'): comfy_api.ClienteComfy(s.url).generar(WF['wan21_t2v_1.3B.api.json'], self.tmp / 'x', dormir=lambda s: None)
    def test_termina_sin_video_es_un_error_claro(self):
        with self.srv(modo='sin_video') as s, self.assertRaisesRegex(comfy_api.ErrorComfy, 'no devolvió video'): comfy_api.ClienteComfy(s.url).generar(WF['wan21_t2v_1.3B.api.json'], self.tmp / 'x', dormir=lambda s: None)
    def test_espera_con_sondeo_hasta_que_aparece_el_resultado(self):
        with self.srv(polls_vacios=3) as s:
            esperas = []; r = comfy_api.ClienteComfy(s.url).generar(WF['wan21_t2v_1.3B.api.json'], self.tmp / 'out', dormir=esperas.append, intervalo=0.5)
            self.assertEqual(len(esperas), 3); self.assertTrue(r.exists() and r.suffix == '.mp4'); self.assertEqual(s.estado.vistas[0], {'filename': 'vidgen_00001_.mp4', 'subfolder': 'video', 'type': 'output'})
    def test_tiempo_agotado(self):
        reloj = iter(range(0, 10000, 100))
        with self.srv(polls_vacios=999) as s, self.assertRaisesRegex(comfy_api.ErrorComfy, 'Tiempo agotado'): comfy_api.ClienteComfy(s.url).esperar('pid-1', timeout=250, dormir=lambda s: None, reloj=lambda: next(reloj))

    # ---- backends completos con servidor simulado ----
    def test_backend_t2v_envia_el_workflow_parcheado_y_devuelve_un_clip_del_tamano_y_duracion_del_guion(self):
        with self.srv() as s, mock.patch.object(comfy_api.config, 'COMFY_URL', s.url), mock.patch.object(bk.config, 'COMFY_URL', s.url):
            os.environ['COMFY_URL'] = s.url
            try:
                with mock.patch('vidgen.backends.comfy.ClienteComfy', lambda: comfy_api.ClienteComfy(s.url)):
                    out = self.tmp / 'e1.mp4'; bk.generar(G, esc(ajustes={'comfy': {'steps': 20, 'seed': 123}}), out, self.tmp)
            finally: os.environ.pop('COMFY_URL', None)
            wf = s.estado.prompts[0]['prompt']; self.assertIn('neon street at night', wf['6']['inputs']['text']); self.assertIn('dolly in', wf['6']['inputs']['text'])
            self.assertEqual((wf['40']['inputs']['width'], wf['40']['inputs']['height'], wf['40']['inputs']['length']), (480, 832, 33)); self.assertEqual((wf['3']['inputs']['seed'], wf['3']['inputs']['steps']), (123, 20))
        i = ffutil.video_info(out); self.assertEqual((i['ancho'], i['alto'], round(i['fps'])), (270, 480, 30)); self.assertAlmostEqual(ffutil.duracion(out), 2.0, delta=0.08)
    def test_backend_congela_el_ultimo_cuadro_si_el_modelo_entrega_un_clip_mas_corto(self):
        with self.srv() as s:
            with mock.patch('vidgen.backends.comfy.ClienteComfy', lambda: comfy_api.ClienteComfy(s.url)):
                out = self.tmp / 'e1.mp4'; bk.generar(G, esc(duracion=3.5), out, self.tmp)
        self.assertAlmostEqual(ffutil.duracion(out), 3.5, delta=0.1)
    def test_backend_i2v_sube_la_imagen_y_la_usa_en_el_workflow(self):
        img = self.tmp / 'entrada.png'; ffutil.ffmpeg('-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', img); g = {**G, '_base': str(self.tmp)}
        with self.srv() as s:
            with mock.patch('vidgen.backends.comfy.ClienteComfy', lambda: comfy_api.ClienteComfy(s.url)):
                bk.generar(g, esc('comfy_i2v', imagen='entrada.png'), self.tmp / 'e1.mp4', self.tmp)
            wf = s.estado.prompts[0]['prompt']; self.assertEqual(wf['52']['inputs']['image'], 'subida_entrada.png'); self.assertEqual(len(s.estado.subidas), 1); self.assertIn(b'entrada.png', s.estado.subidas[0]['cuerpo'])
            self.assertEqual((wf['50']['inputs']['width'], wf['50']['inputs']['height']), (480, 832))

if __name__ == '__main__': unittest.main()
