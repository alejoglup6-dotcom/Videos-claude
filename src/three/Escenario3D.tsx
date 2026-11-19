// Un solo lienzo 3D para todo el video: aquí se elige el decorado de cada escena y se mueve la cámara (empuje, golpe de zoom, whip pan, sacudida).
import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { cl } from '../lib/motor';
import { CALIDADES } from '../lib/calidad';
import { CAMARAS } from '../camaras';
import { ESCENAS } from '../scenes';
import { Cielo } from './piezas';
import { Entorno } from './Ciudad';
import type { Calidad, Camara, Guion, Tramo } from '../lib/guion';
import type { Estado } from '../lib/transiciones';

const Rig: React.FC<{ p: [number, number, number]; l: [number, number, number]; f: number }> = ({ p, l, f }) => {
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.set(...p); c.lookAt(...l); c.fov = f; c.updateProjectionMatrix();
  return null;
};

export const resolverCamara = (e: Tramo['escena'], def: string): Camara => {
  const c = e.camara ?? def;
  if (typeof c !== 'string') return c;
  const r = CAMARAS[c]; if (!r) throw new Error(`Cámara «${c}» no existe (hay: ${Object.keys(CAMARAS).join(', ')})`);
  return r;
};

export const Escenario3D: React.FC<{ t: number; tr: Tramo; est: Estado; calidad: Calidad; exposicion: number; datos?: Guion['escenas'][number]['datos'] }> = ({ t, tr, est, calidad, exposicion }) => {
  const e = tr.escena; const def = ESCENAS[e.tipo];
  if (!def) throw new Error(`Escena «${e.id}»: tipo «${e.tipo}» no existe (hay: ${Object.keys(ESCENAS).join(', ')})`);
  if (e.variante && !def.variantes.includes(e.variante)) throw new Error(`Escena «${e.id}»: «${e.tipo}» no tiene variante «${e.variante}» (hay: ${def.variantes.join(', ')})`);
  const k = Math.max(0, def.variantes.indexOf(e.variante ?? ''));
  const u = cl((t - tr.t0) / (tr.t1 - tr.t0)); const dt = t - tr.t0;
  const cam = resolverCamara(e, def.camara);
  const empuje = e.animacion?.empuje ?? cam.empuje;
  const ease = 0.35 * (1 - Math.pow(1 - u, 3)) + 0.65 * u;   // mezcla frenado + avance lineal: la cámara no se queda quieta al final de la escena
  const dir = new THREE.Vector3(...cam.mira).sub(new THREE.Vector3(...cam.pos)).normalize();
  const der = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const shake = (e.animacion?.shake ?? 0) + est.sacude * 0.5;
  const dist = Math.hypot(cam.mira[0] - cam.pos[0], cam.mira[1] - cam.pos[1], cam.mira[2] - cam.pos[2]);
  const deriva = dist * 0.03 * Math.sin(t * 1.1 + tr.i * 1.7); const vuelo = dist * 0.012 * Math.sin(t * 0.9 + 1);   // deriva lateral lenta (siempre en movimiento)
  const p: [number, number, number] = [
    cam.pos[0] + dir.x * empuje * ease + der.x * deriva + shake * 0.06 * Math.sin(t * 13),        // temblor: ~2 Hz y amplitud pequeña (antes ~10 Hz, que a 30 fps se veía a tirones)
    cam.pos[1] + dir.y * empuje * ease + vuelo + shake * 0.06 * Math.sin(t * 17 + 2),
    cam.pos[2] + dir.z * empuje * ease + der.z * deriva];
  const punchPropio = e.animacion?.zoom_punch === false ? 0 : Math.exp(-dt * 14);
  const punch = Math.max(punchPropio, est.punch);
  const w = est.w;
  const l: [number, number, number] = [cam.mira[0] + der.x * w * 9, cam.mira[1] + der.y * w * 9, cam.mira[2] + der.z * w * 9];
  p[0] += der.x * w * 1.2; p[2] += der.z * w * 1.2;
  const fov = cam.fov * (1 - 0.1 * ease) * (1 - 0.07 * punch) * (1 + 0.12 * Math.abs(w));
  const [fc, fn, ff] = e.fondo?.niebla ?? def.niebla; const cielo = e.fondo?.cielo ?? def.cielo(k);
  const C = CALIDADES[calidad]; const s = C.escala3d; const noche = ['noche', 'ocaso', 'alba', 'estudio'].includes(cielo);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden' }}>
      <div style={{ width: 1080 * s, height: 1920 * s, transform: `scale(${1 / s})`, transformOrigin: '0 0' }}>
        <ThreeCanvas shadows="soft" width={1080 * s} height={1920 * s} gl={{ antialias: C.antialias, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposicion }} camera={{ fov: 55, position: [0, 2, 10], near: 0.1, far: 400 }}>
          <Rig p={p} l={l} f={fov} />
          <color attach="background" args={[fc]} />
          <fog attach="fog" args={[fc, fn, ff]} />
          {/* iluminación de cine: ambiente + luz principal con sombras suaves + relleno + dos luces de contorno (rim) de neón */}
          <Entorno intensidad={noche ? 0.22 : 0.2} />
          <ambientLight intensity={def.luz.amb[1] * 0.8} color={def.luz.amb[0]} />
          <directionalLight position={[0, 14, -30]} intensity={def.luz.sol[1]} color={def.luz.sol[0]} />
          <directionalLight position={[-8, 9, 12]} intensity={def.luz.relleno[1]} color={def.luz.relleno[0]} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={50} shadow-bias={-0.0004} shadow-radius={4} />
          {noche ? <><directionalLight position={[-12, 5, -16]} intensity={0.8} color="#FF4FA8" /><directionalLight position={[12, 5, -16]} intensity={0.8} color="#44E6FF" /></> : null}
          <Cielo tipo={cielo} t={t} />
          <def.Componente key={tr.i} t={t} u={u} k={k} datos={e.datos} />
        </ThreeCanvas>
      </div>
    </div>
  );
};
