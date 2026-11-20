import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { RB, lienzo } from '../three/piezas';
import { ease, mod, Brillo, Plano } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { Auto } from '../three/Vehiculos';
import { PersonajeA } from '../three/Personaje';
import type { Ropa } from '../three/Personaje';

// Escenas del reel del OVNI (bosque nocturno, carro con señales, nave con haz de luz, trofeo). Piezas propias y originales; el carro y el personaje son de la biblioteca.
const ROPA: Ropa = { chaqueta: '#2E7D5B', pantalon: '#1A1A24', zapatos: '#E9E9EF' };
const m = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5, ...o });
const MT = { disco: m('#9AA6C8', { metalness: 0.85, roughness: 0.25 }), cupula: m('#7FEFFF', { metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.7 }), luz: [new THREE.MeshBasicMaterial({ color: '#3DF5A0' }), new THREE.MeshBasicMaterial({ color: '#FF4FA8' }), new THREE.MeshBasicMaterial({ color: '#44E6FF' })],
  haz: new THREE.MeshBasicMaterial({ color: '#9CFFD0', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  tronco: new THREE.MeshLambertMaterial({ color: '#1B1A1A' }), copa: new THREE.MeshLambertMaterial({ color: '#0F3A2E' }), oro: m('#FFB02E', { metalness: 0.8, roughness: 0.3 }), oroOsc: m('#B87810'), tapa: m('#2A2E40'), ropa: new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), estrella: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }) };
const G = { esfera: new THREE.SphereGeometry(1, 20, 12), cil: new THREE.CylinderGeometry(1, 1, 1, 18), haz: new THREE.CylinderGeometry(0.5, 2.6, 1, 24, 1, true), tr: new THREE.CylinderGeometry(0.12, 0.2, 3.2, 6), cop: new THREE.ConeGeometry(1.0, 3.4, 7), caja: new THREE.BoxGeometry(1, 1, 1), luz: new THREE.SphereGeometry(0.1, 8, 6), pl: new THREE.PlaneGeometry(1, 1) };

const Nave: React.FC<{ t: number; pos: [number, number, number]; esc?: number; haz?: number; alto?: number }> = ({ t, pos, esc = 1, haz = 1, alto = 8 }) => (
  <group position={[pos[0], pos[1] + 0.15 * Math.sin(t * 1.6), pos[2]]} scale={esc}>
    <mesh scale={[2.6, 0.45, 2.6]} geometry={G.esfera} material={MT.disco} />
    <mesh position={[0, 0.3, 0]} scale={[1.1, 0.8, 1.1]} geometry={G.esfera} material={MT.cupula} />
    {Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + t * 1.2; return <mesh key={i} position={[Math.cos(a) * 2.2, -0.08, Math.sin(a) * 2.2]} geometry={G.luz} material={MT.luz[i % 3]} />; })}
    <Brillo pos={[0, -0.2, 0]} esc={9} color="#9CFFD0" op={0.45 * haz} />
    {haz > 0 ? <mesh position={[0, -alto / 2, 0]} scale={[1, alto, 1]} geometry={G.haz}><meshBasicMaterial color="#9CFFD0" transparent opacity={0.2 * haz * (0.85 + 0.15 * Math.sin(t * 7))} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh> : null}
  </group>
);
const N_ESTR = 90; const Estrellas: React.FC<{ t: number }> = ({ t }) => { const r = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(); for (let i = 0; i < N_ESTR; i++) { s.setScalar(0.08 + 0.1 * rnd(i + 3) * (0.7 + 0.3 * Math.sin(t * 2 + i))); p.set((rnd(i * 2) - 0.5) * 80, 4 + rnd(i * 2 + 1) * 28, -60); mm.compose(p, q, s); im.setMatrixAt(i, mm); } im.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={r} args={[G.esfera, MT.estrella, N_ESTR]} frustumCulled={false} />; };
const N_ARB = 44; const Bosque: React.FC<{ t: number; vel?: number; hueco?: number }> = ({ t, vel = 0, hueco = 3 }) => { const a = React.useRef<THREE.InstancedMesh>(null), b = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < N_ARB; i++) { const lado = i % 2 ? 1 : -1; const x = lado * (hueco + rnd(i * 3 + 1) * 14); const z = vel ? mod(-rnd(i * 3 + 2) * 80 + t * vel, 90) - 80 : -rnd(i * 3 + 2) * 70 - 2; const h = 0.8 + rnd(i * 3 + 3) * 1.1;
      s.set(1, h, 1); p.set(x, 1.6 * h, z); mm.compose(p, q, s); a.current?.setMatrixAt(i, mm); s.set(1.1, h, 1.1); p.set(x, 3.2 * h + 1.2, z); mm.compose(p, q, s); b.current?.setMatrixAt(i, mm); }
    if (a.current) a.current.instanceMatrix.needsUpdate = true; if (b.current) b.current.instanceMatrix.needsUpdate = true; });
  return <><instancedMesh ref={a} args={[G.tr, MT.tronco, N_ARB]} frustumCulled={false} /><instancedMesh ref={b} args={[G.cop, MT.copa, N_ARB]} frustumCulled={false} /></>; };
