import React from 'react';
import * as THREE from 'three';
import { rnd } from '../lib/motor';
import { Skyline } from '../three/piezas';
import { mod, Brillo, Plano, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { Lancha, Estela } from '../three/fauna';

// Pantanos de Grassrivers (versión estilizada y ORIGINAL): agua oscura, manglares instanciados que pasan a toda velocidad, niebla y luces de neón entre la bruma.
const N = 26; const TR = new THREE.CylinderGeometry(0.12, 0.2, 3.6, 6); const COP = new THREE.ConeGeometry(1.1, 1.8, 7);
const MT = new THREE.MeshLambertMaterial({ color: '#1E2A22' }); const MC = new THREE.MeshLambertMaterial({ color: '#1F5B45' });
const Manglares: React.FC<{ t: number }> = ({ t }) => {
  const a = React.useRef<THREE.InstancedMesh>(null); const b = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const lado = i % 2 ? 1 : -1; const x = lado * (3.6 + rnd(i * 3 + 1) * 7); const z = mod(-rnd(i * 3 + 2) * 70 + t * 14, 80) - 70; const h = 0.8 + rnd(i * 3 + 3) * 0.9;
      s.set(1, h, 1); p.set(x, 1.8 * h, z); m.compose(p, q, s); a.current?.setMatrixAt(i, m);
      s.set(1.2, h, 1.2); p.set(x, 3.6 * h + 0.6, z); m.compose(p, q, s); b.current?.setMatrixAt(i, m);
    }
    if (a.current) a.current.instanceMatrix.needsUpdate = true; if (b.current) b.current.instanceMatrix.needsUpdate = true;
  });
  return <><instancedMesh ref={a} args={[TR, MT, N]} frustumCulled={false} /><instancedMesh ref={b} args={[COP, MC, N]} frustumCulled={false} /></>;
};
export const PantanoLancha: React.FC<PropsEscena> = ({ t }) => (
  <>
    <Plano pos={[0, 0, -40]} tam={[200, 200]} color="#06242A" metal={0.7} rough={0.15} />
    {[-6, 5].map((x, i) => <Reflejo key={i} x={x} z={-40} largo={90} color={i ? '#FF4FA8' : '#44E6FF'} ancho={1.6} op={0.16} />)}
    <Skyline semilla={5} z={-96} ancho={140} n={18} alto={30} />
    <Manglares t={t} />
    {[[-6, -14, '#44E6FF'], [7, -26, '#FF4FA8'], [-8, -40, '#FFB02E'], [6, -52, '#44E6FF']].map((l, i) => <Brillo key={i} pos={[l[0] as number, 1.6, l[1] as number]} esc={4.2} color={l[2] as string} op={0.55} />)}
    <mesh position={[0, 6, -50]}><planeGeometry args={[120, 14]} /><meshBasicMaterial color="#0E3A3E" transparent opacity={0.3} depthWrite={false} /></mesh>
    <group position={[0.5 * Math.sin(t * 1.2), 0.05 + 0.04 * Math.sin(t * 6), 0]} rotation={[0, 0.35 + 0.18 * Math.sin(t * 1.2), 0]}>
      <Lancha t={t} /><Estela t={t} n={22} />
    </group>
    <Lluvia t={t} n={40} x={[-10, 10]} z={[-30, 6]} alto={14} vel={22} />
  </>
);
