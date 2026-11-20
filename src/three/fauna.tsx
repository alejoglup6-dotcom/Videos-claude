// Fauna y objetos estilizados ORIGINALES hechos con primitivas (la biblioteca CC0 no trae animales): perro, moto de agua, caimán,
// lagartija, vaso desechable y basurero. Materiales compartidos (se crean una vez) y pocas mallas por pieza para no encarecer el render.
import React from 'react';
import * as THREE from 'three';
import { RB } from './piezas';
import { rnd } from '../lib/motor';

const M = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const MAT = {
  pelo: M('#C8863E', { roughness: 0.95 }), peloClaro: M('#E8B070', { roughness: 0.95 }), hocico: M('#F2D2A0'), oreja: M('#7A4A22', { roughness: 1 }),
  negro: new THREE.MeshBasicMaterial({ color: '#0A0A12' }), lentes: M('#0A0A18', { metalness: 0.9, roughness: 0.1 }),
  chaleco: M('#FF7A1A', { roughness: 0.6 }),
  casco: M('#FF4FA8', { roughness: 0.25, metalness: 0.45 }), asiento: M('#14142A', { roughness: 0.5 }), neonC: new THREE.MeshBasicMaterial({ color: '#44E6FF' }),
  espuma: new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.6, depthWrite: false }),
  caiman: M('#3E6B3A', { roughness: 0.7 }), caimanVientre: M('#9AA866'), escama: M('#1E3420', { roughness: 0.9 }), ojo: new THREE.MeshBasicMaterial({ color: '#FFE04A' }),
  dientes: M('#EDE6C8'),
  lagarto: M('#3FBF6A', { roughness: 0.6 }), lagartoOsc: M('#1F7A44'),
  iguana: M('#6E9A4A', { roughness: 0.7 }), iguanaOsc: M('#3E5A2A', { roughness: 0.8 }), papada: M('#C9A24A', { roughness: 0.7 }), espina: M('#2E4422'),
  vaso: M('#F4F1EA', { roughness: 0.5 }), tapa: M('#FF4FA8', { roughness: 0.4 }), popote: M('#44E6FF', { roughness: 0.3 }),
  bote: M('#2A3550', { roughness: 0.55, metalness: 0.4 }), boteTapa: M('#1C2438', { roughness: 0.5, metalness: 0.5 }), boteNeon: new THREE.MeshBasicMaterial({ color: '#25C98B' }),
};

/** Perro estilizado (sentado o de pie), con chaleco salvavidas opcional. Mira hacia +z. */
export const Perro: React.FC<{ t: number; sentado?: boolean; chaleco?: boolean }> = ({ t, sentado, chaleco }) => (
  <group>
    <mesh position={[0, sentado ? 0.45 : 0.5, sentado ? -0.05 : 0]} rotation={[sentado ? -0.5 : 0, 0, 0]} material={MAT.pelo}><RB a={[0.48, 0.44, 0.82]} r={0.16} /></mesh>
    {chaleco ? <mesh position={[0, sentado ? 0.5 : 0.55, sentado ? -0.02 : 0.02]} rotation={[sentado ? -0.5 : 0, 0, 0]} material={MAT.chaleco}><RB a={[0.54, 0.36, 0.5]} r={0.12} /></mesh> : null}
    <group position={[0, sentado ? 0.98 : 0.9, sentado ? 0.22 : 0.4]} rotation={[0.06 * Math.sin(t * 5), 0.15 * Math.sin(t * 1.3), 0]}>
      <mesh material={MAT.peloClaro}><RB a={[0.4, 0.38, 0.42]} r={0.14} /></mesh>
      <mesh position={[0, -0.08, 0.26]} material={MAT.hocico}><RB a={[0.22, 0.17, 0.22]} r={0.07} /></mesh>
      <mesh position={[0, -0.02, 0.38]} material={MAT.negro}><sphereGeometry args={[0.045, 8, 8]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.24, 0.0, -0.02]} rotation={[0, 0, s * (0.5 + 0.3 * Math.sin(t * 9 + s))]} material={MAT.oreja}><RB a={[0.1, 0.3, 0.14]} r={0.04} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, 0.07, 0.22]} material={MAT.lentes}><RB a={[0.14, 0.1, 0.03]} r={0.02} /></mesh>)}
      <mesh position={[0, -0.18, 0.3]} rotation={[0.4, 0, 0]} material={MAT.tapa}><boxGeometry args={[0.08, 0.02, 0.1]} /></mesh>
    </group>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 0.15, sentado ? 0.2 : 0.18, sentado ? 0.28 : 0.3]} material={MAT.pelo}><RB a={[0.11, 0.36, 0.12]} r={0.04} /></mesh>)}
    <mesh position={[0, sentado ? 0.3 : 0.55, sentado ? -0.5 : -0.48]} rotation={[0.9 + 0.5 * Math.sin(t * 12), 0, 0]} material={MAT.pelo}><RB a={[0.09, 0.4, 0.09]} r={0.04} /></mesh>
  </group>
);

