// Composición única: lee el guion JSON (props) y compone 3D + capas 2D + textos + subtítulos + audio.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { FPS, lineaTiempo, tramoEn } from '../lib/guion';
import type { Guion } from '../lib/guion';
import { estadoTransicion } from '../lib/transiciones';
import { cl } from '../lib/motor';
import { tema as buscaTema } from '../themes';
import { Escenario3D } from '../three/Escenario3D';
import { CapasElementos, Grading } from '../components/Capas';
import { TransicionCapas, ConAberracion } from '../components/Transiciones';
import { TextoEscena } from '../components/TextoEscena';
import { Subtitulos, crearTrozos } from '../components/Subtitulos';
import { AudioVideo } from '../components/AudioVideo';
import { Sello } from '../components/textoAnim';
import { Grano } from '../components/efectos';
// @ts-ignore fuente local (SIL OFL)
import fuenteUrl from '../assets/lilita-one-latin-400-normal.woff2';

const useFuente = () => {
  const [h] = useState(() => delayRender('fuente'));
  useEffect(() => {
    const f = new FontFace('Lilita', `url(${fuenteUrl})`);
    f.load().then(() => { (document as any).fonts.add(f); continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

export const VideoVertical: React.FC<Guion> = (g) => {
  useFuente();
  const frame = useCurrentFrame(); const t = frame / FPS;
  const tl = useMemo(() => lineaTiempo(g), [g]);
  const trozos = useMemo(() => crearTrozos(g, tl), [g, tl]);
  const tema = buscaTema(g.tema);
  const tr = tramoEn(t, tl); const est = estadoTransicion(t, tl); const u = t - tr.t0; const dur = tr.t1 - tr.t0;
  const etiqueta = g.etiqueta?.txt;
  return (
    <AbsoluteFill style={{ background: tema.contorno }}>
      <ConAberracion est={est}>
        <Escenario3D t={t} tr={tr} est={est} calidad={g._calidad ?? 'normal'} exposicion={tema.exposicion} />
      </ConAberracion>
      <CapasElementos t={t} elementos={tr.escena.elementos} tema={tema} />
      <Grading tema={tema} />
      <TransicionCapas est={est} frame={frame} color={tr.i % 2 ? '#FFB0E0' : '#B0F0FF'} />
      <Grano frame={frame} opacidad={0.06} />
      {etiqueta ? <div style={{ position: 'absolute', left: 54, top: 120, opacity: 0.9 }}><Sello txt={etiqueta} color="#FF3B52" u={t} size={44} /></div> : null}
      <TextoEscena escena={tr.escena} indice={tr.i} u={u} dur={dur} t={t} frame={frame} tema={tema} />
      <Subtitulos t={t} trozos={trozos} tema={tema} />
      <AudioVideo g={g} tl={tl} />
    </AbsoluteFill>
  );
};
