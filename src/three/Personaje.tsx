// Personaje 3D estilizado: malla orgánica con esqueleto (modelos CC0 de Quaternius, ver public/modelos/LICENCIAS.md).
// Los modelos vienen en ropa interior: la ropa se genera por código (color por zona del cuerpo, según los pesos del esqueleto) y se «infla»
// unos centímetros para darle volumen. La pose se calcula por código en cada cuadro (determinista).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as clonarSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile } from 'remotion';

const RUTA = 'modelos/personajes/';
/** Carga con Suspense (useLoader): <ThreeCanvas> de Remotion espera a que termine y recién entonces dibuja el cuadro. */
const useModelos = (archivos: string[]) => useLoader(GLTFLoader, archivos.map((a) => staticFile(RUTA + a))).map((g) => g.scene as THREE.Group);

export type Ropa = { chaqueta: string; pantalon: string; zapatos: string; piel?: string };
type Zona = 'chaqueta' | 'pantalon' | 'zapatos' | 'piel';
const zonaDe = (hueso: string): Zona => {
  if (/^(spine|clavicle|upperarm|lowerarm)/.test(hueso)) return 'chaqueta';
  if (/^(pelvis|thigh|calf)/.test(hueso)) return 'pantalon';
  if (/^(foot|ball)/.test(hueso)) return 'zapatos';
  return 'piel';
};

