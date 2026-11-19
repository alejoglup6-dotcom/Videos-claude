// Piezas 3D originales para el video de GTA 6 (ciudad tropical de neón). Nada copiado del juego: todo son primitivas propias.
import React from 'react';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cl, lerp, rnd, sale } from '../motor';

extend({ RoundedBoxGeometry });

export const RB: React.FC<{ a: [number, number, number]; r?: number }> = ({ a, r = 0.05 }) => (
  // @ts-ignore elemento extendido
  <roundedBoxGeometry args={[a[0], a[1], a[2], 3, r]} />
);

// ---------- texturas (se dibujan una sola vez) ----------
const cache: Record<string, THREE.Texture> = {};
const lienzo = (k: string, w: number, h: number, dibuja: (c: CanvasRenderingContext2D) => void, repite = false) => {
  if (cache[k]) return cache[k];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  dibuja(cv.getContext('2d')!);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 1;
  if (repite) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; }
  return (cache[k] = tx);
};
export type CieloTipo = 'ocaso' | 'noche' | 'alba' | 'pantano' | 'dia' | 'estudio';
const CIELOS: Record<CieloTipo, [number, string][]> = {
  ocaso: [[0, '#1E0B52'], [0.3, '#6A1B9A'], [0.42, '#E0307A'], [0.47, '#FF6A4A'], [0.5, '#FFC15A'], [0.5001, '#7A2A7A'], [1, '#2A0E4A']],
  noche: [[0, '#02010F'], [0.3, '#0A0A3A'], [0.45, '#40128A'], [0.5, '#C23A9A'], [0.5001, '#1A0B3A'], [1, '#050515']],
  alba: [[0, '#16256A'], [0.3, '#5B4DB0'], [0.43, '#E08AB0'], [0.48, '#FFB38A'], [0.5, '#FFE2A0'], [0.5001, '#6A3A6A'], [1, '#2A1A4A']],
  pantano: [[0, '#0B1A14'], [0.35, '#1B3A2A'], [0.48, '#6A8A4A'], [0.5, '#9AAA5A'], [0.5001, '#1B2A1A'], [1, '#0B1A10']],
  dia: [[0, '#2F7BE0'], [0.3, '#5E9FEA'], [0.46, '#A9D3F7'], [0.5, '#EAF6FF'], [0.5001, '#C9D6E0'], [1, '#9AA8B5']],
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

export const Auto: React.FC<{ color?: string; neon?: string }> = ({ color = '#E8EEF8', neon = '#44E6FF' }) => (
  <group>
    <mesh position={[0, 0.42, 0]} castShadow><RB a={[1.95, 0.4, 4.3]} r={0.17} /><meshStandardMaterial color={color} roughness={0.22} metalness={0.7} /></mesh>
    <mesh position={[0, 0.62, 1.35]} rotation={[0.12, 0, 0]}><RB a={[1.8, 0.14, 1.5]} r={0.07} /><meshStandardMaterial color={color} roughness={0.22} metalness={0.7} /></mesh>
    <mesh position={[0, 0.84, -0.15]}><RB a={[1.6, 0.42, 1.85]} r={0.18} /><meshStandardMaterial color="#10102A" roughness={0.08} metalness={0.9} /></mesh>
    <mesh position={[0, 0.86, 0.82]} rotation={[-0.75, 0, 0]}><boxGeometry args={[1.45, 0.02, 0.62]} /><meshBasicMaterial color="#6A5AFF" transparent opacity={0.55} /></mesh>
    <mesh position={[0, 0.86, -1.1]} rotation={[0.75, 0, 0]}><boxGeometry args={[1.45, 0.02, 0.5]} /><meshBasicMaterial color="#6A5AFF" transparent opacity={0.45} /></mesh>
    <mesh position={[0, 0.98, -1.95]}><RB a={[1.7, 0.07, 0.5]} r={0.03} /><meshStandardMaterial color="#10102A" metalness={0.8} roughness={0.2} /></mesh>
    {[-0.7, 0.7].map((s) => <mesh key={s} position={[s, 0.9, -1.95]}><boxGeometry args={[0.06, 0.34, 0.06]} /><meshBasicMaterial color="#10102A" /></mesh>)}
    {[-1, 1].map((s) => <mesh key={s} position={[s * 0.62, 0.64, 2.16]}><boxGeometry args={[0.45, 0.07, 0.04]} /><meshBasicMaterial color="#FFF6D0" /></mesh>)}
    <mesh position={[0, 0.66, -2.16]}><boxGeometry args={[1.7, 0.07, 0.04]} /><meshBasicMaterial color="#FF2D55" /></mesh>
    <sprite position={[0, 0.66, -2.5]} scale={[2.6, 1.0, 1]}><spriteMaterial map={lienzo('halo_r', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,60,90,0.9)'); g.addColorStop(1, 'rgba(255,60,90,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); })} transparent blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    {[[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].map((w, i) => (
      <group key={i} position={[w[0] * 0.97, 0.34, w[1]]} rotation={[0, 0, Math.PI / 2]}>
        <mesh><cylinderGeometry args={[0.35, 0.35, 0.28, 16]} /><meshStandardMaterial color="#0A0A12" roughness={0.6} /></mesh>
        <mesh position={[0, w[0] * 0.15, 0]}><cylinderGeometry args={[0.22, 0.22, 0.04, 14]} /><meshStandardMaterial color="#C8D0E8" metalness={0.9} roughness={0.2} /></mesh>
      </group>
    ))}
    <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.98, 0.05, 3.2]} /><meshBasicMaterial color={neon} /></mesh>
    <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.5, 4.8]} /><meshBasicMaterial color={neon} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    <pointLight position={[0, 0.3, 0]} color={neon} intensity={1.6} distance={5} />
  </group>
);

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

