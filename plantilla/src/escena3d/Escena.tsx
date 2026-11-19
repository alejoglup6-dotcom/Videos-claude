// Escena 3D del video de GTA 6: 18 tomas de ~2 s sobre 6 decorados originales (ciudad de neón, noche, torre, pantano, edificio art déco y cierre).
import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { cl, lerp, rnd, sale, suave } from '../motor';
import { CAL } from '../calidad';
import { latigazo } from '../lib/transiciones';
import { Auto, Ovni, Persona, Edificio, Skyline, Palmera, Carretera, Cielo, Sol, Mar, Huevo, Bigfoot, Hedor, Perro, MotoAcuatica, Estela, ArtDeco, Torre, Cipres, CieloTipo, Farolas, Nubes } from './Piezas';

export type Tiempos = { dur: number; frases: { id: string; ini: number; fin: number }[] };
type V3 = [number, number, number];
type Toma = { id: string; k: number; n: number; t0: number; t1: number; i: number };
type Def = { set: 'ciudad' | 'noche' | 'torre' | 'pantano' | 'bahia' | 'apto' | 'cierre'; p: V3; l: V3; f: number; push: number };

const PLAN: [string, number][] = [['p01', 2], ['p02', 4], ['p03', 4], ['p04', 3], ['p05', 3], ['p06', 2]];
export const crearTomas = (T: Tiempos): Toma[] => {
  const out: Toma[] = []; let i = 0;
  PLAN.forEach(([id, n], pi) => {
    const t0 = pi === 0 ? 0 : T.frases[pi].ini - 0.05;
    const t1 = pi === PLAN.length - 1 ? T.dur : T.frases[pi + 1].ini - 0.05;
    for (let k = 0; k < n; k++) out.push({ id, k, n, t0: lerp(t0, t1, k / n), t1: lerp(t0, t1, (k + 1) / n), i: i++ });
  });
  return out;
};

const DEFS: Record<string, Def[]> = {
  p01: [
    { set: 'ciudad', p: [0.8, 0.9, 16], l: [0, 7.5, -22], f: 58, push: 7 },
    { set: 'ciudad', p: [-10, 3, -2], l: [0, 6.5, -22], f: 46, push: 6 },
  ],
  p02: [
    { set: 'noche', p: [0, 2.2, 13], l: [0, 6, -8], f: 55, push: 4 },
    { set: 'noche', p: [0.3, 0.9, -0.6], l: [0, 6.5, -9], f: 70, push: 2 },
    { set: 'noche', p: [6, 2.5, 3], l: [0, 3.5, -3], f: 50, push: 2.5 },
    { set: 'noche', p: [-3.5, 1.2, 2], l: [0, 0.8, -3], f: 55, push: 2 },
  ],
  p03: [
    { set: 'torre', p: [5, 0.8, 6], l: [0, 13, -6], f: 70, push: 5 },
    { set: 'torre', p: [2.4, 21.7, -1.8], l: [0, 20.7, -6], f: 42, push: 1.4 },
    { set: 'torre', p: [-3.2, 19.2, -1.2], l: [1.2, 20.7, -6], f: 50, push: 2.2 },
    { set: 'torre', p: [-2.5, 1.5, 9], l: [2, 1.6, 4], f: 48, push: 2 },
  ],
  p04: [
    { set: 'pantano', p: [0, 1.3, 7], l: [0, 2.7, -6], f: 52, push: 2.5 },
    { set: 'pantano', p: [1.6, 2.6, -1.0], l: [0, 3.0, -6], f: 40, push: 1.0 },
    { set: 'bahia', p: [4, 1.5, 13], l: [0, 1.0, -2], f: 42, push: 1.5 },
  ],
  p05: [
    { set: 'apto', p: [-13, 3, 9], l: [0, 3.8, -8], f: 46, push: 3 },
    { set: 'apto', p: [3.5, 4.6, 3], l: [0, 4.2, -8], f: 38, push: 2 },
    { set: 'apto', p: [15, 2, 7], l: [0, 4.5, -8], f: 48, push: 3 },
  ],
  p06: [
    { set: 'cierre', p: [0, 1.6, 10], l: [0, 2.2, -30], f: 60, push: 6 },
    { set: 'cierre', p: [5, 1.0, 3], l: [-1, 1.3, -20], f: 46, push: 3 },
  ],
};