/** Moto de agua estilizada (sin marcas). Mira hacia +z. */
export const MotoAcuatica: React.FC<{ t: number }> = ({ t }) => (
  <group rotation={[0.05 * Math.sin(t * 6), 0, 0.04 * Math.sin(t * 4)]}>
    <mesh position={[0, 0.25, 0]} material={MAT.casco}><RB a={[0.9, 0.5, 2.7]} r={0.22} /></mesh>
    <mesh position={[0, 0.42, 1.1]} rotation={[0.35, 0, 0]} material={MAT.casco}><RB a={[0.7, 0.3, 0.7]} r={0.14} /></mesh>
    <mesh position={[0, 0.6, -0.15]} material={MAT.asiento}><RB a={[0.55, 0.2, 1.3]} r={0.1} /></mesh>
    <mesh position={[0, 0.82, 0.85]} material={MAT.asiento}><boxGeometry args={[0.75, 0.05, 0.06]} /></mesh>
    <mesh position={[0, 0.5, 1.2]} material={MAT.neonC}><boxGeometry args={[0.92, 0.04, 0.5]} /></mesh>
  </group>
);

/** Estela de espuma detrás de la moto: UNA malla instanciada. */
export const Estela: React.FC<{ t: number; n?: number }> = ({ t, n = 18 }) => {
  const ref = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const im = ref.current; if (!im) return; const m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const u = (t * 1.4 + i / n) % 1; p.set((rnd(i) - 0.5) * (0.6 + u * 1.8), 0.06, -1.5 - u * 5); s.setScalar(0.5 + u * 1.8); m.compose(p, q, s); im.setMatrixAt(i, m); }
    im.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, MAT.espuma, n]} frustumCulled={false}><sphereGeometry args={[0.2, 8, 6]} /></instancedMesh>;
};

/** Caimán estilizado, semisumergido. Mira hacia +z. `boca` 0-1 abre la mandíbula. Ojos brillantes (sin luces reales). */
export const Caiman: React.FC<{ t: number; boca?: number }> = ({ t, boca = 0 }) => {
  const ond = (i: number) => 0.12 * Math.sin(t * 3 - i * 0.7);
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[ond(i), 0.12 - i * 0.015, -i * 0.75]} scale={[1 - i * 0.16, 1 - i * 0.12, 1]} material={MAT.caiman}><RB a={[0.9, 0.36, 0.9]} r={0.16} /></mesh>)}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <mesh key={'e' + i} position={[ond(i * 0.6), 0.34 - i * 0.02, 0.1 - i * 0.55]} rotation={[0, 0, Math.PI / 4]} material={MAT.escama}><boxGeometry args={[0.1, 0.1, 0.22]} /></mesh>)}
      <group position={[0, 0.14, 0.55]}>
        <mesh position={[0, 0.06, 0.45]} rotation={[-boca * 0.5, 0, 0]} material={MAT.caiman}><RB a={[0.5, 0.16, 1.0]} r={0.07} /></mesh>
        <mesh position={[0, -0.08, 0.45]} rotation={[boca * 0.3, 0, 0]} material={MAT.caimanVientre}><RB a={[0.46, 0.12, 0.95]} r={0.06} /></mesh>
        {boca > 0.05 ? [-1, 1].map((s) => <mesh key={s} position={[s * 0.2, 0, 0.6]} material={MAT.dientes}><boxGeometry args={[0.04, 0.08, 0.6]} /></mesh>) : null}
        {[-1, 1].map((s) => <group key={s} position={[s * 0.18, 0.2, 0.05]}><mesh material={MAT.caiman}><sphereGeometry args={[0.1, 10, 8]} /></mesh><mesh position={[0, 0.02, 0.07]} material={MAT.ojo}><sphereGeometry args={[0.055, 10, 8]} /></mesh><mesh position={[0, 0.02, 0.115]} material={MAT.negro}><boxGeometry args={[0.012, 0.07, 0.01]} /></mesh></group>)}
      </group>
      {[-1, 1].map((s) => [0.2, -1.4].map((z, j) => <mesh key={s + '_' + j} position={[s * 0.5, -0.05, z]} rotation={[0, 0, s * 0.6 + 0.2 * Math.sin(t * 4 + j)]} material={MAT.caiman}><RB a={[0.4, 0.14, 0.22]} r={0.06} /></mesh>))}
    </group>
  );
};

