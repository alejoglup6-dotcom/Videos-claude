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

// Devuelve true cuando la fuente ya está cargada. Hasta entonces no se pinta nada: si el texto se rasteriza antes, sale con una fuente de respaldo
// (más fina y ancha) y se queda así en la caché; en un render eso pasaba en el primer cuadro de cada proceso.
const useFuente = () => {
  const [h] = useState(() => delayRender('fuente'));
  const [lista, setLista] = useState(false);
  useEffect(() => {
    const f = new FontFace('Lilita', `url(${fuenteUrl})`);
    const fin = () => { setLista(true); continueRender(h); };
    f.load().then(() => { (document as any).fonts.add(f); fin(); }).catch(fin);
  }, [h]);
  return lista;
};

export const VideoVertical: React.FC<Guion> = (g) => {
  const fuenteLista = useFuente();
  const frame = useCurrentFrame(); const t = frame / FPS;
  const tl = useMemo(() => lineaTiempo(g), [g]);
  const trozos = useMemo(() => crearTrozos(g, tl), [g, tl]);
  if (!fuenteLista) return null;
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
      {g._version ? <div style={{ position: 'absolute', left: 36, bottom: 40, fontFamily: 'monospace', fontSize: 30, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '4px 12px', borderRadius: 8 }}>v{g._version} · {g._calidad} · {g._vozProveedor ?? 'sin voz'}</div> : null}
      <AudioVideo g={g} tl={tl} />
    </AbsoluteFill>
  );
};
