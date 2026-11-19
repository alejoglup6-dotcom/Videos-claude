import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Persona } from '../three/piezas';
import { ease, Plano, Caja, EdifDia, Arbol, COLORES_EDIF } from '../three/comunesDia';
import type { V3 } from '../three/comunesDia';
import type { PropsEscena } from '../three/tipos';

const COLORES_DATOS = ['#FF2E93', '#1FB6FF', '#FFB02E', '#25C98B', '#B07CFF', '#FF6A4A'];
const Brillo: React.FC<{ pos: V3; tam: V3; color: string }> = ({ pos, tam, color }) => (
  <mesh position={pos}><boxGeometry args={tam} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.35} /></mesh>
);
const SEG: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
const Digito: React.FC<{ x: number; c: string; color: string }> = ({ x, c, color }) => {
  const W = 1.7, H = 3.4, T = 0.3; const on = SEG[c] ?? '';
  const seg: Record<string, [number, number, number, number]> = { a: [0, H / 2, W, T], g: [0, 0, W, T], d: [0, -H / 2, W, T], f: [-W / 2, H / 4, T, H / 2], b: [W / 2, H / 4, T, H / 2], e: [-W / 2, -H / 4, T, H / 2], c: [W / 2, -H / 4, T, H / 2] };
  return (
    <group position={[x, 0, 0]}>
      {Object.entries(seg).map(([n, [sx, sy, w, h]]) => on.includes(n)
        ? <Brillo key={n} pos={[sx, sy, 0]} tam={[w, h, 0.45]} color={color} />
        : <mesh key={n} position={[sx, sy, -0.05]}><boxGeometry args={[w, h, 0.3]} /><meshStandardMaterial color="#1B2152" roughness={0.8} /></mesh>)}
    </group>
  );
};
export const Datos: React.FC<PropsEscena> = ({ t, u, k, datos }) => {
  const d = datos && datos.length ? datos : [3, 5, 8, 6, 10];
  const base = (<><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><planeGeometry args={[60, 40]} /><meshStandardMaterial color="#10163F" roughness={0.7} metalness={0.15} /></mesh>
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-12 + i * 3, 0, -2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.04, 40]} /><meshBasicMaterial color="#2A3A8A" /></mesh>)}</>);
  if (k === 0) { // barras que suben una tras otra
    const mx = Math.max(...d, 1e-9); const n = d.length; const paso = Math.min(1.5, 8 / n);
    return (
      <>
        {base}
        {d.map((v, i) => { const h = Math.max(0.05, (Math.max(0, v) / mx) * 6 * ease(u * 1.5 - i * 0.12)); const x = (i - (n - 1) / 2) * paso;
          return <group key={i}><Brillo pos={[x, h / 2, 0]} tam={[paso * 0.62, h, paso * 0.62]} color={COLORES_DATOS[i % COLORES_DATOS.length]} /><mesh position={[x, h + 0.18, 0]}><sphereGeometry args={[0.16, 8, 6]} /><meshBasicMaterial color="#FFFFFF" /></mesh></group>; })}
      </>
    );
  }
  if (k === 1) { // cifra grande que cuenta hasta el valor
    const v = Math.max(0, d[0]); const dec = Number.isInteger(v) ? 0 : 1; const val = v * ease(u * 1.4);
    const txt = (dec ? val.toFixed(1) : String(Math.round(val))).slice(0, 8); const ancho = 2.1;
    const total = txt.length * ancho; const color = '#44E6FF'; const esc = Math.min(1, 7.4 / total);
    return (
      <>
        {base}
        <group position={[0, 3.2, 0]} scale={esc}>
          {Array.from(txt).map((c, i) => { const x = -total / 2 + ancho / 2 + i * ancho; return c === '.' ? <Brillo key={i} pos={[x - ancho * 0.1, -1.55, 0]} tam={[0.34, 0.34, 0.45]} color={color} /> : <Digito key={i} x={x} c={c} color={color} />; })}
        </group>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[4 + 0.6 * Math.sin(t * 2), 4.15 + 0.6 * Math.sin(t * 2), 48]} /><meshBasicMaterial color="#FF2E93" /></mesh>
      </>
    );
  }
  // ascenso: línea que se dibuja de izquierda a derecha
  const n = d.length; const mn = Math.min(...d), mx = Math.max(...d); const rango = mx - mn || 1;
  const pts: V3[] = d.map((v, i) => [lerp(-4, 4, n > 1 ? i / (n - 1) : 0), 0.6 + ((v - mn) / rango) * 5, 0]);
  const prog = ease(u * 1.3) * (n - 1);
  return (
    <>
      {base}
      <Caja pos={[0, 0.05, 0]} tam={[9.4, 0.1, 0.2]} color="#7A88D8" /><Caja pos={[-4.6, 3.2, 0]} tam={[0.1, 6.4, 0.2]} color="#7A88D8" />
      {pts.slice(0, -1).map((p, i) => { const q = pts[i + 1]; const f = cl(prog - i); if (f <= 0) return null;
        const ex = lerp(p[0], q[0], f), ey = lerp(p[1], q[1], f); const dx = ex - p[0], dy = ey - p[1]; const len = Math.hypot(dx, dy);
        return <mesh key={i} position={[p[0] + dx / 2, p[1] + dy / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]}><boxGeometry args={[len, 0.16, 0.16]} /><meshStandardMaterial color="#FFB02E" emissive="#FFB02E" emissiveIntensity={0.6} /></mesh>; })}
      {pts.map((p, i) => prog >= i ? <mesh key={i} position={p}><sphereGeometry args={[0.26, 10, 8]} /><meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} /></mesh> : null)}
    </>
  );
};

