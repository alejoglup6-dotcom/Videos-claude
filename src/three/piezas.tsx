// Piezas 3D originales (primitivas propias, sin assets ni marcas): edificios con ventanas encendidas, palmeras, auto deportivo, silueta humana, cielos, sol, mar.
import React from 'react';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cl, lerp, rnd, sale } from '../lib/motor';

extend({ RoundedBoxGeometry });

export const RB: React.FC<{ a: [number, number, number]; r?: number }> = ({ a, r = 0.05 }) => (
  // @ts-ignore elemento extendido
  <roundedBoxGeometry args={[a[0], a[1], a[2], 3, r]} />
);

// ---------- texturas (se dibujan una sola vez) ----------
const cache: Record<string, THREE.Texture> = {};
export const lienzo = (k: string, w: number, h: number, dibuja: (c: CanvasRenderingContext2D) => void, repite = false) => {
  if (cache[k]) return cache[k];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  dibuja(cv.getContext('2d')!);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 1;
  if (repite) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; }
  return (cache[k] = tx);
};
export type CieloTipo = 'ocaso' | 'noche' | 'alba' | 'pantano' | 'dia' | 'estudio' | 'negro';
const CIELOS: Record<CieloTipo, [number, string][]> = {
  ocaso: [[0, '#1E0B52'], [0.3, '#6A1B9A'], [0.42, '#E0307A'], [0.47, '#FF6A4A'], [0.5, '#FFC15A'], [0.5001, '#7A2A7A'], [1, '#2A0E4A']],
  noche: [[0, '#02010F'], [0.3, '#0A0A3A'], [0.45, '#40128A'], [0.5, '#C23A9A'], [0.5001, '#1A0B3A'], [1, '#050515']],
  alba: [[0, '#16256A'], [0.3, '#5B4DB0'], [0.43, '#E08AB0'], [0.48, '#FFB38A'], [0.5, '#FFE2A0'], [0.5001, '#6A3A6A'], [1, '#2A1A4A']],
  pantano: [[0, '#0B1A14'], [0.35, '#1B3A2A'], [0.48, '#6A8A4A'], [0.5, '#9AAA5A'], [0.5001, '#1B2A1A'], [1, '#0B1A10']],
  dia: [[0, '#2F7BE0'], [0.3, '#5E9FEA'], [0.46, '#A9D3F7'], [0.5, '#EAF6FF'], [0.5001, '#C9D6E0'], [1, '#9AA8B5']],
  negro: [[0, '#000000'], [1, '#000000']],
  estudio: [[0, '#0B1030'], [0.35, '#141C52'], [0.5, '#2A3A8A'], [0.5001, '#0B1030'], [1, '#060818']],
};
export const Cielo: React.FC<{ tipo: CieloTipo; t: number }> = ({ tipo }) => {
  const tx = lienzo('cielo_' + tipo, 8, 512, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 512);
    CIELOS[tipo].forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fillRect(0, 0, 8, 512);
  });
  const estrellas = tipo === 'noche' || tipo === 'alba';
  return (
    <group>
      <mesh><sphereGeometry args={[190, 24, 16]} /><meshBasicMaterial map={tx} side={THREE.BackSide} fog={false} /></mesh>
      {estrellas ? Array.from({ length: 90 }, (_, i) => {
        const a = rnd(i) * Math.PI * 2; const e = 0.12 + rnd(i + 5) * 0.9; const R = 170;
        return <mesh key={i} position={[Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R * 0.9 + 4, Math.sin(a) * Math.cos(e) * R - 20]}><sphereGeometry args={[0.35 + rnd(i + 9) * 0.5, 4, 4]} /><meshBasicMaterial color={i % 5 ? '#ffffff' : '#9CE9FF'} fog={false} transparent opacity={tipo === 'alba' ? 0.3 : 0.9} /></mesh>;
      }) : null}
    </group>
  );
};
export const Sol: React.FC<{ x?: number; y?: number; z?: number; r?: number }> = ({ x = 0, y = 12, z = -150, r = 22 }) => {
  const tx = lienzo('sol', 256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#FFE86A'); g.addColorStop(0.55, '#FF7A5A'); g.addColorStop(1, '#E0307A');
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) c.fillRect(0, 140 + i * 16, 256, 2 + i * 1.6);
  });
  return (
    <group position={[x, y, z]}>
      <mesh><planeGeometry args={[r * 2, r * 2]} /><meshBasicMaterial map={tx} transparent fog={false} /></mesh>
      <mesh position={[0, 0, -0.1]}><planeGeometry args={[r * 4.2, r * 4.2]} /><meshBasicMaterial map={lienzo('halo', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,140,90,0.7)'); g.addColorStop(1, 'rgba(255,90,140,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); })} transparent fog={false} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>
  );
};