export const Ovni: React.FC<{ t: number; rayo?: number; escala?: number }> = ({ t, rayo = 1, escala = 1 }) => (
  <group scale={escala} rotation={[0.05 * Math.sin(t * 1.7), 0, 0.06 * Math.sin(t * 1.3)]}>
    <mesh scale={[1, 0.28, 1]}><sphereGeometry args={[2.4, 32, 20]} /><meshStandardMaterial color="#C8D2E8" metalness={0.95} roughness={0.18} /></mesh>
    <mesh position={[0, 0.5, 0]} scale={[1, 0.8, 1]}><sphereGeometry args={[1.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#7FFFE0" transparent opacity={0.55} roughness={0.05} emissive="#2AE0B0" emissiveIntensity={0.7} /></mesh>
    <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.1, 0.07, 8, 40]} /><meshBasicMaterial color="#44E6FF" /></mesh>
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + t * 1.5;
      return <mesh key={i} position={[Math.cos(a) * 2.0, -0.14, Math.sin(a) * 2.0]}><sphereGeometry args={[0.13, 8, 8]} /><meshBasicMaterial color={i % 2 ? '#FF4FA8' : '#FFE86A'} /></mesh>;
    })}
    {rayo > 0 ? (
      <group position={[0, -3.6, 0]}>
        <mesh><cylinderGeometry args={[1.1, 3.0, 7.2, 24, 1, true]} /><meshBasicMaterial color="#9CFFE8" transparent opacity={0.28 * rayo} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh scale={[0.6, 1, 0.6]}><cylinderGeometry args={[1.1, 3.0, 7.2, 24, 1, true]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.22 * rayo} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      </group>
    ) : null}
    <pointLight position={[0, -1.5, 0]} color="#7FFFE0" intensity={rayo * 14} distance={18} />
  </group>
);

export const Huevo: React.FC<{ color: string; s?: number }> = ({ color, s = 1 }) => (
  <mesh scale={[0.8 * s, 1 * s, 0.8 * s]} castShadow><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial color={color} roughness={0.35} metalness={0.15} emissive={color} emissiveIntensity={0.25} /></mesh>
);

export const Bigfoot: React.FC<{ t: number; asoma?: number }> = ({ t, asoma = 1 }) => {
  const pelo = '#7A5230';
  return (
    <group scale={asoma} position={[0, 0, 0]}>
      <mesh position={[0, 1.6, 0]} castShadow><RB a={[1.9, 2.1, 1.1]} r={0.5} /><meshStandardMaterial color={pelo} roughness={1} /></mesh>
      <mesh position={[0, 0.5, 0]}><RB a={[1.5, 1.0, 0.9]} r={0.35} /><meshStandardMaterial color="#5A3A20" roughness={1} /></mesh>
      <group position={[0, 3.0 + 0.04 * Math.sin(t * 3), 0.1]}>
        <mesh><RB a={[1.0, 0.95, 0.9]} r={0.32} /><meshStandardMaterial color="#5A3A22" roughness={1} /></mesh>
        <mesh position={[-0.22, 0.08, 0.42]}><sphereGeometry args={[0.1, 10, 10]} /><meshBasicMaterial color="#FFE23A" /></mesh>
        <mesh position={[0.22, 0.08, 0.42]}><sphereGeometry args={[0.1, 10, 10]} /><meshBasicMaterial color="#FFE23A" /></mesh>
        <mesh position={[0, -0.2, 0.44]}><RB a={[0.4, 0.2, 0.1]} r={0.05} /><meshStandardMaterial color="#2A1A10" /></mesh>
        <pointLight position={[0, 0.1, 0.8]} color="#FFE23A" intensity={2} distance={4} />
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.15, 2.4, 0]} rotation={[0, 0, s * (0.25 + 0.06 * Math.sin(t * 2 + s))]}>
          <mesh position={[0, -0.85, 0]}><RB a={[0.5, 1.9, 0.5]} r={0.22} /><meshStandardMaterial color={pelo} roughness={1} /></mesh>
        </group>
      ))}
    </group>
  );
};
export const Hedor: React.FC<{ t: number; k?: number }> = ({ t, k = 1 }) => (
  <group>
    {Array.from({ length: 18 }, (_, i) => {
      const u = ((t * 0.55 + rnd(i) * 3) % 3) / 3;
      const x = (rnd(i + 3) - 0.5) * 3.2 + 0.4 * Math.sin(t * 3 + i);
      return <mesh key={i} position={[x, 1.0 + u * 4.2, (rnd(i + 9) - 0.5) * 1.5 + 1.1]} scale={0.5 + u * 1.4}><sphereGeometry args={[0.3, 10, 8]} /><meshBasicMaterial color={i % 3 ? '#7CFF3A' : '#C8FF6A'} transparent opacity={0.55 * (1 - u) * k} depthWrite={false} /></mesh>;
    })}
  </group>
);

