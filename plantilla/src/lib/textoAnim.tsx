// Textos animados con letras rasterizadas una vez: cada efecto solo mueve imágenes (barato) en vez de repintar sombras.
import React from 'react';
import { cl, sale } from '../motor';
import { TextoImg } from './textoImg';

// curvas de entrada
const rebote = (u: number) => { const x = cl(u); return x < 1 ? 1 - Math.pow(1 - x, 3) * Math.cos(x * 9) : 1; };       // pasa de largo y vuelve
const overshoot = (u: number) => { const x = cl(u); const c1 = 2.2; return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

type Base = { txt: string; color: string; size: number; u: number; stroke?: number; glow?: number; style?: React.CSSProperties };

// 1) Letras que entran una por una con rebote (u = segundos desde que empieza)
export const Letras: React.FC<Base & { retraso?: number }> = ({ txt, color, size, u, stroke = 14, glow = 36, retraso = 0.035, style }) => (
  <div style={{ display: 'flex', justifyContent: 'center', ...style }}>
    {txt.split('').map((ch, i) => {
      if (ch === ' ') return <div key={i} style={{ width: size * 0.3 }} />;
      const k = (u - i * retraso) / 0.3; const s = k <= 0 ? 0 : overshoot(k);
      return (
        <div key={i} style={{ transform: `translateY(${(1 - cl(k)) * -size * 0.8}px) scale(${s}) rotate(${(1 - cl(k)) * (i % 2 ? 24 : -24)}deg)`, opacity: cl(k * 3) }}>
          <TextoImg txt={ch} color={color} size={size} stroke={stroke} glow={glow} ajustado />
        </div>
      );
    })}
  </div>
);

// 2) Slam: cae enorme sobre la pantalla, sacude y se asienta
export const Slam: React.FC<Base> = ({ txt, color, size, u, stroke, glow, style }) => {
  const k = cl(u / 0.22); const asienta = cl((u - 0.22) / 0.25);
  const s = k < 1 ? 3.2 - 2.2 * sale(k) : 1 + 0.06 * Math.sin(asienta * Math.PI * 3) * (1 - asienta);
  const sacude = u > 0.2 && u < 0.5 ? 14 * (1 - (u - 0.2) / 0.3) * Math.sin(u * 140) : 0;
  return <div style={{ transform: `translate(${sacude}px, ${sacude * 0.6}px) scale(${s}) rotate(${-3 * sale(k)}deg)`, opacity: cl(u / 0.06), ...style }}><TextoImg txt={txt} color={color} size={size} stroke={stroke} glow={glow} /></div>;
};

// 3) Sello: aparece como un sello de goma (rotado, con borde), para etiquetas como «SIN CONFIRMAR»
export const Sello: React.FC<{ txt: string; color: string; u: number; size?: number }> = ({ txt, color, u, size = 64 }) => {
  const k = cl(u / 0.18); const s = k < 1 ? 2.4 - 1.4 * sale(k) : 1;
  return (
    <div style={{ display: 'inline-block', transform: `rotate(-6deg) scale(${s})`, opacity: cl(u / 0.05), border: `7px solid ${color}`, borderRadius: 18, padding: '2px 24px', background: color }}>
      <TextoImg txt={txt} color="#FFFFFF" size={size} stroke={0} glow={10} ajustado style={{ margin: -30 }} />
    </div>
  );
};

// 4) Glitch: el texto tiembla con copias rojas/cian desplazadas (solo imágenes)
export const TextoGlitch: React.FC<Base & { frame: number }> = ({ txt, color, size, u, stroke, glow, frame, style }) => {
  const g = u < 0.35 ? 1 - u / 0.35 : (frame % 37 < 3 ? 0.6 : 0);
  const d = 16 * g;
  return (
    <div style={{ position: 'relative', ...style }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-d}px)`, mixBlendMode: 'screen', opacity: g ? 0.8 : 0, filter: 'hue-rotate(160deg)' }}><TextoImg txt={txt} color="#FF2D6E" size={size} stroke={0} glow={0} /></div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${d}px)`, mixBlendMode: 'screen', opacity: g ? 0.8 : 0 }}><TextoImg txt={txt} color="#22E6FF" size={size} stroke={0} glow={0} /></div>
      <div style={{ transform: `translateX(${g * 6 * Math.sin(frame * 3)}px)` }}><TextoImg txt={txt} color={color} size={size} stroke={stroke} glow={glow} /></div>
    </div>
  );
};

// 5) Parpadeo de neón (como un letrero que se enciende)
export const NeonParpadeo: React.FC<Base> = ({ txt, color, size, u, stroke, glow, style }) => {
  const enc = u < 0.5 ? (Math.sin(u * 90) > 0.2 ? 1 : 0.25) : 1;
  return <div style={{ opacity: enc, ...style }}><TextoImg txt={txt} color={color} size={size} stroke={stroke ?? 10} glow={(glow ?? 50) * enc} /></div>;
};

// 6) Máquina de escribir con cursor
export const Escribir: React.FC<Base & { cps?: number }> = ({ txt, color, size, u, stroke, glow, cps = 24, style }) => {
  const n = Math.min(txt.length, Math.floor(u * cps));
  return <div style={style}><TextoImg txt={txt.slice(0, n) + (n < txt.length && Math.floor(u * 6) % 2 ? '▌' : '')} color={color} size={size} stroke={stroke} glow={glow} /></div>;
};
