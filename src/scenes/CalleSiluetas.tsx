import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

export const CalleSiluetas: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u); const z0 = -4;

  return (
    <>
      <Plano pos={[0, 0, -40]} tam={[200, 220]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -40]} tam={[9, 220]} color="#14102E" metal={0.7} rough={0.12} />
      {[-3.6, 3.6].map((x, i) => <Caja key={i} pos={[x, 0.05, -40]} tam={[0.16, 0.1, 220]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-2} z={-18} largo={60} color="#FF4FA8" ancho={1.4} op={0.3} /><Reflejo x={2.4} z={-18} largo={60} color="#44E6FF" ancho={1.4} op={0.3} /><Reflejo x={0} z={-14} largo={30} color="#FFE9A0" ancho={3} op={0.18} />
      {[-1, 1].map((s) => [0, 1, 2, 3, 4, 5].map((i) => <Edificio key={s + '_' + i} x={s * (11 + (i % 2) * 2)} z={6 - i * 15} w={9} h={14 + ((i * 7) % 5) * 5} d={9} k={i + (s > 0 ? 3 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      <Rotulo pos={[-7.6, 5, -14]} w={3.2} h={1.1} color="#FF4FA8" rot={0.5} /><Rotulo pos={[7.6, 6.4, -24]} w={3.8} h={1.2} color="#44E6FF" rot={-0.5} /><Rotulo pos={[-7.4, 3.2, -34]} w={3} h={1} color="#FFB02E" rot={0.5} />
      {[-6.5, 6.5].map((x, i) => [10, 0, -12, -26].map((z, j) => <Palmera key={i + '_' + j} x={x} z={z} h={5.2} t={t} i={i * 4 + j} />))}
      <group position={[0.2, 0, z0 - 6]}><Auto color="#1C2236" neon="#FF4FA8" />
        <Brillo pos={[-0.62, 0.64, 2.4]} esc={3.6} color="#FFF3C4" op={0.9} /><Brillo pos={[0.62, 0.64, 2.4]} esc={3.6} color="#FFF3C4" op={0.9} />
        <mesh position={[0, 0.9, 9]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[2.2, 12, 14, 1, true]} /><meshBasicMaterial color="#FFF0C0" transparent opacity={0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      </group>
      <group position={[-0.65, 0, z0 + lerp(0, 0.4, e)]} rotation={[0, Math.PI, 0]}><Silueta alto={1.05} pelo="corto" neon="#44E6FF" t={t} /></group>
      <group position={[0.65, 0, z0 + lerp(0, 0.4, e)]} rotation={[0, Math.PI, 0]}><Silueta alto={0.95} pelo="largo" neon="#FF4FA8" t={t + 1} /></group>
      <Lluvia t={t} n={150} x={[-12, 12]} z={[-40, 8]} alto={16} vel={22} />
      <pointLight position={[0, 2, -2]} color="#FFE9C0" intensity={4} distance={14} />
    </>
  );
};
