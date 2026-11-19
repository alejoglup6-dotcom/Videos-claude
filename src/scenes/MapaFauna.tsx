import React from 'react';
import * as THREE from 'three';
import { cl } from '../lib/motor';
import { lienzo } from '../three/piezas';
import { Brillo } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { Mapa } from './MapaEstado';

// Mapa estilizado de Leonida con marcadores de fauna. Solo especies con fuente (ver guion: «fuentes»). Los osos NO se incluyen: no están confirmados.
const PINES: { txt: string; color: string; p: [number, number] }[] = [
  { txt: 'PERROS', color: '#FFB02E', p: [2.4, -1.0] },
  { txt: 'SERPIENTES', color: '#25C98B', p: [0.4, 5.2] },
  { txt: 'TIBURONES', color: '#44E6FF', p: [6.6, -4.2] },
  { txt: 'CAIMANES', color: '#7CFF3A', p: [-2.6, 3.4] },
];
const etiqueta = (txt: string, color: string) => lienzo(`pin_${txt}`, 512, 128, (c) => {
  c.fillStyle = 'rgba(8,10,30,0.85)'; c.beginPath(); c.roundRect(8, 16, 496, 96, 40); c.fill(); c.strokeStyle = color; c.lineWidth = 8; c.stroke();
  c.font = 'bold 62px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#FFFFFF'; c.fillText(txt, 256, 66);
});
export const MapaFauna: React.FC<PropsEscena> = (p) => {
  const { t, u, config } = p; const pines = config?.pines ?? true;
  return (
    <>
      <Mapa {...p} k={0} />
      <group position={[1.4, 0, -1.3]}>
        {!pines ? null : PINES.map((pin, i) => {
          const a = cl((u - 0.06 - i * 0.17) / 0.07); if (a <= 0) return null;   // aparecen uno a uno, al ritmo de la voz
          const s = a < 1 ? 1.25 - 0.25 * a : 1 + 0.04 * Math.sin(t * 5 + i);
          return (
            <group key={pin.txt} position={[pin.p[0], 0.55, -pin.p[1]]} scale={s}>
              <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.04, 0.04, 1.1, 6]} /><meshBasicMaterial color={pin.color} /></mesh>
              <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.16, 12, 10]} /><meshBasicMaterial color={pin.color} /></mesh>
              <sprite position={[0, 1.75, 0]} scale={[2.4, 0.6, 1]}><spriteMaterial map={etiqueta(pin.txt, pin.color)} transparent depthWrite={false} toneMapped={false} /></sprite>
              <Brillo pos={[0, 0.05, 0]} esc={1.6} color={pin.color} op={0.6} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[0.3 + 0.5 * ((t * 1.2 + i * 0.3) % 1), 0.36 + 0.5 * ((t * 1.2 + i * 0.3) % 1), 24]} /><meshBasicMaterial color={pin.color} transparent opacity={0.7 * (1 - ((t * 1.2 + i * 0.3) % 1))} side={THREE.DoubleSide} depthWrite={false} /></mesh>
            </group>
          );
        })}
      </group>
    </>
  );
};
