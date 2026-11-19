// Piezas auxiliares compartidas por las escenas nocturnas: halos, planos, cajas, reflejos mojados, lluvia 3D, carteles de neón, siluetas, patrulla y helicóptero.
import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';

export type V3 = [number, number, number];
export const ease = (x: number) => 1 - Math.pow(1 - cl(x), 3);
export const mod = (a: number, b: number) => ((a % b) + b) % b;

// ---------- piezas comunes ----------
export const cache: Record<string, THREE.Texture> = {};
export const halo = (color: string): THREE.Texture => {
  const k = 'halo_' + color; if (cache[k]) return cache[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, color); g.addColorStop(1, color + '00'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return (cache[k] = tx);
};
export const Brillo: React.FC<{ pos: V3; esc: number | [number, number, number]; color: string; op?: number }> = ({ pos, esc, color, op = 0.9 }) => (
  <sprite position={pos} scale={typeof esc === 'number' ? [esc, esc, 1] : esc}><spriteMaterial map={halo(color)} transparent opacity={op} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></sprite>
);
export const Plano: React.FC<{ pos: V3; tam: [number, number]; color: string; metal?: number; rough?: number }> = ({ pos, tam, color, metal = 0.1, rough = 0.9 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos}><planeGeometry args={tam} /><meshStandardMaterial color={color} metalness={metal} roughness={rough} /></mesh>
);
export const Caja: React.FC<{ pos: V3; tam: V3; color: string; basico?: boolean; rot?: V3 }> = ({ pos, tam, color, basico, rot }) => (
  <mesh position={pos} rotation={rot}><boxGeometry args={tam} />{basico ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color={color} roughness={0.8} />}</mesh>
);
// franja de reflejo de neón sobre el asfalto mojado
export const Reflejo: React.FC<{ x: number; z: number; largo: number; color: string; ancho?: number; op?: number }> = ({ x, z, largo, color, ancho = 0.8, op = 0.3 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}><planeGeometry args={[ancho, largo]} /><meshBasicMaterial color={color} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
);
// lluvia: rayas finas que caen (posiciones deterministas según el tiempo)
export const Lluvia: React.FC<{ t: number; n?: number; x?: [number, number]; z?: [number, number]; alto?: number; vel?: number }> = ({ t, n = 140, x = [-20, 20], z = [-45, 14], alto = 22, vel = 24 }) => (
  <group>{Array.from({ length: Math.min(n, 40) }, (_, i) => {   // tope de 40 mallas: más no mejora la imagen y cuesta CPU
    const px = lerp(x[0], x[1], rnd(i * 3 + 1)), pz = lerp(z[0], z[1], rnd(i * 3 + 2)), py = mod(rnd(i * 3 + 3) * alto - t * vel, alto);
    return <mesh key={i} position={[px, py, pz]}><boxGeometry args={[0.05, 2.2, 0.05]} /><meshBasicMaterial color="#B8E0FF" transparent opacity={0.55} fog={false} /></mesh>;
  })}</group>
);
// cartel de neón (marco luminoso sin texto)
export const Rotulo: React.FC<{ pos: V3; w: number; h: number; color: string; rot?: number }> = ({ pos, w, h, color, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <Caja pos={[0, h / 2, 0]} tam={[w, 0.12, 0.12]} color={color} basico /><Caja pos={[0, -h / 2, 0]} tam={[w, 0.12, 0.12]} color={color} basico />
    <Caja pos={[-w / 2, 0, 0]} tam={[0.12, h, 0.12]} color={color} basico /><Caja pos={[w / 2, 0, 0]} tam={[0.12, h, 0.12]} color={color} basico />
    <mesh position={[0, 0, -0.05]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
  </group>
);
// figura humana original en silueta, SIN rostro y de espaldas (mira hacia -z); borde de luz de neón
export const Silueta: React.FC<{ alto?: number; pelo?: 'corto' | 'largo'; neon: string; t: number }> = ({ alto = 1, pelo = 'corto', neon, t }) => {
  const h = alto; const sway = 0.01 * Math.sin(t * 1.4);
  const partes: [V3, V3][] = [
    [[0, 0.95 * h, 0], [0.5 * h, 0.7 * h, 0.28 * h]], [[-0.14 * h, 0.32 * h, 0], [0.2 * h, 0.62 * h, 0.22 * h]], [[0.14 * h, 0.32 * h, 0], [0.2 * h, 0.62 * h, 0.22 * h]],
    [[-0.34 * h, 0.95 * h, 0], [0.12 * h, 0.62 * h, 0.14 * h]], [[0.34 * h, 0.95 * h, 0], [0.12 * h, 0.62 * h, 0.14 * h]], [[0, 1.5 * h, 0], [0.34 * h, 0.36 * h, 0.34 * h]],
    ...(pelo === 'largo' ? [[[0, 1.4 * h, 0.2 * h], [0.4 * h, 0.7 * h, 0.14 * h]] as [V3, V3]] : [[[0, 1.7 * h, 0.04 * h], [0.38 * h, 0.1 * h, 0.36 * h]] as [V3, V3]]),
  ];
  return (
    <group rotation={[0, 0, sway]}>
      {partes.map(([p, s], i) => (
        <group key={i} position={p}>
          <mesh><boxGeometry args={s} /><meshBasicMaterial color="#04040A" /></mesh>
          <mesh scale={1.14}><boxGeometry args={s} /><meshBasicMaterial color={neon} side={THREE.BackSide} /></mesh>
        </group>
      ))}
    </group>
  );
};
// patrulla genérica (sin marcas): carrocería clara con barra de luces roja/azul que alterna
export const Patrulla: React.FC<{ t: number; fase?: number }> = ({ t, fase = 0 }) => {
  const a = Math.sin((t * 4 + fase) * Math.PI) > 0;
  return (
    <group>
      <Auto color="#E8ECF4" neon="#2A2A70" />
      <Caja pos={[0, 1.14, -0.15]} tam={[1.1, 0.1, 0.3]} color="#101018" />
      <Caja pos={[-0.36, 1.25, -0.15]} tam={[0.4, 0.14, 0.28]} color={a ? '#FF2030' : '#3A0810'} basico />
      <Caja pos={[0.36, 1.25, -0.15]} tam={[0.4, 0.14, 0.28]} color={a ? '#10143A' : '#2A5BFF'} basico />
      <Brillo pos={[a ? -0.36 : 0.36, 1.4, -0.15]} esc={4.2} color={a ? '#FF2030' : '#2A5BFF'} op={0.8} />
      <pointLight position={[0, 2.4, 0]} color={a ? '#FF3040' : '#3A6BFF'} intensity={8} distance={16} />
    </group>
  );
};
export const Helicoptero: React.FC<{ t: number; esc?: number }> = ({ t, esc = 1 }) => (
  <group scale={esc}>
    <mesh scale={[1.25, 0.95, 1.9]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#262B40" metalness={0.6} roughness={0.35} /></mesh>
    <mesh position={[0, 0.2, 1.35]} scale={[0.95, 0.7, 0.9]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#5AA0FF" metalness={0.8} roughness={0.1} transparent opacity={0.8} /></mesh>
    <Caja pos={[0, 0.25, -3.3]} tam={[0.28, 0.28, 3.8]} color="#262B40" /><Caja pos={[0, 0.85, -5]} tam={[0.1, 1.1, 0.7]} color="#262B40" />
    <Caja pos={[-0.9, -1.2, 0]} tam={[0.08, 0.08, 3]} color="#101018" /><Caja pos={[0.9, -1.2, 0]} tam={[0.08, 0.08, 3]} color="#101018" />
    <Caja pos={[-0.9, -0.8, 0.8]} tam={[0.08, 0.8, 0.08]} color="#101018" /><Caja pos={[0.9, -0.8, 0.8]} tam={[0.08, 0.8, 0.08]} color="#101018" />
    <group position={[0, 1.35, 0]} rotation={[0, t * 40, 0]}><Caja pos={[0, 0, 0]} tam={[8, 0.06, 0.28]} color="#0C0C14" /><Caja pos={[0, 0, 0]} tam={[0.28, 0.06, 8]} color="#0C0C14" /></group>
    <group position={[0.2, 0.9, -5]} rotation={[t * 50, 0, 0]}><Caja pos={[0, 0, 0]} tam={[0.06, 1.6, 0.14]} color="#0C0C14" /></group>
    <Caja pos={[0, 0.02, 2.2]} tam={[0.4, 0.14, 0.1]} color="#FF2030" basico /><Brillo pos={[0, 0.02, 2.4]} esc={2.4} color="#FF2030" op={0.7} />
    <mesh position={[0, -8, 0.6]} rotation={[0.05, 0, 0]}><coneGeometry args={[3.4, 14, 16, 1, true]} /><meshBasicMaterial color="#FFE9A0" transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
  </group>
);