export const Perro: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 0.5, 0]} castShadow><RB a={[0.5, 0.45, 0.85]} r={0.16} /><meshStandardMaterial color="#C8863E" roughness={0.9} /></mesh>
    <group position={[0, 0.9, 0.4]} rotation={[0.05 * Math.sin(t * 5), 0, 0]}>
      <mesh><RB a={[0.4, 0.38, 0.42]} r={0.14} /><meshStandardMaterial color="#D89A50" roughness={0.9} /></mesh>
      <mesh position={[0, -0.08, 0.26]}><RB a={[0.22, 0.17, 0.22]} r={0.07} /><meshStandardMaterial color="#F2D2A0" roughness={0.9} /></mesh>
      <mesh position={[0, -0.02, 0.38]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#111" /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.24, 0.0, -0.02]} rotation={[0, 0, s * (0.5 + 0.25 * Math.sin(t * 9))]}><RB a={[0.1, 0.3, 0.14]} r={0.04} /><meshStandardMaterial color="#8A5A2A" roughness={1} /></mesh>)}
      {/* lentes de sol */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, 0.07, 0.22]}><RB a={[0.14, 0.1, 0.03]} r={0.02} /><meshStandardMaterial color="#0A0A18" metalness={0.9} roughness={0.1} /></mesh>)}
    </group>
    <mesh position={[0, 0.5, -0.5]} rotation={[0.6 + 0.4 * Math.sin(t * 12), 0, 0]}><RB a={[0.09, 0.4, 0.09]} r={0.04} /><meshStandardMaterial color="#C8863E" /></mesh>
  </group>
);
export const MotoAcuatica: React.FC<{ t: number; color?: string }> = ({ t, color = '#FF4FA8' }) => (
  <group rotation={[0.05 * Math.sin(t * 6), 0, 0.04 * Math.sin(t * 4)]}>
    <mesh position={[0, 0.25, 0]}><RB a={[0.85, 0.5, 2.6]} r={0.22} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} /></mesh>
    <mesh position={[0, 0.58, 0.55]}><RB a={[0.6, 0.22, 0.9]} r={0.1} /><meshStandardMaterial color="#12122A" roughness={0.4} /></mesh>
    <mesh position={[0, 0.7, 0.95]}><RB a={[0.7, 0.06, 0.08]} r={0.02} /><meshStandardMaterial color="#44E6FF" emissive="#44E6FF" emissiveIntensity={0.8} /></mesh>
    <mesh position={[0, 0.05, -1.3]}><boxGeometry args={[0.6, 0.06, 0.4]} /><meshBasicMaterial color="#44E6FF" /></mesh>
  </group>
);
export const Estela: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {Array.from({ length: 16 }, (_, i) => {
      const u = ((t * 1.4 + i / 16) % 1);
      return <mesh key={i} position={[(rnd(i) - 0.5) * (0.6 + u * 1.6), 0.08, 1.6 + u * 4.5]} scale={0.5 + u * 1.6}><sphereGeometry args={[0.2, 8, 6]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.65 * (1 - u)} depthWrite={false} /></mesh>;
    })}
  </group>
);

