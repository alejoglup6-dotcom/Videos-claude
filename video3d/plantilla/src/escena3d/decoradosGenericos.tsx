// Decorados genéricos reutilizables (no atados a ningún tema). Se registran en decorados.tsx.
//   calle     de día: avenida · plaza · esquina
//   interior  habitación sencilla: mesa · ventana · estante
//   datos     escena de datos animada: barras · cifra · ascenso   (usa "datos": [números] de la toma)
import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../motor';
import { Auto, Persona } from './Piezas';
import type { PropsDecorado } from './decorados';

type V3 = [number, number, number];
const ease = (x: number) => 1 - Math.pow(1 - cl(x), 3);

// ---------- textura de ventanas de día (se dibuja una sola vez por combinación) ----------
const cache: Record<string, THREE.Texture> = {};
const ventanasDia = (color: string, cols: number, filas: number): THREE.Texture => {
  const k = `vd_${color}_${cols}_${filas}`;
  if (cache[k]) return cache[k];
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const c = cv.getContext('2d')!; c.fillStyle = color; c.fillRect(0, 0, 128, 256);
  const mw = 128 / cols, mh = 256 / filas;
  for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) { c.fillStyle = (i * 7 + j * 3) % 5 === 0 ? '#F6E7A8' : '#6FA3D8'; c.fillRect(i * mw + mw * 0.2, j * mh + mh * 0.18, mw * 0.6, mh * 0.55); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 1;
  return (cache[k] = tx);
};
const EdifDia: React.FC<{ x: number; z: number; w: number; h: number; d: number; color: string }> = ({ x, z, w, h, d, color }) => {
  const tx = ventanasDia(color, Math.max(2, Math.round(w / 1.7)), Math.max(2, Math.round(h / 2)));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial map={tx} roughness={0.85} /></mesh>
      <mesh position={[0, h + 0.15, 0]}><boxGeometry args={[w + 0.3, 0.3, d + 0.3]} /><meshStandardMaterial color="#8A8F98" roughness={0.9} /></mesh>
    </group>
  );
};
const COLORES_EDIF = ['#E8D9B8', '#D98F6C', '#B9CBE0', '#E5C6C0', '#C9DDB8', '#F0E2A8'];
const Arbol: React.FC<{ x: number; z: number; h?: number; t: number; i: number }> = ({ x, z, h = 3, t, i }) => (
  <group position={[x, 0, z]} rotation={[0, 0, 0.02 * Math.sin(t * 1.2 + i)]}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.15, 0.22, h, 6]} /><meshStandardMaterial color="#6B4A2B" roughness={0.9} /></mesh>
    <mesh position={[0, h + 0.7, 0]}><sphereGeometry args={[1.25, 10, 8]} /><meshStandardMaterial color="#3E9B4F" roughness={0.9} /></mesh>
    <mesh position={[0.5, h + 1.3, 0.2]}><sphereGeometry args={[0.85, 10, 8]} /><meshStandardMaterial color="#4FB562" roughness={0.9} /></mesh>
  </group>
);
const Plano: React.FC<{ pos: V3; tam: [number, number]; color: string; rough?: number }> = ({ pos, tam, color, rough = 0.95 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos}><planeGeometry args={tam} /><meshStandardMaterial color={color} roughness={rough} /></mesh>
);
const Caja: React.FC<{ pos: V3; tam: V3; color: string; rough?: number }> = ({ pos, tam, color, rough = 0.85 }) => (
  <mesh position={pos}><boxGeometry args={tam} /><meshStandardMaterial color={color} roughness={rough} /></mesh>
);

