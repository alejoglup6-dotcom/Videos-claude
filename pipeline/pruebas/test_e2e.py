import json, os, shutil, subprocess, sys, unittest
from pathlib import Path
from util import Base, config, ffutil, tono, lufs

def cli(*args, entorno=None, **kw):
    return subprocess.run([sys.executable, '-m', 'vidgen', *map(str, args)], capture_output=True, text=True, cwd=config.RAIZ, env={**os.environ, **(entorno or {})}, **kw)

class TestE2E(Base):
    def entorno(self): return {'VIDGEN_BUILD': str(self.tmp / 'build'), 'VIDGEN_SALIDA': str(self.tmp / 'salida')}
    def ejemplo(self):
        d = self.tmp / 'g'; d.mkdir(); shutil.copy(config.RAIZ / 'guion/ejemplo_corto.json', d / 'g.json'); return d / 'g.json'

    def test_cada_etapa_por_separado_y_luego_todo_reutiliza_lo_hecho(self):
        g = self.ejemplo(); env = self.entorno()
        for etapa in ('escenas', 'efectos', 'textos', 'unir', 'audio'):
            r = cli(etapa, g, entorno=env); self.assertEqual(r.returncode, 0, f'{etapa}: {r.stderr[-300:]}')
        r = cli('exportar', g, '--perfil', 'prueba', entorno=env); self.assertEqual(r.returncode, 0, r.stderr[-300:])
        final = self.tmp / 'salida/ejemplo_corto.mp4'; self.assertTrue(final.exists())
        r = cli('todo', g, '--perfil', 'prueba', entorno=env); self.assertEqual(r.returncode, 0, r.stderr[-300:]); self.assertEqual(r.stdout.count('sin cambios'), 9)     # 3 escenas × 3 etapas caras
    def test_el_video_final_cumple_el_formato_y_la_duracion_esperada(self):
        g = self.ejemplo(); r = cli('todo', g, '--perfil', 'prueba', entorno=self.entorno()); self.assertEqual(r.returncode, 0, r.stderr[-400:])
        f = self.tmp / 'salida/ejemplo_corto.mp4'; i = ffutil.video_info(f)
        self.assertEqual((i['ancho'], i['alto'], i['codec'], i['perfil'], i['pix_fmt']), (1080, 1920, 'h264', 'High', 'yuv420p')); self.assertAlmostEqual(i['fps'], 30, delta=0.1)
        self.assertAlmostEqual(ffutil.duracion(f), 6.5, delta=0.1)                                                        # 3 × 2.5 s − 2 transiciones de 0.5 s
        self.assertTrue(ffutil.tiene_audio(f))
    def test_cambiar_un_texto_solo_rehace_la_etapa_de_textos_de_esa_escena(self):
        g = self.ejemplo(); env = self.entorno(); cli('todo', g, '--perfil', 'prueba', entorno=env)
        d = json.loads(g.read_text()); d['escenas'][1]['texto']['contenido'] = 'OTRO TEXTO'; g.write_text(json.dumps(d))
        r = cli('todo', g, '--perfil', 'prueba', entorno=env); self.assertEqual(r.returncode, 0, r.stderr[-300:])
        self.assertIn('texto e02: 2.5 s en', r.stdout); self.assertEqual(r.stdout.count('sin cambios'), 8)               # solo se rehizo el texto de e02
    def test_con_audio_real_la_mezcla_final_queda_en_el_objetivo(self):
        g = self.ejemplo(); d = json.loads(g.read_text()); tono(g.parent / 'voz.wav', 300, 1.5, 0.6); tono(g.parent / 'mus.wav', 120, 20, 0.5); tono(g.parent / 'sfx.wav', 1800, 0.3, 0.8)
        d['audio'] = {'musica': {'archivo': 'mus.wav', 'volumen_db': -16}, 'ducking': True}; d['escenas'][0]['voz'] = {'archivo': 'voz.wav', 'inicio': 0.4}; d['escenas'][2]['sfx'] = [{'archivo': 'sfx.wav', 't': 0.5}]
        g.write_text(json.dumps(d)); r = cli('todo', g, '--perfil', 'prueba', entorno=self.entorno()); self.assertEqual(r.returncode, 0, r.stderr[-400:])
        f = self.tmp / 'salida/ejemplo_corto.mp4'; i, tp = lufs(f); self.assertAlmostEqual(i, -14.0, delta=1.5); self.assertLessEqual(tp, -0.5)
    def test_solo_rehace_las_escenas_pedidas(self):
        g = self.ejemplo(); env = self.entorno(); r = cli('escenas', g, '--solo', 'e02', entorno=env); self.assertEqual(r.returncode, 0); self.assertIn('escena e02', r.stdout); self.assertNotIn('e01', r.stdout)
    def test_errores_de_uso_son_claros_y_con_codigo_distinto_de_cero(self):
        g = self.ejemplo(); env = self.entorno()
        r = cli('escenas', g, '--solo', 'zzz', entorno=env); self.assertEqual(r.returncode, 1); self.assertIn('inexistente', r.stderr)
        r = cli('unir', g, entorno=env); self.assertEqual(r.returncode, 1); self.assertIn('Faltan clips', r.stderr)
        r = cli('audio', g, entorno=env); self.assertEqual(r.returncode, 1); self.assertIn('ejecuta antes la etapa unir', r.stderr)
        r = cli('validar', self.tmp / 'no_existe.json'); self.assertEqual(r.returncode, 1); self.assertIn('No existe', r.stderr + r.stdout)
        d = json.loads(g.read_text()); d['escenas'][0]['transicion']['tipo'] = 'explosion'; g.write_text(json.dumps(d)); r = cli('todo', g, entorno=env); self.assertEqual(r.returncode, 1); self.assertIn('explosion', r.stdout)
    def test_doctor_responde_y_valida_las_plantillas(self):
        r = cli('doctor', '--sin-comfy'); self.assertEqual(r.returncode, 0, r.stdout); self.assertIn('ffmpeg', r.stdout)
        r = cli('validar', config.RAIZ / 'guion/plantilla.json'); self.assertEqual(r.returncode, 0, r.stdout); self.assertIn('0 error(es)', r.stdout)

if __name__ == '__main__': unittest.main()
