// Texto grande animado de cada escena (slam, letras, glitch, neón, máquina de escribir) con tamaño autoajustado a 1080 px.
import React from 'react';
import { cl } from '../lib/motor';
import { TextoImg, padTexto } from './textoImg';
import { Slam, Letras, TextoGlitch, NeonParpadeo, Escribir } from './textoAnim';
import type { Escena } from '../lib/guion';
import type { Tema } from '../themes';

const ESTILOS = ['slam', 'letras', 'glitch', 'neon'] as const;
export const TextoEscena: React.FC<{ escena: Escena; indice: number; u: number; dur: number; t: number; frame: number; tema: Tema }> = ({ escena, indice, u: u0, dur, t, frame, tema }) => {
  let u = u0;
  const tx = escena.texto; if (!tx || !tx.contenido) return null;
  const txt = tx.contenido; const col = tx.color ?? tema.textos[indice % tema.textos.length];
  const palabras = txt.split(' ');
  const lineas = txt.includes(' · ') ? txt.split(' · ') : palabras.length > 2 && txt.length > 12 ? [palabras.slice(0, Math.ceil(palabras.length / 2)).join(' '), palabras.slice(Math.ceil(palabras.length / 2)).join(' ')] : [txt];
  const base = tx.tam ?? (indice === 0 ? 240 : txt.length > 12 ? 130 : 160);
  const size = Math.min(base, Math.floor(880 / (Math.max(...lineas.map((l) => l.length)) * 0.58)));
  const salida = tx.sinSalida ? 1 : 1 - cl((u - (dur - 0.12)) / 0.12);
  if (tx.sinEntrada) u = u + 5;   // ya «entró» en el plano anterior: sin animación de entrada
  const estilo = tx.estilo ?? ESTILOS[indice % 4];
  const top = tx.posicion === 'arriba' ? 250 : tx.posicion === 'abajo' ? 1000 : 480;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, textAlign: 'center', opacity: salida, lineHeight: 1, transform: `rotate(${-3 + 1.5 * Math.sin(t * 3)}deg)` }}>
      {lineas.map((l, i) => {
        const uu = u - i * 0.07;
        // 'letras' ya recorta el margen de cada imagen; el resto lo conserva, así que hay que solapar los márgenes para que las líneas queden juntas
        const gap = { marginTop: i ? (estilo === 'letras' ? -size * 0.25 : -(2 * padTexto(16, estilo === 'neon' ? 50 : 44) + size * 0.25)) : 0 }; const p = { txt: l, color: col, size, u: uu, stroke: 16, glow: 44 };
        if (estilo === 'letras') return <Letras key={i} {...p} style={gap} />;
        if (estilo === 'glitch') return <TextoGlitch key={i} {...p} frame={frame} style={gap} />;
        if (estilo === 'neon') return <NeonParpadeo key={i} {...p} glow={50} style={gap} />;
        if (estilo === 'escribir') return <Escribir key={i} {...p} style={gap} />;
        return <Slam key={i} {...p} style={gap} />;
      })}
      {tx.sub ? <div style={{ marginTop: 8, opacity: cl((u - 0.25) / 0.15) }}><TextoImg txt={tx.sub} color={tema.sub} size={52} stroke={9} glow={24} /></div> : null}
    </div>
  );
};
