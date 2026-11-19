import unittest
from util import Base, W, H, FPS, clip_color, cuadro, ssim, psnr, luma_media
from vidgen import ffutil, guion, unir

def g_con(trans):
    return {'proyecto': 'p', 'formato': {'ancho': 64, 'alto': 112, 'fps': FPS}, 'escenas': [{'id': 'a', 'duracion': 2, 'backend': 'lavfi', 'transicion': trans}, {'id': 'b', 'duracion': 2, 'backend': 'lavfi'}]}

class TestUnir(Base):
    def clips(self, n=2, ancho=64, alto=112):
        out = []
        for i, c in enumerate(('red', 'blue', 'green')[:n]):
            p = self.tmp / f'c{i}.mp4'; clip_color(p, c, 2.0, ancho, alto); out.append(p)
        return out
    def test_con_transicion_el_total_se_acorta_lo_que_dura_la_transicion(self):
        g = g_con({'tipo': 'fade', 'duracion': 0.5}); salida = self.tmp / 'u.mp4'; lt = unir.unir(g, self.clips(), salida)
        self.assertAlmostEqual(ffutil.duracion(salida), 3.5, delta=0.1); self.assertAlmostEqual(lt[1]['inicio'], 1.5)
    def test_corte_suma_las_duraciones(self):
        g = g_con({'tipo': 'corte'}); salida = self.tmp / 'u.mp4'; unir.unir(g, self.clips(), salida); self.assertAlmostEqual(ffutil.duracion(salida), 4.0, delta=0.1)
    def test_a_mitad_de_la_transicion_se_mezclan_los_dos_clips(self):
        g = g_con({'tipo': 'fade', 'duracion': 1.0}); salida = self.tmp / 'u.mp4'; unir.unir(g, self.clips(), salida)
        solo_a = luma_media(salida, 0.5); mezcla = luma_media(salida, 1.5); solo_b = luma_media(salida, 2.6)      # rojo y azul tienen luma distinta
        self.assertTrue(min(solo_a, solo_b) < mezcla < max(solo_a, solo_b), (solo_a, mezcla, solo_b))
    def test_cada_transicion_real_de_este_ffmpeg_funciona(self):
        malas = []
        for t in ffutil.transiciones_disponibles():
            g = g_con({'tipo': t, 'duracion': 0.4}); try_ = self.tmp / f'{t}.mp4'
            try: unir.unir(g, self.clips(), try_); assert abs(ffutil.duracion(try_) - 3.6) < 0.15
            except Exception as ex: malas.append((t, str(ex)[:80]))
        self.assertEqual(malas, [])
    def test_tres_clips_mezclando_transicion_y_corte(self):
        g = g_con({'tipo': 'wipeleft', 'duracion': 0.5}); g['escenas'][1]['transicion'] = {'tipo': 'corte'}; g['escenas'].append({'id': 'c', 'duracion': 2, 'backend': 'lavfi'})
        salida = self.tmp / 'u.mp4'; lt = unir.unir(g, self.clips(3), salida); self.assertAlmostEqual(ffutil.duracion(salida), 5.5, delta=0.1); self.assertEqual([x['tipo_trans'] for x in lt], ['wipeleft', 'corte', 'corte'])
    def test_un_solo_clip(self):
        g = g_con({}); g['escenas'] = g['escenas'][:1]; salida = self.tmp / 'u.mp4'; unir.unir(g, self.clips(1), salida); self.assertAlmostEqual(ffutil.duracion(salida), 2.0, delta=0.1)
    def test_el_look_final_se_aplica_al_unir(self):
        cl = []
        for i, c in enumerate(('0x806040', '0x406080')): p = self.tmp / f'k{i}.mp4'; clip_color(p, c, 2.0, 64, 112); cl.append(p)       # colores intermedios: un rojo puro no cambia con un grading
        a = self.tmp / 'a.mp4'; b = self.tmp / 'b.mp4'; g = g_con({'tipo': 'corte'}); g['estilo'] = {'look': 'calido_atardecer'}
        unir.unir(g, cl, a); unir.unir(g_con({'tipo': 'corte'}), cl, b)
        self.assertLess(psnr(str(cuadro(a, 0.5, self.tmp / 'a.png')), str(cuadro(b, 0.5, self.tmp / 'b.png'))), 40)

if __name__ == '__main__': unittest.main()