const COL = ['#FF4FA8', '#44E6FF', '#FFE45C', '#F2EEE6', '#B07CFF', '#FF8A3A', '#3DF5A0']; const N_ROPA = 9;
const Ropas: React.FC<{ a: [number, number]; b: [number, number] }> = ({ a, b }) => { const r = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < N_ROPA; i++) { const f = (i + 0.5) / N_ROPA; q.setFromEuler(new THREE.Euler(0, rnd(i) * 6, 0)); s.set(0.5 + 0.3 * rnd(i + 2), 0.04, 0.35 + 0.2 * rnd(i + 5)); p.set(lerp(a[0], b[0], f) + (rnd(i + 8) - 0.5) * 0.8, 0.03, lerp(a[1], b[1], f) + (rnd(i + 11) - 0.5) * 0.8); mm.compose(p, q, s); im.setMatrixAt(i, mm); im.setColorAt(i, c.set(COL[i % 7])); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  return <instancedMesh ref={r} args={[G.caja, MT.ropa, N_ROPA]} frustumCulled={false} />; };
/** Carro estacionado con balizas parpadeando y el maletero abierto (de la biblioteca + tapa abierta falsa). */
const Carro: React.FC<{ t: number }> = ({ t }) => { const on = Math.sin(t * 7) > 0;
  return (
    <group position={[0, 0, -6]} rotation={[0, Math.PI * 0.86, 0]}>
      <Auto modelo="NormalCar2" neon="#FFB02E" />
      <mesh position={[0, 1.18, -2.0]} rotation={[-1.25, 0, 0]} scale={[1.45, 0.06, 0.95]} geometry={G.caja} material={MT.tapa} />
      <mesh position={[0, 0.95, -1.75]} scale={[1.3, 0.05, 0.6]} geometry={G.caja} material={m('#0A0A12')} />
      {on ? [[-0.75, 0.7, 2.1], [0.75, 0.7, 2.1], [-0.75, 0.75, -2.15], [0.75, 0.75, -2.15]].map((p, i) => <Brillo key={i} pos={p as [number, number, number]} esc={2.4} color="#FFB02E" op={0.9} />) : null}
    </group>
  ); };
const tiempoPanel = () => lienzo('ovni_reloj', 640, 256, (c) => { c.fillStyle = 'rgba(8,10,34,0.94)'; c.beginPath(); c.roundRect(6, 6, 628, 244, 40); c.fill(); c.lineWidth = 8; c.strokeStyle = '#44E6FF'; c.stroke(); c.font = 'bold 150px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#44E6FF'; c.shadowBlur = 30; c.fillStyle = '#FFFFFF'; c.fillText('2:00', 230, 128); c.font = 'bold 76px Arial, sans-serif'; c.fillText('A. M.', 500, 150); });