// ====================== CALLE (de día) ======================
export const Calle: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = ease(u);
  const fila = (xs: number, zs: number[], dz = 0) => zs.map((z, i) => <EdifDia key={i} x={xs} z={z + dz} w={8 + (i % 3) * 2} h={9 + ((i * 5) % 7) * 2.2} d={9} color={COLORES_EDIF[(i + (xs > 0 ? 2 : 0)) % COLORES_EDIF.length]} />);
  if (k === 0) { // avenida en perspectiva
    return (
      <>
        <Plano pos={[0, -0.02, -40]} tam={[200, 240]} color="#A9B3A0" />
        <Plano pos={[0, 0, -40]} tam={[8, 200]} color="#4B5057" rough={0.8} />
        <Caja pos={[5.5, 0.06, -40]} tam={[3, 0.12, 200]} color="#CFD2D6" /><Caja pos={[-5.5, 0.06, -40]} tam={[3, 0.12, 200]} color="#CFD2D6" />
        {Array.from({ length: 24 }, (_, i) => <Caja key={i} pos={[0, 0.02, 12 - i * 4.4]} tam={[0.25, 0.02, 2]} color="#F4F4F0" rough={0.6} />)}
        {Array.from({ length: 7 }, (_, i) => <Caja key={'c' + i} pos={[-3.2 + i * 1.07, 0.02, 4]} tam={[0.6, 0.02, 3]} color="#F4F4F0" rough={0.6} />)}
        {fila(-14, [-4, -16, -28, -40, -52, -64, -76])}{fila(14, [-6, -18, -30, -42, -54, -66, -78])}
        {Array.from({ length: 8 }, (_, i) => <Arbol key={i} x={(i % 2 ? 1 : -1) * 6.2} z={2 - i * 9} t={t} i={i} />)}
        <group position={[2, 0, 8 - ((t * 5) % 70)]} rotation={[0, Math.PI, 0]}><Auto color="#E85A4F" neon="#FFD9A0" /></group>
      </>
    );
  }
  if (k === 1) { // plaza con fuente
    const chorro = (i: number) => 1.1 + 0.5 * Math.sin(t * 3 + i * 1.6);
    return (
      <>
        <Plano pos={[0, 0, -10]} tam={[90, 90]} color="#DDD5C4" rough={0.85} />
        <mesh position={[0, 0.3, -10]}><cylinderGeometry args={[3.4, 3.6, 0.6, 28]} /><meshStandardMaterial color="#BFC7CF" roughness={0.7} /></mesh>
        <mesh position={[0, 0.62, -10]}><cylinderGeometry args={[3.0, 3.0, 0.1, 28]} /><meshStandardMaterial color="#6EC6F2" roughness={0.15} metalness={0.2} /></mesh>
        <mesh position={[0, 1.5, -10]}><cylinderGeometry args={[0.35, 0.5, 2, 10]} /><meshStandardMaterial color="#BFC7CF" roughness={0.7} /></mesh>
        <mesh position={[0, 2.5, -10]}><sphereGeometry args={[0.9, 12, 8]} /><meshStandardMaterial color="#CFD6DC" roughness={0.6} /></mesh>
        {Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3 + t * 0.2; return <mesh key={i} position={[Math.cos(a) * 1.7, 0.7 + chorro(i) / 2, -10 + Math.sin(a) * 1.7]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color="#CFEFFF" roughness={0.2} /></mesh>; })}
        {Array.from({ length: 4 }, (_, i) => { const a = i * Math.PI / 2 + Math.PI / 4; const x = Math.cos(a) * 8, z = -10 + Math.sin(a) * 8;
          return <group key={i} position={[x, 0, z]} rotation={[0, -a + Math.PI / 2, 0]}><Caja pos={[0, 0.5, 0]} tam={[2.4, 0.12, 0.7]} color="#8A5A34" /><Caja pos={[0, 0.9, -0.3]} tam={[2.4, 0.6, 0.1]} color="#8A5A34" /><Caja pos={[-1, 0.25, 0]} tam={[0.12, 0.5, 0.6]} color="#3A3F46" /><Caja pos={[1, 0.25, 0]} tam={[0.12, 0.5, 0.6]} color="#3A3F46" /></group>; })}
        {Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8; return <Arbol key={i} x={Math.cos(a) * 14} z={-10 + Math.sin(a) * 14} t={t} i={i} />; })}
        {[-24, -12, 0, 12, 24].map((x, i) => <EdifDia key={i} x={x} z={-38} w={10} h={11 + (i % 3) * 4} d={9} color={COLORES_EDIF[i % COLORES_EDIF.length]} />)}
        {[-1, 1].map((s, i) => <EdifDia key={'l' + i} x={s * 26} z={-10} w={9} h={13 + i * 3} d={22} color={COLORES_EDIF[(i + 3) % COLORES_EDIF.length]} />)}
      </>
    );
  }
  // esquina: dos calles que se cruzan, semáforo y una persona cruzando
  const px = lerp(-3.4, 3.4, e);
  return (
    <>
      <Plano pos={[0, -0.02, -20]} tam={[200, 200]} color="#A9B3A0" />
      <Plano pos={[0, 0, -20]} tam={[8, 200]} color="#4B5057" rough={0.8} /><Plano pos={[0, 0.005, -6]} tam={[200, 8]} color="#4B5057" rough={0.8} />
      {Array.from({ length: 7 }, (_, i) => <Caja key={i} pos={[-3.2 + i * 1.07, 0.03, 1.2]} tam={[0.6, 0.02, 2.4]} color="#F4F4F0" rough={0.6} />)}
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map((c, i) => <EdifDia key={i} x={c[0] * 15} z={-6 + c[1] * 15} w={12} h={10 + i * 3} d={12} color={COLORES_EDIF[(i + 1) % COLORES_EDIF.length]} />)}
      <group position={[4.6, 0, 3.2]}>
        <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.1, 0.12, 4, 6]} /><meshStandardMaterial color="#3A3F46" /></mesh>
        <Caja pos={[0, 4.2, 0]} tam={[0.5, 1.4, 0.4]} color="#2A2E33" />
        {['#FF3B30', '#FFCC00', '#34C759'].map((c, i) => <mesh key={i} position={[0, 4.65 - i * 0.45, 0.22]}><sphereGeometry args={[0.15, 8, 6]} /><meshBasicMaterial color={c} /></mesh>)}
      </group>
      <group position={[px, 0, 1.2]} rotation={[0, Math.PI / 2, 0]}><Persona t={t * 3} camisa="#FFB02E" /></group>
      <Arbol x={-6.5} z={6} t={t} i={1} /><Arbol x={6.5} z={-14} t={t} i={2} />
      <group position={[-2, 0, -2 - ((t * 4) % 30)]} rotation={[0, Math.PI, 0]}><Auto color="#2F7BE0" neon="#FFFFFF" /></group>
    </>
  );
};

