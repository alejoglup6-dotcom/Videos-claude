import React from 'react';
import * as THREE from 'three';
import { lerp } from '../lib/motor';
import { Edificio, Palmera } from '../three/piezas';
import { ease, Brillo, Plano, Caja, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { PersonajeA } from '../three/Personaje';
import type { Ropa } from '../three/Personaje';
import { Auto } from '../three/Vehiculos';
import { Modelo } from '../three/Modelo';
import { FarolaLib, Letrero } from '../three/Ciudad';

// la ropa debe ser un objeto estable (el material se crea una vez por personaje)
const ROPA_H: Ropa = { chaqueta: '#2B2F6B', pantalon: '#17171F', zapatos: '#E9E9EF' };
const ROPA_M: Ropa = { chaqueta: '#F2EEE6', pantalon: '#3A2A66', zapatos: '#FF4FA8' };
const SIN_ASFALTO = /asphalt/i;   // los edificios del kit traen un trozo de calle: se oculta, la calle ya existe

export const CalleSiluetas: React.FC<PropsEscena> = ({ t, u }) => {
  const e = ease(u); const z0 = -4;
  return (
    <>
      <Plano pos={[0, 0, -40]} tam={[200, 220]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -40]} tam={[9, 220]} color="#14102E" metal={0.7} rough={0.12} />
      {[-3.6, 3.6].map((x, i) => <Caja key={i} pos={[x, 0.05, -40]} tam={[0.16, 0.1, 220]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-2} z={-18} largo={60} color="#FF4FA8" ancho={1.4} op={0.22} /><Reflejo x={2.4} z={-18} largo={60} color="#44E6FF" ancho={1.4} op={0.22} /><Reflejo x={0} z={-14} largo={30} color="#FFE9A0" ancho={3} op={0.12} />
      {/* edificios: dos de la biblioteca cerca de la cámara; el resto, siluetas procedurales baratas */}
      {[-1, 1].map((s) => [2, 3, 4, 5].map((i) => <Edificio key={s + '_' + i} x={s * (11 + (i % 2) * 2)} z={6 - i * 15} w={9} h={14 + ((i * 7) % 5) * 5} d={9} k={i + (s > 0 ? 3 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      <Edificio x={11} z={6} w={9} h={22} d={9} k={4} neon="#FF4FA8" /><Edificio x={-11} z={-24} w={9} h={26} d={9} k={2} neon="#44E6FF" />
      <Letrero txt="LUNA BAR" color="#FF4FA8" pos={[-6.4, 3.2, -4]} rot={0.9} w={2.6} /><Letrero txt="MOTEL" color="#44E6FF" pos={[6.4, 3.4, -14]} rot={-0.9} w={2.8} /><Letrero txt="24 H" color="#FFB02E" pos={[-6.4, 3.8, -34]} rot={0.9} w={2.4} />
      {/* Edificios, aceras, bolardos, semáforo y farolas de la biblioteca están DESACTIVADOS en esta escena: sumaban ~160 s (props) y ~127 s (edificios) al render de estos 3,5 s. Ver public/modelos/BIBLIOTECA.md */}
      {[-6.5, 6.5].map((x, i) => [10, -12, -26].map((z, j) => <Palmera key={i + '_' + j} x={x} z={z} h={5.2} t={t} i={i * 4 + j} />))}
      <group position={[0.2, 0, z0 - 6]}><Auto modelo="SportsCar2" neon="#FF4FA8" />
        <Brillo pos={[-0.62, 0.64, 2.4]} esc={2.2} color="#FFF3C4" op={0.6} /><Brillo pos={[0.62, 0.64, 2.4]} esc={2.2} color="#FFF3C4" op={0.6} />
      </group>
      <group position={[-0.8, 0, z0 - 3.5 + lerp(0, 1.4, e)]}><PersonajeA genero="h" ropa={ROPA_H} pelo="#2A1C14" barba pose={{ t, paso: 0.55, brazos: 0.0, giro: 0.3 }} /></group>
      <group position={[0.8, 0, z0 - 3.2 + lerp(0, 1.4, e)]}><PersonajeA genero="m" ropa={ROPA_M} pelo="#4A2A1A" pose={{ t: t + 1, paso: 0.55, brazos: 0.0, giro: -0.3 }} /></group>
      <Lluvia t={t} n={40} x={[-12, 12]} z={[-40, 8]} alto={16} vel={22} />
    </>
  );
};
