// Capas 2D baratas encima del 3D: lluvia, partículas, neón de bordes, color grading (tinte + viñeta). Todo en función de t, sin CSS keyframes.
import React from 'react';
import { rnd } from '../lib/motor';
import type { Elemento } from '../lib/guion';
import type { Tema } from '../themes';

export const Lluvia2D: React.FC<{ t: number; color: string; intensidad?: number }> = ({ t, color, intensidad = 1 }) => {
  const n = Math.round(70 * intensidad);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
      {Array.from({ length: n }, (_, i) => {
        const v = 2600 + rnd(i) * 1500; const x0 = rnd(i + 100) * 1300 - 150; const y = ((rnd(i + 200) * 2200 + t * v) % 2300) - 250; const l = 70 + rnd(i + 300) * 90;
        return <line key={i} x1={x0 - y * 0.18} y1={y} x2={x0 - (y + l) * 0.18} y2={y + l} stroke={color} strokeWidth={2 + rnd(i + 400) * 2} strokeLinecap="round" opacity={0.35 + rnd(i + 500) * 0.5} />;
      })}
    </svg>
  );
};

export const Particulas: React.FC<{ t: number; color: string; intensidad?: number }> = ({ t, color, intensidad = 1 }) => {
  const n = Math.round(46 * intensidad);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: n }, (_, i) => {
        const x = (rnd(i) * 1200 + Math.sin(t * (0.6 + rnd(i + 7)) + i) * 40 - 60); const y = 2000 - ((rnd(i + 50) * 2100 + t * (60 + rnd(i + 90) * 160)) % 2100);
        const r = 2 + rnd(i + 130) * 5; const op = 0.25 + 0.6 * Math.abs(Math.sin(t * 2 + i));
        return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={op} />;
      })}
    </svg>
  );
};

// marco de neón que respira en los bordes (dos colores)
export const NeonBordes: React.FC<{ t: number; a: string; b: string; intensidad?: number }> = ({ t, a, b, intensidad = 1 }) => {
  const p = (0.55 + 0.25 * Math.sin(t * 5)) * intensidad;
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(90deg, ${a}${hex(p * 0.7)} 0%, transparent 14%, transparent 86%, ${b}${hex(p * 0.7)} 100%)` }} />;
};
const hex = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');

// color grading barato: tinte plano + viñeta radial (sin mix-blend-mode a pantalla completa)
export const Grading: React.FC<{ tema: Tema }> = ({ tema }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, background: tema.tinte, opacity: tema.tinteOp }} />
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 48%, rgba(5,2,20,${tema.vineta}) 100%)` }} />
  </>
);

export const CapasElementos: React.FC<{ t: number; elementos?: Elemento[]; tema: Tema }> = ({ t, elementos, tema }) => (
  <>
    {(elementos ?? []).map((e, i) => {
      if (e.tipo === 'lluvia') return <Lluvia2D key={i} t={t} color={e.color ?? tema.lluvia} intensidad={e.intensidad} />;
      if (e.tipo === 'particulas') return <Particulas key={i} t={t} color={e.color ?? tema.acento} intensidad={e.intensidad} />;
      if (e.tipo === 'neon') return <NeonBordes key={i} t={t} a={tema.neon[0]} b={tema.neon[1]} intensidad={e.intensidad} />;
      return null;
    })}
  </>
);
