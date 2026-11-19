// Convierte OBJ+MTL (colores planos de Blender) a GLB con materiales PBR, para la biblioteca de assets.
// Uso: node scripts/biblioteca/convertir-obj.mjs <entrada.obj> <salida.glb> [rugosidad] [metal]
// Imprime triángulos y peso. Los materiales con nombre Glass/Window/Light se marcan translúcidos/emisivos.
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// el exportador usa FileReader (solo existe en navegadores)
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); } readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:' + (b.type || 'application/octet-stream') + ';base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); } };

const [entrada, salida, rug = '0.55', met = '0.15'] = process.argv.slice(2);
if (!entrada || !salida) { console.error('Uso: convertir-obj.mjs <entrada.obj> <salida.glb> [rugosidad] [metal]'); process.exit(2); }
const mtlRuta = entrada.replace(/\.obj$/i, '.mtl');
const mats = fs.existsSync(mtlRuta) ? new MTLLoader().parse(fs.readFileSync(mtlRuta, 'utf8'), '') : null; mats?.preload();
const loader = new OBJLoader(); if (mats) loader.setMaterials(mats);
const obj = loader.parse(fs.readFileSync(entrada, 'utf8'));
const cache = new Map(); let tris = 0;
const aStandard = (m) => {
  if (cache.has(m.name)) return cache.get(m.name);
  const n = (m.name || '').toLowerCase(); const c = m.color.clone();   // Kd de Blender está en lineal
  const s = new THREE.MeshStandardMaterial({ name: m.name, roughness: Number(rug), metalness: Number(met) });
  s.color.setRGB(c.r, c.g, c.b, THREE.LinearSRGBColorSpace);
  if (/glass|window/.test(n)) { s.roughness = 0.08; s.metalness = 0.85; }
  if (/light|headl|lamp/.test(n)) { s.emissive = s.color.clone(); s.emissiveIntensity = 1.5; }
  if (/tire|wheel|rubber/.test(n)) s.roughness = 0.9;
  if (/bark/.test(n)) s.color.set('#5E4630');            // los árboles originales usan texturas aparte; aquí se pintan por nombre
  if (/leaves/.test(n)) s.color.set(/yellow/.test(n) ? '#C9B23A' : /pine/.test(n) ? '#2E6B3E' : '#4C9A45');
  cache.set(m.name, s); return s;
};
obj.traverse((o) => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(aStandard) : aStandard(o.material); o.geometry.deleteAttribute('uv'); tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
new GLTFExporter().parse(obj, (buf) => { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, Buffer.from(buf)); const bb = new THREE.Box3().setFromObject(obj), sz = bb.getSize(new THREE.Vector3());
  console.log(`${path.basename(salida)}\t${Math.round(tris)} tri\t${(fs.statSync(salida).size / 1024).toFixed(0)} KB\ttam ${sz.x.toFixed(2)}x${sz.y.toFixed(2)}x${sz.z.toFixed(2)}`); },
  (e) => { console.error(e); process.exit(1); }, { binary: true });
