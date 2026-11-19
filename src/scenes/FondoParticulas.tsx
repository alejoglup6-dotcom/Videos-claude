import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia, Rotulo, Silueta, Patrulla, Helicoptero } from '../three/comunes';
import type { V3 } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

export const Fondo: React.FC<PropsEscena> = ({ t, u, k }) => {
  const negro = k === 1; const n = negro ? 18 : 70;
  return (
    <>
      {!negro ? <>
        <Plano pos={[0, -2, -20]} tam={[80, 80]} color="#05030F" metal={0.5} rough={0.3} />
        {Array.from({ length: 13 }, (_, i) => <Caja key={i} pos={[(i - 6) * 3, -1.97, -20]} tam={[0.05, 0.02, 80]} color="#6A2AB0" basico />)}
        {Array.from({ length: 14 }, (_, i) => <Caja key={'z' + i} pos={[0, -1.97, mod(-i * 5 + t * 6, 70) - 55]} tam={[80, 0.02, 0.05]} color="#B02A80" basico />)}
        <Brillo pos={[0, 3, -16]} esc={38} color="#6A2AB0" op={0.28} /><Brillo pos={[-8, 6, -20]} esc={22} color="#B02A80" op={0.22} /><Brillo pos={[9, 1, -22]} esc={20} color="#1FB6FF" op={0.2} />
      </> : null}
      {Array.from({ length: n }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 26, -1.5 + mod(rnd(i + 50) * 14 + t * (0.5 + rnd(i + 7)), 14), -rnd(i * 2 + 1) * 18]}><sphereGeometry args={[0.06 + 0.07 * rnd(i + 20), 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF', '#FFE86A'][i % 4]} transparent opacity={negro ? 0.45 : 0.95} /></mesh>)}
    </>
  );
};