// ====================== INTERIOR (habitación sencilla) ======================
const Taza: React.FC<{ pos: V3; color: string }> = ({ pos, color }) => (
  <group position={pos}>
    <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.16, 0.14, 0.34, 14]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    <mesh position={[0.2, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.09, 0.025, 6, 10]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
  </group>
);
const Libros: React.FC<{ pos: V3 }> = ({ pos }) => (
  <group position={pos}>
    <Caja pos={[0, 0.06, 0]} tam={[0.9, 0.12, 0.6]} color="#2F7BE0" /><Caja pos={[0.03, 0.18, 0]} tam={[0.85, 0.12, 0.58]} color="#E85A4F" /><Caja pos={[-0.02, 0.3, 0.02]} tam={[0.8, 0.12, 0.55]} color="#F0C24A" />
  </group>
);
const Lampara: React.FC<{ pos: V3 }> = ({ pos }) => (
  <group position={pos}>
    <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.3, 0.34, 0.1, 14]} /><meshStandardMaterial color="#2A2E33" roughness={0.6} /></mesh>
    <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.04, 0.04, 1.1, 6]} /><meshStandardMaterial color="#2A2E33" /></mesh>
    <mesh position={[0, 1.2, 0]}><coneGeometry args={[0.45, 0.45, 14, 1, true]} /><meshStandardMaterial color="#F4B942" side={THREE.DoubleSide} roughness={0.6} /></mesh>
    <mesh position={[0, 1.05, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshBasicMaterial color="#FFF3C4" /></mesh>
    <pointLight position={[0, 1.0, 0]} color="#FFD9A0" intensity={9} distance={11} />
  </group>
);
const Maceta: React.FC<{ pos: V3; esc?: number; t: number }> = ({ pos, esc = 1, t }) => (
  <group position={pos} scale={esc}>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.35, 0.26, 0.6, 12]} /><meshStandardMaterial color="#C0623E" roughness={0.8} /></mesh>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.3) * 0.25, 0.95 + (i % 3) * 0.18, Math.sin(i * 1.3) * 0.25]} rotation={[0.2 * Math.sin(t * 1.3 + i), 0, 0.3 * Math.cos(i)]}><sphereGeometry args={[0.28, 8, 6]} /><meshStandardMaterial color={i % 2 ? '#3E9B4F' : '#4FB562'} roughness={0.9} /></mesh>)}
  </group>
);
const Mesa: React.FC<{ pos: V3; ancho?: number }> = ({ pos, ancho = 3.2 }) => (
  <group position={pos}>
    <Caja pos={[0, 1, 0]} tam={[ancho, 0.14, 1.7]} color="#8A5A34" rough={0.6} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map((c, i) => <Caja key={i} pos={[c[0] * (ancho / 2 - 0.15), 0.5, c[1] * 0.7]} tam={[0.16, 1, 0.16]} color="#6B4426" />)}
  </group>
);
export const Interior: React.FC<{ t: number; u: number; k: number }> = ({ t, u, k }) => {
  const e = ease(u);
  return (
    <>
      <Plano pos={[0, 0, -3]} tam={[14, 24]} color="#B98B5E" rough={0.55} />
      <Caja pos={[0, 2.5, -15]} tam={[14.2, 5, 0.3]} color="#EDE6DA" /><Caja pos={[-7.1, 2.5, -3]} tam={[0.3, 5, 24]} color="#E4DACB" /><Caja pos={[7.1, 2.5, -3]} tam={[0.3, 5, 24]} color="#E4DACB" />
      <Caja pos={[0, 5.1, -3]} tam={[14.2, 0.3, 24]} color="#F6F1E8" />
      <Caja pos={[0, 0.12, -14.8]} tam={[14, 0.24, 0.1]} color="#C9BBA6" />
      {k === 0 && (
        <>
          <Mesa pos={[0, 0, -7]} />
          <Taza pos={[-0.9, 1.07, -6.8]} color="#E85A4F" /><Libros pos={[0.5, 1.07, -7.2]} /><Lampara pos={[1.2, 1.07, -7.6]} />
          <Caja pos={[-0.2, 1.1, -7.6]} tam={[0.8, 0.06, 0.55]} color="#B8BEC6" rough={0.4} />
          <group position={[-0.2, 1.1, -7.9]} rotation={[-0.35 - 0.1 * e, 0, 0]}><Caja pos={[0, 0.3, 0]} tam={[0.8, 0.56, 0.04]} color="#2A2E33" /><mesh position={[0, 0.3, 0.03]}><planeGeometry args={[0.7, 0.46]} /><meshBasicMaterial color="#9ED8FF" /></mesh></group>
          <Caja pos={[0, 3, -14.8]} tam={[2.4, 1.6, 0.08]} color="#F0C24A" /><Caja pos={[0, 3, -14.74]} tam={[2.1, 1.3, 0.06]} color="#6FA3D8" />
          <Maceta pos={[-5, 0, -12]} esc={1.4} t={t} />
        </>
      )}
      {k === 1 && (
        <>
          <Caja pos={[0, 3, -14.8]} tam={[6, 3.4, 0.1]} color="#FFFFFF" rough={0.2} />
          <mesh position={[0, 3, -14.72]}><planeGeometry args={[5.6, 3]} /><meshBasicMaterial color="#DFF1FF" /></mesh>
          <Caja pos={[0, 3, -14.68]} tam={[0.12, 3, 0.06]} color="#FFFFFF" /><Caja pos={[0, 3, -14.68]} tam={[5.6, 0.12, 0.06]} color="#FFFFFF" />
          <Caja pos={[-3.7, 2.8, -14.5]} tam={[1.1, 4.2, 0.2]} color="#C0623E" /><Caja pos={[3.7, 2.8, -14.5]} tam={[1.1, 4.2, 0.2]} color="#C0623E" />
          <Mesa pos={[-3, 0, -9]} ancho={2.4} /><Taza pos={[-3.3, 1.07, -9]} color="#2F7BE0" /><Libros pos={[-2.4, 1.07, -9.1]} />
          <Maceta pos={[4.5, 0, -12]} esc={1.7} t={t} />
          <directionalLight position={[0, 4, -16]} intensity={1.4 * lerp(0.6, 1, e)} color="#FFF6DD" />
        </>
      )}
      {k === 2 && (
        <>
          <Caja pos={[0, 2.4, -14.5]} tam={[8, 4.4, 0.5]} color="#7A4F2E" rough={0.7} />
          {[0.8, 2.1, 3.4].map((y, r) => <Caja key={r} pos={[0, y, -14.2]} tam={[7.6, 0.1, 0.5]} color="#5E3B22" />)}
          {[0.8, 2.1, 3.4].map((y, r) => Array.from({ length: 11 }, (_, i) => <Caja key={r + '_' + i} pos={[-3.4 + i * 0.68, y + 0.4 + 0.04 * (i % 3), -14.15]} tam={[0.45, 0.7 + 0.18 * rnd(r * 11 + i), 0.34]} color={['#E85A4F', '#2F7BE0', '#F0C24A', '#3E9B4F', '#8A5FB4', '#F4F1E8'][(i + r * 2) % 6]} />))}
          <Mesa pos={[0, 0, -6]} ancho={2.8} /><Taza pos={[-0.6, 1.07, -6]} color="#E85A4F" /><Lampara pos={[0.9, 1.07, -6.3]} /><Maceta pos={[-5.5, 0, -10]} esc={1.2} t={t} />
        </>
      )}
    </>
  );
};

// ====================== DATOS (barras · cifra · ascenso) ======================
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
export const Datos: React.FC<PropsDecorado> = ({ t, u, k, datos }) => {
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
