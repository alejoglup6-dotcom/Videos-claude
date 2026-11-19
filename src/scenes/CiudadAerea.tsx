import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

export const CiudadAerea: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u);
  const trafico = (zs: number[], x: number, vel: number) => zs.map((z0, i) => <Caja key={i} pos={[x + (i % 2) * 0.9, 0.4, mod(z0 - t * vel * (i % 2 ? 1 : -1), 150) - 110]} tam={[0.5, 0.4, 1.0]} color={i % 2 ? '#FF3040' : '#FFE9A0'} basico />);
  return (
    <>
      <Plano pos={[-46, 0, -45]} tam={[92, 190]} color="#0D0828" />
      <Plano pos={[4, 0.01, -45]} tam={[8, 190]} color="#4A3568" rough={0.95} />
      <Plano pos={[52, -0.02, -45]} tam={[88, 190]} color="#0A1048" metal={0.6} rough={0.18} />
      {[16, 24, 33, 44].map((x, i) => <Reflejo key={i} x={x} z={-50} largo={150} color={i % 2 ? '#44E6FF' : '#FF4FA8'} ancho={2.2} op={0.2} />)}
      <group position={[-36, 0, 0]}><Skyline semilla={3} z={-24} ancho={60} n={16} alto={34} /></group><group position={[-62, 0, -52]}><Skyline semilla={8} z={-10} ancho={56} n={16} alto={40} /></group>
      <Plano pos={[-2, 0.03, -45]} tam={[2.4, 190]} color="#1A1040" /><Reflejo x={-2} z={-45} largo={190} color="#FF4FA8" ancho={1.8} op={0.35} />
      {trafico([0, 22, 44, 66, 88, 110], -2.6, 9)}
      {[0, 2, 4, 6, 8, 10, 12].map((i) => <Palmera key={i} x={3 + (i % 2) * 2} z={20 - i * 14} h={5} t={t} i={i} />)}
      <Lluvia t={t} n={120} x={[-30, 16]} z={[-90, 40]} alto={40} vel={30} />
      <mesh position={[28, 40, -140]}><sphereGeometry args={[5, 18, 14]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh>
      <Brillo pos={[28, 40, -139]} esc={34} color="#8AA0FF" op={0.35} />
    </>
  );
};