const Camara: React.FC<{ p: V3; l: V3; f: number }> = ({ p, l, f }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...p); c.lookAt(...l); c.fov = f; c.updateProjectionMatrix();
  return null;
};

const FOG: Record<string, [string, number, number]> = { ciudad: ['#7A2A8A', 25, 140], noche: ['#0A0A3A', 18, 120], torre: ['#7A2A8A', 25, 140], pantano: ['#2F4A2A', 8, 42], bahia: ['#8A2A7A', 25, 150], apto: ['#8A3A8A', 28, 150], cierre: ['#6A2088', 25, 140] };
const CIELO: Record<string, CieloTipo> = { ciudad: 'ocaso', torre: 'ocaso', pantano: 'pantano', bahia: 'ocaso', apto: 'ocaso', cierre: 'ocaso', noche: 'noche' };

const Suelo: React.FC<{ color?: string }> = ({ color = '#160B38' }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -60]} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial color={color} roughness={0.55} metalness={0.3} /></mesh>
);
const Palmeras: React.FC<{ t: number; zs: number[]; ancho?: number }> = ({ t, zs, ancho = 8 }) => (
  <group>{zs.map((z, i) => <Palmera key={i} x={(i % 2 ? 1 : -1) * (ancho + (i % 3))} z={z} h={4.5 + (i % 3)} t={t} i={i} />)}</group>
);
const Sombras: React.FC = () => null;