// material PBR del cuerpo con ropa por zonas (se parte del material original: textura de piel, normales y rugosidad)
const materialConRopa = (orig: THREE.MeshStandardMaterial, ropa: Ropa) => {
  const m = orig.clone(); m.envMapIntensity = 0.8;
  const u = { uJ: { value: new THREE.Color(ropa.chaqueta) }, uP: { value: new THREE.Color(ropa.pantalon) }, uS: { value: new THREE.Color(ropa.zapatos) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aRopa;\nvarying vec3 vRopa;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRopa = aRopa;\ntransformed += objectNormal * (aRopa.x * 0.022 + aRopa.y * 0.014 + aRopa.z * 0.012);');   // volumen de la ropa (metros)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRopa;\nuniform vec3 uJ; uniform vec3 uP; uniform vec3 uS;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.333));
        vec3 telaJ = uJ * (0.82 + 0.35 * lum); vec3 telaP = uP * (0.82 + 0.35 * lum);
        diffuseColor.rgb = mix(diffuseColor.rgb, telaJ, clamp(vRopa.x, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, telaP, clamp(vRopa.y, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, uS, clamp(vRopa.z, 0.0, 1.0));`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, clamp(max(vRopa.x, vRopa.y) * 0.9, 0.0, 0.9)));')   // la tela no marca los músculos
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.88, clamp(max(vRopa.x, vRopa.y), 0.0, 1.0));\nroughnessFactor = mix(roughnessFactor, 0.35, clamp(vRopa.z, 0.0, 1.0));');
  };
  return m;
};

const aplicaZonas = (mesh: THREE.SkinnedMesh) => {
  const g = mesh.geometry; const idx = g.getAttribute('skinIndex'), pes = g.getAttribute('skinWeight'); const bones = mesh.skeleton.bones;
  const zonas = bones.map((b) => zonaDe(b.name)); const a = new Float32Array(idx.count * 3);
  for (let i = 0; i < idx.count; i++) for (let k = 0; k < 4; k++) {
    const w = pes.getComponent(i, k as 0 | 1 | 2 | 3); const z = zonas[idx.getComponent(i, k as 0 | 1 | 2 | 3)];
    if (z === 'chaqueta') a[i * 3] += w; else if (z === 'pantalon') a[i * 3 + 1] += w; else if (z === 'zapatos') a[i * 3 + 2] += w;
  }
  g.setAttribute('aRopa', new THREE.BufferAttribute(a, 3));
};

// ---- pose por código: apunta cada hueso hacia una dirección (en el marco del personaje) ----
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _d = new THREE.Quaternion();
const apunta = (h: THREE.Object3D, hijo: THREE.Object3D, dir: THREE.Vector3) => {
  h.updateWorldMatrix(true, false); hijo.updateWorldMatrix(true, false);
  h.getWorldPosition(_v); hijo.getWorldPosition(_w); _w.sub(_v).normalize();
  _d.setFromUnitVectors(_w, dir.clone().normalize());
  h.getWorldQuaternion(_q); _q.premultiply(_d); (h.parent as THREE.Object3D).getWorldQuaternion(_qp);
  h.quaternion.copy(_qp.invert().multiply(_q)); h.updateWorldMatrix(false, true);
};

export type PosePersonaje = { t: number; paso?: number; brazos?: number; giro?: number };

const Cuerpo: React.FC<{ modelo: THREE.Group; ropa: Ropa; pelos: { modelo: THREE.Group; color: string }[]; pose: PosePersonaje; escala?: number }> = ({ modelo, ropa, pelos, pose, escala = 1 }) => {
  const obj = useMemo(() => {
    const c = clonarSkinned(modelo) as THREE.Group; let cuerpo: THREE.SkinnedMesh | null = null; const huesos: Record<string, THREE.Bone> = {};
    c.traverse((o) => {
      if ((o as THREE.Bone).isBone) huesos[o.name] = o as THREE.Bone;
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) { sm.castShadow = true; sm.frustumCulled = false; if (!cuerpo || sm.geometry.attributes.position.count > (cuerpo as THREE.SkinnedMesh).geometry.attributes.position.count) cuerpo = sm; }   // el cuerpo es la malla con más vértices
    });
    if (cuerpo) { const sm = cuerpo as THREE.SkinnedMesh; aplicaZonas(sm); sm.material = materialConRopa(sm.material as THREE.MeshStandardMaterial, ropa); }
    const reposo: Record<string, THREE.Quaternion> = {}; for (const [n, h] of Object.entries(huesos)) reposo[n] = h.quaternion.clone();
    return { c, huesos, reposo };
  }, [modelo, ropa]);
  const peloObj = useMemo(() => pelos.map((p) => {
    const c = p.modelo.clone(true);
    c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = (m.material as THREE.MeshStandardMaterial).clone(); (m.material as THREE.MeshStandardMaterial).color.set(p.color); (m.material as THREE.MeshStandardMaterial).roughness = 0.7; m.castShadow = true; } });
    return c;
  }), [pelos]);
  // pose del cuadro
  const { huesos: H, reposo } = obj; const t = pose.t; const paso = pose.paso ?? 0; const br = pose.brazos ?? 0;
  for (const [n, h] of Object.entries(H)) h.quaternion.copy(reposo[n]); obj.c.updateMatrixWorld(true);
  const swing = Math.sin(t * 3.2) * 0.35 * paso;
  for (const s of [1, -1]) {
    const L = s === 1 ? 'l' : 'r'; const sx = Math.sign((H['upperarm_' + L].getWorldPosition(new THREE.Vector3())).x) || s;
    apunta(H['upperarm_' + L], H['lowerarm_' + L], new THREE.Vector3(sx * (0.2 + 0.5 * br), -1, 0.1 + s * swing));
    apunta(H['lowerarm_' + L], H['hand_' + L], new THREE.Vector3(sx * (0.12 + 0.3 * br), -0.8, 0.45 - s * swing * 0.6));
    apunta(H['thigh_' + L], H['calf_' + L], new THREE.Vector3(sx * 0.04, -1, -s * swing * 0.5));
    apunta(H['calf_' + L], H['foot_' + L], new THREE.Vector3(0, -1, -s * swing * 0.25));
  }
  const resp = 1 + 0.004 * Math.sin(t * 1.8);
  return <group rotation={[0, pose.giro ?? 0, 0]} scale={escala * resp}><primitive object={obj.c} />{peloObj.map((p, i) => <primitive key={i} object={p} />)}</group>;
};

export const PersonajeA: React.FC<{ genero: 'h' | 'm'; ropa: Ropa; pelo: string; barba?: boolean; pose: PosePersonaje; escala?: number }> = ({ genero, ropa, pelo, barba, pose, escala }) => {
  const arch = genero === 'h' ? ['Superhero_Male_FullBody.gltf', 'Hair_SimpleParted.gltf', 'Hair_Beard.gltf'] : ['Superhero_Female_FullBody.gltf', 'Hair_Long.gltf'];
  const ms = useModelos(arch);
    if (!ms) return null;
  const pelos = genero === 'h' ? [{ modelo: ms[1], color: pelo }, ...(barba ? [{ modelo: ms[2], color: pelo }] : [])] : [{ modelo: ms[1], color: pelo }];
  return <Cuerpo modelo={ms[0]} ropa={ropa} pelos={pelos} pose={pose} escala={escala} />;
};
