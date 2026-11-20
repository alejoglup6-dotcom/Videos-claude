import React from 'react';
import * as THREE from 'three';
import { cl, rnd } from '../lib/motor';
import { Auto, Palmera, Skyline, lienzo, RB } from '../three/piezas';
import { mod, Brillo, Plano, Caja, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { Letrero } from '../three/Ciudad';

// Escenas del easter egg «PETTY FOREVER»: puerta de un local con la pegatina (k=0 primer plano · 1 con luz de neón · 2 con más detalle) y radio antigua (K-D-S-T).
// El diseño de la pegatina es propio (colores y forma originales); solo el texto viene del dato verificado.
const pegatina = () => lienzo('pegatina_petty', 512, 256, (c) => {
  const g = c.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, '#FF4FA8'); g.addColorStop(1, '#7A5AFF'); c.fillStyle = g; c.beginPath(); c.roundRect(8, 8, 496, 240, 44); c.fill();
  c.lineWidth = 10; c.strokeStyle = '#FFF3C4'; c.beginPath(); c.roundRect(24, 24, 464, 208, 32); c.stroke();
  c.font = 'bold 92px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#FFFFFF'; c.fillText('PETTY', 256, 100); c.fillText('FOREVER', 256, 182);
  c.fillStyle = '#FFE45C'; for (const [x, y] of [[60, 60], [452, 60], [60, 196], [452, 196]]) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
});
const GOTAS = new THREE.SphereGeometry(0.02, 6, 5); const GOTA_M = new THREE.MeshBasicMaterial({ color: '#BFE4FF', transparent: true, opacity: 0.7 });
const Gotas: React.FC<{ t: number }> = ({ t }) => {
  const r = React.useRef<THREE.InstancedMesh>(null); const N = 24;
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4(); for (let i = 0; i < N; i++) { m.makeTranslation(-0.6 + rnd(i * 2) * 2.6, 2.4 - mod(rnd(i + 9) * 2 + t * (0.15 + 0.2 * rnd(i)), 2.4), 0.04); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={r} args={[GOTAS, GOTA_M, N]} frustumCulled={false} />;
};
export const PuertaPegatina: React.FC<PropsEscena> = ({ t, u, k }) => {
  const pulso = 0.5 + 0.5 * Math.sin(t * 3); const luz = k === 0 ? 0.18 : k === 1 ? 0.35 + 0.5 * cl(u * 1.6) : 0.8; const sub = k === 2 ? 1 : 0;
  return (
    <>
      <Plano pos={[0, 0, 4]} tam={[60, 24]} color="#0C0A22" metal={0.6} rough={0.2} />
      <Reflejo x={0.6} z={3} largo={10} color="#FF4FA8" ancho={1.8} op={0.28} /><Reflejo x={-1.2} z={3} largo={10} color="#44E6FF" ancho={1.4} op={0.22} />
      <mesh position={[0, 3, -0.1]}><planeGeometry args={[24, 8]} /><meshStandardMaterial color="#1E1636" roughness={0.9} /></mesh>
      {/* marco y puerta de vidrio */}
      <Caja pos={[0.5, 1.3, -0.02]} tam={[2.5, 2.7, 0.08]} color="#2A2250" />
      <mesh position={[0.5, 1.3, 0.03]}><planeGeometry args={[2.2, 2.45]} /><meshStandardMaterial color="#0A1030" metalness={0.8} roughness={0.15} transparent opacity={0.88} /></mesh>
      <Caja pos={[0.5, 1.3, 0.04]} tam={[0.05, 2.45, 0.04]} color="#8A93C8" /><Caja pos={[1.4, 1.2, 0.12]} tam={[0.06, 0.8, 0.06]} color="#C9D3EE" />
      <Caja pos={[0.5, 2.62, 0.05]} tam={[2.6, 0.08, 0.08]} color="#44E6FF" basico /><Caja pos={[-0.78, 1.3, 0.05]} tam={[0.08, 2.7, 0.08]} color="#FF4FA8" basico /><Caja pos={[1.78, 1.3, 0.05]} tam={[0.08, 2.7, 0.08]} color="#FF4FA8" basico />
      <Brillo pos={[0.5, 1.3, 0.3]} esc={[4.5, 3.8, 1]} color="#B07CFF" op={0.22} />
      {/* pegatina (esquina de la puerta) */}
      <group position={[0.15, 1.5, 0.07]} rotation={[0, 0, -0.05]}>
        <mesh><planeGeometry args={[1.0, 0.5]} /><meshBasicMaterial map={pegatina()} transparent toneMapped={false} opacity={0.55 + 0.45 * cl(luz * 2)} /></mesh>
        <Brillo pos={[0, 0, 0.05]} esc={[2.6, 1.6, 1]} color="#FF4FA8" op={luz * (0.7 + 0.3 * pulso)} />
      </group>
      <Gotas t={t} />
      {sub ? <>
        <Letrero txt="ABIERTO" color="#44E6FF" pos={[-1.7, 2.9, 0.4]} rot={0.4} w={2.2} />
        <group position={[-3.4, 0, 3.4]} rotation={[0, 0.9, 0]}><Auto modelo="SportsCar2" neon="#FF4FA8" /></group>
        <Palmera x={4} z={1.5} h={5.5} t={t} i={1} />
        <Skyline semilla={3} z={-40} ancho={80} n={14} alto={26} />
      </> : null}
      <Lluvia t={t} n={40} x={[-5, 6]} z={[-1, 6]} alto={6} vel={14} />
    </>
  );
};

/** Radio antigua con pantalla «K-DST» (nombre de la emisora en GTA: San Andreas) y ondas suaves. Diseño propio. */
const display = () => lienzo('radio_kdst', 512, 160, (c) => {
  c.fillStyle = '#06200F'; c.fillRect(0, 0, 512, 160); c.font = 'bold 104px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = '#7CFF3A'; c.shadowBlur = 24; c.fillStyle = '#9CFF6A'; c.fillText('K-DST', 256, 84);
});
const REJ = new THREE.BoxGeometry(0.06, 1.3, 0.05); const REJ_M = new THREE.MeshStandardMaterial({ color: '#241408', roughness: 0.8 });
const MARCA = new THREE.BoxGeometry(0.02, 0.18, 0.02); const MARCA_M = new THREE.MeshBasicMaterial({ color: '#F2E6C0' });
const BARRA = new THREE.BoxGeometry(0.1, 1, 0.1); const BARRA_M = new THREE.MeshBasicMaterial({ color: '#44E6FF', transparent: true, opacity: 0.5 });
const Rejilla: React.FC = () => { const r = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4(); for (let i = 0; i < 12; i++) { m.makeTranslation(-1.7 + i * 0.13, 0.0, 0.62); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={r} args={[REJ, REJ_M, 12]} frustumCulled={false} />; };
const Marcas: React.FC = () => { const r = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4(); for (let i = 0; i < 26; i++) { m.makeTranslation(-0.2 + i * 0.075, -0.55, 0.62); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={r} args={[MARCA, MARCA_M, 26]} frustumCulled={false} />; };
const Ecualizador: React.FC<{ t: number }> = ({ t }) => { const r = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(); for (let i = 0; i < 18; i++) { const h = 0.2 + 0.5 * Math.abs(Math.sin(t * 2.2 + i * 0.7)) * (0.6 + 0.4 * rnd(i)); s.set(1, h, 1); p.set(-2.0 + i * 0.24, 3.55 + h / 2, 0); m.compose(p, q, s); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={r} args={[BARRA, BARRA_M, 18]} frustumCulled={false} />; };
export const RadioAntigua: React.FC<PropsEscena> = ({ t, u }) => {
  const aguja = -0.2 + 1.9 * (0.5 + 0.5 * Math.sin(t * 0.9));
  return (
    <>
      <mesh position={[0, 2.4, -2]}><planeGeometry args={[30, 16]} /><meshBasicMaterial color="#0A0620" /></mesh>
      <Plano pos={[0, 0, 0]} tam={[30, 20]} color="#14102E" metal={0.5} rough={0.3} />
      <Brillo pos={[0, 2.2, -1]} esc={[12, 9, 1]} color="#7A5AFF" op={0.35} /><Brillo pos={[-2.5, 3.5, -1]} esc={6} color="#FF4FA8" op={0.3} />
      <group position={[0, 1.4, 0]} rotation={[0, 0.12 * Math.sin(t * 0.6), 0]}>
        <mesh position={[0, 0.8, 0]}><RB a={[4.6, 2.5, 1.2]} r={0.16} /><meshStandardMaterial color="#6A3A1E" roughness={0.6} /></mesh>
        <mesh position={[0, 0.8, 0.61]}><planeGeometry args={[4.3, 2.2]} /><meshStandardMaterial color="#2A1A10" roughness={0.7} /></mesh>
        <group position={[0, 0.8, 0]}><Rejilla /></group>
        <mesh position={[1.0, 1.55, 0.63]}><planeGeometry args={[1.9, 0.6]} /><meshBasicMaterial map={display()} toneMapped={false} /></mesh>
        <Brillo pos={[1.0, 1.55, 0.9]} esc={[3.4, 1.4, 1]} color="#7CFF3A" op={0.35} />
        <group position={[1.0, 0.8, 0]}><Marcas /></group>
        <mesh position={[0.2 + aguja * 0.78, 0.25, 0.63]}><boxGeometry args={[0.03, 0.5, 0.02]} /><meshBasicMaterial color="#FF4F4F" /></mesh>
        {[0.9, 1.9].map((x) => <mesh key={x} position={[x, 0.0, 0.66]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.14, 14]} /><meshStandardMaterial color="#D8CFA8" roughness={0.4} metalness={0.5} /></mesh>)}
      </group>
      <Ecualizador t={t} />
      {Array.from({ length: 22 }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 10, 0.5 + mod(rnd(i + 30) * 6 + t * 0.35, 6), -1]}><sphereGeometry args={[0.035, 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF'][i % 3]} /></mesh>)}
    </>
  );
};