export const ArtDeco: React.FC<{ t: number; x?: number }> = ({ t, x = 0 }) => (
  <group position={[x, 0, 0]}>
    <mesh position={[0, 3.2, 0]}><RB a={[9, 6.4, 3.6]} r={0.35} /><meshStandardMaterial color="#FFB6D2" roughness={0.7} /></mesh>
    {[0, 1, 2].map((i) => <mesh key={i} position={[0, 1.3 + i * 1.9, 1.85]}><boxGeometry args={[9.2, 0.18, 0.2]} /><meshStandardMaterial color="#44E6C8" emissive="#44E6C8" emissiveIntensity={0.5} /></mesh>)}
    {[-3, -1, 1, 3].map((xx) => [0, 1, 2].map((i) => (
      <group key={xx + '_' + i} position={[xx, 1.9 + i * 1.9, 1.8]}>
        <mesh><boxGeometry args={[1.0, 1.1, 0.08]} /><meshStandardMaterial color="#12163A" emissive="#FFD36B" emissiveIntensity={rnd(xx * 5 + i) > 0.4 ? 0.9 : 0.1} /></mesh>
        <mesh position={[0, -0.62, 0.25]}><boxGeometry args={[1.3, 0.1, 0.5]} /><meshStandardMaterial color="#FFFFFF" roughness={0.6} /></mesh>
      </group>
    )))}
    <mesh position={[0, 6.7, 0]}><RB a={[9.4, 0.5, 3.9]} r={0.2} /><meshStandardMaterial color="#44E6C8" roughness={0.5} /></mesh>
    {/* cartel de neón sin texto */}
    <mesh position={[0, 7.4, 1.2]}><boxGeometry args={[4.2, 0.35, 0.12]} /><meshBasicMaterial color="#FF4FA8" /></mesh>
    <mesh position={[0, 7.9, 1.2]}><boxGeometry args={[2.6, 0.22, 0.12]} /><meshBasicMaterial color="#44E6FF" /></mesh>
    <pointLight position={[0, 7.5, 3]} color="#FF4FA8" intensity={6} distance={14} />
    <mesh position={[0, 0.02, 4.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 4]} /><meshStandardMaterial color="#44E6FF" roughness={0.1} metalness={0.3} emissive="#1AA6D0" emissiveIntensity={0.6 + 0.1 * Math.sin(t * 2)} /></mesh>
  </group>
);

export const Torre: React.FC<{ t: number; luz?: number }> = ({ t, luz = 1 }) => (
  <group>
    {[[0, 6, 3.4, 12], [12, 4, 2.6, 8]].map(([y, h, r, hh], i) => (
      <mesh key={i} position={[0, y + (hh as number) / 2, 0]} castShadow><cylinderGeometry args={[(r as number) * 0.7, r as number, hh as number, 6]} /><meshStandardMaterial color={i % 2 ? '#5A4AB0' : '#6A4AC0'} roughness={0.6} metalness={0.1} emissive={i % 2 ? '#3A2A90' : '#4A2AA0'} emissiveIntensity={0.55} /></mesh>
    ))}
    {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[0, 1.5 + i * 2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.5 - i * 0.18, 0.06, 6, 24]} /><meshBasicMaterial color={i % 2 ? '#FF4FA8' : '#44E6FF'} /></mesh>)}
    {/* plataforma y nido */}
    <mesh position={[0, 20.1, 0]}><cylinderGeometry args={[2.4, 2.4, 0.3, 24]} /><meshStandardMaterial color="#1A1650" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[0, 20.45, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.3, 0.34, 10, 24]} /><meshStandardMaterial color="#8A5A2A" roughness={1} /></mesh>
    {['#FF4FA8', '#44E6FF', '#FFE86A', '#7CFF3A', '#B07CFF', '#FF8A3A'].map((c, i) => {
      const a = (i / 6) * Math.PI * 2;
      return <group key={i} position={[Math.cos(a) * 0.55, 20.75 + 0.06 * Math.sin(t * 3 + i), Math.sin(a) * 0.55]}><Huevo color={c} /></group>;
    })}
    <pointLight position={[0, 21.5, 1]} color="#FFE86A" intensity={5 * luz} distance={9} />
  </group>
);

export const Cipres: React.FC<{ x: number; z: number; h?: number; i?: number }> = ({ x, z, h = 7, i = 0 }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.35, 0.8, h, 8]} /><meshStandardMaterial color="#3A2A1A" roughness={1} /></mesh>
    <mesh position={[0, h, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[2.2, 10, 8]} /><meshStandardMaterial color="#2A5A2A" roughness={1} /></mesh>
    {Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[Math.cos(k + i) * 1.6, h - 1.8, Math.sin(k + i) * 1.6]}><cylinderGeometry args={[0.03, 0.12, 2.6, 5]} /><meshStandardMaterial color="#8AAA6A" roughness={1} /></mesh>)}
  </group>
);
