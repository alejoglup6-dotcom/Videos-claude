// Autos de la biblioteca (public/modelos/autos/*.glb, CC0 de Quaternius). El frente del modelo mira a +z, igual que el Auto procedural anterior.
import React from 'react';
import * as THREE from 'three';
import { Modelo } from './Modelo';

export const CIVILES = ['NormalCar1', 'NormalCar2', 'SUV', 'Taxi', 'SportsCar2', 'SportsCar'] as const;
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export const Auto: React.FC<{ color?: string; neon?: string; modelo?: string; sombra?: boolean }> = ({ color = '#FFFFFF', neon = '#44E6FF', modelo, sombra = true }) => {
  const m = modelo ?? CIVILES[hash(color) % CIVILES.length];
  return (
    <group>
      <Modelo archivo={`autos/${m}.glb`} sombra={sombra} envMap={1.1} />
      {/* luz de neón bajo el auto, falsa (una luz puntual por auto encarece mucho el render por CPU) */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.6, 4.9]} /><meshBasicMaterial color={neon} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    </group>
  );
};
