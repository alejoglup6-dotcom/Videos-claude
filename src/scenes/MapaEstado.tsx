import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

const COSTA: [number, number][] = [[-8, 6], [-3, 6.2], [0, 5.4], [2.5, 5.6], [3.4, 4.2], [3.2, 2], [3.8, 0], [4.2, -2.5], [4.8, -5], [5.2, -7.5], [4.4, -8.8], [3, -8.6], [2.4, -7], [1.4, -5], [0.2, -3.4], [-0.8, -1], [-1.4, 1.6], [-3.2, 2.6], [-6, 3.2]];
const FORMA = (() => { const s = new THREE.Shape(COSTA.map((p) => new THREE.Vector2(p[0], p[1]))); return s; })();
const w3 = (p: [number, number], y = 0): V3 => [p[0], y, -p[1]];
const Tramo: React.FC<{ a: [number, number]; b: [number, number]; y: number; ancho: number; color: string; op?: number }> = ({ a, b, y, ancho, color, op = 1 }) => {
  const dx = b[0] - a[0], dz = -(b[1] - a[1]); const largo = Math.hypot(dx, dz);
  return <mesh position={[(a[0] + b[0]) / 2, y, -(a[1] + b[1]) / 2]} rotation={[0, Math.atan2(dx, dz), 0]}><boxGeometry args={[ancho, ancho, largo]} /><meshBasicMaterial color={color} transparent={op < 1} opacity={op} /></mesh>;
};
const CARRETERAS: [number, number][][] = [[[3, -1.5], [2.2, 1.5], [0.6, 4.2], [-3, 4.6], [-7, 4.4]], [[3, -1.5], [3.4, -4], [2.6, -6.2], [3.6, -8]], [[3, -1.5], [0, -2.2], [-0.4, -4.6], [1.6, -6.4]]];
export const Mapa: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u); const ciudad = k === 1; const pantano = k === 2; const carr = k === 3; const costa = k === 0;
  const pulso = 0.6 + 0.4 * Math.sin(t * 4);
  const torres = Array.from({ length: 16 }, (_, i) => ({ x: 2.2 + (i % 4) * 0.42 + (rnd(i) - 0.5) * 0.15, y: -0.6 - Math.floor(i / 4) * 0.45 - rnd(i + 9) * 0.1, h: 0.4 + rnd(i * 3 + 1) * 1.1 }));
  return (
    <group position={[1.4, 0, -1.3]}>
      <Plano pos={[-1.4, -0.05, 1.3]} tam={[120, 120]} color="#070B26" metal={0.05} rough={0.95} />
      {Array.from({ length: 11 }, (_, i) => <Caja key={i} pos={[-1.4 + (i - 5) * 3, -0.02, 1.3]} tam={[0.03, 0.02, 40]} color="#1A2A6A" basico />)}
      {Array.from({ length: 9 }, (_, i) => <Caja key={'h' + i} pos={[-1.4, -0.02, 1.3 + (i - 4) * 3]} tam={[40, 0.02, 0.03]} color="#1A2A6A" basico />)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><extrudeGeometry args={[FORMA, { depth: 0.5, bevelEnabled: false }]} /><meshStandardMaterial color="#17235A" roughness={0.6} metalness={0.2} /></mesh>
      {COSTA.map((p, i) => <Tramo key={i} a={p} b={COSTA[(i + 1) % COSTA.length]} y={0.55} ancho={costa ? 0.16 : 0.09} color={costa ? '#44E6FF' : '#2A7AB0'} />)}
      {costa ? <Brillo pos={w3(COSTA[7 + Math.floor(mod(t * 3, 5))], 0.7)} esc={2.2} color="#44E6FF" /> : null}
      {costa ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.7, 0.02, -0.5]}><ringGeometry args={[1.5 + 1.2 * mod(t, 1), 1.6 + 1.2 * mod(t, 1), 40]} /><meshBasicMaterial color="#44E6FF" transparent opacity={0.5 * (1 - mod(t, 1))} side={THREE.DoubleSide} /></mesh> : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.52, 5.5]}><circleGeometry args={[1.7, 28]} /><meshBasicMaterial color="#25C98B" transparent opacity={pantano ? 0.35 + 0.25 * pulso : 0.16} /></mesh>
      {Array.from({ length: 16 }, (_, i) => { const a = rnd(i) * 6.28, r = Math.sqrt(rnd(i + 3)) * 1.5; return <mesh key={i} position={[0.5 + Math.cos(a) * r, 0.7, 5.5 + Math.sin(a) * r]}><coneGeometry args={[0.05, 0.4 + 0.2 * rnd(i + 5), 5]} /><meshBasicMaterial color={pantano ? '#7CFF3A' : '#25C98B'} /></mesh>; })}
      {pantano ? <Brillo pos={[0.5, 0.8, 5.5]} esc={7} color="#25C98B" op={0.45 * pulso} /> : null}
      {torres.map((o, i) => { const s = ciudad ? ease(u * 1.6 - i * 0.04) : 1; const h = o.h * s + 0.02;
        return <mesh key={i} position={[o.x, 0.5 + h / 2, -o.y]}><boxGeometry args={[0.3, h, 0.3]} /><meshStandardMaterial color="#B07CFF" emissive={i % 2 ? '#FF4FA8' : '#44E6FF'} emissiveIntensity={ciudad ? 0.9 : 0.5} roughness={0.4} /></mesh>; })}
      {ciudad ? <Brillo pos={[2.9, 1.2, 1.1]} esc={6} color="#FF4FA8" op={0.4 * pulso} /> : null}
      {CARRETERAS.map((ruta, r) => ruta.slice(0, -1).map((p, i) => <Tramo key={r + '_' + i} a={p} b={ruta[i + 1]} y={0.52} ancho={carr ? 0.1 : 0.05} color={carr ? '#FFB02E' : '#7A5A2A'} />))}
      {CARRETERAS.map((ruta, r) => { const n = ruta.length - 1; const f = mod(t * (carr ? 0.5 : 0.25) + r * 0.3, 1) * n; const i = Math.min(n - 1, Math.floor(f)); const p = ruta[i], q = ruta[i + 1]; const m = f - i;
        return <Brillo key={r} pos={w3([lerp(p[0], q[0], m), lerp(p[1], q[1], m)], 0.7)} esc={carr ? 1.4 : 0.8} color="#FFE9A0" />; })}
      {Array.from({ length: 36 }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 22, 0.4 + mod(rnd(i + 40) * 6 + t * 0.5, 6), (rnd(i * 2 + 1) - 0.5) * 22]}><sphereGeometry args={[0.05, 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF'][i % 3]} /></mesh>)}
    </group>
  );
};

