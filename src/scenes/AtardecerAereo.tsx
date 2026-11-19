import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

export const Atardecer: React.FC<PropsEscena> = ({ t, u, k }) => {
  const ang = lerp(-0.5, 0.5, u) * (k === 0 ? 1 : 0.5); const a = t * 0.5; const R = k === 1 ? 11 : 17; const hy = k === 2 ? 9 : 15;
  const hx = Math.cos(a) * R, hz = -30 + Math.sin(a) * R;
  return (
    <>
      <Sol x={0} y={14} z={-190} r={30} />
      <group position={[0, 0, -30]} rotation={[0, ang, 0]}>
        <group position={[0, 0, 30]}>
          <Plano pos={[-60, 0, -40]} tam={[110, 200]} color="#2A1450" />
          <Plano pos={[4, 0.01, -40]} tam={[10, 200]} color="#C99A7A" rough={0.95} />
          <Plano pos={[60, -0.02, -40]} tam={[100, 200]} color="#3A2A7A" metal={0.6} rough={0.2} />
          <Reflejo x={30} z={-60} largo={150} color="#FFB070" ancho={6} op={0.25} /><Reflejo x={38} z={-60} largo={150} color="#FF6AA0" ancho={3} op={0.25} />
          <group position={[-40, 0, 0]}><Skyline semilla={2} z={-12} ancho={70} n={18} alto={32} /></group><group position={[-66, 0, -34]}><Skyline semilla={6} z={-10} ancho={60} n={16} alto={38} /></group>
          <Plano pos={[-2, 0.03, -40]} tam={[2.4, 200]} color="#1A1040" />
          {[0, 1, 2, 3, 4].map((i) => <group key={i} position={[-2 + (i % 2 ? 0.5 : -0.5), 0, mod(-i * 28 + t * (i % 2 ? -7 : 6), 140) - 100]} rotation={[0, i % 2 ? 0 : Math.PI, 0]} scale={0.9}><Auto color={['#E85A4F', '#2F7BE0', '#F0C24A', '#E8EEF8', '#8A5FB4'][i]} neon="#FFFFFF" /></group>)}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Palmera key={i} x={0.5 + (i % 2) * 3} z={20 - i * 15} h={5 + (i % 3)} t={t} i={i} />)}
          <group position={[hx, hy, hz]} rotation={[0.08, -a + Math.PI, 0]}><Helicoptero t={t} esc={k === 1 ? 1.3 : 1} /></group>
        </group>
      </group>
    </>
  );
};

