// Auto estilizado con forma real: carrocería extruida de un perfil lateral con bordes redondeados, cabina de vidrio, ruedas con llantas,
// faros, luces traseras, espejos y pintura con barniz que refleja el entorno. Sin marcas, sin logos, sin placas legibles.
import React, { useMemo } from 'react';
import * as THREE from 'three';

const perfilCarroceria = () => {
  const s = new THREE.Shape();           // (x,y) = (largo, alto); el frente está en +x
  s.moveTo(-2.05, 0.34); s.lineTo(2.0, 0.34);
  s.quadraticCurveTo(2.22, 0.36, 2.22, 0.56); s.quadraticCurveTo(2.2, 0.68, 1.85, 0.72);   // paragolpes y nariz
  s.quadraticCurveTo(1.2, 0.8, 0.72, 0.86);                                                // capó
  s.lineTo(-1.05, 0.86);                                                                    // línea de cintura
  s.quadraticCurveTo(-1.95, 0.86, -2.12, 0.74);                                             // cajuela
  s.quadraticCurveTo(-2.22, 0.62, -2.2, 0.5); s.quadraticCurveTo(-2.18, 0.36, -2.05, 0.34);
  return s;
};
const perfilCabina = () => {
  const s = new THREE.Shape();
  s.moveTo(-1.2, 0.85); s.quadraticCurveTo(-0.95, 1.0, -0.6, 1.04); s.lineTo(0.1, 1.04); s.quadraticCurveTo(0.5, 1.02, 0.85, 0.85); s.lineTo(-1.18, 0.85);
  return s;
};
const extruir = (shape: THREE.Shape, ancho: number, bisel: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth: ancho - bisel * 2, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 4, curveSegments: 14 });
  g.translate(0, 0, -(ancho - bisel * 2) / 2); g.rotateY(-Math.PI / 2);
  // «tumblehome»: la parte alta se estrecha, como en un auto real (los costados no son verticales)
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.55) p.setX(i, p.getX(i) * (1 - Math.min(0.2, (y - 0.55) * 0.34))); }
  g.computeVertexNormals(); return g;   // x(largo) -> +z (frente), profundidad -> x
};

const MAT = {
  llanta: new THREE.MeshStandardMaterial({ color: '#0A0A10', roughness: 0.85 }),
  aro: new THREE.MeshStandardMaterial({ color: '#D5DAE8', metalness: 1, roughness: 0.22 }),
  negro: new THREE.MeshStandardMaterial({ color: '#07070D', roughness: 0.5, metalness: 0.4 }),
  vidrio: new THREE.MeshPhysicalMaterial({ color: '#0B0E22', roughness: 0.04, metalness: 0.9, envMapIntensity: 1.6 }),
};

export const AutoPro: React.FC<{ color?: string; neon?: string }> = ({ color = '#E8EEF8', neon = '#44E6FF' }) => {
  const geo = useMemo(() => ({ cuerpo: extruir(perfilCarroceria(), 1.92, 0.1), cabina: extruir(perfilCabina(), 1.6, 0.06), techo: new THREE.BoxGeometry(1.34, 0.05, 1.05) }), []);
  const pintura = useMemo(() => new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }), [color]);
  const ruedas: [number, number][] = [[-1, 1.35], [1, 1.35], [-1, -1.35], [1, -1.35]];
  return (
    <group>
      <mesh geometry={geo.cuerpo} material={pintura} position={[0, 0, 0]} castShadow />
      <mesh geometry={geo.cabina} material={MAT.vidrio} />
      <mesh geometry={geo.techo} material={pintura} position={[0, 1.065, -0.28]} />
      {[0.1, -0.05].map((z, i) => [-1, 1].map((s) => <mesh key={`${i}${s}`} position={[s * 0.8, 0.98, z - 0.35]} material={pintura}><boxGeometry args={[0.04, 0.26, 0.06]} /></mesh>))}
      {/* parrilla, bajos y alerón discreto */}
      <mesh position={[0, 0.5, 2.19]} material={MAT.negro}><boxGeometry args={[1.0, 0.12, 0.05]} /></mesh>
      <mesh position={[0, 0.3, 0]} material={MAT.negro}><boxGeometry args={[1.8, 0.08, 4.1]} /></mesh>
      <mesh position={[0, 0.95, -2.0]} material={pintura}><boxGeometry args={[1.6, 0.04, 0.34]} /></mesh>
      {/* faros y luces traseras (emisivos) */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.62, 0.62, 2.17]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.46, 0.1, 0.06]} /><meshBasicMaterial color="#FFF6D0" /></mesh>)}
      <mesh position={[0, 0.66, -2.2]}><boxGeometry args={[1.64, 0.06, 0.05]} /><meshBasicMaterial color="#FF2D55" /></mesh>
      {/* espejos */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.96, 0.92, 0.55]} material={pintura}><boxGeometry args={[0.1, 0.1, 0.18]} /></mesh>)}
      {/* ruedas: neumático, llanta con radios y pasarruedas oscuro */}
      {ruedas.map(([s, z], i) => (
        <group key={i} position={[s * 0.84, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={MAT.llanta}><torusGeometry args={[0.26, 0.11, 12, 24]} /></mesh>
          <mesh material={MAT.aro} position={[0, s * -0.0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.14, 18]} /></mesh>
          {[0, 1, 2, 3, 4].map((k) => <mesh key={k} material={MAT.negro} position={[0, s * 0.075, 0]} rotation={[0, (k / 5) * Math.PI * 2, 0]}><boxGeometry args={[0.04, 0.02, 0.38]} /></mesh>)}
          <mesh position={[0, s * 0.02, 0]} rotation={[0, 0, 0]} material={MAT.negro}><cylinderGeometry args={[0.42, 0.42, 0.02, 20]} /></mesh>
        </group>
      ))}
      {/* luz de neón bajo el auto (falsa, sin luces reales: cada luz puntual encarece mucho el render por CPU) */}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.6, 4.9]} /><meshBasicMaterial color={neon} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <mesh position={[0, 0.32, 0]}><boxGeometry args={[1.9, 0.03, 3.3]} /><meshBasicMaterial color={neon} /></mesh>
    </group>
  );
};