const Mundo: React.FC<{ d: Def; tm: Toma; t: number; u: number; T: Tiempos }> = ({ d, tm, t, u, T }) => {
  const s = d.set; const { id, k } = tm;
  const e = sale(u);
  const ciudad = (ufo: boolean) => (
    <>
      <Sol /><Nubes t={t} /><Suelo /><Skyline semilla={3} z={-62} />
      <Carretera t={t} /><Farolas zs={[-2, -12, -22, -32, -42, -52]} />
      <Palmeras t={t} zs={[4, -6, -16, -26, -36, -46, -58, -70]} />
      <group position={[1.9, 0, 6 - ((t * 9) % 70)]} rotation={[0, Math.PI, 0]}><Auto color="#F2F4FF" neon="#FF4FA8" /></group>
      {ufo ? <group position={[0, 9, -22 + 2 * Math.sin(t * 0.8)]}><Ovni t={t} rayo={1} escala={1.3} /></group> : null}
    </>
  );
  if (s === 'ciudad') return ciudad(true);
  if (s === 'cierre') return (
    <>
      {ciudad(false)}
      <group position={[-16, 15, -55]}><Ovni t={t} rayo={0} escala={1.4} /></group>
    </>
  );
  if (s === 'noche') {
    const bajada = k === 0 ? lerp(24, 14, e) : k === 1 ? lerp(14, 10.5, e) : 10;
    const hay = k < 3;
    const alza = k === 2 ? 5.2 * e : k < 2 ? 0 : 0;
    return (
      <>
        <Suelo color="#0C0830" />
        <Skyline semilla={9} z={-90} ancho={160} n={26} alto={20} />
        <Carretera t={k === 2 ? t * 0.1 : t * 0.3} color="#44E6FF" />
        <Palmeras t={t} zs={[6, -4, -14, -24, -34, -48]} />
        <group position={[-3.7, 0, -1.5]} rotation={[0, 2.9, 0]}><Auto color="#B07CFF" neon="#B07CFF" /></group>
        {k < 3 ? (
          <group position={[0, alza, -3]} rotation={[0, k === 1 ? Math.PI : 0.3, k === 2 ? 0.2 * Math.sin(t * 4) : 0]}>
            <Persona t={t} camisa="#44E6FF" brazos={k === 2 ? 0.45 : k === 1 ? 0.08 : 0} mira={k === 1 ? 0.6 : 0.1} />
          </group>
        ) : (
          <group position={[0, 0.25, -3]} rotation={[-1.45, 0.3, 0]}><Persona t={t} camisa="#44E6FF" brazos={0.4 * Math.sin(t * 3) ** 2} mira={0.2} /></group>
        )}
        {hay ? <group position={[0, bajada, -9]}><Ovni t={t} rayo={k === 0 ? e * 0.4 : 1} escala={1.4} /></group> : null}
        <mesh position={[-22, 40, -140]}><sphereGeometry args={[5, 20, 16]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh>
        {k === 3 ? <Sol x={0} y={6} z={-150} r={16} /> : null}
      </>
    );
  }
  if (s === 'torre') {
    const huevoVuelo = k === 2 ? { x: lerp(0, 9, u), y: 20.7 + 6 * u - 14 * u * u, z: lerp(-6, -3, u) } : null;
    const caida = k === 3 ? { y: lerp(14, 2.3, u * u) } : null;
    return (
      <>
        <Sol /><Suelo /><Skyline semilla={5} z={-75} ancho={150} />
        <Palmeras t={t} zs={[10, 2, -8, -20]} ancho={9} />
        <group position={[0, 0, -6]}><Torre t={t} /></group>
        {k !== 0 && k !== 3 ? (
          <group position={[1.7, 20.25, -5.2]} rotation={[0, -0.6, 0]}><Persona t={t} camisa="#FF4FA8" brazos={k === 2 ? 0.5 + 0.35 * sale(u * 3) : 0} mira={0.1} /></group>
        ) : null}
        {huevoVuelo ? <group position={[huevoVuelo.x, huevoVuelo.y, huevoVuelo.z]} rotation={[t * 8, 0, t * 5]}><Huevo color="#FFE86A" s={1.6} /></group> : null}
        {k === 3 ? (
          <>
            <group position={[2, 0, 4]} rotation={[0, 0.15, 0]}><Persona t={t} camisa="#7CFF3A" mira={u > 0.6 ? 0.9 : 0.1} brazos={u > 0.75 ? 0.35 : 0} /></group>
            {u < 0.72 ? <group position={[2, caida!.y + 1.3, 4]} rotation={[t * 8, 0, 0]}><Huevo color="#FF4FA8" s={2.2} /></group> : null}
            {u >= 0.72 ? Array.from({ length: 16 }, (_, i) => { const w = cl((u - 0.72) / 0.28); const a = i * 0.95; return <mesh key={i} position={[2 + Math.cos(a) * 0.9 * w, 2.9 + Math.sin(a * 2) * 0.4 * w - 0.5 * w * w, 4 + Math.sin(a) * 0.9 * w]} scale={0.8 * (1 - w * 0.6)}><sphereGeometry args={[0.14, 8, 8]} /><meshBasicMaterial color={i % 2 ? '#FFE86A' : '#FF4FA8'} /></mesh>; }) : null}
          </>
        ) : null}
      </>
    );
  }
  if (s === 'pantano') {
    return (
      <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -20]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#10301F" roughness={0.15} metalness={0.5} /></mesh>
        {[[-6, -2], [7, -4], [-9, -12], [10, -14], [-4, -22], [5, -24], [-13, -6], [13, -8]].map((c, i) => <Cipres key={i} x={c[0]} z={c[1]} h={6 + (i % 3) * 1.5} i={i} />)}
        <group position={[0, 0, -6]}><Bigfoot t={t} asoma={k === 0 ? lerp(0.55, 1, e) : 1} /></group>
        <group position={[0, 0, -6]}><Hedor t={t} k={k === 1 ? 1.8 : 1} /></group>
        <pointLight position={[0, 5, 2]} color="#B8FF6A" intensity={k === 1 ? 14 : 7} distance={14} />
        <pointLight position={[0, 3, 4]} color="#7CFF3A" intensity={3} distance={9} />
      </>
    );
  }
  if (s === 'bahia') {
    const x = lerp(-11, 12, u);
    return (
      <>
        <Sol y={10} /><Mar t={t} color="#2A0E5A" />
        <Skyline semilla={13} z={-110} ancho={170} n={20} />
        <group position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <MotoAcuatica t={t} color="#FF4FA8" /><group position={[0, 0.3, 0.15]}><Perro t={t} /></group><Estela t={t} />
        </group>
        <group position={[x - 4, 0, 0.1]} />
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[x - 1.5 - i * 0.6, 0.12, (rnd(i) - 0.5) * (0.5 + i * 0.25)]} scale={0.5 + i * 0.12}><sphereGeometry args={[0.22, 8, 6]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.55 * (1 - i / 14)} depthWrite={false} /></mesh>)}
        <pointLight position={[x, 3, 4]} color="#FFD0A0" intensity={14} distance={14} />
      </>
    );
  }
  // apto
  return (
    <>
      <Sol /><Suelo color="#1A0E40" /><Skyline semilla={21} z={-70} ancho={140} />
      <group position={[0, 0, -8]} rotation={[0, k === 2 ? 0.0 : 0, 0]}><ArtDeco t={t} /></group>
      <Palmeras t={t} zs={[0, -4, -10, -18]} ancho={7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, -2]}><planeGeometry args={[30, 8]} /><meshStandardMaterial color="#2A1A60" roughness={0.4} metalness={0.3} /></mesh>
    </>
  );
};

