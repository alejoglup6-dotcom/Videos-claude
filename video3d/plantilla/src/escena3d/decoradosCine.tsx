// Decorados «cinemáticos» originales (sin marcas, logos ni personas): noche costera con lluvia, mapa de un estado ficticio,
// persecución nocturna, atardecer aéreo con helicóptero y fondo de partículas de neón. Se registran en decorados.tsx.
//   vice          noche costera:  aerea · calle (pareja en silueta frente a un auto deportivo) · playa
//   mapa          mapa estilizado de un estado ficticio:  costa · ciudad · pantano · carreteras
//   persecucion   persecución policial estilizada:  detras · lateral · giro
//   atardecer     vista aérea al atardecer con helicóptero:  orbita · helicoptero · costa
//   fondo         pantalla oscura con partículas de neón:  particulas · negro
import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../motor';
import { Auto, Edificio, Palmera, Skyline, Farolas, Sol } from './Piezas';
import type { PropsDecorado } from './decorados';

type V3 = [number, number, number];
const ease = (x: number) => 1 - Math.pow(1 - cl(x), 3);
const mod = (a: number, b: number) => ((a % b) + b) % b;

// ---------- piezas comunes ----------
const cache: Record<string, THREE.Texture> = {};
const halo = (color: string): THREE.Texture => {
  const k = 'halo_' + color; if (cache[k]) return cache[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, color); g.addColorStop(1, color + '00'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return (cache[k] = tx);
};
const Brillo: React.FC<{ pos: V3; esc: number | [number, number, number]; color: string; op?: number }> = ({ pos, esc, color, op = 0.9 }) => (
  <sprite position={pos} scale={typeof esc === 'number' ? [esc, esc, 1] : esc}><spriteMaterial map={halo(color)} transparent opacity={op} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></sprite>
);
const Plano: React.FC<{ pos: V3; tam: [number, number]; color: string; metal?: number; rough?: number }> = ({ pos, tam, color, metal = 0.1, rough = 0.9 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos}><planeGeometry args={tam} /><meshStandardMaterial color={color} metalness={metal} roughness={rough} /></mesh>
);
const Caja: React.FC<{ pos: V3; tam: V3; color: string; basico?: boolean; rot?: V3 }> = ({ pos, tam, color, basico, rot }) => (
  <mesh position={pos} rotation={rot}><boxGeometry args={tam} />{basico ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color={color} roughness={0.8} />}</mesh>
);
// franja de reflejo de neón sobre el asfalto mojado
const Reflejo: React.FC<{ x: number; z: number; largo: number; color: string; ancho?: number; op?: number }> = ({ x, z, largo, color, ancho = 0.8, op = 0.3 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}><planeGeometry args={[ancho, largo]} /><meshBasicMaterial color={color} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
);
// lluvia: rayas finas que caen (posiciones deterministas según el tiempo)
const Lluvia: React.FC<{ t: number; n?: number; x?: [number, number]; z?: [number, number]; alto?: number; vel?: number }> = ({ t, n = 140, x = [-20, 20], z = [-45, 14], alto = 22, vel = 24 }) => (
  <group>{Array.from({ length: n }, (_, i) => {
    const px = lerp(x[0], x[1], rnd(i * 3 + 1)), pz = lerp(z[0], z[1], rnd(i * 3 + 2)), py = mod(rnd(i * 3 + 3) * alto - t * vel, alto);
    return <mesh key={i} position={[px, py, pz]}><boxGeometry args={[0.03, 1.5, 0.03]} /><meshBasicMaterial color="#B8E0FF" transparent opacity={0.5} fog={false} /></mesh>;
  })}</group>
);
// cartel de neón (marco luminoso sin texto)
const Rotulo: React.FC<{ pos: V3; w: number; h: number; color: string; rot?: number }> = ({ pos, w, h, color, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <Caja pos={[0, h / 2, 0]} tam={[w, 0.12, 0.12]} color={color} basico /><Caja pos={[0, -h / 2, 0]} tam={[w, 0.12, 0.12]} color={color} basico />
    <Caja pos={[-w / 2, 0, 0]} tam={[0.12, h, 0.12]} color={color} basico /><Caja pos={[w / 2, 0, 0]} tam={[0.12, h, 0.12]} color={color} basico />
    <mesh position={[0, 0, -0.05]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
  </group>
);
// figura humana original en silueta, SIN rostro y de espaldas (mira hacia -z); borde de luz de neón
const Silueta: React.FC<{ alto?: number; pelo?: 'corto' | 'largo'; neon: string; t: number }> = ({ alto = 1, pelo = 'corto', neon, t }) => {
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
const Patrulla: React.FC<{ t: number; fase?: number }> = ({ t, fase = 0 }) => {
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
const Helicoptero: React.FC<{ t: number; esc?: number }> = ({ t, esc = 1 }) => (
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

// ====================== VICE (noche costera con lluvia) ======================
export const Vice: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = ease(u);
  const trafico = (zs: number[], x: number, vel: number) => zs.map((z0, i) => <Caja key={i} pos={[x + (i % 2) * 0.9, 0.4, mod(z0 - t * vel * (i % 2 ? 1 : -1), 150) - 110]} tam={[0.5, 0.4, 1.0]} color={i % 2 ? '#FF3040' : '#FFE9A0'} basico />);
  if (k === 0) { // aérea
    return (
      <>
        <Plano pos={[-46, 0, -45]} tam={[92, 190]} color="#0D0828" />
        <Plano pos={[4, 0.01, -45]} tam={[8, 190]} color="#4A3568" rough={0.95} />
        <Plano pos={[52, -0.02, -45]} tam={[88, 190]} color="#0A1048" metal={0.6} rough={0.18} />
        {[16, 24, 33, 44].map((x, i) => <Reflejo key={i} x={x} z={-50} largo={150} color={i % 2 ? '#44E6FF' : '#FF4FA8'} ancho={2.2} op={0.2} />)}
        <group position={[-36, 0, 0]}><Skyline semilla={3} z={-24} ancho={60} n={16} alto={34} /></group><group position={[-62, 0, -52]}><Skyline semilla={8} z={-10} ancho={56} n={16} alto={40} /></group>
        <Plano pos={[-2, 0.03, -45]} tam={[2.4, 190]} color="#1A1040" /><Reflejo x={-2} z={-45} largo={190} color="#FF4FA8" ancho={1.8} op={0.35} />
        {trafico([0, 22, 44, 66, 88, 110], -2.6, 9)}
        {[0, 2, 4, 6, 8, 10, 12].map((i) => <Palmera key={i} x={3 + (i % 2) * 2} z={20 - i * 14} h={5} t={t} i={i} />)}
        <Lluvia t={t} n={120} x={[-30, 16]} z={[-90, 40]} alto={40} vel={30} />
        <mesh position={[28, 40, -140]}><sphereGeometry args={[5, 18, 14]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh>
        <Brillo pos={[28, 40, -139]} esc={34} color="#8AA0FF" op={0.35} />
      </>
    );
  }
  if (k === 1) { // calle: pareja en silueta frente a un auto deportivo
    const z0 = -4;
    return (
      <>
        <Plano pos={[0, 0, -40]} tam={[200, 220]} color="#0C0A22" />
        <Plano pos={[0, 0.02, -40]} tam={[9, 220]} color="#14102E" metal={0.7} rough={0.12} />
        {[-3.6, 3.6].map((x, i) => <Caja key={i} pos={[x, 0.05, -40]} tam={[0.16, 0.1, 220]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
        <Reflejo x={-2} z={-18} largo={60} color="#FF4FA8" ancho={1.4} op={0.3} /><Reflejo x={2.4} z={-18} largo={60} color="#44E6FF" ancho={1.4} op={0.3} /><Reflejo x={0} z={-14} largo={30} color="#FFE9A0" ancho={3} op={0.18} />
        {[-1, 1].map((s) => [0, 1, 2, 3, 4, 5].map((i) => <Edificio key={s + '_' + i} x={s * (11 + (i % 2) * 2)} z={6 - i * 15} w={9} h={14 + ((i * 7) % 5) * 5} d={9} k={i + (s > 0 ? 3 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
        <Rotulo pos={[-7.6, 5, -14]} w={3.2} h={1.1} color="#FF4FA8" rot={0.5} /><Rotulo pos={[7.6, 6.4, -24]} w={3.8} h={1.2} color="#44E6FF" rot={-0.5} /><Rotulo pos={[-7.4, 3.2, -34]} w={3} h={1} color="#FFB02E" rot={0.5} />
        {[-6.5, 6.5].map((x, i) => [10, 0, -12, -26].map((z, j) => <Palmera key={i + '_' + j} x={x} z={z} h={5.2} t={t} i={i * 4 + j} />))}
        <group position={[0.2, 0, z0 - 6]}><Auto color="#1C2236" neon="#FF4FA8" />
          <Brillo pos={[-0.62, 0.64, 2.4]} esc={3.6} color="#FFF3C4" op={0.9} /><Brillo pos={[0.62, 0.64, 2.4]} esc={3.6} color="#FFF3C4" op={0.9} />
          <mesh position={[0, 0.9, 9]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[2.2, 12, 14, 1, true]} /><meshBasicMaterial color="#FFF0C0" transparent opacity={0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        </group>
        <group position={[-0.65, 0, z0 + lerp(0, 0.4, e)]} rotation={[0, Math.PI, 0]}><Silueta alto={1.05} pelo="corto" neon="#44E6FF" t={t} /></group>
        <group position={[0.65, 0, z0 + lerp(0, 0.4, e)]} rotation={[0, Math.PI, 0]}><Silueta alto={0.95} pelo="largo" neon="#FF4FA8" t={t + 1} /></group>
        <Lluvia t={t} n={150} x={[-12, 12]} z={[-40, 8]} alto={16} vel={22} />
        <pointLight position={[0, 2, -2]} color="#FFE9C0" intensity={4} distance={14} />
      </>
    );
  }
  // playa de noche
  return (
    <>
      <Plano pos={[-14, 0, -40]} tam={[52, 200]} color="#4A3568" rough={0.95} />
      <Plano pos={[40, -0.02, -40]} tam={[80, 200]} color="#0A1048" metal={0.6} rough={0.18} />
      {[18, 26, 34].map((x, i) => <Reflejo key={i} x={x} z={-60} largo={140} color={i % 2 ? '#44E6FF' : '#FF4FA8'} ancho={2.4} op={0.22} />)}
      <Reflejo x={22} z={-90} largo={120} color="#F2EEFF" ancho={5} op={0.16} />
      <mesh position={[26, 34, -130]}><sphereGeometry args={[6, 18, 14]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh><Brillo pos={[26, 34, -129]} esc={40} color="#8AA0FF" op={0.4} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <Palmera key={i} x={-2 + (i % 2) * 5 - lerp(0, 1, e)} z={14 - i * 11} h={5 + (i % 3)} t={t} i={i} />)}
      <Skyline semilla={5} z={-95} ancho={110} n={20} alto={34} />
      <Rotulo pos={[-10, 4, -8]} w={3.4} h={1.2} color="#FF4FA8" rot={0.6} /><Rotulo pos={[-12, 6, -30]} w={3.8} h={1.2} color="#44E6FF" rot={0.5} />
      <Lluvia t={t} n={90} x={[-25, 25]} z={[-50, 14]} alto={20} vel={24} />
    </>
  );
};

// ====================== MAPA (estado ficticio estilizado) ======================
// contorno en coordenadas de mapa (x, y); y positiva = norte (hacia -z en el mundo)
const COSTA: [number, number][] = [[-8, 6], [-3, 6.2], [0, 5.4], [2.5, 5.6], [3.4, 4.2], [3.2, 2], [3.8, 0], [4.2, -2.5], [4.8, -5], [5.2, -7.5], [4.4, -8.8], [3, -8.6], [2.4, -7], [1.4, -5], [0.2, -3.4], [-0.8, -1], [-1.4, 1.6], [-3.2, 2.6], [-6, 3.2]];
const FORMA = (() => { const s = new THREE.Shape(COSTA.map((p) => new THREE.Vector2(p[0], p[1]))); return s; })();
const w3 = (p: [number, number], y = 0): V3 => [p[0], y, -p[1]];
const Tramo: React.FC<{ a: [number, number]; b: [number, number]; y: number; ancho: number; color: string; op?: number }> = ({ a, b, y, ancho, color, op = 1 }) => {
  const dx = b[0] - a[0], dz = -(b[1] - a[1]); const largo = Math.hypot(dx, dz);
  return <mesh position={[(a[0] + b[0]) / 2, y, -(a[1] + b[1]) / 2]} rotation={[0, Math.atan2(dx, dz), 0]}><boxGeometry args={[ancho, ancho, largo]} /><meshBasicMaterial color={color} transparent={op < 1} opacity={op} /></mesh>;
};
const CARRETERAS: [number, number][][] = [[[3, -1.5], [2.2, 1.5], [0.6, 4.2], [-3, 4.6], [-7, 4.4]], [[3, -1.5], [3.4, -4], [2.6, -6.2], [3.6, -8]], [[3, -1.5], [0, -2.2], [-0.4, -4.6], [1.6, -6.4]]];
export const Mapa: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = ease(u); const ciudad = k === 1; const pantano = k === 2; const carr = k === 3; const costa = k === 0;
  const pulso = 0.6 + 0.4 * Math.sin(t * 4);
  const torres = Array.from({ length: 16 }, (_, i) => ({ x: 2.2 + (i % 4) * 0.42 + (rnd(i) - 0.5) * 0.15, y: -0.6 - Math.floor(i / 4) * 0.45 - rnd(i + 9) * 0.1, h: 0.4 + rnd(i * 3 + 1) * 1.1 }));
  return (
    <group position={[1.4, 0, -1.3]}>
      <Plano pos={[-1.4, -0.05, 1.3]} tam={[120, 120]} color="#070B26" metal={0.05} rough={0.95} />
      {Array.from({ length: 11 }, (_, i) => <Caja key={i} pos={[-1.4 + (i - 5) * 3, -0.02, 1.3]} tam={[0.03, 0.02, 40]} color="#1A2A6A" basico />)}
      {Array.from({ length: 9 }, (_, i) => <Caja key={'h' + i} pos={[-1.4, -0.02, 1.3 + (i - 4) * 3]} tam={[40, 0.02, 0.03]} color="#1A2A6A" basico />)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><extrudeGeometry args={[FORMA, { depth: 0.5, bevelEnabled: false }]} /><meshStandardMaterial color="#17235A" roughness={0.6} metalness={0.2} /></mesh>
      {COSTA.map((p, i) => <Tramo key={i} a={p} b={COSTA[(i + 1) % COSTA.length]} y={0.55} ancho={costa ? 0.16 : 0.09} color={costa ? '#44E6FF' : '#2A7AB0'} />)}
      {costa ? <Brillo pos={w3(COSTA[7 + Math.floor(mod(t * 3, 5))], 0.7)} esc={2.2} color="#44E6FF" /> : null}
      {costa ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.7, 0.02, -0.5]}><ringGeometry args={[1.5 + 1.2 * mod(t, 1), 1.6 + 1.2 * mod(t, 1), 40]} /><meshBasicMaterial color="#44E6FF" transparent opacity={0.5 * (1 - mod(t, 1))} side={THREE.DoubleSide} /></mesh> : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.52, 5.5]}><circleGeometry args={[1.7, 28]} /><meshBasicMaterial color="#25C98B" transparent opacity={pantano ? 0.35 + 0.25 * pulso : 0.16} /></mesh>
      {Array.from({ length: 16 }, (_, i) => { const a = rnd(i) * 6.28, r = Math.sqrt(rnd(i + 3)) * 1.5; return <mesh key={i} position={[0.5 + Math.cos(a) * r, 0.7, 5.5 + Math.sin(a) * r]}><coneGeometry args={[0.05, 0.4 + 0.2 * rnd(i + 5), 5]} /><meshBasicMaterial color={pantano ? '#7CFF3A' : '#25C98B'} /></mesh>; })}
      {pantano ? <Brillo pos={[0.5, 0.8, 5.5]} esc={7} color="#25C98B" op={0.45 * pulso} /> : null}
      {torres.map((o, i) => { const s = ciudad ? ease(u * 1.6 - i * 0.04) : 1; const h = o.h * s + 0.02;
        return <mesh key={i} position={[o.x, 0.5 + h / 2, -o.y]}><boxGeometry args={[0.3, h, 0.3]} /><meshStandardMaterial color="#B07CFF" emissive={i % 2 ? '#FF4FA8' : '#44E6FF'} emissiveIntensity={ciudad ? 0.9 : 0.5} roughness={0.4} /></mesh>; })}
      {ciudad ? <Brillo pos={[2.9, 1.2, 1.1]} esc={6} color="#FF4FA8" op={0.4 * pulso} /> : null}
      {CARRETERAS.map((ruta, r) => ruta.slice(0, -1).map((p, i) => <Tramo key={r + '_' + i} a={p} b={ruta[i + 1]} y={0.52} ancho={carr ? 0.1 : 0.05} color={carr ? '#FFB02E' : '#7A5A2A'} />))}
      {CARRETERAS.map((ruta, r) => { const n = ruta.length - 1; const f = mod(t * (carr ? 0.5 : 0.25) + r * 0.3, 1) * n; const i = Math.min(n - 1, Math.floor(f)); const p = ruta[i], q = ruta[i + 1]; const m = f - i;
        return <Brillo key={r} pos={w3([lerp(p[0], q[0], m), lerp(p[1], q[1], m)], 0.7)} esc={carr ? 1.4 : 0.8} color="#FFE9A0" />; })}
      {Array.from({ length: 36 }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 22, 0.4 + mod(rnd(i + 40) * 6 + t * 0.5, 6), (rnd(i * 2 + 1) - 0.5) * 22]}><sphereGeometry args={[0.05, 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF'][i % 3]} /></mesh>)}
    </group>
  );
};

// ====================== PERSECUCIÓN (nocturna, estilizada) ======================
export const Persecucion: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const vel = 30; const xj = 2.4 * Math.sin(t * 1.7 + 0.5) * (k === 2 ? 1.5 : 1); const yaw = Math.PI - 0.2 * Math.cos(t * 1.7 + 0.5) * (k === 2 ? 2.5 : 1) - (k === 2 ? 0.25 * Math.sin(t * 5) : 0);
  const patrullas: [number, number][] = k === 1 ? [[xj - 3.3, -15], [xj + 3.3, -12.5]] : k === 2 ? [[xj * 0.6 - 1.2, -7], [xj * 0.5 + 2.6, -5]] : [[xj * 0.7 - 1.6, -5], [xj * 0.6 + 2.2, -2]];
  const lentos = [[-4.6, 12, 14], [4.8, 40, 11], [-4.4, 70, 12], [0.4, 95, 10]];
  return (
    <>
      <Plano pos={[0, 0, -60]} tam={[220, 300]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -60]} tam={[15, 300]} color="#12102C" metal={0.7} rough={0.12} />
      {[-2.4, 2.4].map((x) => Array.from({ length: 14 }, (_, i) => <Caja key={x + '_' + i} pos={[x, 0.04, mod(i * 12 + t * vel, 168) - 140]} tam={[0.2, 0.04, 4]} color="#F4F4F0" basico />))}
      {[-7.4, 7.4].map((x, i) => <Caja key={i} pos={[x, 0.05, -60]} tam={[0.2, 0.1, 300]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-5} z={-30} largo={140} color="#44E6FF" ancho={1.6} op={0.28} /><Reflejo x={5} z={-30} largo={140} color="#FF4FA8" ancho={1.6} op={0.28} />
      {[-1, 1].map((s) => Array.from({ length: 12 }, (_, i) => <Edificio key={s + '_' + i} x={s * (16 + (i % 2) * 2)} z={20 - i * 16} w={10} h={14 + ((i * 7) % 5) * 5} d={10} k={i + (s > 0 ? 5 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      <Farolas zs={[0, 1, 2, 3, 4, 5].map((i) => mod(i * 18 + t * vel, 108) - 90)} ancho={8.4} />
      <group position={[xj, 0, -14]} rotation={[0, yaw, 0]}><Auto color="#E8EEF8" neon="#FF4FA8" /></group>
      {patrullas.map((p, i) => <group key={i} position={[p[0], 0, p[1]]} rotation={[0, Math.PI - 0.1 * Math.cos(t * 1.7 + i), 0]}><Patrulla t={t} fase={i * 0.5} /></group>)}
      {lentos.map((c, i) => <group key={i} position={[c[0], 0, mod(c[1] + t * (vel - c[2]), 150) - 120]} rotation={[0, Math.PI, 0]}><Auto color={['#2F7BE0', '#E85A4F', '#F0C24A', '#8A5FB4'][i]} neon="#FFFFFF" /></group>)}
      <Lluvia t={t} n={150} x={[-14, 14]} z={[-50, 16]} alto={18} vel={26} />
      <pointLight position={[0, 4, 6]} color="#FFFFFF" intensity={3} distance={18} />
    </>
  );
};

// ====================== ATARDECER (aéreo, con helicóptero) ======================
export const Atardecer: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const ang = lerp(-0.5, 0.5, u) * (k === 0 ? 1 : 0.5); const a = t * 0.5; const R = k === 1 ? 11 : 17; const hy = k === 2 ? 9 : 15;
  const hx = Math.cos(a) * R, hz = -30 + Math.sin(a) * R;
  return (
    <>
      <Sol x={0} y={14} z={-190} r={30} />
      <group position={[0, 0, -30]} rotation={[0, ang, 0]}>
        <group position={[0, 0, 30]}>
          <Plano pos={[-60, 0, -40]} tam={[110, 200]} color="#2A1450" />
          <Plano pos={[4, 0.01, -40]} tam={[10, 200]} color="#C99A7A" rough={0.95} />
          <Plano pos={[60, -0.02, -40]} tam={[100, 200]} color="#3A2A7A" metal={0.6} rough={0.2} />
          <Reflejo x={30} z={-60} largo={150} color="#FFB070" ancho={6} op={0.25} /><Reflejo x={38} z={-60} largo={150} color="#FF6AA0" ancho={3} op={0.25} />
          <group position={[-40, 0, 0]}><Skyline semilla={2} z={-12} ancho={70} n={18} alto={32} /></group><group position={[-66, 0, -34]}><Skyline semilla={6} z={-10} ancho={60} n={16} alto={38} /></group>
          <Plano pos={[-2, 0.03, -40]} tam={[2.4, 200]} color="#1A1040" />
          {[0, 1, 2, 3, 4].map((i) => <group key={i} position={[-2 + (i % 2 ? 0.5 : -0.5), 0, mod(-i * 28 + t * (i % 2 ? -7 : 6), 140) - 100]} rotation={[0, i % 2 ? 0 : Math.PI, 0]} scale={0.9}><Auto color={['#E85A4F', '#2F7BE0', '#F0C24A', '#E8EEF8', '#8A5FB4'][i]} neon="#FFFFFF" /></group>)}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Palmera key={i} x={0.5 + (i % 2) * 3} z={20 - i * 15} h={5 + (i % 3)} t={t} i={i} />)}
          <group position={[hx, hy, hz]} rotation={[0.08, -a + Math.PI, 0]}><Helicoptero t={t} esc={k === 1 ? 1.3 : 1} /></group>
        </group>
      </group>
    </>
  );
};

// ====================== FONDO (partículas de neón / negro) ======================
export const Fondo: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const negro = k === 1; const n = negro ? 18 : 70;
  return (
    <>
      {!negro ? <>
        <Plano pos={[0, -2, -20]} tam={[80, 80]} color="#05030F" metal={0.5} rough={0.3} />
        {Array.from({ length: 13 }, (_, i) => <Caja key={i} pos={[(i - 6) * 3, -1.97, -20]} tam={[0.05, 0.02, 80]} color="#6A2AB0" basico />)}
        {Array.from({ length: 14 }, (_, i) => <Caja key={'z' + i} pos={[0, -1.97, mod(-i * 5 + t * 6, 70) - 55]} tam={[80, 0.02, 0.05]} color="#B02A80" basico />)}
        <Brillo pos={[0, 3, -16]} esc={38} color="#6A2AB0" op={0.28} /><Brillo pos={[-8, 6, -20]} esc={22} color="#B02A80" op={0.22} /><Brillo pos={[9, 1, -22]} esc={20} color="#1FB6FF" op={0.2} />
      </> : null}
      {Array.from({ length: n }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 26, -1.5 + mod(rnd(i + 50) * 14 + t * (0.5 + rnd(i + 7)), 14), -rnd(i * 2 + 1) * 18]}><sphereGeometry args={[0.06 + 0.07 * rnd(i + 20), 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF', '#FFE86A'][i % 4]} transparent opacity={negro ? 0.45 : 0.95} /></mesh>)}
    </>
  );
};
