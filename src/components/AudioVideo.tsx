// Audio del video: música (con ducking bajo la voz), efectos de sonido y voz en off. Los archivos los generan scripts/generar-audio.mjs y scripts/voz-piper.mjs.
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { FPS } from '../lib/guion';
import type { Guion, Tramo, TipoTransicion } from '../lib/guion';
import { duracionVozEstimada } from './Subtitulos';

// efecto de sonido automático de cada transición (se puede quitar con sfx_auto:false en el futuro; hoy se suma a los de la escena)
export const SFX_TRANSICION: Partial<Record<TipoTransicion, string>> = { flash: 'impacto', zoom: 'riser_corto', whip: 'whoosh', glitch: 'glitch', camara_rapida: 'whoosh', slide: 'whoosh', fade: 'suave' };
export const rutaAudio = (id: string, nombre: string) => `audio/${id}/${nombre}`;

export const AudioVideo: React.FC<{ g: Guion; tl: Tramo[] }> = ({ g, tl }) => {
  const a = g.audio ?? {}; const vm = a.musica?.volumen ?? 0.55; const vv = a.voz?.volumen ?? 1; const vs = a.sfx?.volumen ?? 0.8; const duck = a.ducking ?? 0.5;
  const ventanasVoz = tl.filter((x) => x.escena.voz?.texto).map((x) => { const v = x.escena.voz!; const d = g._voces?.[x.escena.id]?.duracion ?? duracionVozEstimada(v.texto); const s = x.t0 + (v.inicio ?? 0.15); return [s - 0.15, s + d + 0.25] as const; });
  const volMusica = (f: number) => {
    const t = f / FPS; let m = 1;
    for (const [s, e] of ventanasVoz) { const k = Math.max(0, Math.min(1, Math.min((t - s) / 0.25, (e - t) / 0.4))); m = Math.min(m, 1 - duck * k); }
    const fin = tl[tl.length - 1].t1; const fade = Math.max(0, Math.min(1, (fin - t) / 1.2));
    return vm * m * fade;
  };
  return (
    <>
      {a.musica ? <Audio src={staticFile(rutaAudio(g.id, 'musica.wav'))} volume={volMusica} /> : null}
      {tl.map((tr) => {
        const e = tr.escena; const lista: { nombre: string; t: number; volumen: number }[] = [];
        const auto = e.transicion ? SFX_TRANSICION[e.transicion.tipo] : undefined; if (auto && tr.i > 0) lista.push({ nombre: auto, t: tr.t0 - 0.05, volumen: 0.8 });
        (e.sfx ?? []).forEach((s) => { const o = typeof s === 'string' ? { nombre: s } : s; lista.push({ nombre: o.nombre, t: tr.t0 + (('t' in o && o.t) || 0), volumen: ('volumen' in o && o.volumen) || 1 }); });
        return lista.map((s, j) => (
          <Sequence key={`${tr.i}-s${j}`} from={Math.max(0, Math.round(s.t * FPS))} durationInFrames={Math.round(2.5 * FPS)} layout="none">
            <Audio src={staticFile(`audio/sfx/${s.nombre}.wav`)} volume={vs * s.volumen} />
          </Sequence>
        ));
      })}
      {tl.map((tr) => {
        const v = tr.escena.voz; const info = g._voces?.[tr.escena.id]; if (!v?.texto || !info) return null;
        return (
          <Sequence key={`v${tr.i}`} from={Math.round((tr.t0 + (v.inicio ?? 0.15)) * FPS)} layout="none">
            <Audio src={staticFile(info.archivo)} volume={vv} />
          </Sequence>
        );
      })}
    </>
  );
};
