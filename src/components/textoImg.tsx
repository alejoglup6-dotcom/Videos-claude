// Texto rasterizado una sola vez (contorno + brillo neón) y animado solo con transformaciones.
// Pintar sombras desenfocadas grandes con CSS en cada cuadro es lo más caro de un render sin GPU; esto lo evita.
import React from 'react';

type Img = { url: string; w: number; h: number; pad: number };
const cache: Record<string, Img> = {};
/** Margen transparente que añade rasterizaTexto alrededor del texto (brillo + contorno). */
export const padTexto = (stroke = 14, glow = 40) => Math.ceil(glow * 1.6 + stroke * 1.7 + 16);
export const rasterizaTexto = (txt: string, o: { color: string; size: number; stroke?: number; glow?: number; borde?: string; fuente?: string }): Img => {
  const fuente = o.fuente ?? 'Lilita'; const stroke = o.stroke ?? 14; const glow = o.glow ?? 40; const borde = o.borde ?? '#12082E';
  const listo = (document as any).fonts?.check?.(`${o.size}px ${fuente}`) ? 1 : 0;
  const key = [txt, o.color, o.size, stroke, glow, borde, fuente, listo].join('|');
  if (cache[key]) return cache[key];
  const pad = Math.ceil(glow * 1.6 + stroke * 1.7 + 16);
  const m = document.createElement('canvas').getContext('2d')!; m.font = `${o.size}px ${fuente}, sans-serif`;
  const w = Math.ceil(m.measureText(txt).width) + pad * 2; const h = Math.ceil(o.size * 1.3) + pad * 2;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; x.font = `${o.size}px ${fuente}, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const cx = w / 2; const cy = h / 2;
  // brillo
  x.shadowColor = o.color; x.shadowBlur = glow; x.fillStyle = o.color; x.strokeStyle = o.color; x.lineWidth = stroke * 1.7; x.globalAlpha = 0.9; x.strokeText(txt, cx, cy); x.fillText(txt, cx, cy); x.fillText(txt, cx, cy);
  x.globalAlpha = 1; x.shadowBlur = 0; x.shadowColor = 'transparent';
  // sombra dura
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = stroke * 1.7; x.strokeText(txt, cx, cy + stroke * 0.9); x.fillText(txt, cx, cy + stroke * 0.9);
  // contorno y relleno
  x.strokeStyle = borde; x.lineWidth = stroke * 1.7; x.strokeText(txt, cx, cy);
  x.fillStyle = o.color; x.fillText(txt, cx, cy);
  return (cache[key] = { url: c.toDataURL('image/png'), w, h, pad });
};
export const TextoImg: React.FC<{ txt: string; color: string; size: number; stroke?: number; glow?: number; style?: React.CSSProperties; ajustado?: boolean }> = ({ txt, color, size, stroke, glow, style, ajustado }) => {
  const im = rasterizaTexto(txt, { color, size, stroke, glow });
  // ajustado: la imagen ocupa solo el espacio del texto (el margen del brillo/contorno sobresale), para usarla dentro de una línea de texto
  return <img src={im.url} width={im.w} height={im.h} style={{ display: 'block', margin: ajustado ? -im.pad : '0 auto', ...style }} />;
};
