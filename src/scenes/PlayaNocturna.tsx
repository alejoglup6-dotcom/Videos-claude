import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

export const PlayaNocturna: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u);

return (
  <>
    <Plano pos={[-14, 0, -40]} tam={[52, 200]} color="#4A3568" rough={0.95} />
    <Plano pos={[40, -0.02, -40]} tam={[80, 200]} color="#0A1048" metal={0.6} rough={0.18} />
    {[18, 26, 34].map((x, i) => <Reflejo key={i} x={x} z={-60} largo={140} color={i % 2 ? '#44E6FF' : '#FF4FA8'} ancho={2.4} op={0.22} />)}
    <Reflejo x={22} z={-90} largo={120} color="#F2EEFF" ancho={5} op={0.16} />
    <mesh position={[26, 34, -130]}><sphereGeometry args={[6, 18, 14]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh><Brillo pos={[26, 34, -129]} esc={40} color="#8AA0FF" op={0.4} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <Palmera key={i} x={-2 + (i % 2) * 5 - lerp(0, 1, e)} z={14 - i * 11} h={5 + (i % 3)} t={t} i={i} />)}
    <Skyline semilla={5} z={-95} ancho={110} n={20} alto={34} />
    <Rotulo pos={[-10, 4, -8]} w={3.4} h={1.2} color="#FF4FA8" rot={0.6} /><Rotulo pos={[-12, 6, -30]} w={3.8} h={1.2} color="#44E6FF" rot={0.5} />
    <Lluvia t={t} n={90} x={[-25, 25]} z={[-50, 14]} alto={20} vel={24} />
  </>
);
};
