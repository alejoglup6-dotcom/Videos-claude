import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

export const Persecucion: React.FC<PropsEscena> = ({ t, u, k }) => {
  const vel = 30; const xj = 2.4 * Math.sin(t * 1.7 + 0.5) * (k === 2 ? 1.5 : 1); const yaw = Math.PI - 0.2 * Math.cos(t * 1.7 + 0.5) * (k === 2 ? 2.5 : 1) - (k === 2 ? 0.25 * Math.sin(t * 5) : 0);
  const patrullas: [number, number][] = k === 1 ? [[xj - 3.3, -15], [xj + 3.3, -12.5]] : k === 2 ? [[xj * 0.6 - 1.2, -7], [xj * 0.5 + 2.6, -5]] : [[xj * 0.7 - 1.6, -5], [xj * 0.6 + 2.2, -2]];
  const lentos = [[-4.6, 12, 14], [4.8, 40, 11], [-4.4, 70, 12], [0.4, 95, 10]];
  return (
    <>
      <Plano pos={[0, 0, -60]} tam={[220, 300]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -60]} tam={[15, 300]} color="#12102C" metal={0.7} rough={0.12} />
      {[-2.4, 2.4].map((x) => Array.from({ length: 14 }, (_, i) => <Caja key={x + '_' + i} pos={[x, 0.04, mod(i * 12 + t * vel, 168) - 140]} tam={[0.2, 0.04, 4]} color="#F4F4F0" basico />))}
      {[-7.4, 7.4].map((x, i) => <Caja key={i} pos={[x, 0.05, -60]} tam={[0.2, 0.1, 300]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-5} z={-30} largo={140} color="#44E6FF" ancho={1.6} op={0.28} /><Reflejo x={5} z={-30} largo={140} color="#FF4FA8" ancho={1.6} op={0.28} />
      {[-1, 1].map((s) => Array.from({ length: 12 }, (_, i) => <Edificio key={s + '_' + i} x={s * (16 + (i % 2) * 2)} z={20 - i * 16} w={10} h={14 + ((i * 7) % 5) * 5} d={10} k={i + (s > 0 ? 5 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      <Farolas zs={[0, 1, 2, 3, 4, 5].map((i) => mod(i * 18 + t * vel, 108) - 90)} ancho={8.4} />
      <group position={[xj, 0, -14]} rotation={[0, yaw, 0]}><Auto color="#E8EEF8" neon="#FF4FA8" /></group>
      {patrullas.map((p, i) => <group key={i} position={[p[0], 0, p[1]]} rotation={[0, Math.PI - 0.1 * Math.cos(t * 1.7 + i), 0]}><Patrulla t={t} fase={i * 0.5} /></group>)}
      {lentos.map((c, i) => <group key={i} position={[c[0], 0, mod(c[1] + t * (vel - c[2]), 150) - 120]} rotation={[0, Math.PI, 0]}><Auto color={['#2F7BE0', '#E85A4F', '#F0C24A', '#8A5FB4'][i]} neon="#FFFFFF" /></group>)}
      <Lluvia t={t} n={150} x={[-14, 14]} z={[-50, 16]} alto={18} vel={26} />
      <pointLight position={[0, 4, 6]} color="#FFFFFF" intensity={3} distance={18} />
    </>
  );
};

