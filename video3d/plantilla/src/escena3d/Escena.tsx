// Escena 3D: cámara por tomas (zoom + latigazo) sobre los decorados de decorados.tsx. Las tomas salen de video.config.json (ver config.ts).
import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { cl } from '../motor';
import { CAL } from '../calidad';
import { latigazo } from '../lib/transiciones';
import { Cielo } from './Piezas';
import { DECORADOS } from './decorados';
import type { Tiempos, Toma, V3 } from '../config';
export type { Tiempos, Toma };

const Camara: React.FC<{ p: V3; l: V3; f: number }> = ({ p, l, f }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...p); c.lookAt(...l); c.fov = f; c.updateProjectionMatrix();
  return null;
};

export const Escena3D: React.FC<{ t: number; T: Tiempos; tomas: Toma[] }> = ({ t, T, tomas }) => {
  let tm = tomas[0];
  for (const x of tomas) if (t >= x.t0) tm = x;
  const d = tm.def;
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
  const dec = DECORADOS[d.set];
  if (!dec) throw new Error(`Decorado «${d.set}» no existe (hay: ${Object.keys(DECORADOS).join(', ')})`);
  if (tm.variante && !dec.variantes.includes(tm.variante)) throw new Error(`Decorado «${d.set}» no tiene la variante «${tm.variante}» (hay: ${dec.variantes.join(', ') || 'ninguna'})`);
  const kv = Math.max(0, dec.variantes.indexOf(tm.variante ?? ''));
  const [fogC, fogN, fogF] = dec.niebla;
  const cielo = dec.cielo(kv);
  const pant = d.set === 'pantano';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden' }}>
    <div style={{ width: 1080 * CAL.escala3d, height: 1920 * CAL.escala3d, transform: `scale(${1 / CAL.escala3d})`, transformOrigin: '0 0' }}>
    <ThreeCanvas width={1080 * CAL.escala3d} height={1920 * CAL.escala3d} gl={{ antialias: CAL.antialias, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} camera={{ fov: 55, position: [0, 2, 10], near: 0.1, far: 400 }}>
      <Camara p={p} l={lw} f={f * (1 + 0.12 * Math.abs(wp))} />
      <color attach="background" args={[fogC]} />
      <fog attach="fog" args={[fogC, fogN, fogF]} />
      <ambientLight intensity={dec.luz ? dec.luz.amb[1] : pant ? 0.5 : 0.75} color={dec.luz ? dec.luz.amb[0] : pant ? '#8AFFA0' : d.set === 'noche' ? '#7A7AFF' : '#E08AFF'} />
      <directionalLight position={[0, 14, -30]} intensity={dec.luz ? dec.luz.sol[1] : pant ? 0.6 : 2.2} color={dec.luz ? dec.luz.sol[0] : d.set === 'noche' ? '#8AA0FF' : '#FF9A5A'} />
      <directionalLight position={[-8, 6, 10]} intensity={dec.luz ? dec.luz.relleno[1] : 1.1} color={dec.luz ? dec.luz.relleno[0] : d.set === 'noche' ? '#5A8AFF' : '#FF4FA8'} />
      <Cielo tipo={cielo} t={t} />
      <dec.Mundo t={t} u={u} k={kv} datos={tm.datos} />
    </ThreeCanvas>
    </div>
    </div>
  );
};
