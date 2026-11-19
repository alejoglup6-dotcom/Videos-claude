// Video vertical 9:16: escena 3D con cortes cada ~2 s + textos grandes animados + subtítulos con píldoras en todo el video.
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { cl, sale } from './motor';
import { TextoImg } from './lib/textoImg';
import { Slam, Letras, Sello, TextoGlitch, NeonParpadeo } from './lib/textoAnim';
import { Aberracion, Destello, EstelaLatigazo, FugaDeLuz, Glitch, Grano, LineasVelocidad } from './lib/efectos';
import { latigazo, tipoCorte, tomaEn } from './lib/transiciones';
import { Escena3D } from './escena3d/Escena';
import { crearTomas, crearTrozos } from './config';
import type { PropsVideo, Toma, Trozo } from './config';
// @ts-ignore fuente local (SIL OFL)
import fuenteUrl from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';

const fps = 30;
const SIN = ((typeof process !== 'undefined' && (process as any).env?.REMOTION_SIN) || '').split(',');

// ---------- subtítulos con píldoras (los trozos salen de config.ts) ----------
const trazo: React.CSSProperties = { fontFamily: 'Lilita, sans-serif', WebkitTextStroke: '10px #12082E', paintOrder: 'stroke fill', textShadow: '0 7px 0 rgba(0,0,0,0.4)' };
const Subtitulos: React.FC<{ t: number; trozos: Trozo[] }> = ({ t, trozos }) => {
  let idx = -1;
  trozos.forEach((z, i) => { if (t >= z.ini) idx = i; });
  const z = trozos[idx];
  if (!z || t > z.fin) return null;
  const n = z.palabras.length; const corte = n >= 3 ? Math.ceil(n / 2) : n;
  const lineas = [z.palabras.slice(0, corte), z.palabras.slice(corte)].filter((l) => l.length);
  const entra = sale((t - z.ini) / 0.12);
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: 1290, height: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, transform: `scale(${0.9 + 0.1 * entra})`, opacity: entra }}>
      {lineas.map((l, li) => (
        <div key={li} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'nowrap' }}>
          {l.map((p, i) => {
            const dicha = t >= p.s; const activa = t >= p.s && t < p.e + 0.1; const pill = p.clave && dicha;
            const w = p.w.replace(/[.,:…]$/, '');
            return (
              <span key={i} style={{ display: 'inline-block', padding: pill ? '0 20px' : '0 2px', borderRadius: 24, background: pill ? p.col : 'transparent', opacity: dicha ? 1 : 0.5, transform: `scale(${activa ? 1.1 : 1}) rotate(${pill ? -2 : 0}deg)`, boxShadow: pill ? '0 8px 0 rgba(0,0,0,0.3)' : 'none', lineHeight: 0 }}>
                <TextoImg txt={w} color="#fff" size={92} stroke={pill ? 0 : 10} glow={0} ajustado style={{ margin: pill ? -26 : -26, marginTop: -26 }} />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- textos grandes animados (uno por toma; el texto sale de video.config.json) ----------
const TextoGrande: React.FC<{ t: number; frame: number; tomas: Toma[] }> = ({ t, frame, tomas }) => {
  const tm = tomaEn(t, tomas);
  const { txt, color: col, sub } = tm.texto ?? { txt: '', color: '#fff', sub: undefined };
  const u = t - tm.t0; const dur = tm.t1 - tm.t0;
  const salida = 1 - cl((u - (dur - 0.12)) / 0.12);
  const lineas = txt.split(' ').length > 2 && txt.length > 12 ? [txt.split(' ').slice(0, 2).join(' '), txt.split(' ').slice(2).join(' ')] : [txt];
  const base = tm.i === 0 ? 260 : txt.length > 12 ? 120 : 150;
  const size = Math.min(base, Math.floor(880 / (Math.max(...lineas.map((l) => l.length)) * 0.58))); // que quepa en 1080 px con margen
  const estilo = tm.i % 4; // alterna: slam · letras · glitch · neón
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', opacity: salida, lineHeight: 1, transform: `rotate(${-3 + 1.5 * Math.sin(t * 3)}deg)` }}>
      {lineas.map((l, i) => {
        const uu = u - i * 0.07;
        if (estilo === 1) return <Letras key={i} txt={l} color={col} size={size} u={uu} stroke={16} glow={44} />;
        if (estilo === 2) return <TextoGlitch key={i} txt={l} color={col} size={size} u={uu} stroke={16} glow={44} frame={frame} />;
        if (estilo === 3) return <NeonParpadeo key={i} txt={l} color={col} size={size} u={uu} stroke={16} glow={50} />;
        return <Slam key={i} txt={l} color={col} size={size} u={uu} stroke={16} glow={44} />;
      })}
      {sub ? <div style={{ marginTop: 8, opacity: cl((u - 0.25) / 0.15) }}><TextoImg txt={sub} color="#44E6FF" size={52} stroke={9} glow={24} /></div> : null}
    </div>
  );
};

// etiqueta fija sobre un rango de tomas (por ejemplo «SIN CONFIRMAR» o «100% FICCIÓN»); null = sin etiqueta
const Etiqueta: React.FC<{ t: number; tomas: Toma[]; etiqueta: PropsVideo['config']['etiqueta'] }> = ({ t, tomas, etiqueta }) => {
  if (!etiqueta) return null;
  const a = tomas[etiqueta.desdeToma ?? 0].t0; const b = tomas[etiqueta.hastaToma ?? tomas.length - 1].t1;
  if (t < a || t > b) return null;
  return <div style={{ position: 'absolute', left: 54, top: 330, opacity: 0.85 + 0.15 * Math.sin(t * 6) }}><Sello txt={etiqueta.txt} color="#FF3B52" u={t - a} size={48} /></div>;
};

const useFuente = () => {
  const [h] = useState(() => delayRender('fuente'));
  useEffect(() => {
    const f = new FontFace('Lilita', `url(${fuenteUrl})`);
    f.load().then(() => { (document as any).fonts.add(f); continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

export const Video: React.FC<PropsVideo> = ({ config, tiempos }) => {
  useFuente();
  const T = tiempos;
  const TOMAS = useMemo(() => crearTomas(config, tiempos), [config, tiempos]);
  const TROZOS = useMemo(() => crearTrozos(config, tiempos), [config, tiempos]);
  const c = useCurrentFrame(); const t = c / fps;
  const tm = tomaEn(t, TOMAS);
  const dt = t - tm.t0; const tipo = tipoCorte(tm.i);
  const k = tm.i > 0 ? Math.exp(-dt * 22) : 0;               // 1 al cortar, cae rápido
  const w = latigazo(t, TOMAS);
  const velocidad = dt < 0.45 ? Math.exp(-dt * 7) * (tm.i > 0 ? 1 : 0.4) : 0; // líneas de velocidad con el zoom de cada toma
  return (
    <AbsoluteFill style={{ background: '#12082E' }}>
      <Aberracion k={SIN.includes('ab') ? 0 : tipo === 'glitch' || tipo === 'zoom' ? k : 0}>
        {(typeof process !== 'undefined' && (process as any).env?.REMOTION_SIN3D === '1') ? null : <Escena3D t={t} T={T} tomas={TOMAS} />}
      </Aberracion>
      {SIN.includes('vel') ? null : <LineasVelocidad k={velocidad * 0.7} />}
      {SIN.includes('estela') ? null : <EstelaLatigazo w={w} color={tm.i % 2 ? '#FFB0E0' : '#B0F0FF'} />}
      <Destello k={tipo === 'destello' ? k : 0.35 * k} color={tm.i % 2 ? '#FFFFFF' : '#FFD0F0'} />
      {SIN.includes('glitch') ? null : <Glitch k={tipo === 'glitch' ? k : 0} frame={c} />}
      {SIN.includes('fuga') ? null : <FugaDeLuz k={tipo === 'zoom' ? k * 0.8 : 0} />}
      {(typeof process !== 'undefined' && (process as any).env?.REMOTION_GRANO === '1') ? <Grano frame={c} opacidad={0.08} /> : null}
      <Etiqueta t={t} tomas={TOMAS} etiqueta={config.etiqueta} />
      {SIN.includes('txt') ? null : <TextoGrande t={t} frame={c} tomas={TOMAS} />}
      {SIN.includes('sub') ? null : <Subtitulos t={t} trozos={TROZOS} />}
    </AbsoluteFill>
  );
};

