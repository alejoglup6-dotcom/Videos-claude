import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { PersonajeA } from '../three/Personaje';
import type { Ropa } from '../three/Personaje';
import { Acera, Farola, Letrero, Escaparate } from '../three/Ciudad';

// la ropa debe ser un objeto estable (el material se crea una vez por personaje)
const ROPA_H: Ropa = { chaqueta: '#2B2F6B', pantalon: '#17171F', zapatos: '#E9E9EF' };
const ROPA_M: Ropa = { chaqueta: '#F2EEE6', pantalon: '#3A2A66', zapatos: '#FF4FA8' };

export const CalleSiluetas: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u); const z0 = -4;

  return (
    <>
      <Plano pos={[0, 0, -40]} tam={[200, 220]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -40]} tam={[9, 220]} color="#14102E" metal={0.7} rough={0.12} />
      {[-3.6, 3.6].map((x, i) => <Caja key={i} pos={[x, 0.05, -40]} tam={[0.16, 0.1, 220]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-2} z={-18} largo={60} color="#FF4FA8" ancho={1.4} op={0.3} /><Reflejo x={2.4} z={-18} largo={60} color="#44E6FF" ancho={1.4} op={0.3} /><Reflejo x={0} z={-14} largo={30} color="#FFE9A0" ancho={3} op={0.18} />
      {[-1, 1].map((s) => [0, 1, 2, 3, 4, 5].map((i) => <Edificio key={s + '_' + i} x={s * (11 + (i % 2) * 2)} z={6 - i * 15} w={9} h={14 + ((i * 7) % 5) * 5} d={9} k={i + (s > 0 ? 3 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      <Letrero txt="LUNA BAR" color="#FF4FA8" pos={[-6.2, 5.2, -14]} rot={0.9} /><Letrero txt="MOTEL" color="#44E6FF" pos={[6.2, 6.4, -24]} rot={-0.9} w={3.8} /><Letrero txt="24 H" color="#FFB02E" pos={[-6.2, 3.8, -34]} rot={0.9} w={2.6} />
      <Acera x={-5.5} z={-40} largo={220} ancho={2} /><Acera x={5.5} z={-40} largo={220} ancho={2} />
      {[4, -10, -24, -38].map((z) => <React.Fragment key={z}><Farola x={4.9} z={z} lado={1} /><Farola x={-4.9} z={z - 7} lado={-1} /></React.Fragment>)}
      {[6, -24, -54].map((z, i) => <React.Fragment key={z}><Escaparate x={6.47} z={z} lado={1} color={i % 2 ? '#44E6FF' : '#FF4FA8'} /><Escaparate x={-6.47} z={z - 8} lado={-1} color={i % 2 ? '#FFB02E' : '#44E6FF'} /></React.Fragment>)}
      {[-6.5, 6.5].map((x, i) => [10, 0, -12, -26].map((z, j) => <Palmera key={i + '_' + j} x={x} z={z} h={5.2} t={t} i={i * 4 + j} />))}
      <group position={[0.2, 0, z0 - 6]}><Auto color="#1C2236" neon="#FF4FA8" />
        <Brillo pos={[-0.62, 0.64, 2.4]} esc={2.6} color="#FFF3C4" op={0.7} /><Brillo pos={[0.62, 0.64, 2.4]} esc={2.6} color="#FFF3C4" op={0.7} />
        <mesh position={[0, 0.9, 9]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[2.2, 12, 14, 1, true]} /><meshBasicMaterial color="#FFF0C0" transparent opacity={0.045} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      </group>
      <group position={[-0.8, 0, z0 - 3.5 + lerp(0, 1.4, e)]}><PersonajeA genero="h" ropa={ROPA_H} pelo="#2A1C14" barba pose={{ t, paso: 0.55, brazos: 0.0, giro: 0.3 }} /></group>
      <group position={[0.8, 0, z0 - 3.2 + lerp(0, 1.4, e)]}><PersonajeA genero="m" ropa={ROPA_M} pelo="#4A2A1A" pose={{ t: t + 1, paso: 0.55, brazos: 0.0, giro: -0.3 }} /></group>
      <Lluvia t={t} n={150} x={[-12, 12]} z={[-40, 8]} alto={16} vel={22} />
      <pointLight position={[0, 2, -2]} color="#FFE9C0" intensity={4} distance={14} />
    </>
  );
};
