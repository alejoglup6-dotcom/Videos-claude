import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Persona } from '../three/piezas';
import { ease, Plano, Caja, EdifDia, Arbol, COLORES_EDIF } from '../three/comunesDia';
import type { V3 } from '../three/comunesDia';
import type { PropsEscena } from '../three/tipos';

export const Calle: React.FC<PropsEscena> = ({ t, u, k }) => {
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
