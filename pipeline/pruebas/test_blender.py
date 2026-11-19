import os, unittest
from unittest import mock
from util import Base, config, ffutil, ssim, luma_media, cuadro
from vidgen import guion
from vidgen.backends import blender as bk

G = {'proyecto': 'p', 'formato': {'ancho': 270, 'alto': 480, 'fps': 30}, 'escenas': [], '_base': '.', 'estilo': {'paleta': ['#FF2E93', '#1FB6FF']}}
def esc(**kw): return {'id': 'e1', 'duracion': 0.5, 'backend': 'blender', 'camara': {'tipo': 'dolly_in', 'lente_mm': 35, 'apertura_f': 2.0}, **kw}
HAY = bool(config.blender())

class TestParametros(Base):
    def test_parametros_se_derivan_del_guion(self):
        p = bk.parametros(G, esc(ajustes={'blender': {'samples': 8, 'escala': 0.5, 'personajes': 1, 'lluvia': False, 'fps_render': 12}}))
        self.assertEqual((p['ancho'], p['alto'], p['fps'], p['duracion'], p['samples'], p['escala']), (270, 480, 12, 0.5, 8, 0.5)); self.assertEqual(p['camara'], {'tipo': 'dolly_in', 'lente_mm': 35, 'apertura_f': 2.0})
        self.assertEqual((p['personajes'], p['lluvia']), (1, False)); self.assertEqual(p['paleta'], ['#FF2E93', '#1FB6FF'])
    def test_semilla_estable_por_escena_y_distinta_entre_escenas(self):
        a = bk.parametros(G, esc())['semilla']; self.assertEqual(a, bk.parametros(G, esc())['semilla']); self.assertNotEqual(a, bk.parametros(G, esc(id='otra'))['semilla'])
    def test_gpu_se_activa_por_ajuste_o_variable_de_entorno(self):
        self.assertFalse(bk.parametros(G, esc())['gpu'])
        self.assertTrue(bk.parametros(G, esc(ajustes={'blender': {'gpu': True}}))['gpu'])
        with mock.patch.dict(os.environ, {'VIDGEN_GPU': '1'}): self.assertTrue(bk.parametros(G, esc())['gpu'])
    def test_sin_blender_el_error_dice_que_hacer(self):
        with mock.patch.dict(os.environ, {'BLENDER': '/no/existe/blender'}), self.assertRaisesRegex(bk.ErrorBlender, 'No encuentro Blender.*BLENDER'): bk.generar(G, esc(), self.tmp / 'x.mp4', self.tmp)

@unittest.skipUnless(HAY, 'Blender no está instalado (define BLENDER=/ruta/a/blender para ejecutar estas pruebas)')
class TestBlenderReal(Base):
    AJ = {'blender': {'samples': 4, 'escala': 0.15, 'fps_render': 12, 'personajes': 1, 'lluvia': True}}
    def test_render_real_diminuto_produce_un_clip_valido_con_movimiento_de_camara(self):
        out = self.tmp / 'e1.mp4'; bk.generar(G, esc(duracion=0.5, ajustes=self.AJ), out, self.tmp)
        i = ffutil.video_info(out); self.assertEqual((i['ancho'], i['alto'], round(i['fps'])), (270, 480, 30)); self.assertAlmostEqual(ffutil.duracion(out), 0.5, delta=0.1)
        self.assertEqual(len(list((self.tmp / 'e1_frames').glob('frame_*.png'))), 6)                     # 0.5 s a 12 fps
        y = luma_media(out, 0.1); self.assertTrue(8 < y < 200, y)                                          # ni negro ni quemado
        self.assertLess(ssim(str(cuadro(out, 0.0, self.tmp / 'a.png')), str(cuadro(out, 0.45, self.tmp / 'b.png'))), 0.97)    # la cámara se movió
    def test_un_tramo_vacio_es_un_error_claro(self):
        with self.assertRaisesRegex(bk.ErrorBlender, 'sin escribir cuadros'): bk.generar(G, esc(ajustes={'blender': {**self.AJ['blender'], 'primer_cuadro': 9, 'ultimo_cuadro': 2}}), self.tmp / 'x.mp4', self.tmp)

if __name__ == '__main__': unittest.main()
