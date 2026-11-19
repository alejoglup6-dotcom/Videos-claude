import unittest
from pathlib import Path
from util import Base, tono, rms_ventana, lufs
from vidgen import audio, ffutil, guion

def guion_audio(tmp, voz=True, musica=True, sfx=True, ducking=True):
    """Dos escenas de 4 s con transición de 0.5 s (3.5 s de solape → la 2.ª empieza en 3.5 s). Voz 440 Hz, música 220 Hz, sfx 1500 Hz."""
    tono(tmp / 'voz.wav', 440, 1.5, 0.6); tono(tmp / 'mus.wav', 220, 30, 0.5); tono(tmp / 'sfx.wav', 1500, 0.3, 0.8)
    e1 = {'id': 'a', 'duracion': 4, 'backend': 'lavfi', 'transicion': {'tipo': 'fade', 'duracion': 0.5}}; e2 = {'id': 'b', 'duracion': 4, 'backend': 'lavfi'}
    if voz: e1['voz'] = {'archivo': 'voz.wav', 'inicio': 0.5}; e2['voz'] = {'archivo': 'voz.wav', 'inicio': 0.2}
    if sfx: e2['sfx'] = [{'archivo': 'sfx.wav', 't': 1.0, 'volumen_db': -3}]
    g = {'proyecto': 'p', 'formato': {'ancho': 64, 'alto': 112, 'fps': 30}, 'escenas': [e1, e2], '_base': str(tmp), 'audio': {'ducking': ducking}}
    if musica: g['audio']['musica'] = {'archivo': 'mus.wav', 'volumen_db': -12}
    return g

class TestAudio(Base):
    def mezcla(self, **kw):
        g = guion_audio(self.tmp, **kw); lt, total = guion.linea_tiempo(g); m = audio.mezclar(g, lt, total, self.tmp / 'mix.wav', self.tmp / 'stems'); return g, lt, total, m
    def test_la_mezcla_final_queda_en_el_objetivo_de_loudness(self):
        self.mezcla(); i, tp = lufs(self.tmp / 'mix.wav'); self.assertAlmostEqual(i, -14.0, delta=1.0); self.assertLessEqual(tp, -1.0)
    def test_objetivo_personalizado(self):
        g = guion_audio(self.tmp); g['audio']['lufs'] = -16; lt, t = guion.linea_tiempo(g); audio.mezclar(g, lt, t, self.tmp / 'm.wav'); self.assertAlmostEqual(lufs(self.tmp / 'm.wav')[0], -16.0, delta=1.0)
    def test_duracion_de_la_mezcla_igual_a_la_del_video(self):
        _, _, total, _ = self.mezcla(); self.assertAlmostEqual(ffutil.duracion(self.tmp / 'mix.wav'), total, delta=0.1)
    def test_la_voz_empieza_donde_toca_en_la_linea_de_tiempo(self):
        _, lt, _, _ = self.mezcla(); voz = str(self.tmp / 'stems/voz.wav')
        self.assertLess(rms_ventana(voz, 0.0, 0.4), 0.002); self.assertGreater(rms_ventana(voz, 0.6, 1.8), 0.05)               # escena a: voz a 0.5 s
        ini_b = lt[1]['inicio'] + 0.2; self.assertLess(rms_ventana(voz, ini_b - 0.45, ini_b - 0.05), 0.002); self.assertGreater(rms_ventana(voz, ini_b + 0.1, ini_b + 1.3), 0.05)
    def test_el_sfx_cae_en_su_instante(self):
        _, lt, _, _ = self.mezcla(); sfx = str(self.tmp / 'stems/sfx.wav'); t = lt[1]['inicio'] + 1.0
        self.assertLess(rms_ventana(sfx, t - 0.5, t - 0.05), 0.002); self.assertGreater(rms_ventana(sfx, t + 0.02, t + 0.28), 0.05); self.assertLess(rms_ventana(sfx, t + 0.5, t + 0.9), 0.002)
    def test_ducking_baja_la_musica_mientras_habla_la_voz(self):
        self.mezcla(); mus = str(self.tmp / 'stems/musica.wav'); hablando = rms_ventana(mus, 0.9, 1.8); callado = rms_ventana(mus, 2.4, 3.2)
        self.assertLess(hablando, callado * 0.6, (hablando, callado))
    def test_ducking_se_puede_apagar(self):
        self.mezcla(ducking=False); mus = str(self.tmp / 'stems/musica.wav'); self.assertAlmostEqual(rms_ventana(mus, 0.9, 1.8), rms_ventana(mus, 2.4, 3.2), delta=rms_ventana(mus, 2.4, 3.2) * 0.1)
    def test_la_musica_entra_y_sale_con_fundido(self):
        self.mezcla(); mus = str(self.tmp / 'stems/musica.wav'); self.assertLess(rms_ventana(mus, 0.0, 0.1), rms_ventana(mus, 2.4, 3.2) * 0.6); self.assertLess(rms_ventana(mus, 7.2, 7.5), rms_ventana(mus, 2.4, 3.2) * 0.6)
    def test_la_musica_corta_se_repite_para_cubrir_el_video(self):
        tono(self.tmp / 'mus.wav', 220, 2.0, 0.5); g = guion_audio(self.tmp, voz=False, sfx=False); tono(self.tmp / 'mus.wav', 220, 2.0, 0.5)
        lt, total = guion.linea_tiempo(g); audio.mezclar(g, lt, total, self.tmp / 'm.wav', self.tmp / 's'); self.assertGreater(rms_ventana(str(self.tmp / 's/musica.wav'), 5.0, 6.0), 0.01)
    def test_guion_sin_audio_da_pista_silenciosa_de_la_duracion_correcta(self):
        g = guion_audio(self.tmp, voz=False, musica=False, sfx=False); lt, total = guion.linea_tiempo(g); audio.mezclar(g, lt, total, self.tmp / 'silencio.wav')
        self.assertAlmostEqual(ffutil.duracion(self.tmp / 'silencio.wav'), total, delta=0.1); self.assertLess(rms_ventana(str(self.tmp / 'silencio.wav'), 0.5, 3.0), 1e-4)
    def test_archivos_de_audio_inexistentes_se_omiten_sin_romper(self):
        g = guion_audio(self.tmp); g['escenas'][0]['voz']['archivo'] = 'no_existe.wav'; lt, t = guion.linea_tiempo(g); audio.mezclar(g, lt, t, self.tmp / 'm.wav'); self.assertTrue((self.tmp / 'm.wav').exists())
    def test_musica_por_escena_arranca_en_su_escena(self):
        g = guion_audio(self.tmp, voz=False, musica=False, sfx=False); tono(self.tmp / 'subida.wav', 330, 3.0, 0.6); g['escenas'][1]['musica'] = {'archivo': 'subida.wav', 'volumen_db': -6}
        lt, t = guion.linea_tiempo(g); audio.mezclar(g, lt, t, self.tmp / 'm.wav'); i = lt[1]['inicio']; self.assertGreater(rms_ventana(str(self.tmp / 'm.wav'), i + 0.3, i + 1.5), 0.02); self.assertLess(rms_ventana(str(self.tmp / 'm.wav'), 0.0, i - 0.2), 0.002)

if __name__ == '__main__': unittest.main()
