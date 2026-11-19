// Hoja de miniaturas de la biblioteca: coloca todos los modelos en una cuadrícula y se renderiza UNA sola imagen (scripts/biblioteca/miniaturas.mjs la recorta).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useModelos } from '../three/Modelo';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type PropsMiniaturas = { modelos: { nombre: string; archivo: string }[]; columnas: number; celda: number; etiquetas: boolean };

const Celda: React.FC<{ g: THREE.Group; x: number; y: number }> = ({ g, x, y }) => {
  const obj = useMemo(() => {
    const c = clone(g); c.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) m.frustumCulled = false; });
    const bb = new THREE.Box3().setFromObject(c); const sz = bb.getSize(new THREE.Vector3()); const ctr = bb.getCenter(new THREE.Vector3());
    const k = 1.8 / Math.max(sz.x, sz.y, sz.z, 1e-3);
    const pivote = new THREE.Group(); c.position.sub(ctr); pivote.add(c); pivote.scale.setScalar(k); return pivote;
  }, [g]);
  return <group position={[x, y, 0]} rotation={[0.3, -0.7, 0]}><primitive object={obj} /></group>;
};
const Todos: React.FC<PropsMiniaturas> = ({ modelos, columnas }) => {
  const gs = useModelos(modelos.map((m) => m.archivo)); if (!gs) return null;
  return <>{gs.map((g, i) => <Celda key={modelos[i].archivo} g={g.scene} x={(i % columnas) * 2 - columnas + 1} y={-(Math.floor(i / columnas) * 2) + Math.ceil(modelos.length / columnas) - 1} />)}</>;
};

export const Miniaturas: React.FC<PropsMiniaturas> = (p) => {
  const filas = Math.ceil(p.modelos.length / p.columnas); const W = p.columnas * p.celda, H = filas * p.celda;
  const dist = 400; const fov = (2 * Math.atan((filas) / dist) * 180) / Math.PI;   // casi ortográfica: todas las celdas se ven igual
  return (
    <AbsoluteFill style={{ background: '#2B2B38' }}>
      <ThreeCanvas width={W} height={H} camera={{ fov, position: [0, 0, dist], near: 1, far: 800 }}>
        <color attach="background" args={['#2B2B38']} />
        <hemisphereLight args={['#FFFFFF', '#6A6A80', 1.6]} />
        <directionalLight position={[3, 6, 8]} intensity={2.6} />
        <directionalLight position={[-6, 2, 4]} intensity={0.9} color="#B0C8FF" />
        <Todos {...p} />
      </ThreeCanvas>
      {p.etiquetas ? p.modelos.map((m, i) => (
        <div key={m.archivo} style={{ position: 'absolute', left: (i % p.columnas) * p.celda, top: Math.floor(i / p.columnas) * p.celda + p.celda - 24, width: p.celda, textAlign: 'center', font: '14px monospace', color: '#fff', textShadow: '0 1px 2px #000' }}>{m.nombre}</div>
      )) : null}
    </AbsoluteFill>
  );
};
