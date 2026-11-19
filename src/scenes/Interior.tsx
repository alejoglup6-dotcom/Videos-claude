import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Persona } from '../three/piezas';
import { ease, Plano, Caja, EdifDia, Arbol, COLORES_EDIF } from '../three/comunesDia';
import type { V3 } from '../three/comunesDia';
import type { PropsEscena } from '../three/tipos';

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

