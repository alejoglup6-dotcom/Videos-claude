// Efectos de imagen baratos (DOM/SVG): grano, líneas de velocidad, aberración cromática, destello, estela del latigazo y glitch.
// Todo se calcula con t; nada pide GPU. Los que usan filtros solo se activan unos cuadros en cada corte.
import React from 'react';
import { cl } from '../lib/motor';

let granoUrl = '';
const grano = () => {
  if (granoUrl) return granoUrl;
  const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d')!;
  const d = x.createImageData(192, 192);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return (granoUrl = c.toDataURL('image/png'));
};
export const Grano: React.FC<{ frame: number; opacidad?: number }> = ({ frame, opacidad = 0.07 }) => {
  const r = (n: number) => ((Math.sin(frame * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${grano()})`, backgroundSize: '192px 192px', backgroundPosition: `${Math.floor(r(1) * 192)}px ${Math.floor(r(2) * 192)}px`, opacity: opacidad * 0.6, pointerEvents: 'none' }} />;   // sin mix-blend-mode: la mezcla «overlay» a pantalla completa costaba ~30 % del render
};
export const Destello: React.FC<{ k: number; color?: string }> = ({ k, color = '#FFFFFF' }) => (k > 0.01 ? <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.6 * k }} /> : null);

export const LineasVelocidad: React.FC<{ k: number; color?: string }> = ({ k, color = '#FFFFFF' }) => {
  if (k < 0.02) return null;
  const n = 46;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 0.5 * k }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.07 * Math.sin(i * 12.3); const r0 = 520 + 260 * ((i * 7) % 5) / 5; const r1 = 1700;
        return <line key={i} x1={540 + Math.cos(a) * r0} y1={960 + Math.sin(a) * r0 * 1.5} x2={540 + Math.cos(a) * r1} y2={960 + Math.sin(a) * r1 * 1.5} stroke={color} strokeWidth={3 + (i % 4) * 2} strokeLinecap="round" />;
      })}
    </svg>
  );
};

// aberración cromática: separa rojo y azul unos píxeles. Se usa como envoltorio y solo filtra cuando k > 0.
export const Aberracion: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => {
  if (k < 0.02) return <>{children}</>;
  const d = 14 * k;
  return (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id="ca" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="r" dx={-d} dy={0} result="r2" /><feOffset in="b" dx={d} dy={0} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" /><feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </svg>
      <div style={{ position: 'absolute', inset: 0, filter: 'url(#ca)' }}>{children}</div>
    </>
  );
};

// estela del latigazo: barras horizontales translúcidas que se desplazan en el sentido del giro
export const EstelaLatigazo: React.FC<{ w: number; color?: string }> = ({ w, color = '#FFFFFF' }) => {
  const k = Math.abs(w); if (k < 0.03) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 0.85 * k, overflow: 'hidden' }}>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: w > 0 ? '-10%' : '-40%', top: (i / 14) * 1920 + ((i * 37) % 50), width: '150%', height: 40 + ((i * 53) % 90), background: `linear-gradient(${w > 0 ? 90 : 270}deg, transparent, ${color}${i % 3 ? '55' : '99'} 45%, transparent)`, transform: `translateX(${w * 260}px)` }} />
      ))}
    </div>
  );
};

// glitch: bloques de color desplazados durante unos cuadros
export const Glitch: React.FC<{ k: number; frame: number }> = ({ k, frame }) => {
  if (k < 0.05) return null;
  const r = (n: number) => ((Math.sin(frame * 91.3 + n * 17.7) * 43758.5453) % 1 + 1) % 1;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: k }}>
      {Array.from({ length: 7 }, (_, i) => {
        const y = r(i) * 1800; const h = 20 + r(i + 9) * 130; const x = (r(i + 3) - 0.5) * 220;
        return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y, height: h, transform: `translateX(${x}px)`, background: i % 2 ? 'rgba(255,40,160,0.28)' : 'rgba(40,230,255,0.28)', mixBlendMode: 'screen' }} />;
      })}
    </div>
  );
};

// destello de luz cálido/rosado en una esquina (light leak)
export const FugaDeLuz: React.FC<{ k: number }> = ({ k }) => (k > 0.02 ? <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 100% 0%, rgba(255,120,60,0.8), rgba(255,40,140,0.35) 35%, rgba(0,0,0,0) 65%)', opacity: k, mixBlendMode: 'screen' }} /> : null);
