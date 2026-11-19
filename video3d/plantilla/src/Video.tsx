// Video de GTA 6 (3 rumores): escena 3D con cortes cada ~2 s + textos grandes animados + subtítulos con píldoras en todo el video.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import T0 from './tiempos.json';
import { cl, sale } from './motor';
import { TextoImg } from './lib/textoImg';
import { Slam, Letras, Sello, TextoGlitch, NeonParpadeo } from './lib/textoAnim';
import { Aberracion, Destello, EstelaLatigazo, FugaDeLuz, Glitch, Grano, LineasVelocidad } from './lib/efectos';
import { latigazo, tipoCorte, tomaEn } from './lib/transiciones';
import { Escena3D, Tiempos, crearTomas } from './escena3d/Escena';
// @ts-ignore fuente local (SIL OFL)
import fuenteUrl from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';

type Pal = { w: string; s: number; e: number };
type Frase = { id: string; texto: string; ini: number; fin: number; palabras: Pal[] };
const T = T0 as unknown as { dur: number; frases: Frase[] } & Tiempos;
const fps = 30;
const SIN = ((typeof process !== 'undefined' && (process as any).env?.REMOTION_SIN) || '').split(',');
const TOMAS = crearTomas(T);

// ---------- subtítulos con píldoras ----------
const CLAVES: Record<string, string[]> = {
  p01: ['ovni', 'tres', 'días', 'gta'], p02: ['noche', 'abducción', 'tres', 'días'], p03: ['torre', 'nido', 'huevos', 'lanzarle'],
  p04: ['bigfoot', 'horrible', 'perro', 'acuática'], p05: ['fans', 'apartamento', 'dexter', 'idéntico'], p06: ['cuál', 'comenta', 'sígueme', 'dos'],
};
const PILDORAS = ['#FF2E93', '#1FB6FF', '#FF8A1F', '#25C98B'];
const limpia = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
type Trozo = { id: string; palabras: (Pal & { clave: boolean; col: string })[]; ini: number; fin: number };
const TROZOS: Trozo[] = [];
for (const f of T.frases) {
  let cur: Trozo['palabras'] = []; let k = 0;
  const cierra = () => { if (cur.length) { TROZOS.push({ id: f.id, palabras: cur, ini: cur[0].s - 0.05, fin: cur[cur.length - 1].e + 0.3 }); cur = []; } };
  f.palabras.forEach((p) => {
    const clave = (CLAVES[f.id] ?? []).includes(limpia(p.w));
    cur.push({ ...p, clave, col: PILDORAS[k++ % PILDORAS.length] });
    if (/[.,:?!…]$/.test(p.w) || cur.length >= 4) cierra();
  });
  cierra();
}
const trazo: React.CSSProperties = { fontFamily: 'Lilita, sans-serif', WebkitTextStroke: '10px #12082E', paintOrder: 'stroke fill', textShadow: '0 7px 0 rgba(0,0,0,0.4)' };
const Subtitulos: React.FC<{ t: number }> = ({ t }) => {
  let idx = -1;
  TROZOS.forEach((z, i) => { if (t >= z.ini) idx = i; });
  const z = TROZOS[idx];
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

// ---------- textos grandes animados (uno por toma) ----------
const TEXTOS: [string, string, string?][] = [
  ['GTA 6', '#FFFFFF', '19 NOV · PS5 · XBOX SERIES X|S'], ['OVNI = 3 DÍAS', '#FFE86A'],
  ['1 · ABDUCCIÓN', '#FF4FA8'], ['DE NOCHE', '#44E6FF'], ['¡TE LLEVAN!', '#FFE86A'], ['+3 DÍAS', '#FF4FA8'],
  ['2 · EL NIDO', '#FFE86A'], ['HUEVOS', '#44E6FF'], ['¡LANZA!', '#FF4FA8'], ['¡SPLAT!', '#7CFF3A'],
  ['3 · BIGFOOT', '#7CFF3A'], ['HUELE HORRIBLE', '#C8FF6A'], ['PERRO + MOTO', '#FF4FA8'],
  ['¿IDÉNTICO?', '#44E6FF'], ['MIAMI', '#FF4FA8'], ['TEORÍA DE FANS', '#FFE86A'],
  ['¿CUÁL PRIMERO?', '#FFE86A'], ['PARTE 2', '#FF4FA8'],
];
const TextoGrande: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const tm = tomaEn(t, TOMAS);
  const [txt, col, sub] = TEXTOS[tm.i] ?? ['', '#fff'];
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

// etiqueta honesta: los datos del guion no están confirmados
const SinConfirmar: React.FC<{ t: number }> = ({ t }) => {
  const a = TOMAS[2].t0; const b = TOMAS[15].t1;
  if (t < a || t > b) return null;
  return <div style={{ position: 'absolute', left: 54, top: 330, opacity: 0.85 + 0.15 * Math.sin(t * 6) }}><Sello txt="SIN CONFIRMAR" color="#FF3B52" u={t - a} size={48} /></div>;
};

const useFuente = () => {
  const [h] = useState(() => delayRender('fuente'));
  useEffect(() => {
    const f = new FontFace('Lilita', `url(${fuenteUrl})`);
    f.load().then(() => { (document as any).fonts.add(f); continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

export const Video: React.FC = () => {
  useFuente();
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
      <SinConfirmar t={t} />
      {SIN.includes('txt') ? null : <TextoGrande t={t} frame={c} />}
      {SIN.includes('sub') ? null : <Subtitulos t={t} />}
    </AbsoluteFill>
  );
};

export const CUADROS = Math.ceil(T.dur * fps);
