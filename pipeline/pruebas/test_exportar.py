import os, re, subprocess, unittest
from pathlib import Path
from util import Base, clip_color, tono, lufs
from vidgen import config, exportar, ffutil

RAIZ = config.RAIZ

class TestExportar(Base):
    def exporta(self, perfil, ancho=1080, alto=1920):
        v = self.tmp / 'v.mp4'; clip_color(v, '0x305080', 2.0, ancho, alto); a = self.tmp / 'a.wav'; tono(a, 440, 2.0, 0.3)
        return exportar.exportar(v, a, self.tmp / f'{perfil}.mp4', perfil)
    def test_perfil_tiktok_h264_high_yuv420p_vertical_con_aac(self):
        o = self.exporta('prueba'); i = ffutil.video_info(o); s = ffutil.sonda(o)
        self.assertEqual((i['ancho'], i['alto'], i['codec'], i['perfil'], i['pix_fmt']), (1080, 1920, 'h264', 'High', 'yuv420p')); self.assertAlmostEqual(i['fps'], 30, delta=0.1)
        a = next(x for x in s['streams'] if x['codec_type'] == 'audio'); self.assertEqual((a['codec_name'], int(a['sample_rate']), a['channels']), ('aac', 48000, 2))
    def test_etiquetas_de_color_bt709(self):
        v = next(s for s in ffutil.sonda(self.exporta('prueba'))['streams'] if s['codec_type'] == 'video'); self.assertEqual((v.get('color_space'), v.get('color_primaries'), v.get('color_transfer')), ('bt709', 'bt709', 'bt709'))
    def test_faststart_moov_antes_que_mdat(self):
        d = Path(self.exporta('prueba')).read_bytes(); self.assertLess(d.find(b'moov'), d.find(b'mdat'))
    def test_todos_los_perfiles_funcionan(self):
        for p in exportar.PERFILES: self.assertTrue(Path(self.exporta(p)).stat().st_size > 1000, p)
    def test_perfil_final_no_supera_el_tope_de_bitrate(self):
        v = self.tmp / 'ruido.mp4'; ffutil.ffmpeg('-f', 'lavfi', '-i', 'testsrc2=s=1080x1920:r=30:d=3', '-vf', 'noise=alls=60:allf=t', '-c:v', 'libx264', '-crf', '10', '-pix_fmt', 'yuv420p', v)
        a = self.tmp / 'a.wav'; tono(a, 440, 3.0); o = exportar.exportar(v, a, self.tmp / 'tt.mp4', 'tiktok'); br = float(ffutil.sonda(o)['format']['bit_rate']) / 1e6
        dur = ffutil.duracion(o); limite = 14 + 28 / dur            # con VBV, en T segundos caben a lo sumo maxrate*T + bufsize bits
        self.assertLess(br, limite + 0.3, f'{br:.1f} Mbit/s (límite VBV {limite:.1f})')
    def test_el_primer_comando_ffmpeg_del_readme_genera_un_video_valido(self):
        sh = RAIZ / 'ffmpeg/01_exportar_vertical_prueba.sh'; out = self.tmp / 'prueba_vertical.mp4'
        r = subprocess.run(['bash', str(sh), str(out)], capture_output=True, text=True); self.assertEqual(r.returncode, 0, r.stderr[-400:])
        i = ffutil.video_info(out); self.assertEqual((i['ancho'], i['alto'], i['codec'], i['pix_fmt']), (1080, 1920, 'h264', 'yuv420p')); self.assertAlmostEqual(ffutil.duracion(out), 5.0, delta=0.15); self.assertTrue(ffutil.tiene_audio(out))
        d = out.read_bytes(); self.assertLess(d.find(b'moov'), d.find(b'mdat'))

if __name__ == '__main__': unittest.main()
