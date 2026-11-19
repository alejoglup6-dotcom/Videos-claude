import copy, json, unittest
from util import Base, config
from vidgen import guion

def base():
    return {'proyecto': 'p', 'formato': {'ancho': 1080, 'alto': 1920, 'fps': 30},
            'escenas': [{'id': 'a', 'duracion': 4, 'backend': 'lavfi', 'transicion': {'tipo': 'fade', 'duracion': 0.5}}, {'id': 'b', 'duracion': 4, 'backend': 'lavfi'}]}

class TestGuion(Base):
    def escribe(self, g):
        r = self.tmp / 'g.json'; r.write_text(json.dumps(g)); return r
    def errores(self, g):
        try: guion.cargar(self.escribe(g)); return []
        except guion.ErrorGuion as e: return e.errores

    def test_plantillas_del_repo_cargan_y_validan(self):
        for n in ('plantilla.json', 'ejemplo_corto.json'):
            g = guion.cargar(config.RAIZ / 'guion' / n); errs, _ = guion.validar(g); self.assertEqual(errs, [], n)
    def test_plantilla_cumple_30_a_40_s(self):
        _, total = guion.linea_tiempo(guion.cargar(config.RAIZ / 'guion/plantilla.json')); self.assertTrue(30 <= total <= 40, total)
    def test_plantilla_usa_todos_los_campos_pedidos(self):
        g = guion.cargar(config.RAIZ / 'guion/plantilla.json'); campos = {c for e in g['escenas'] for c in e}
        self.assertTrue({'id', 'duracion', 'prompt_visual', 'camara', 'movimiento', 'texto', 'voz', 'musica', 'sfx', 'transicion'} <= campos)

    def test_campo_con_typo_se_rechaza_con_su_ruta(self):
        g = base(); g['escenas'][1]['duracon'] = 3
        self.assertTrue(any('escenas[1]' in e and 'duracon' in e for e in self.errores(g)))
    def test_falta_campo_obligatorio(self):
        g = base(); del g['escenas'][0]['backend']; self.assertTrue(any("'backend' is a required property" in e for e in self.errores(g)))
    def test_fps_no_permitido(self):
        g = base(); g['formato']['fps'] = 45; self.assertTrue(any('formato.fps' in e for e in self.errores(g)))
    def test_dimensiones_impares_rechazadas(self):
        g = base(); g['formato']['ancho'] = 1081; self.assertTrue(any('formato.ancho' in e for e in self.errores(g)))
    def test_color_invalido(self):
        g = base(); g['escenas'][0]['texto'] = {'contenido': 'x', 'color': 'rojo'}; self.assertTrue(any('texto.color' in e for e in self.errores(g)))
    def test_efecto_desconocido(self):
        g = base(); g['escenas'][0]['efectos'] = ['explosion']; self.assertTrue(self.errores(g))
    def test_duracion_fuera_de_rango(self):
        g = base(); g['escenas'][0]['duracion'] = 0.1; self.assertTrue(any('duracion' in e for e in self.errores(g)))
    def test_json_roto_y_archivo_inexistente(self):
        r = self.tmp / 'roto.json'; r.write_text('{"a":'); 
        with self.assertRaises(guion.ErrorGuion) as c: guion.cargar(r)
        self.assertIn('no es JSON válido', str(c.exception))
        with self.assertRaises(guion.ErrorGuion) as c: guion.cargar(self.tmp / 'no.json')
        self.assertIn('No existe', str(c.exception))

    def val(self, g, **kw):
        r = self.escribe(g); gg = guion.cargar(r); return guion.validar(gg, **kw)
    def test_id_repetido(self):
        g = base(); g['escenas'][1]['id'] = 'a'; self.assertTrue(any('repetido' in e for e in self.val(g)[0]))
    def test_transicion_inexistente_usa_la_lista_real_de_ffmpeg(self):
        g = base(); g['escenas'][0]['transicion']['tipo'] = 'explosion'; errs, _ = self.val(g)
        self.assertTrue(any('explosion' in e and 'circleopen' in e for e in errs))
    def test_todas_las_transiciones_reales_son_validas(self):
        from vidgen import ffutil
        for t in ffutil.transiciones_disponibles():
            g = base(); g['escenas'][0]['transicion']['tipo'] = t; self.assertEqual(self.val(g)[0], [], t)
    def test_backend_comfy_exige_prompt_e_imagen(self):
        g = base(); g['escenas'][0]['backend'] = 'comfy_i2v'; errs, _ = self.val(g)
        self.assertTrue(any('necesita "imagen"' in e for e in errs)); self.assertTrue(any('necesita "prompt_visual"' in e for e in errs))
    def test_archivos_que_faltan_son_aviso_o_error_si_estricto(self):
        g = base(); g['escenas'][0]['voz'] = {'archivo': 'voz/no.wav'}
        errs, avs = self.val(g); self.assertEqual(errs, []); self.assertTrue(any('voz/no.wav' in a for a in avs))
        errs, _ = self.val(g, estricto=True); self.assertTrue(any('voz/no.wav' in e for e in errs))
    def test_duracion_total_fuera_de_30_a_40_avisa(self):
        self.assertTrue(any('fuera del rango' in a for a in self.val(base())[1]))

    def test_linea_tiempo_solapa_con_la_transicion(self):
        lt, total = guion.linea_tiempo(base())
        self.assertAlmostEqual(lt[1]['inicio'], 3.5); self.assertAlmostEqual(total, 7.5); self.assertEqual(lt[0]['tipo_trans'], 'fade')
    def test_linea_tiempo_corte_no_solapa(self):
        g = base(); g['escenas'][0]['transicion'] = {'tipo': 'corte'}; lt, total = guion.linea_tiempo(g)
        self.assertAlmostEqual(lt[1]['inicio'], 4.0); self.assertAlmostEqual(total, 8.0)
    def test_linea_tiempo_limita_la_transicion_a_la_mitad_de_la_escena(self):
        g = base(); g['escenas'][0]['duracion'] = 1.0; g['escenas'][0]['transicion']['duracion'] = 3.0; lt, _ = guion.linea_tiempo(g)
        self.assertAlmostEqual(lt[0]['trans'], 0.5)
    def test_ultima_escena_ignora_su_transicion(self):
        g = base(); g['escenas'][1]['transicion'] = {'tipo': 'fade', 'duracion': 1}; lt, total = guion.linea_tiempo(g); self.assertEqual(lt[1]['trans'], 0); self.assertAlmostEqual(total, 7.5)
    def test_linea_tiempo_con_duraciones_reales(self):
        lt, total = guion.linea_tiempo(base(), {'a': 4.1, 'b': 3.9}); self.assertAlmostEqual(lt[1]['inicio'], 3.6); self.assertAlmostEqual(total, 7.5)

if __name__ == '__main__': unittest.main()
