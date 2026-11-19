import * as THREE from 'three';

const lites = new Map<THREE.Material, THREE.Material>();
/** Edificio «lite»: solo color base (sin normales ni ORM), sombreado Lambert, interiores sin iluminar y sin vidrio translúcido. Un solo programa de shader para todo el edificio. */
export const aLite = (obj: THREE.Object3D, ocultar?: RegExp) => {
  obj.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return; const orig = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    if (/glass/i.test(orig.name) || (ocultar && ocultar.test(orig.name))) { m.visible = false; return; }
    let n = lites.get(orig);
    if (!n) {
      n = /interior(?!wall|floor)/i.test(orig.name) ? new THREE.MeshBasicMaterial({ map: orig.map, color: orig.color }) : new THREE.MeshLambertMaterial({ map: orig.map, color: orig.color });
      lites.set(orig, n);
    }
    m.material = n; m.castShadow = false; m.receiveShadow = false;
  });
  return obj;
};
