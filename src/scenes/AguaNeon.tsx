import React from 'react';
import * as THREE from 'three';
import { cl, lerp } from '../lib/motor';
import { Skyline, Palmera } from '../three/piezas';
import { ease, Brillo, Plano, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { Perro, MotoAcuatica, Estela, Caiman } from '../three/fauna';

// Agua nocturna con la ciudad de neón al fondo. k=0: perro en moto de agua · k=1: caimán acercándose.
const Onda: React.FC<{ t: number; pos: [number, number, number]; fase: number; color?: string; max?: number }> = ({ t, pos, fase, color = '#FFFFFF', max = 2.2 }) => {
  const u = (t * 0.6 + fase) % 1;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos}><ringGeometry args={[0.2 + u * max, 0.26 + u * max, 32]} /><meshBasicMaterial color={color} transparent opacity={0.45 * (1 - u)} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>;
};
export const AguaNeon: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u); const jet = k === 0;
  return (
    <>
      <Plano pos={[0, 0, -60]} tam={[260, 260]} color="#0A1048" metal={0.65} rough={0.16} />
      {[-14, -6, 4, 12].map((x, i) => <Reflejo key={i} x={x} z={-60} largo={110} color={i % 2 ? '#44E6FF' : '#FF4FA8'} ancho={1.8} op={0.2} />)}
      <Reflejo x={8} z={-90} largo={80} color="#F2EEFF" ancho={4} op={0.14} />
      <Plano pos={[0, 0.02, -86]} tam={[260, 10]} color="#2A1E4A" rough={0.95} />
      <Skyline semilla={7} z={-98} ancho={150} n={22} alto={40} />
      {[-30, -18, 16, 28].map((x, i) => <Palmera key={i} x={x} z={-84} h={6} t={t} i={i} />)}
      <mesh position={[22, 30, -150]}><sphereGeometry args={[6, 18, 14]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh><Brillo pos={[22, 30, -149]} esc={38} color="#8AA0FF" op={0.35} />
      {jet ? (
        <group position={[0.6 * Math.sin(t * 1.3), 0.05 + 0.06 * Math.sin(t * 5), 0]} rotation={[0, 0.25 * Math.sin(t * 1.3), 0]}>
          <MotoAcuatica t={t} />
          <group position={[0, 0.58, -0.05]} scale={0.85}><Perro t={t} sentado chaleco /></group>
          <Estela t={t} />
        </group>
      ) : (
        <group position={[0.3 * Math.sin(t * 0.8), -0.05, lerp(-7, -2.6, e)]}>
          <Caiman t={t} boca={cl((u - 0.65) / 0.2)} />
          {[-1, 1].map((s) => <Brillo key={s} pos={[s * 0.18, 0.4, 0.68]} esc={0.32} color="#FFE04A" op={0.8} />)}
          <Onda t={t} pos={[0, 0.03, 0.4]} fase={0} /><Onda t={t} pos={[0, 0.03, 0.4]} fase={0.5} />
        </group>
      )}
      <Lluvia t={t} n={40} x={[-10, 10]} z={[-30, 6]} alto={14} vel={22} />
    </>
  );
};
