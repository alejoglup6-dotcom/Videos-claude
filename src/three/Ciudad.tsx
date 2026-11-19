// Detalles urbanos originales: aceras con bordillo, farolas con halo, letreros de neón con texto, escaparates con toldo y entorno reflectante.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { lienzo } from './piezas';
import { Modelo } from './Modelo';

export const Acera: React.FC<{ x: number; z: number; largo: number; ancho?: number }> = ({ x, z, largo, ancho = 2.4 }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.09, 0]} receiveShadow><boxGeometry args={[ancho, 0.18, largo]} /><meshStandardMaterial color="#2A2640" roughness={0.9} /></mesh>
    <mesh position={[(x > 0 ? -1 : 1) * (ancho / 2 - 0.05), 0.19, 0]}><boxGeometry args={[0.1, 0.02, largo]} /><meshBasicMaterial color="#6A5AA0" /></mesh>
  </group>
);

const haloTex = () => lienzo('halo_farola', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,230,170,0.95)'); g.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
export const Farola: React.FC<{ x: number; z: number; lado?: 1 | -1; color?: string }> = ({ x, z, lado = 1, color = '#FFE2A0' }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 2.6, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 5.2, 10]} /><meshStandardMaterial color="#14121F" metalness={0.7} roughness={0.4} /></mesh>
    <mesh position={[-lado * 0.55, 5.2, 0]} rotation={[0, 0, lado * 0.08]}><boxGeometry args={[1.2, 0.07, 0.09]} /><meshStandardMaterial color="#14121F" metalness={0.7} roughness={0.4} /></mesh>
    <mesh position={[-lado * 1.05, 5.12, 0]}><boxGeometry args={[0.5, 0.1, 0.22]} /><meshBasicMaterial color={color} /></mesh>
    <sprite position={[-lado * 1.05, 5.0, 0]} scale={[3.2, 3.2, 1]}><spriteMaterial map={haloTex()} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></sprite>
    <mesh position={[-lado * 1.05, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.2, 20]} /><meshBasicMaterial color={color} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
  </group>
);

export const Letrero: React.FC<{ txt: string; color: string; pos: [number, number, number]; rot?: number; w?: number }> = ({ txt, color, pos, rot = 0, w = 3.4 }) => {
  const tx = lienzo(`letrero_${txt}_${color}`, 512, 160, (c) => {
    c.clearRect(0, 0, 512, 160); c.font = 'bold 96px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = color; c.shadowBlur = 28; c.fillStyle = color; c.fillText(txt, 256, 84); c.shadowBlur = 8; c.fillStyle = '#FFFFFF'; c.fillText(txt, 256, 84);
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0, -0.06]}><boxGeometry args={[w + 0.3, w * 0.31 + 0.25, 0.1]} /><meshStandardMaterial color="#0C0A18" roughness={0.6} /></mesh>
      <mesh><planeGeometry args={[w, w * 0.3125]} /><meshBasicMaterial map={tx} transparent toneMapped={false} /></mesh>
    </group>
  );
};

/** Escaparate iluminado con toldo, pegado a la fachada de un edificio (lado = 1 si la fachada mira hacia -x). */
export const Escaparate: React.FC<{ x: number; z: number; ancho?: number; lado: 1 | -1; color: string }> = ({ x, z, ancho = 6, lado, color }) => (
  <group position={[x, 0, z]} rotation={[0, lado === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}>
    <mesh position={[0, 1.5, 0]}><planeGeometry args={[ancho, 2.4]} /><meshBasicMaterial color="#FFE6B8" /></mesh>
    <mesh position={[0, 1.5, 0.02]}><planeGeometry args={[ancho - 0.2, 2.2]} /><meshBasicMaterial color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    {[-1, 0, 1].map((i) => <mesh key={i} position={[i * ancho / 3 + ancho / 6 * 0, 1.5, 0.05]}><boxGeometry args={[0.08, 2.4, 0.06]} /><meshStandardMaterial color="#0C0A18" /></mesh>)}
    <mesh position={[0, 2.95, 0.45]} rotation={[0.55, 0, 0]}><boxGeometry args={[ancho + 0.3, 0.06, 1.1]} /><meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={0.25} /></mesh>
  </group>
);

/** Entorno reflectante (PMREM) hecho con un domo degradado y tiras de neón: da reflejos reales al asfalto mojado, la pintura y el vidrio. Se crea una vez. */
export const Entorno: React.FC<{ intensidad?: number }> = ({ intensidad = 0.55 }) => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const env = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.07,0.05,0.28); vec3 hor = vec3(0.55,0.34,0.62); vec3 bot = vec3(0.02,0.02,0.07); vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.55)) : mix(hor * 0.25, bot, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }' });
    env.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), mat));
    const tira = (c: string, k: number, p: [number, number, number], s: [number, number, number]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(...p); env.add(m); };
    tira('#44E6FF', 6, [-28, 8, -10], [1.2, 14, 1.2]); tira('#FF4FA8', 6, [28, 8, -14], [1.2, 14, 1.2]); tira('#FFE2A0', 5, [0, 16, -30], [18, 1, 1]); tira('#FFFFFF', 3, [0, 40, 0], [10, 0.5, 10]);
    const pm = new THREE.PMREMGenerator(gl); const rt = pm.fromScene(env, 0.02); pm.dispose();
    scene.environment = rt.texture; (scene as any).environmentIntensity = intensidad;
  }, [gl, scene, intensidad]);
  return null;
};

/** Farola de la biblioteca (Streetlight_Single/Double, 1 m de alto → escala 5) con halo y mancha de luz en el suelo. */
export const FarolaLib: React.FC<{ x: number; z: number; modelo?: 'Streetlight_Single' | 'Streetlight_Double'; rot?: number; color?: string }> = ({ x, z, modelo = 'Streetlight_Single', rot = 0, color = '#FFE2A0' }) => (
  <group position={[x, 0, z]}>
    <Modelo archivo={`props/${modelo}.glb`} escala={5} rot={[0, rot, 0]} />
    <sprite position={[0, 5.3, 0]} scale={[3.4, 3.4, 1]}><spriteMaterial map={haloTex()} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></sprite>
    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.4, 20]} /><meshBasicMaterial color={color} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
  </group>
);
