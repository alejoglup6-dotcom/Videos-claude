import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from '../three/piezas';
import { lienzo } from '../three/piezas';
import { ease, mod, Brillo, Plano, Caja, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { PersonajeA } from '../three/Personaje';
import type { Ropa } from '../three/Personaje';
import { Letrero } from '../three/Ciudad';
import { RB } from '../three/piezas';

// Escenas de «10 cosas que debes hacer primero». Todo con la biblioteca (autos, personajes) y piezas propias; sin logos ni marcas.
const ROPA_A: Ropa = { chaqueta: '#1F6F8B', pantalon: '#1A1A24', zapatos: '#F2F2F2' };
const ROPA_B: Ropa = { chaqueta: '#F2EEE6', pantalon: '#3A2A66', zapatos: '#FF4FA8' };
const ROPA_C: Ropa = { chaqueta: '#8B2F5F', pantalon: '#22222E', zapatos: '#E9E9EF' };

/** Conducción: un auto de la biblioteca recorre una avenida con palmeras; la calle se desplaza, el auto se queda en cuadro. */
export const Conduccion: React.FC<PropsEscena> = ({ t }) => {
  const vel = 26; const xj = 0.9 * Math.sin(t * 1.3);
  return (
    <>
      <Plano pos={[0, 0, -60]} tam={[220, 300]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -60]} tam={[13, 300]} color="#12102C" metal={0.7} rough={0.12} />
      {[-2.2, 2.2].map((x) => Array.from({ length: 14 }, (_, i) => <Caja key={x + '_' + i} pos={[x, 0.04, mod(i * 12 + t * vel, 168) - 140]} tam={[0.2, 0.04, 4]} color="#F4F4F0" basico />))}
      {[-6.4, 6.4].map((x, i) => <Caja key={i} pos={[x, 0.05, -60]} tam={[0.2, 0.1, 300]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-4} z={-30} largo={140} color="#44E6FF" ancho={1.6} op={0.26} /><Reflejo x={4} z={-30} largo={140} color="#FF4FA8" ancho={1.6} op={0.26} />
      {[-1, 1].map((s) => Array.from({ length: 8 }, (_, i) => <Edificio key={s + '_' + i} x={s * (19 + (i % 2) * 2)} z={10 - i * 18} w={11} h={16 + ((i * 7) % 5) * 5} d={11} k={i + (s > 0 ? 5 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      {[-8.5, 8.5].map((x, j) => Array.from({ length: 6 }, (_, i) => <Palmera key={j + '_' + i} x={x} z={mod(i * 17 + t * vel * (1 + 0 * j), 102) - 92} h={5.5} t={t} i={i + j * 6} />))}
      <Farolas zs={[0, 1, 2, 3, 4].map((i) => mod(i * 20 + t * vel, 100) - 85)} ancho={7.2} />
      <group position={[xj, 0, -4]} rotation={[0, Math.PI - 0.12 * Math.cos(t * 1.3), 0]}><Auto modelo="SportsCar2" neon="#FF4FA8" /></group>
      <Lluvia t={t} n={40} x={[-12, 12]} z={[-40, 8]} alto={16} vel={24} />
    </>
  );
};

/** Playa al atardecer: personaje de espaldas mirando el sol sobre el mar. */
export const PlayaAtardecer: React.FC<PropsEscena> = ({ t, u }) => (
  <>
    <Sol x={0} y={9} z={-190} r={28} />
    <Plano pos={[0, 0, -2]} tam={[120, 26]} color="#C99A7A" rough={0.95} />
    <Plano pos={[0, -0.03, -110]} tam={[260, 200]} color="#3A2A7A" metal={0.65} rough={0.16} />
    <Reflejo x={0} z={-100} largo={170} color="#FFB070" ancho={9} op={0.3} /><Reflejo x={3} z={-100} largo={170} color="#FF6AA0" ancho={3} op={0.25} />
    <group position={[-48, 0, -60]}><Skyline semilla={3} z={-12} ancho={60} n={14} alto={28} /></group>
    {[-9, -5, 7, 11, 15].map((x, i) => <Palmera key={i} x={x} z={-4 - (i % 3) * 3} h={5 + (i % 3)} t={t} i={i} />)}
    <group position={[0.4, 0.02, 0]}><PersonajeA genero="m" ropa={ROPA_B} pelo="#4A2A1A" pose={{ t, paso: 0, brazos: 0.1, giro: Math.PI }} /></group>
    {Array.from({ length: 5 }, (_, i) => <Caja key={i} pos={[(rnd(i) - 0.5) * 30, 0.02, -12 - mod(i * 3 + t * 1.2, 9)]} tam={[8 + 6 * rnd(i + 4), 0.02, 0.18]} color="#FFFFFF" basico />)}
  </>
);

/** Gasolinera de noche con marquesina de neón, surtidores genéricos, un auto de la biblioteca y un personaje. */
export const Gasolinera: React.FC<PropsEscena> = ({ t, u }) => {
  const e = ease(u);
  return (
    <>
      <Plano pos={[0, 0, -20]} tam={[160, 120]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -4]} tam={[16, 14]} color="#14102E" metal={0.7} rough={0.12} />
      <Reflejo x={-3} z={-3} largo={12} color="#44E6FF" ancho={1.6} op={0.3} /><Reflejo x={3} z={-3} largo={12} color="#FF4FA8" ancho={1.6} op={0.3} />
      <Skyline semilla={9} z={-70} ancho={120} n={20} alto={34} />
      <Edificio x={-14} z={-16} w={12} h={7} d={9} k={2} neon="#FFB02E" /><Edificio x={12} z={-20} w={10} h={14} d={9} k={5} neon="#44E6FF" />
      <Letrero txt="24 H" color="#FFB02E" pos={[-8.2, 4.2, -11]} rot={0.5} w={2.6} />
      <group position={[0, 0, -3]}>
        <Caja pos={[0, 4.3, 0]} tam={[10, 0.35, 6.5]} color="#1B1F3F" />
        <Caja pos={[0, 4.1, 3.3]} tam={[10.1, 0.12, 0.12]} color="#44E6FF" basico /><Caja pos={[0, 4.1, -3.3]} tam={[10.1, 0.12, 0.12]} color="#FF4FA8" basico />
        <Caja pos={[0, 4.12, 0]} tam={[9.4, 0.04, 5.8]} color="#E8F4FF" basico />
        {[-4.6, 4.6].map((x) => [-2.8, 2.8].map((z) => <Caja key={x + '_' + z} pos={[x, 2.1, z]} tam={[0.3, 4.2, 0.3]} color="#C9D3EE" />))}
        {[-1.6, 1.6].map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <Caja pos={[0, 0.8, 0]} tam={[0.7, 1.6, 0.55]} color="#2A3550" /><Caja pos={[0, 1.35, 0.29]} tam={[0.5, 0.3, 0.02]} color={i ? '#FF4FA8' : '#44E6FF'} basico /><Caja pos={[0, 1.62, 0]} tam={[0.74, 0.1, 0.6]} color="#FF4FA8" basico />
            <Brillo pos={[0, 1.4, 0.4]} esc={1.6} color={i ? '#FF4FA8' : '#44E6FF'} op={0.5} />
          </group>
        ))}
      </group>
      <group position={[-3.4, 0, -2.2 + 0.6 * e]} rotation={[0, 1.0, 0]}><Auto modelo="NormalCar2" neon="#44E6FF" /></group>
      <group position={[-0.6, 0, -0.8]}><PersonajeA genero="h" ropa={ROPA_A} pelo="#2A1C14" barba pose={{ t, paso: 0.2, brazos: 0.15, giro: 0.5 }} /></group>
      <Lluvia t={t} n={40} x={[-12, 12]} z={[-24, 8]} alto={14} vel={22} />
    </>
  );
};

/** Local nocturno (bar) con neones, barra, banquetas y botellas instanciadas. */
const BOT = new THREE.CylinderGeometry(0.06, 0.07, 0.34, 8); const BOT_M = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
const BAN = new THREE.CylinderGeometry(0.22, 0.2, 0.08, 12); const BAN_M = new THREE.MeshStandardMaterial({ color: '#FF4FA8', roughness: 0.5 });
const Botellas: React.FC = () => {
  const r = React.useRef<THREE.InstancedMesh>(null); const N = 22; const cols = ['#44E6FF', '#FF4FA8', '#FFE45C', '#7CFF3A', '#B07CFF'];
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4(); const c = new THREE.Color();
    for (let i = 0; i < N; i++) { m.makeTranslation(-3.3 + (i % 11) * 0.66, i < 11 ? 2.05 : 2.85, -7.6); im.setMatrixAt(i, m); im.setColorAt(i, c.set(cols[Math.floor(rnd(i * 3) * 5)])); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  return <instancedMesh ref={r} args={[BOT, BOT_M, N]} frustumCulled={false} />;
};
const Banquetas: React.FC = () => {
  const r = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4(); for (let i = 0; i < 5; i++) { m.makeTranslation(-2.4 + i * 1.2, 0.7, -3.0); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={r} args={[BAN, BAN_M, 5]} frustumCulled={false} />;
};
export const Local: React.FC<PropsEscena> = ({ t, u }) => (
  <>
    <Plano pos={[0, 0, -4]} tam={[16, 16]} color="#1A0F2E" metal={0.5} rough={0.25} />
    <mesh position={[0, 3.5, -8]}><planeGeometry args={[16, 8]} /><meshStandardMaterial color="#1A0F3A" roughness={0.9} /></mesh>
    {[-8, 8].map((x) => <mesh key={x} position={[x, 3.5, -4]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[16, 8]} /><meshStandardMaterial color="#140C2C" roughness={0.9} /></mesh>)}
    <mesh position={[0, 7.4, -4]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[16, 16]} /><meshBasicMaterial color="#0A0618" /></mesh>
    <Caja pos={[0, 0.55, -4.2]} tam={[8, 1.1, 1.1]} color="#5A2A9A" /><Caja pos={[0, 1.13, -4.2]} tam={[8.1, 0.08, 1.2]} color="#44E6FF" basico />
    <Caja pos={[0, 2.45, -7.85]} tam={[7.4, 0.08, 0.3]} color="#3A2A66" /><Caja pos={[0, 3.25, -7.85]} tam={[7.4, 0.08, 0.3]} color="#3A2A66" />
    <Botellas /><Banquetas />
    <Letrero txt="BAR" color="#FF4FA8" pos={[0, 4.9, -7.8]} w={3.6} />
    <Caja pos={[-6, 3.4, -7.9]} tam={[0.12, 3, 0.1]} color="#44E6FF" basico /><Caja pos={[6, 3.4, -7.9]} tam={[0.12, 3, 0.1]} color="#B07CFF" basico />
    {[-5, -1.7, 1.7, 5].map((x, i) => <Brillo key={i} pos={[x, 6.2, -4]} esc={4.5} color={['#FF4FA8', '#44E6FF'][i % 2]} op={0.5} />)}
    <Brillo pos={[0, 2.4, -7.5]} esc={[10, 3, 1]} color="#B07CFF" op={0.35} />
    <group position={[1.2, 0, -1.6]}><PersonajeA genero="m" ropa={ROPA_C} pelo="#2A1A10" pose={{ t, paso: 0, brazos: 0.1, giro: -0.4 }} /></group>
    {Array.from({ length: 24 }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 12, 0.6 + mod(rnd(i + 30) * 6 + t * 0.3, 6), -1 - rnd(i + 5) * 6]}><sphereGeometry args={[0.03, 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF'][i % 3]} /></mesh>)}
  </>
);

/** Teléfono: el personaje lo sostiene a la altura del pecho; notificaciones (iconos, sin texto de marcas) flotan alrededor. */
const pantalla = () => lienzo('tel_pantalla', 256, 512, (c) => {
  const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2A0A5A'); g.addColorStop(1, '#0A1A5A'); c.fillStyle = g; c.fillRect(0, 0, 256, 512);
  const cs = ['#44E6FF', '#FF4FA8', '#FFE45C', '#7CFF3A', '#B07CFF', '#FFB02E'];
  for (let i = 0; i < 12; i++) { c.fillStyle = cs[i % 6]; c.beginPath(); c.roundRect(24 + (i % 3) * 76, 70 + Math.floor(i / 3) * 76, 56, 56, 14); c.fill(); }
});
const tarjeta = (k: number) => lienzo('tel_tarjeta' + k, 384, 128, (c) => {
  const col = ['#44E6FF', '#FF4FA8', '#FFE45C'][k];
  c.fillStyle = 'rgba(8,10,34,0.93)'; c.beginPath(); c.roundRect(4, 4, 376, 120, 28); c.fill(); c.lineWidth = 6; c.strokeStyle = col; c.stroke();
  c.fillStyle = col;
  if (k === 0) { c.beginPath(); c.arc(64, 64, 26, 0, 7); c.fill(); c.fillStyle = '#08102A'; c.beginPath(); c.arc(64, 64, 10, 0, 7); c.fill(); }
  if (k === 1) { c.beginPath(); c.roundRect(36, 38, 56, 40, 12); c.fill(); c.beginPath(); c.moveTo(50, 76); c.lineTo(48, 94); c.lineTo(68, 78); c.fill(); }
  if (k === 2) { c.beginPath(); c.arc(64, 62, 24, Math.PI, 0); c.lineTo(88, 86); c.lineTo(40, 86); c.fill(); c.beginPath(); c.arc(64, 96, 8, 0, 7); c.fill(); }
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(116, 40, 200, 16, 8); c.fill(); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.roundRect(116, 70, 140, 14, 7); c.fill();
});
export const Telefono: React.FC<PropsEscena> = ({ t, u }) => (
  <>
    <Plano pos={[0, 0, -20]} tam={[120, 90]} color="#0C0A22" metal={0.6} rough={0.2} />
    <Reflejo x={-3} z={-10} largo={50} color="#FF4FA8" ancho={1.6} op={0.2} /><Reflejo x={3} z={-10} largo={50} color="#44E6FF" ancho={1.6} op={0.2} />
    <Skyline semilla={4} z={-45} ancho={90} n={18} alto={30} />
    {[-5, 5].map((x, i) => <Palmera key={i} x={x} z={-8} h={6} t={t} i={i} />)}
    <group position={[-0.3, 0, 0]}><PersonajeA genero="h" ropa={ROPA_A} pelo="#2A1C14" barba pose={{ t, paso: 0, brazos: 0.55, giro: -0.15 }} /></group>
    <group position={[0.38, 1.28 + 0.01 * Math.sin(t * 2), 0.5]} rotation={[-0.25, -0.25, 0]}>
      <mesh><RB a={[0.3, 0.6, 0.04]} r={0.03} /><meshStandardMaterial color="#10101C" roughness={0.3} metalness={0.6} /></mesh>
      <mesh position={[0, 0, 0.026]}><planeGeometry args={[0.26, 0.54]} /><meshBasicMaterial map={pantalla()} toneMapped={false} /></mesh>
      <Brillo pos={[0, 0, 0.1]} esc={1.4} color="#44E6FF" op={0.5} />
    </group>
    {[0, 1, 2].map((k) => { const a = cl((u - 0.12 - k * 0.14) / 0.1); if (a <= 0) return null; return (
      <mesh key={k} position={[[-0.5, 0.6, -0.55][k], [2.7, 3.0, 0.9][k] + 0.03 * Math.sin(t * 2 + k), 0.7]} scale={(a < 1 ? 0.6 + 0.5 * Math.sin(a * Math.PI * 0.6) : 1) * 1.0}><planeGeometry args={[1.2, 0.4]} /><meshBasicMaterial map={tarjeta(k)} transparent toneMapped={false} /></mesh>); })}
    <Lluvia t={t} n={40} x={[-8, 8]} z={[-20, 6]} alto={12} vel={22} />
  </>
);
