import unittest
from util import Base, W, H, FPS, clip_rejilla, clip_cuadro, clip_color, caja_blanca, cuadro, ssim, psnr, luma_media
from vidgen import efectos, ffutil

FMT = {'ancho': W, 'alto': H, 'fps': FPS}
def esc(**kw): return {'id': 'x', 'duracion': 2.0, 'backend': 'lavfi', **kw}

class TestEfectos(Base):
    def setUp(self):
        super().setUp(); self.rej = self.tmp / 'rej.mp4'; clip_rejilla(self.rej)
        self.color = self.tmp / 'color.mp4'; ffutil.ffmpeg('-f', 'lavfi', '-i', f'testsrc2=s={W}x{H}:r={FPS}:d=2', '-c:v', 'libx264', '-crf', '8', '-pix_fmt', 'yuv420p', self.color)
    def aplica(self, nombre, **kw):
        out = self.tmp / f'{nombre}.mp4'; efectos.aplicar_escena(self.rej, out, esc(**kw), FMT); return out
    def c(self, video, t, n):
        return str(cuadro(video, t, self.tmp / f'{n}.png'))

    def test_salida_siempre_tiene_el_formato_pedido(self):
        o = self.aplica('todo', movimiento={'zoom': {'desde': 1, 'hasta': 1.3}, 'pan': {'dx': 0.05}, 'shake': 0.01},
                        efectos=['bloom', {'tipo': 'flash', 't': 1}, {'tipo': 'glitch', 't': 0.5}, 'motion_blur', 'aberracion', {'tipo': 'zoom_punch', 't': 1.5}, {'tipo': 'shake', 't': 0.2}])
        i = ffutil.video_info(o); self.assertEqual((i['ancho'], i['alto'], round(i['fps']), i['pix_fmt']), (W, H, FPS, 'yuv420p')); self.assertAlmostEqual(ffutil.duracion(o), 2.0, delta=0.05)
    def test_sin_movimiento_ni_efectos_no_altera_la_imagen(self):
        o = self.aplica('nada'); self.assertGreater(psnr(self.c(self.rej, 1.0, 'a'), self.c(o, 1.0, 'b')), 40)
    def test_formato_horizontal_se_recorta_a_vertical_sin_deformar(self):
        h = self.tmp / 'h.mp4'; clip_rejilla(h, ancho=640, alto=360); o = self.tmp / 'hv.mp4'; efectos.aplicar_escena(h, o, esc(), FMT)
        i = ffutil.video_info(o); self.assertEqual((i['ancho'], i['alto']), (W, H))

    def caja(self, **mov):
        """Aplica el movimiento a un cuadrado blanco de 100 px y devuelve el video resultante."""
        q = self.tmp / 'cuadro.mp4'
        if not q.exists(): clip_cuadro(q)
        o = self.tmp / f'cz{abs(hash(str(mov)))}.mp4'; efectos.aplicar_escena(q, o, esc(movimiento=mov), FMT); return o
    def test_zoom_lineal_escala_el_cuadrado_con_la_formula_esperada(self):
        o = self.caja(zoom={'desde': 1.0, 'hasta': 1.4, 'curva': 'lineal'})
        for t, z in ((0.05, 1.01), (1.0, 1.2), (1.5, 1.3), (1.95, 1.39)): self.assertAlmostEqual(caja_blanca(o, t)[0], 100 * z, delta=2.5, msg=f't={t}')
    def test_zoom_ease_out_va_mas_rapido_al_principio_que_el_lineal(self):
        o = self.caja(zoom={'desde': 1.0, 'hasta': 1.4, 'curva': 'ease_out'})        # t=0.5 s de 2 s → p = 1-(1-0.25)^3 = 0.578 → z = 1.231
        self.assertAlmostEqual(caja_blanca(o, 0.5)[0], 123, delta=2.5)
    def test_zoom_ease_in_va_mas_lento_al_principio(self):
        o = self.caja(zoom={'desde': 1.0, 'hasta': 1.4, 'curva': 'ease_in'})         # p = 0.25^3 = 0.0156 → z = 1.006
        self.assertAlmostEqual(caja_blanca(o, 0.5)[0], 100.6, delta=2.5)
    def test_zoom_ease_in_out_pasa_por_la_mitad_a_mitad_de_tiempo(self):
        o = self.caja(zoom={'desde': 1.0, 'hasta': 1.4, 'curva': 'ease_in_out'}); self.assertAlmostEqual(caja_blanca(o, 1.0)[0], 120, delta=2.5)
    def test_zoom_hacia_atras(self):
        o = self.caja(zoom={'desde': 1.4, 'hasta': 1.0, 'curva': 'lineal'}); self.assertGreater(caja_blanca(o, 0.05)[0], caja_blanca(o, 1.9)[0] + 25)
    def test_pan_desplaza_el_cuadrado_en_la_direccion_y_cantidad_esperadas(self):
        o = self.caja(zoom={'desde': 1.3, 'hasta': 1.3}, pan={'dx': 0.1, 'dy': 0.0}); x0, x1 = caja_blanca(o, 0.05)[2], caja_blanca(o, 1.95)[2]
        self.assertLess(x1, x0); self.assertAlmostEqual(x0 - x1, 0.1 * W * 0.95, delta=4)          # el recorte se mueve a la derecha: el contenido, a la izquierda
    def test_pan_vertical(self):
        o = self.caja(zoom={'desde': 1.3, 'hasta': 1.3}, pan={'dx': 0.0, 'dy': -0.08}); y0, y1 = caja_blanca(o, 0.05)[3], caja_blanca(o, 1.95)[3]
        self.assertGreater(y1, y0); self.assertAlmostEqual(y1 - y0, 0.08 * H * 0.95, delta=5)

    def test_shake_constante_mueve_cuadro_a_cuadro_y_cero_no(self):
        s = self.aplica('shk', movimiento={'shake': 0.02}); q = self.aplica('quieto')
        self.assertLess(ssim(self.c(s, 0.50, 's1'), self.c(s, 0.55, 's2')), 0.9); self.assertGreater(ssim(self.c(q, 0.50, 'q1'), self.c(q, 0.55, 'q2')), 0.99)
    def test_golpe_de_shake_solo_ocurre_en_su_ventana_y_decae(self):
        s = self.aplica('golpe', efectos=[{'tipo': 'shake', 't': 0.5, 'duracion': 0.4, 'intensidad': 1.0}])
        self.assertLess(ssim(self.c(s, 0.52, 'a'), self.c(s, 0.56, 'b')), 0.95)                   # dentro de la ventana: se mueve
        self.assertGreater(ssim(self.c(s, 1.5, 'c'), self.c(s, 1.55, 'd')), 0.99)                 # fuera: quieto

    def test_flash_sube_el_brillo_en_t_y_decae(self):
        n = self.tmp / 'neg.mp4'; clip_color(n, '0x303030'); o = self.tmp / 'fl.mp4'; efectos.aplicar_escena(n, o, esc(efectos=[{'tipo': 'flash', 't': 1.0, 'intensidad': 0.9, 'duracion': 0.2}]), FMT)
        antes, pico, despues = luma_media(o, 0.9), luma_media(o, 1.04), luma_media(o, 1.8)
        self.assertGreater(pico, antes + 60); self.assertLess(abs(despues - antes), 8); self.assertAlmostEqual(antes, luma_media(n, 0.9), delta=6)
    def test_glitch_solo_dentro_de_su_ventana(self):
        g = self.aplica('gl', efectos=[{'tipo': 'glitch', 't': 1.0, 'duracion': 0.3, 'intensidad': 0.8}]); base = self.aplica('base_gl')
        self.assertLess(psnr(self.c(g, 1.1, 'g1'), self.c(base, 1.1, 'b1')), 30)                  # dentro: cambia
        self.assertGreater(psnr(self.c(g, 0.5, 'g2'), self.c(base, 0.5, 'b2')), 45)               # fuera: igual
    def test_glitch_periodico_se_repite(self):
        g = self.aplica('glp', efectos=[{'tipo': 'glitch', 't': 0.0, 'duracion': 0.2, 'periodo': 1.0, 'intensidad': 0.8}]); base = self.aplica('base_glp')
        for t in (0.1, 1.1): self.assertLess(psnr(self.c(g, t, f'a{t}'), self.c(base, t, f'b{t}')), 30)
        self.assertGreater(psnr(self.c(g, 0.6, 'm1'), self.c(base, 0.6, 'm2')), 45)
    def test_zoom_punch_golpea_y_se_asienta(self):
        z = self.aplica('zp', efectos=[{'tipo': 'zoom_punch', 't': 1.0, 'intensidad': 1.0}]); base = self.aplica('base_zp')
        self.assertLess(ssim(self.c(z, 1.02, 'a'), self.c(base, 1.02, 'b')), 0.8); self.assertGreater(ssim(self.c(z, 1.9, 'c'), self.c(base, 1.9, 'd')), 0.97)
    def test_bloom_aclara_las_zonas_cercanas_a_las_luces(self):
        b = self.aplica('bl', efectos=['bloom']); base = self.aplica('base_bl'); self.assertGreater(luma_media(b, 1.0), luma_media(base, 1.0))
    def similitud_adyacentes(self, video) -> float:
        d = 1 / FPS; ts = [0.4 + 0.1 * k for k in range(8)]; return sum(ssim(self.c(video, t, f'a{t:.2f}'), self.c(video, t + d, f'b{t:.2f}')) for t in ts) / len(ts)
    def test_motion_blur_hace_mas_parecidos_los_cuadros_consecutivos(self):
        a = self.aplica('mb0', movimiento={'shake': 0.03}); b = self.aplica('mb1', movimiento={'shake': 0.03}, efectos=['motion_blur'])
        self.assertGreater(self.similitud_adyacentes(b), self.similitud_adyacentes(a) + 0.02)
    def test_aberracion_cromatica_cambia_los_canales(self):
        a = self.aplica('ab', efectos=[{'tipo': 'aberracion', 'intensidad': 1.0}]); self.assertLess(psnr(self.c(a, 1.0, 'a'), self.c(self.rej, 1.0, 'b')), 30)

    def test_looks_cambian_el_color_y_neutro_no(self):
        for nombre in ('neon_nocturno', 'calido_atardecer', 'frio_cinematografico'):
            f = efectos.look_final({'look': nombre}); self.assertTrue(f, nombre)
            o = self.tmp / f'{nombre}.mp4'; ffutil.ffmpeg('-i', self.color, '-vf', f + ',format=yuv420p', '-c:v', 'libx264', '-crf', '8', o)
            self.assertLess(psnr(self.c(o, 1.0, nombre), self.c(self.color, 1.0, 'r_' + nombre)), 33, nombre)
        self.assertEqual(efectos.look_final({'look': 'neutro'}), ''); self.assertEqual(efectos.look_final(None), '')
    def test_look_final_incluye_vineta_grano_y_lut(self):
        f = efectos.look_final({'look': 'neutro', 'vineta': True, 'grano': 8}, '/tmp/a b.cube'); self.assertIn('vignette', f); self.assertIn('noise=alls=8', f); self.assertIn('lut3d', f)

if __name__ == '__main__': unittest.main()
