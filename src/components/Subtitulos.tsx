// Subtítulos con píldoras. Los tiempos por palabra se reparten dentro de la duración real de la voz (si no hay voz, de la estimada).
import React from 'react';
import { sale } from '../lib/motor';
import { TextoImg } from './textoImg';
import type { Guion, Tramo } from '../lib/guion';
import type { Tema } from '../themes';

export type Palabra = { w: string; s: number; e: number; clave: boolean };
export type Trozo = { ini: number; fin: number; palabras: Palabra[] };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export const duracionVozEstimada = (txt: string) => Math.max(0.8, txt.trim().split(/\s+/).length / 2.7);

export const crearTrozos = (g: Guion, tl: Tramo[], porTrozo = 3): Trozo[] => {
  const out: Trozo[] = [];
  for (const tr of tl) {
    const v = tr.escena.voz; if (!v?.texto) continue;
    const real = g._voces?.[tr.escena.id]?.duracion; const dur = real ?? duracionVozEstimada(v.texto);
    const ini = tr.t0 + (v.inicio ?? 0.15); const ws = v.texto.trim().split(/\s+/);
    const pesos = ws.map((w) => Math.max(2, w.length)); const tot = pesos.reduce((a, b) => a + b, 0);
    const claves = new Set((v.claves ?? []).map(norm)); let c = ini; const pal: Palabra[] = [];
    ws.forEach((w, i) => { const d = (pesos[i] / tot) * dur; pal.push({ w, s: c, e: c + d, clave: claves.has(norm(w)) }); c += d; });
    for (let i = 0; i < pal.length; i += porTrozo) { const z = pal.slice(i, i + porTrozo); out.push({ ini: z[0].s, fin: z[z.length - 1].e + 0.12, palabras: z }); }
  }
  return out;
};

export const Subtitulos: React.FC<{ t: number; trozos: Trozo[]; tema: Tema }> = ({ t, trozos, tema }) => {
  let idx = -1; trozos.forEach((z, i) => { if (t >= z.ini) idx = i; });
  const z = trozos[idx]; if (!z || t > z.fin) return null;
  const entra = sale((t - z.ini) / 0.12);
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: 1330, height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, transform: `scale(${0.9 + 0.1 * entra})`, opacity: entra, flexWrap: 'nowrap' }}>
      {z.palabras.map((p, i) => {
        const dicha = t >= p.s; const activa = dicha && t < p.e + 0.1; const pill = p.clave && dicha; const w = p.w.replace(/[.,:;…¡!¿?]/g, '');
        return (
          <span key={i} style={{ display: 'inline-block', padding: pill ? '0 20px' : '0 2px', borderRadius: 24, background: pill ? tema.acento : 'transparent', opacity: dicha ? 1 : 0.5, transform: `scale(${activa ? 1.1 : 1}) rotate(${pill ? -2 : 0}deg)`, boxShadow: pill ? '0 8px 0 rgba(0,0,0,0.3)' : 'none', lineHeight: 0 }}>
            <TextoImg txt={w} color="#fff" size={Math.min(92, Math.floor(980 / (z.palabras.reduce((a, q) => a + q.w.length + 1, 0) * 0.5)))} stroke={pill ? 0 : 10} glow={0} ajustado style={{ margin: -26 }} />
          </span>
        );
      })}
    </div>
  );
};