export const Ovni: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u); const base = (<>
    <mesh position={[0, 6, -70]} scale={[160, 60, 1]} geometry={G.pl}><meshBasicMaterial color="#04061A" /></mesh>
    <Estrellas t={t} />
    <mesh position={[-14, 17, -58]} scale={4.5} geometry={G.esfera}><meshBasicMaterial color="#EAF0FF" /></mesh><Brillo pos={[-14, 17, -57]} esc={30} color="#8AA0FF" op={0.35} />
    <Plano pos={[0, 0, -30]} tam={[160, 120]} color="#08121A" rough={0.95} />
  </>);
  if (k === 1) return (<>{base}
    <group position={[0, 2.6, 0]}><mesh scale={[6, 2.4, 1]} geometry={G.pl}><meshBasicMaterial map={tiempoPanel()} transparent toneMapped={false} /></mesh><Brillo pos={[0, 0, -0.3]} esc={[12, 6, 1]} color="#44E6FF" op={0.3 + 0.1 * Math.sin(t * 2)} /></group>
    <Nave t={t} pos={[7, 9, -30]} esc={0.9} haz={0} /><Bosque t={t} />
  </>);
  if (k === 2) return (<>{base}<Bosque t={t} hueco={9} />
    <Carro t={t} /><Ropas a={[1.8, -4]} b={[7, -12]} />
    <Brillo pos={[0, 1, -6]} esc={[9, 4, 1]} color="#FFB02E" op={0.18} />
  </>);
  if (k === 3) return (<>{base}<Bosque t={t} vel={2.2} hueco={3.2} />
    <Ropas a={[0.4, 4]} b={[1.8, -22]} /><Nave t={t} pos={[2.6, 7.5, -38]} esc={1.8} haz={1} alto={8} />
    <Brillo pos={[2.6, 2, -38]} esc={[10, 8, 1]} color="#9CFFD0" op={0.3} />
  </>);
  if (k === 4) { const y = 5.5 * ease(u * 1.1); const flash = cl((u - 0.82) / 0.18);
    return (<>{base}<Bosque t={t} hueco={9} /><Carro t={t} />
      <Nave t={t} pos={[2.2, 11, -6]} esc={1.5} haz={1} alto={11} />
      <group position={[2.2, y, -6]} rotation={[0, t * 0.9, 0.15 * Math.sin(t * 2)]}><PersonajeA genero="m" ropa={ROPA} pelo="#4A2A1A" pose={{ t, paso: 0, brazos: 0.7, giro: 0 }} /></group>
      {flash > 0 ? <mesh position={[0, 3, 4]} scale={[40, 40, 1]} geometry={G.pl}><meshBasicMaterial color="#FFFFFF" transparent opacity={flash} depthWrite={false} /></mesh> : null}
    </>); }
  if (k === 5) return (<>{base}
    <Brillo pos={[0, 5, -3]} esc={[8, 14, 1]} color="#9CFFD0" op={0.25} />
    <group position={[0, 1.6, 0]} rotation={[0, t * 0.9, 0]} scale={1.4 * (0.6 + 0.4 * e)}>
      <mesh position={[0, 0.3, 0]} scale={[0.55, 0.75, 0.55]} geometry={G.cil} material={MT.oro} /><mesh position={[0, -0.25, 0]} scale={[0.15, 0.4, 0.15]} geometry={G.cil} material={MT.oroOsc} /><mesh position={[0, -0.55, 0]} scale={[0.6, 0.15, 0.4]} geometry={G.caja} material={MT.oroOsc} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.62, 0.35, 0]} material={MT.oro}><torusGeometry args={[0.25, 0.07, 8, 16]} /></mesh>)}
    </group>
    <Brillo pos={[0, 2.2, 0.6]} esc={7} color="#FFB02E" op={0.5 + 0.1 * Math.sin(t * 3)} />
  </>);
  // k=0: cielo con la nave sobre el bosque
  return (<>{base}<Bosque t={t} hueco={2.5} /><Nave t={t} pos={[0, 9 - 1.2 * u, -26]} esc={2.1} haz={1} alto={9} /><Brillo pos={[0, 1, -26]} esc={[10, 6, 1]} color="#9CFFD0" op={0.35} /></>);
};