/** Lagartija estilizada que camina. Mira hacia +z (sobre el plano XZ; para una pared, rotar el grupo). */
export const Lagartija: React.FC<{ t: number; esc?: number }> = ({ t, esc = 1 }) => (
  <group scale={esc}>
    {[0, 1, 2].map((i) => <mesh key={i} position={[0.03 * Math.sin(t * 10 - i), 0.05, 0.1 - i * 0.14]} material={MAT.lagarto}><RB a={[0.13 - i * 0.02, 0.07, 0.16]} r={0.03} /></mesh>)}
    <mesh position={[0, 0.06, 0.24]} rotation={[0, 0.2 * Math.sin(t * 3), 0]} material={MAT.lagarto}><RB a={[0.1, 0.07, 0.14]} r={0.03} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 0.035, 0.09, 0.28]} material={MAT.negro}><sphereGeometry args={[0.012, 6, 6]} /></mesh>)}
    {[0, 1, 2, 3].map((i) => <mesh key={'c' + i} position={[0.04 * Math.sin(t * 10 - 2 - i * 0.8), 0.04, -0.3 - i * 0.12]} material={MAT.lagartoOsc}><boxGeometry args={[0.05 - i * 0.008, 0.035, 0.13]} /></mesh>)}
    {[-1, 1].map((s) => [0.15, -0.15].map((z, j) => <mesh key={s + '_' + j} position={[s * 0.1, 0.02, z]} rotation={[0, s * (0.6 + 0.5 * Math.sin(t * 10 + j * Math.PI + (s > 0 ? Math.PI : 0))), 0]} material={MAT.lagartoOsc}><boxGeometry args={[0.12, 0.025, 0.035]} /></mesh>))}
  </group>
);

/** Vaso desechable genérico con tapa y popote (sin logos). */
export const Vaso: React.FC = () => (
  <group>
    <mesh position={[0, 0.11, 0]} material={MAT.vaso}><cylinderGeometry args={[0.055, 0.04, 0.22, 14]} /></mesh>
    <mesh position={[0, 0.225, 0]} material={MAT.tapa}><cylinderGeometry args={[0.06, 0.058, 0.02, 14]} /></mesh>
    <mesh position={[0.015, 0.3, 0]} rotation={[0, 0, -0.15]} material={MAT.popote}><cylinderGeometry args={[0.007, 0.007, 0.16, 6]} /></mesh>
  </group>
);

/** Basurero urbano genérico con franja de neón. */
export const Basurero: React.FC = () => (
  <group>
    <mesh position={[0, 0.48, 0]} material={MAT.bote}><cylinderGeometry args={[0.3, 0.26, 0.96, 18, 1, true]} /></mesh>
    <mesh position={[0, 0.02, 0]} material={MAT.bote}><cylinderGeometry args={[0.26, 0.26, 0.04, 18]} /></mesh>
    <mesh position={[0, 0.97, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.boteTapa}><ringGeometry args={[0.18, 0.31, 18]} /></mesh>
    <mesh position={[0, 0.55, 0]} material={MAT.boteNeon}><cylinderGeometry args={[0.305, 0.3, 0.05, 18, 1, true]} /></mesh>
  </group>
);

/** Iguana verde estilizada (las iguanas verdes aparecen en material oficial de los Cayos de Leonida). Mira hacia +z; mide ~1 m con la cola. */
export const Iguana: React.FC<{ t: number }> = ({ t }) => {
  const resp = 0.01 * Math.sin(t * 2.2);
  return (
    <group>
      {/* cuerpo alargado y bajo, en tres tramos */}
      {[0, 1, 2].map((i) => <mesh key={i} position={[0.02 * Math.sin(t * 1.8 - i), 0.11 + resp, 0.16 - i * 0.16]} material={MAT.iguana}><RB a={[0.17 - i * 0.02, 0.12 - i * 0.01, 0.2]} r={0.05} /></mesh>)}
      <group position={[0, 0.15, 0.36]} rotation={[0.12 + 0.08 * Math.sin(t * 1.5), 0.3 * Math.sin(t * 0.9), 0]}>
        <mesh material={MAT.iguana}><RB a={[0.1, 0.09, 0.16]} r={0.04} /></mesh>
        <mesh position={[0, -0.01, 0.1]} material={MAT.iguana}><RB a={[0.07, 0.06, 0.09]} r={0.025} /></mesh>
        <mesh position={[0, -0.08, 0.02]} material={MAT.papada}><boxGeometry args={[0.015, 0.08, 0.1]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.048, 0.02, 0.03]} material={MAT.negro}><sphereGeometry args={[0.013, 8, 6]} /></mesh>)}
      </group>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, 0.2 - i * 0.008, 0.36 - i * 0.07]} material={MAT.espina}><coneGeometry args={[0.012, 0.06 - i * 0.004, 4]} /></mesh>)}
      {/* cola larga con anillos oscuros */}
      {Array.from({ length: 9 }, (_, i) => <mesh key={'c' + i} position={[0.05 * Math.sin(t * 2 - i * 0.6), 0.08 - i * 0.005, -0.32 - i * 0.1]} material={i % 2 ? MAT.iguanaOsc : MAT.iguana}><boxGeometry args={[0.07 - i * 0.006, 0.05 - i * 0.004, 0.11]} /></mesh>)}
      {[-1, 1].map((s) => [0.18, -0.16].map((z, j) => <mesh key={s + '_' + j} position={[s * 0.12, 0.05, z]} rotation={[0, s * 0.4, s * 0.6]} material={MAT.iguanaOsc}><boxGeometry args={[0.11, 0.03, 0.04]} /></mesh>))}
    </group>
  );
};