export const Escena3D: React.FC<{ t: number; T: Tiempos; tomas: Toma[] }> = ({ t, T, tomas }) => {
  let tm = tomas[0];
  for (const x of tomas) if (t >= x.t0) tm = x;
  const d = DEFS[tm.id][tm.k];
  const u = cl((t - tm.t0) / (tm.t1 - tm.t0));
  const e = 1 - Math.pow(1 - u, 3); // zoom rápido y frenado
  const dir = new THREE.Vector3(...d.l).sub(new THREE.Vector3(...d.p)).normalize();
  const p: V3 = [d.p[0] + dir.x * d.push * e + 0.03 * Math.sin(t * 7), d.p[1] + dir.y * d.push * e + 0.03 * Math.sin(t * 6 + 1), d.p[2] + dir.z * d.push * e];
  const punch = Math.exp(-(t - tm.t0) * 14); // golpe de zoom al cortar
  const wp = latigazo(t, tomas); // latigazo de cámara entre tomas
  const der = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const lw: V3 = [d.l[0] + der.x * wp * 9, d.l[1] + der.y * wp * 9, d.l[2] + der.z * wp * 9];
  p[0] += der.x * wp * 1.2; p[2] += der.z * wp * 1.2;
  const f = d.f * (1 - 0.1 * e) * (1 - 0.07 * punch);
  const [fogC, fogN, fogF] = FOG[d.set];
  let cielo = CIELO[d.set];
  if (d.set === 'noche' && tm.k === 3) cielo = 'alba';
  const pant = d.set === 'pantano';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden' }}>
    <div style={{ width: 1080 * CAL.escala3d, height: 1920 * CAL.escala3d, transform: `scale(${1 / CAL.escala3d})`, transformOrigin: '0 0' }}>
    <ThreeCanvas width={1080 * CAL.escala3d} height={1920 * CAL.escala3d} gl={{ antialias: CAL.antialias, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} camera={{ fov: 55, position: [0, 2, 10], near: 0.1, far: 400 }}>
      <Camara p={p} l={lw} f={f * (1 + 0.12 * Math.abs(wp))} />
      <color attach="background" args={[fogC]} />
      <fog attach="fog" args={[fogC, fogN, fogF]} />
      <ambientLight intensity={pant ? 0.5 : 0.75} color={pant ? '#8AFFA0' : d.set === 'noche' ? '#7A7AFF' : '#E08AFF'} />
      <directionalLight position={[0, 14, -30]} intensity={pant ? 0.6 : 2.2} color={d.set === 'noche' ? '#8AA0FF' : '#FF9A5A'} />
      <directionalLight position={[-8, 6, 10]} intensity={1.1} color={d.set === 'noche' ? '#5A8AFF' : '#FF4FA8'} />
      <Cielo tipo={cielo} t={t} />
      <Mundo d={d} tm={tm} t={t} u={u} T={T} />
    </ThreeCanvas>
    </div>
    </div>
  );
};
