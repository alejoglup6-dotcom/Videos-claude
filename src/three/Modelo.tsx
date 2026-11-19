// Carga y coloca modelos de la biblioteca (public/modelos/). La carga retiene el render de Remotion hasta que el modelo está dibujado.
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile, useDelayRender } from 'remotion';
import { aLite } from './lite';

export const urlModelo = (rel: string) => staticFile('modelos/' + rel);
const cache = new Map<string, Promise<GLTF>>();
const cargar = (rel: string) => { let p = cache.get(rel); if (!p) { p = new GLTFLoader().loadAsync(urlModelo(rel)); cache.set(rel, p); } return p; };
/** Carga modelos SIN Suspense y retiene el render (delayRender) hasta que estén montados y dibujados dos veces.
 *  Con useLoader/Suspense, el render de Remotion (frameloop «never») a veces capturaba el cuadro antes de que el modelo se dibujara. Devuelve null mientras carga. */
export const useModelos = (rels: string[]): GLTF[] | null => {
  const advance = useThree((s) => s.advance); const { delayRender, continueRender } = useDelayRender();
  const [h] = useState(() => delayRender('cargando modelos 3D: ' + rels.join(',')));
  const [m, setM] = useState<GLTF[] | null>(null);
  useEffect(() => { let vivo = true; Promise.all(rels.map(cargar)).then((x) => { if (vivo) setM(x); }).catch((e) => { console.error('Modelo 3D no cargó', e); throw e; }); return () => { vivo = false; }; }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!m) return; advance(performance.now()); let id2 = 0;
    const id = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => { advance(performance.now()); continueRender(h); }); });
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(id2); };
  }, [m]);   // eslint-disable-line react-hooks/exhaustive-deps
  return m;
};

export const Modelo: React.FC<{ archivo: string; pos?: [number, number, number]; rot?: [number, number, number]; escala?: number | [number, number, number]; sombra?: boolean; recibe?: boolean; color?: string; envMap?: number; ocultar?: RegExp; lite?: boolean }> = ({ archivo, pos, rot, escala = 1, sombra = false, recibe = false, color, envMap, ocultar, lite }) => {
  const gs = useModelos([archivo]); const g = gs ? gs[0] : null;
  const obj = useMemo(() => {
    if (!g) return null; const c = clone(g.scene);
    const tinte = color ? new THREE.Color(color) : null; const copias = new Map<THREE.Material, THREE.Material>();
    c.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      m.castShadow = sombra; m.receiveShadow = recibe;
      const nom = (Array.isArray(m.material) ? m.material[0] : m.material).name; if (ocultar && ocultar.test(nom)) { m.visible = false; return; }
      for (const mt of Array.isArray(m.material) ? m.material : [m.material]) { const s = mt as THREE.MeshStandardMaterial; if (s.vertexColors && !(m as THREE.SkinnedMesh).isSkinnedMesh) { s.vertexColors = false; s.needsUpdate = true; } }   // COLOR_0 del kit = máscara de desgaste, no color
      if (tinte || envMap !== undefined) {
        const f = (mat: THREE.Material) => { let n = copias.get(mat); if (!n) { n = mat.clone(); const s = n as THREE.MeshStandardMaterial; if (tinte && /body|paint|car|main/i.test(s.name)) s.color.copy(tinte); if (envMap !== undefined) s.envMapIntensity = envMap; copias.set(mat, n); } return n; };
        m.material = Array.isArray(m.material) ? m.material.map(f) : f(m.material);
      }
    });
    if (lite) aLite(c, ocultar);
    return c;
  }, [g, sombra, recibe, color, envMap, ocultar, lite]);
  return obj ? <primitive object={obj} position={pos} rotation={rot} scale={escala} /> : null;
};
