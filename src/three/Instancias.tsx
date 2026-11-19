// Objetos repetidos con UNA sola llamada de dibujo por malla (InstancedMesh) y versión «lite» de edificios (materiales baratos).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useModelos } from './Modelo';

export type Colocacion = { pos: [number, number, number]; rot?: number; escala?: number };

/** Dibuja `colocaciones.length` copias de un modelo: cada malla del modelo se vuelve un InstancedMesh (misma geometría y material). */
export const Instancias: React.FC<{ archivo: string; colocaciones: Colocacion[] }> = ({ archivo, colocaciones }) => {
  const gs = useModelos([archivo]); const g = gs ? gs[0] : null;
  const grupo = useMemo(() => {
    if (!g) return null; const raiz = new THREE.Group(); g.scene.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), inst = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const im = new THREE.InstancedMesh(m.geometry, m.material, colocaciones.length);
      colocaciones.forEach((c, i) => { e.set(0, c.rot ?? 0, 0); q.setFromEuler(e); v.set(...c.pos); s.setScalar(c.escala ?? 1); inst.compose(v, q, s); m4.multiplyMatrices(inst, m.matrixWorld); im.setMatrixAt(i, m4); });
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; raiz.add(im);
    });
    return raiz;
  }, [g, colocaciones]);
  return grupo ? <primitive object={grupo} /> : null;
};

