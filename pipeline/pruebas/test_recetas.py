import subprocess, unittest
from pathlib import Path
from util import Base, W, H, FPS, config, ffutil, clip_cuadro, clip_rejilla, clip_color, caja_blanca, psnr, cuadro, luma_media, tono, rms_ventana, lufs

SH = config.RAIZ / 'ffmpeg/recetas.sh'
def receta(*a):
    r = subprocess.run(['bash', str(SH), *map(str, a)], capture_output=True, text=True)
    if r.returncode != 0: raise AssertionError(f'receta {a[0]} falló:\n{r.stderr[-500:]}')

class TestRecetas(Base):
    def setUp(self):
        super().setUp(); self.rej = self.tmp / 'rej.mp4'; clip_rejilla(self.rej); self.cuad = self.tmp / 'cuad.mp4'; clip_cuadro(self.cuad)
    def dims(self, v): i = ffutil.video_info(v); return (i['ancho'], i['alto'])
    def test_vertical_convierte_16_9_a_1080x1920_sin_deformar(self):
        h = self.tmp / 'h.mp4'; clip_rejilla(h, ancho=640, alto=360); o = self.tmp / 'v.mp4'; receta('vertical', h, o); self.assertEqual(self.dims(o), (1080, 1920))
    def test_zoom_llega_al_factor_pedido(self):
        o = self.tmp / 'z.mp4'; receta('zoom', self.cuad, o, 1.4); self.assertEqual(self.dims(o), (W, H)); self.assertAlmostEqual(caja_blanca(o, 1.95)[0], 139, delta=3); self.assertAlmostEqual(caja_blanca(o, 0.05)[0], 103, delta=3)
    def test_shake_mueve_cuadro_a_cuadro(self):
        o = self.tmp / 's.mp4'; receta('shake', self.rej, o, 0.02); from util import ssim; self.assertLess(ssim(str(cuadro(o, 0.50, self.tmp / 'a.png')), str(cuadro(o, 0.55, self.tmp / 'b.png'))), 0.9)
    def test_glitch_solo_en_su_ventana(self):
        o = self.tmp / 'g.mp4'; receta('glitch', self.rej, o, 1.0, 0.3); self.assertLess(psnr(str(cuadro(o, 1.1, self.tmp / 'a.png')), str(cuadro(self.rej, 1.1, self.tmp / 'b.png'))), 30); self.assertGreater(psnr(str(cuadro(o, 0.4, self.tmp / 'c.png')), str(cuadro(self.rej, 0.4, self.tmp / 'd.png'))), 45)
    def test_flash_sube_el_brillo_y_decae(self):
        n = self.tmp / 'n.mp4'; clip_color(n, '0x303030'); o = self.tmp / 'f.mp4'; receta('flash', n, o, 1.0, 0.9); self.assertGreater(luma_media(o, 1.03), luma_media(o, 0.9) + 60); self.assertLess(abs(luma_media(o, 1.8) - luma_media(o, 0.9)), 8)
    def test_motion_blur_bloom_grade_funcionan_y_conservan_el_tamano(self):
        for r, extra in (('motion_blur', []), ('bloom', []), ('grade', ['neon']), ('grade', ['calido']), ('grade', ['frio'])):
            o = self.tmp / f'{r}{extra}.mp4'; receta(r, self.rej, o, *extra); self.assertEqual(self.dims(o), (W, H), r)
    def test_grade_desconocido_da_error(self):
        r = subprocess.run(['bash', str(SH), 'grade', str(self.rej), str(self.tmp / 'x.mp4'), 'rosa'], capture_output=True, text=True); self.assertEqual(r.returncode, 2)
    def test_transicion_acorta_el_total_lo_que_dura(self):
        a = self.tmp / 'a.mp4'; b = self.tmp / 'b.mp4'; clip_color(a, 'red'); clip_color(b, 'blue'); o = self.tmp / 't.mp4'; receta('transicion', a, b, o, 'wipeleft', 0.5); self.assertAlmostEqual(ffutil.duracion(o), 3.5, delta=0.1)
    def test_ducking_baja_la_musica_con_la_voz_y_normaliza(self):
        v = self.tmp / 'v.wav'; m = self.tmp / 'm.wav'; ffutil.ffmpeg('-f', 'lavfi', '-i', 'sine=f=440:d=3', '-af', 'volume=4,adelay=1000|1000,apad=whole_dur=4', '-ac', '2', v)
        ffutil.ffmpeg('-f', 'lavfi', '-i', 'sine=f=220:d=4', '-af', 'volume=4', '-ac', '2', m); o = self.tmp / 'd.wav'; receta('ducking', v, m, o); self.assertAlmostEqual(lufs(o)[0], -14.0, delta=1.2)
    def test_loudnorm_y_exportar(self):
        a = self.tmp / 'a.wav'; tono(a, 440, 3.0, 0.2); o = self.tmp / 'ln.wav'; receta('loudnorm', a, o, -16); self.assertAlmostEqual(lufs(o)[0], -16.0, delta=1.2)
        v = self.tmp / 'v.mp4'; clip_color(v, '0x305080', 2.0, 1080, 1920); e = self.tmp / 'e.mp4'; receta('exportar', v, e); i = ffutil.video_info(e); self.assertEqual((i['codec'], i['perfil'], i['pix_fmt']), ('h264', 'High', 'yuv420p'))
    def test_receta_desconocida(self):
        r = subprocess.run(['bash', str(SH), 'volar'], capture_output=True, text=True); self.assertEqual(r.returncode, 2)

if __name__ == '__main__': unittest.main()