export const Mar: React.FC<{ t: number; color?: string; y?: number }> = ({ t, color = '#1A0B4A', y = 0 }) => {
  const franjas = lienzo('mar', 64, 256, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 64, 256); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,${120 + (i * 3) % 80},${150},${0.35 + 0.4 * ((i * 7) % 10) / 10})`; c.fillRect(8 + ((i * 13) % 40), (i * 6.3) % 256, 6 + (i % 5) * 4, 2); } });
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[500, 500]} /><meshStandardMaterial color={color} roughness={0.25} metalness={0.4} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -75]}><planeGeometry args={[36, 140]} /><meshBasicMaterial map={franjas} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} /></mesh>
    </group>
  );
};

// edificios con ventanas encendidas
const ventanas = (k: number) => lienzo('vent' + (k % 4), 64, 128, (c) => {
  c.fillStyle = '#05050F'; c.fillRect(0, 0, 64, 128);
  const cols = ['#FF4FA8', '#44E6FF', '#FFD36B', '#FFFFFF'];
  for (let y = 4; y < 124; y += 8) for (let x = 4; x < 60; x += 8) if (rnd(y * 7 + x + k * 100) > 0.42) { c.fillStyle = cols[Math.floor(rnd(x * 3 + y + k) * 4)]; c.globalAlpha = 0.55 + 0.45 * rnd(x + y * 5); c.fillRect(x, y, 4, 5); }
  c.globalAlpha = 1;
}, true);
const clones: Record<string, THREE.Texture> = {};
const ventanasRep = (k: number, w: number, h: number) => {
  const rx = Math.max(1, Math.round(w / 2.2)); const ry = Math.max(1, Math.round(h / 4.5)); const key = `${k % 4}_${rx}_${ry}`;
  if (!clones[key]) { const c = ventanas(k).clone(); c.repeat.set(rx, ry); c.needsUpdate = true; clones[key] = c; }
  return clones[key];
};
export const Edificio: React.FC<{ x: number; z: number; w: number; h: number; d: number; k?: number; neon?: string }> = ({ x, z, w, h, d, k = 0, neon }) => {
  const tx = ventanasRep(k, w, h); const alto2 = h * 0.22; const tx2 = ventanasRep(k + 1, w * 0.7, alto2);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#1B1650" map={tx} emissiveMap={tx} emissive="#ffffff" emissiveIntensity={1.1} roughness={0.7} /></mesh>
      {k % 3 !== 1 ? <mesh position={[0, h + alto2 / 2, 0]}><boxGeometry args={[w * 0.7, alto2, d * 0.7]} /><meshStandardMaterial color="#201A60" map={tx2} emissiveMap={tx2} emissive="#ffffff" emissiveIntensity={1.0} roughness={0.7} /></mesh> : null}
      {k % 3 === 0 ? <group position={[0, h + (k % 3 !== 1 ? alto2 : 0), 0]}><mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.08, 2.8, 5]} /><meshBasicMaterial color="#8A7AC0" /></mesh><mesh position={[0, 2.9, 0]}><sphereGeometry args={[0.16, 8, 6]} /><meshBasicMaterial color="#FF2D55" /></mesh></group> : null}
      {neon ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map((c, i) => <mesh key={i} position={[c[0] * w / 2, h / 2, c[1] * d / 2]}><boxGeometry args={[0.1, h, 0.1]} /><meshBasicMaterial color={neon} /></mesh>) : null}
      {neon ? <mesh position={[0, h + 0.05, 0]}><boxGeometry args={[w + 0.15, 0.14, d + 0.15]} /><meshBasicMaterial color={neon} /></mesh> : null}
    </group>
  );
};
export const Skyline: React.FC<{ semilla?: number; z?: number; ancho?: number; n?: number; alto?: number }> = ({ semilla = 0, z = -60, ancho = 120, n = 22, alto = 26 }) => (
  <group>
    {Array.from({ length: n }, (_, i) => {
      const x = -ancho / 2 + (i / (n - 1)) * ancho + (rnd(i + semilla) - 0.5) * 3;
      const h = 8 + rnd(i * 3 + semilla + 1) * alto; const w = 3 + rnd(i + 7 + semilla) * 4;
      return <Edificio key={i} x={x} z={z - rnd(i + 11 + semilla) * 14} w={w} h={h} d={w} k={i} neon={i % 4 === 0 ? '#FF4FA8' : i % 4 === 2 ? '#44E6FF' : undefined} />;
    })}
  </group>
);

// geometrías compartidas: una copa y dos troncos curvos, fusionados en una sola malla cada uno (muy pocas llamadas de dibujo)
const colorear = (g: THREE.BufferGeometry, c: THREE.Color) => { const n = g.getAttribute('position').count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
let _copa: THREE.BufferGeometry | null = null; const copa = () => {
  if (_copa) return _copa; const gs: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * Math.PI * 2; const verde = new THREE.Color(k % 2 ? '#1F9E5A' : '#34C777').lerp(new THREE.Color('#0F6A3A'), (k % 3) * 0.2);
    let x = 0, y = 0.05;
    for (let j = 0; j < 4; j++) {
      const largo = 0.75 - j * 0.1; const caida = -0.28 - j * 0.34;
      const g = new THREE.SphereGeometry(1, 8, 5); g.scale(largo, 0.045, 0.3 - j * 0.04);
      g.rotateZ(caida); g.translate(x + Math.cos(caida) * largo * 0.9, y + Math.sin(caida) * largo * 0.9, 0);
      x += Math.cos(caida) * largo * 1.8; y += Math.sin(caida) * largo * 1.8;
      g.rotateY(ang); gs.push(colorear(g, verde));
    }
  }
  return (_copa = mergeGeometries(gs)!);
};
const troncos: Record<string, THREE.BufferGeometry> = {};
const tronco = (h: number, dir: number) => {
  const key = h.toFixed(1) + dir; if (troncos[key]) return troncos[key];
  const gs: THREE.BufferGeometry[] = []; const n = 7;
  for (let k = 0; k < n; k++) {
    const u0 = k / n; const u1 = (k + 1) / n; const off = (u: number) => dir * 0.12 * h * u * u;
    const r0 = 0.22 - 0.1 * u0; const r1 = 0.22 - 0.1 * u1; const g = new THREE.CylinderGeometry(r1, r0, h / n + 0.04, 8);
    g.rotateZ(Math.atan2(off(u1) - off(u0), h / n) * -1); g.translate((off(u0) + off(u1)) / 2, h * (u0 + u1) / 2, 0); gs.push(colorear(g, new THREE.Color(k % 2 ? '#7A5230' : '#6B4526')));
  }
  return (troncos[key] = mergeGeometries(gs)!);
};
export const Palmera: React.FC<{ x: number; z: number; h?: number; t: number; i?: number }> = ({ x, z, h = 5, t, i = 0 }) => {
  const sway = 0.045 * Math.sin(t * 1.1 + i * 1.7); const dir = i % 2 ? 1 : -1;
  return (
    <group position={[x, 0, z]} rotation={[0, i * 1.3, 0]}>
      <mesh geometry={tronco(h, dir)}><meshLambertMaterial vertexColors /></mesh>
      <group position={[dir * 0.12 * h, h, 0]} rotation={[sway, 0, sway * 0.8]}>
        <mesh geometry={copa()} scale={1.25}><meshLambertMaterial vertexColors side={THREE.DoubleSide} /></mesh>
        {[[0.18, -0.1, 0.1], [-0.12, -0.15, 0.15], [0.02, -0.18, -0.2]].map((c, k) => <mesh key={k} position={c as [number, number, number]}><sphereGeometry args={[0.15, 8, 6]} /><meshLambertMaterial color="#5A3A1A" /></mesh>)}
      </group>
    </group>
  );
};

export const Farolas: React.FC<{ zs: number[]; ancho?: number; color?: string }> = ({ zs, ancho = 5.6, color = '#FFD08A' }) => (
  <group>
    {zs.map((z, i) => { const s = i % 2 ? 1 : -1; return (
      <group key={i} position={[s * ancho, 0, z]}>
        <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.06, 0.09, 4.4, 6]} /><meshLambertMaterial color="#1A1440" /></mesh>
        <mesh position={[-s * 0.55, 4.35, 0]}><boxGeometry args={[1.2, 0.07, 0.1]} /><meshLambertMaterial color="#1A1440" /></mesh>
        <mesh position={[-s * 1.1, 4.25, 0]}><sphereGeometry args={[0.2, 10, 8]} /><meshBasicMaterial color={color} /></mesh>
        <sprite position={[-s * 1.1, 4.25, 0]} scale={[3.2, 3.2, 1]}><spriteMaterial map={lienzo('halo2', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,170,0.9)'); g.addColorStop(0.3, 'rgba(255,170,90,0.35)'); g.addColorStop(1, 'rgba(255,120,60,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); })} transparent blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
      </group>
    ); })}
  </group>
);

export const Nubes: React.FC<{ t: number; y?: number; color?: string; n?: number }> = ({ t, y = 55, color = '#FF8AB0', n = 9 }) => {
  const tx = lienzo('nube', 256, 64, (c) => { const g = c.createRadialGradient(128, 32, 0, 128, 32, 128); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.save(); c.scale(1, 0.25); c.translate(0, 96); c.fillStyle = g; c.fillRect(0, -96, 256, 256); c.restore(); });
  return (
    <group>
      {Array.from({ length: n }, (_, i) => <sprite key={i} position={[((rnd(i) * 360 - 180) + t * (1.5 + rnd(i + 3))) % 360 - 180, y + rnd(i + 5) * 40, -150 - rnd(i + 8) * 20]} scale={[90 + rnd(i + 2) * 80, 14 + rnd(i + 4) * 10, 1]}><spriteMaterial map={tx} color={color} transparent opacity={0.55} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>)}
    </group>
  );
};

export const Carretera: React.FC<{ t: number; largo?: number; ancho?: number; color?: string }> = ({ t, largo = 200, ancho = 9, color = '#FF4FA8' }) => {
  const key = `mallaR_${color}_${ancho}_${largo}`;
  if (!clones[key]) {
    const base = lienzo('malla_' + color, 128, 128, (c) => {
      c.fillStyle = '#0A0620'; c.fillRect(0, 0, 128, 128); c.strokeStyle = color; c.lineWidth = 3; c.globalAlpha = 0.9;
      c.strokeRect(0, 0, 128, 128); c.beginPath(); c.moveTo(64, 0); c.lineTo(64, 128); c.globalAlpha = 0.3; c.stroke();
    }, true);
    const c2 = base.clone(); c2.repeat.set(ancho / 3, largo / 3); c2.needsUpdate = true; clones[key] = c2;
  }
  const tx = clones[key]; tx.offset.y = -(t * 1.1) % 1;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -largo / 2 + 20]}><planeGeometry args={[ancho, largo]} /><meshStandardMaterial map={tx} emissiveMap={tx} emissive="#ffffff" emissiveIntensity={0.7} roughness={0.5} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (ancho / 2 + 0.1), 0.06, -largo / 2 + 20]}><boxGeometry args={[0.16, 0.12, largo]} /><meshBasicMaterial color={s < 0 ? '#44E6FF' : '#FF4FA8'} /></mesh>)}
    </group>
  );
};

export { AutoPro as Auto } from './AutoPro';

export const Persona: React.FC<{ t: number; camisa?: string; pelo?: string; brazos?: number; mira?: number }> = ({ t, camisa = '#FF4FA8', pelo = '#2A1A10', brazos = 0, mira = 0 }) => {
  const piel = '#E8A878';
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow><RB a={[0.52, 0.7, 0.3]} r={0.1} /><meshStandardMaterial color={camisa} roughness={0.7} /></mesh>
      <mesh position={[-0.14, 0.32, 0]}><RB a={[0.2, 0.62, 0.22]} r={0.07} /><meshStandardMaterial color="#1E2A6A" roughness={0.8} /></mesh>
      <mesh position={[0.14, 0.32, 0]}><RB a={[0.2, 0.62, 0.22]} r={0.07} /><meshStandardMaterial color="#1E2A6A" roughness={0.8} /></mesh>
      <group position={[0, 1.5, 0]} rotation={[-mira * 0.5, 0, 0]}>
        <mesh><RB a={[0.4, 0.4, 0.38]} r={0.12} /><meshStandardMaterial color={piel} roughness={0.8} /></mesh>
        <mesh position={[0, 0.2, -0.02]}><RB a={[0.44, 0.14, 0.42]} r={0.06} /><meshStandardMaterial color={pelo} roughness={0.9} /></mesh>
        <mesh position={[-0.1, 0.03, 0.19]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0.1, 0.03, 0.19]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, -0.1, 0.19]} scale={[1, 0.5 + mira * 0.8, 0.5]}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color="#5A1A22" /></mesh>
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.33, 1.15, 0]} rotation={[0, 0, s * (0.12 + 2.4 * brazos) + 0.05 * Math.sin(t * 3 + s)]}>
          <mesh position={[0, -0.28, 0]}><RB a={[0.13, 0.56, 0.13]} r={0.05} /><meshStandardMaterial color={camisa} roughness={0.7} /></mesh>
          <mesh position={[0, -0.58, 0]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={piel} /></mesh>
        </group>
      ))}
    </group>
  );
};

