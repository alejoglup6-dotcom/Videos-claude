import React from 'react';
import * as THREE from 'three';
import { cl } from '../lib/motor';
import { lienzo } from '../three/piezas';
import { Brillo } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { Mapa } from './MapaEstado';

// Mapa estilizado de Leonida con pines de misterio («?») y zonas marcadas. Los pines NO nombran nada: son invitación a explorar, no datos.
const PINES: { color: string; p: [number, number]; zona: number }[] = [
  { color: '#44E6FF', p: [2.4, -1.0], zona: 1.1 }, { color: '#7CFF3A', p: [0.5, 5.5], zona: 1.5 }, { color: '#FF4FA8', p: [6.6, -4.2], zona: 0.9 },
  { color: '#FFB02E', p: [-2.6, 3.4], zona: 1.0 }, { color: '#B07CFF', p: [3.4, 3.0], zona: 0.9 }, { color: '#44E6FF', p: [-0.2, -4.4], zona: 1.0 },
];
const signo = (color: string) => lienzo(`q_${color}`, 128, 128, (c) => {
  c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fillStyle = 'rgba(8,10,30,0.9)'; c.fill(); c.lineWidth = 8; c.strokeStyle = color; c.stroke();
  c.font = 'bold 84px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#FFFFFF'; c.fillText('?', 64, 70);
});
export const MapaSecretos: React.FC<PropsEscena> = (p) => {
  const { t, u } = p; const barrido = -9 + 22 * cl(u * 1.15);
  return (
    <>
      <Mapa {...p} k={0} />
      <group position={[1.4, 0, -1.3]}>
        {PINES.map((pin, i) => {
          const a = cl((u - 0.08 - i * 0.1) / 0.08); if (a <= 0) return null; const s = a < 1 ? 1.3 - 0.3 * a : 1 + 0.05 * Math.sin(t * 5 + i); const f = (t * 1.1 + i * 0.3) % 1;
          return (
            <group key={i} position={[pin.p[0], 0.55, -pin.p[1]]} scale={s}>
              <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 1.0, 6]} /><meshBasicMaterial color={pin.color} /></mesh>
              <sprite position={[0, 1.3, 0]} scale={[0.95, 0.95, 1]}><spriteMaterial map={signo(pin.color)} transparent depthWrite={false} toneMapped={false} /></sprite>
              <Brillo pos={[0, 0.05, 0]} esc={pin.zona * 2.2} color={pin.color} op={0.45} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[pin.zona * (0.55 + 0.45 * f), pin.zona * (0.6 + 0.45 * f), 40]} /><meshBasicMaterial color={pin.color} transparent opacity={0.8 * (1 - f)} side={THREE.DoubleSide} depthWrite={false} /></mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[pin.zona * 0.95, pin.zona, 40]} /><meshBasicMaterial color={pin.color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} /></mesh>
            </group>
          );
        })}
        {/* barrido de mapa: una franja de luz que cruza el territorio */}
        <mesh position={[barrido - 1.4, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.35, 40]} /><meshBasicMaterial color="#44E6FF" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      </group>
    </>
  );
};
