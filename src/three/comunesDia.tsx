// Piezas auxiliares de las escenas de día/interior: ventanas diurnas, edificio, árbol, plano y caja.
import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Persona } from '../three/piezas';

export type V3 = [number, number, number];
export const ease = (x: number) => 1 - Math.pow(1 - cl(x), 3);

// ---------- textura de ventanas de día (se dibuja una sola vez por combinación) ----------
export const cache: Record<string, THREE.Texture> = {};
export const ventanasDia = (color: string, cols: number, filas: number): THREE.Texture => {
  const k = `vd_${color}_${cols}_${filas}`;
  if (cache[k]) return cache[k];
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const c = cv.getContext('2d')!; c.fillStyle = color; c.fillRect(0, 0, 128, 256);
  const mw = 128 / cols, mh = 256 / filas;
  for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) { c.fillStyle = (i * 7 + j * 3) % 5 === 0 ? '#F6E7A8' : '#6FA3D8'; c.fillRect(i * mw + mw * 0.2, j * mh + mh * 0.18, mw * 0.6, mh * 0.55); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 1;
  return (cache[k] = tx);
};
export const EdifDia: React.FC<{ x: number; z: number; w: number; h: number; d: number; color: string }> = ({ x, z, w, h, d, color }) => {
  const tx = ventanasDia(color, Math.max(2, Math.round(w / 1.7)), Math.max(2, Math.round(h / 2)));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial map={tx} roughness={0.85} /></mesh>
      <mesh position={[0, h + 0.15, 0]}><boxGeometry args={[w + 0.3, 0.3, d + 0.3]} /><meshStandardMaterial color="#8A8F98" roughness={0.9} /></mesh>
    </group>
  );
};
export const COLORES_EDIF = ['#E8D9B8', '#D98F6C', '#B9CBE0', '#E5C6C0', '#C9DDB8', '#F0E2A8'];
export const Arbol: React.FC<{ x: number; z: number; h?: number; t: number; i: number }> = ({ x, z, h = 3, t, i }) => (
  <group position={[x, 0, z]} rotation={[0, 0, 0.02 * Math.sin(t * 1.2 + i)]}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.15, 0.22, h, 6]} /><meshStandardMaterial color="#6B4A2B" roughness={0.9} /></mesh>
    <mesh position={[0, h + 0.7, 0]}><sphereGeometry args={[1.25, 10, 8]} /><meshStandardMaterial color="#3E9B4F" roughness={0.9} /></mesh>
    <mesh position={[0.5, h + 1.3, 0.2]}><sphereGeometry args={[0.85, 10, 8]} /><meshStandardMaterial color="#4FB562" roughness={0.9} /></mesh>
  </group>
);
export const Plano: React.FC<{ pos: V3; tam: [number, number]; color: string; rough?: number }> = ({ pos, tam, color, rough = 0.95 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos}><planeGeometry args={tam} /><meshStandardMaterial color={color} roughness={rough} /></mesh>
);
export const Caja: React.FC<{ pos: V3; tam: V3; color: string; rough?: number }> = ({ pos, tam, color, rough = 0.85 }) => (
  <mesh position={pos}><boxGeometry args={tam} /><meshStandardMaterial color={color} roughness={rough} /></mesh>
);

