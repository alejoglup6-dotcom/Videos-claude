import React from 'react';
import { cl, lerp } from '../lib/motor';
import { Edificio, Palmera } from '../three/piezas';
import { ease, Plano, Caja, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { PersonajeA } from '../three/Personaje';
import type { Ropa } from '../three/Personaje';
import { Acera, Letrero } from '../three/Ciudad';
import { Instancias } from '../three/Instancias';
import type { Colocacion } from '../three/Instancias';
import { Vaso, Basurero, Lagartija, Iguana } from '../three/fauna';

// Calle de neón a escala humana. k=0: alguien tira un vaso vacío al basurero · k=1: una lagartija recorre una pared.
const ROPA: Ropa = { chaqueta: '#1F6F8B', pantalon: '#1A1A24', zapatos: '#F2F2F2' };
const FAROLAS: Colocacion[] = [-6, -20, -34].flatMap((z) => [{ pos: [4.6, 0, z] as [number, number, number], escala: 5 }, { pos: [-4.6, 0, z - 7] as [number, number, number], escala: 5, rot: Math.PI }]);
export const CalleDetalle: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u);
  // vuelo del vaso: de la mano (≈ hombro derecho) a la boca del basurero, con giro; después queda dentro
  const v = cl((u - 0.18) / 0.4); const ini: [number, number, number] = [-0.05, 1.35, 0.15]; const fin: [number, number, number] = [1.15, 1.0, 0.05];
  const vp: [number, number, number] = [lerp(ini[0], fin[0], v), lerp(ini[1], fin[1], v) + 0.7 * Math.sin(Math.PI * v), lerp(ini[2], fin[2], v)];
  return (
    <>
      <Plano pos={[0, 0, -40]} tam={[200, 220]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -40]} tam={[8, 220]} color="#14102E" metal={0.7} rough={0.12} />
      <Reflejo x={-1.5} z={-20} largo={60} color="#FF4FA8" ancho={1.4} op={0.2} /><Reflejo x={2} z={-20} largo={60} color="#44E6FF" ancho={1.4} op={0.2} />
      <Acera x={-5.5} z={-40} largo={120} ancho={3} /><Acera x={5.5} z={-40} largo={120} ancho={3} />
      <Instancias archivo="props/Streetlight_Single.glb" colocaciones={FAROLAS} />
      {[-1, 1].map((s) => [1, 2, 3].map((i) => <Edificio key={s + '_' + i} x={s * (11 + (i % 2) * 2)} z={-4 - i * 15} w={9} h={16 + ((i * 7) % 5) * 5} d={9} k={i + (s > 0 ? 3 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      <Letrero txt="ABIERTO 24 H" color="#FF4FA8" pos={[-6.2, 3.4, -10]} rot={0.9} w={3} />
      {[-6.4, 6.4].map((x, i) => [-14, -28].map((z, j) => <Palmera key={i + '_' + j} x={x} z={z} h={5.2} t={t} i={i * 2 + j} />))}
      {k === 2 ? (
        <group position={[4.6, 0.18, -1]}>
          {/* iguana en la acera, junto a una palmera, girando la cabeza */}
          <group position={[0, 0, 0]} rotation={[0, -0.9 + 0.15 * Math.sin(t * 0.7), 0]} scale={1.1}><Iguana t={t} /></group>
          <Palmera x={1.3} z={-1.2} h={5} t={t} i={7} />
        </group>
      ) : k === 0 ? (
        <group position={[4.2, 0.18, 0]}>
          <group position={[-0.5, 0, 0.1]}><PersonajeA genero="h" ropa={ROPA} pelo="#1E140E" barba pose={{ t, paso: 0, brazos: v < 1 ? 0.25 * Math.sin(Math.PI * cl(u / 0.3)) : 0, giro: Math.PI / 2 - 0.3 }} /></group>
          <group position={[0.7, 0, 0]}><Basurero /></group>
          {v < 1 ? <group position={[vp[0] - 0.45, vp[1], vp[2]]} rotation={[v * 5, 0, v * 7]}><Vaso /></group> : null}
        </group>
      ) : (
        <group>
          {/* pared de ladrillo pintado con neón: la lagartija sube en diagonal */}
          <mesh position={[-1.6, 2.5, -1.2]}><boxGeometry args={[4.6, 5, 0.3]} /><meshStandardMaterial color="#6A4A8A" roughness={0.85} /></mesh>
          <Caja pos={[-1.6, 3.6, -1.03]} tam={[3.2, 0.06, 0.04]} color="#44E6FF" basico /><Caja pos={[-1.6, 1.1, -1.03]} tam={[3.2, 0.06, 0.04]} color="#FF4FA8" basico />
          <Letrero txt="ABIERTO" color="#44E6FF" pos={[-2.3, 2.9, -1.0]} w={1.4} />
          {/* lagartija pegada a la pared: lomo hacia la cámara y cabeza hacia arriba, subiendo en diagonal */}
          <group position={[lerp(-1.9, -1.0, e), lerp(1.55, 2.25, e), -1.03]} rotation={[0, 0, -0.55]}><group rotation={[Math.PI / 2, 0, 0]}><group rotation={[0, Math.PI, 0]}><Lagartija t={t} esc={0.45} /></group></group></group>
        </group>
      )}
      <Lluvia t={t} n={40} x={[-10, 10]} z={[-30, 6]} alto={14} vel={22} />
    </>
  );
};
