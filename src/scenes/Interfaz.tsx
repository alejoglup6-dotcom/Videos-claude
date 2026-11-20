import React from 'react';
import * as THREE from 'three';
import { cl, lerp, rnd } from '../lib/motor';
import { lienzo, RB } from '../three/piezas';
import { ease, mod, Brillo } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

// Escenas de INTERFAZ (menús, mando, teléfono, candado…): todo plano o con piezas 3D simples y originales, sin ciudad, autos ni lluvia.
// Una sola geometría y pocos materiales compartidos; los objetos repetidos (91 puntos de misión, líneas de la cuadrícula) van instanciados.
const C = { cian: '#44E6FF', rosa: '#FF4FA8', verde: '#3DF5A0', ambar: '#FFB02E', rojo: '#FF4F4F', violeta: '#B07CFF' };
const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35, ...o });
const basico = (color: string) => new THREE.MeshBasicMaterial({ color });
const M = {
  cuerpo: mat('#1C2140'), agarre: mat('#141830'), claro: mat('#C9D3EE', { metalness: 0.2 }), palo: mat('#0C0F22'), oro: mat('#FFB02E', { metalness: 0.7, roughness: 0.3 }), oroOsc: mat('#B87810', { metalness: 0.6 }),
  hueco: basico('#0A0A14'), azul: mat('#2A5AE0'), gris: mat('#8A93C8'), pantalla: mat('#10142E', { metalness: 0.5, roughness: 0.2 }),
  cian: basico(C.cian), rosa: basico(C.rosa), verde: basico(C.verde), rojo: basico(C.rojo), ambar: basico(C.ambar), violeta: basico(C.violeta), blanco: basico('#FFFFFF'),
  btn: [basico('#3DF5A0'), basico('#FF4F4F'), basico('#44A8FF'), basico('#FFE45C')],
};
const PLANO = new THREE.PlaneGeometry(1, 1); const CAJA = new THREE.BoxGeometry(1, 1, 1); const CIL = new THREE.CylinderGeometry(1, 1, 1, 20);

const Fondo: React.FC<{ t: number }> = ({ t }) => {
  const g = lienzo('ui_rejilla', 256, 256, (c) => { c.fillStyle = '#05070F'; c.fillRect(0, 0, 256, 256); c.strokeStyle = 'rgba(68,230,255,0.16)'; c.lineWidth = 2; c.strokeRect(0, 0, 256, 256); }, true);
  g.repeat.set(8, 14); g.offset.set(0, -t * 0.02);
  return (<>
    <mesh position={[0, 0, -1]} scale={[40, 40, 1]} geometry={PLANO}><meshBasicMaterial map={g} /></mesh>
    <Brillo pos={[0, 0, -0.5]} esc={[14, 20, 1]} color="#2A1A7A" op={0.35} />
    {Array.from({ length: 22 }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 7, ((rnd(i * 2 + 1) * 13 + t * 0.35) % 13) - 6.5, -0.4]} scale={0.05} geometry={PLANO}><meshBasicMaterial color={[C.cian, C.rosa, C.violeta][i % 3]} transparent opacity={0.6} /></mesh>)}
  </>);
};
const Panel: React.FC<{ id: string; w: number; h: number; pos: [number, number, number]; dibuja: (c: CanvasRenderingContext2D, w: number, h: number) => void; px?: number; op?: number; esc?: number }> = ({ id, w, h, pos, dibuja, px = 96, op = 1, esc = 1 }) => {
  const tx = lienzo(id, Math.round(w * px), Math.round(h * px), (c) => dibuja(c, Math.round(w * px), Math.round(h * px)));
  return <mesh position={pos} scale={[w * esc, h * esc, 1]} geometry={PLANO}><meshBasicMaterial map={tx} transparent opacity={op} toneMapped={false} /></mesh>;
};
const tarjeta = (c: CanvasRenderingContext2D, w: number, h: number, col: string, r = 28) => { c.fillStyle = 'rgba(10,14,40,0.94)'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, r); c.fill(); c.lineWidth = 6; c.strokeStyle = col; c.stroke(); };
const texto = (c: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, col = '#FFFFFF', al: CanvasTextAlign = 'center') => { c.font = `bold ${px}px Arial, sans-serif`; c.textAlign = al; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); };

/** Mando genérico (sin marca). Se pueden iluminar la cruceta arriba y los botones superiores L1/R1. */
const Mando: React.FC<{ esc?: number; arriba?: boolean; l1?: boolean; r1?: boolean }> = ({ esc = 1, arriba, l1, r1 }) => (
  <group scale={esc}>
    <mesh material={M.cuerpo}><RB a={[3.0, 1.5, 0.6]} r={0.45} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 1.25, -0.7, 0]} rotation={[0, 0, s * 0.3]} material={M.agarre}><RB a={[0.95, 1.5, 0.6]} r={0.4} /></mesh>)}
    <mesh position={[-0.95, 0.1, 0.32]} scale={[0.64, 0.2, 0.1]} geometry={CAJA} material={M.claro} /><mesh position={[-0.95, 0.1, 0.32]} scale={[0.2, 0.64, 0.1]} geometry={CAJA} material={M.claro} />
    {arriba ? <mesh position={[-0.95, 0.36, 0.38]} scale={[0.2, 0.26, 0.1]} geometry={CAJA} material={M.cian} /> : null}
    {[[0.28, 0], [0, 0.28], [-0.28, 0], [0, -0.28]].map((p, i) => <mesh key={i} position={[0.95 + p[0], 0.1 + p[1], 0.33]} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.08, 0.13]} geometry={CIL} material={M.btn[i]} />)}
    {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, -0.35, 0.33]} rotation={[Math.PI / 2, 0, 0]} scale={[0.22, 0.12, 0.22]} geometry={CIL} material={M.palo} />)}
    <mesh position={[-1.05, 0.82, 0.1]} scale={[0.8, 0.18, 0.34]} geometry={CAJA} material={l1 ? M.rosa : M.gris} /><mesh position={[1.05, 0.82, 0.1]} scale={[0.8, 0.18, 0.34]} geometry={CAJA} material={r1 ? M.rosa : M.gris} />
  </group>
);
const Telefono3D: React.FC<{ esc?: number }> = ({ esc = 1 }) => (
  <group scale={esc}>
    <mesh material={M.pantalla}><RB a={[1.5, 2.8, 0.14]} r={0.14} /></mesh>
    <Panel id="ui_tel_pantalla" w={1.3} h={2.5} pos={[0, 0, 0.09]} dibuja={(c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2A0A5A'); g.addColorStop(1, '#0A1A5A'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#44E6FF'; c.beginPath(); c.roundRect(w * 0.15, h * 0.1, w * 0.7, h * 0.07, 10); c.fill(); for (let i = 0; i < 12; i++) { c.fillStyle = ['#FF4FA8', '#44E6FF', '#FFE45C', '#3DF5A0'][i % 4]; c.beginPath(); c.roundRect(w * 0.1 + (i % 3) * w * 0.29, h * 0.25 + Math.floor(i / 3) * h * 0.16, w * 0.22, w * 0.22, 12); c.fill(); } }} px={90} />
  </group>
);
const Candado3D: React.FC<{ abre: number }> = ({ abre }) => (
  <group>
    <group position={[-0.45, 0.65 + 0.35 * abre, 0]} rotation={[0, 0, -0.9 * abre]}><mesh position={[0.45, 0.35, 0]} material={M.gris}><torusGeometry args={[0.52, 0.13, 10, 24, Math.PI]} /></mesh></group>
    <mesh material={M.oro}><RB a={[1.9, 1.5, 0.7]} r={0.2} /></mesh>
    <mesh position={[0, 0.1, 0.36]} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.05, 0.13]} geometry={CIL} material={M.hueco} /><mesh position={[0, -0.12, 0.36]} scale={[0.1, 0.3, 0.05]} geometry={CAJA} material={M.hueco} />
  </group>
);
const flecha = (dir: 'u' | 'r' | 'd' | 'l', on: boolean) => lienzo(`ui_flecha_${dir}_${on}`, 160, 160, (c) => {
  c.fillStyle = on ? 'rgba(68,230,255,0.95)' : 'rgba(20,26,60,0.95)'; c.beginPath(); c.roundRect(6, 6, 148, 148, 26); c.fill(); c.lineWidth = 6; c.strokeStyle = on ? '#FFFFFF' : '#44E6FF'; c.stroke();
  c.translate(80, 80); c.rotate({ u: 0, r: Math.PI / 2, d: Math.PI, l: -Math.PI / 2 }[dir]); c.fillStyle = on ? '#06101F' : '#44E6FF'; c.beginPath(); c.moveTo(0, -42); c.lineTo(38, 24); c.lineTo(12, 24); c.lineTo(12, 44); c.lineTo(-12, 44); c.lineTo(-12, 24); c.lineTo(-38, 24); c.closePath(); c.fill();
});
const ficha = (id: string, s: string, col: string) => lienzo(id, 256, 128, (c) => { tarjeta(c, 256, 128, col, 30); texto(c, s, 128, 68, 62, col); });
const contador = (n: number) => lienzo(`ui_n_${n}`, 384, 128, (c) => { texto(c, `${n}/91`, 192, 68, 104, '#FFFFFF'); });

export const Interfaz: React.FC<PropsEscena> = ({ t, u, k }) => {
  const e = ease(u); const pulso = 0.5 + 0.5 * Math.sin(t * 3);
  let cont: React.ReactNode = null;
  if (k === 0) cont = (   // mando
    <group position={[0, 0.4, 0]} rotation={[0.25 * Math.sin(t * 0.8), 0.3 * Math.sin(t * 0.6), 0.04 * Math.sin(t * 0.9)]}><Mando esc={1.55} /><Brillo pos={[0, 0, -0.4]} esc={9} color={C.cian} op={0.3 + 0.1 * pulso} /></group>
  );
  if (k === 1) {   // progreso 91/91
    const f = ease(u * 1.25); const n = Math.round(91 * f);
    cont = (<>
      <Panel id="ui_prog_t" w={5.6} h={1.2} pos={[0, 3.4, 0]} dibuja={(c, w, h) => { tarjeta(c, w, h, C.cian); texto(c, 'PROGRESO', w / 2, h / 2, 76, '#FFFFFF'); }} />
      <mesh position={[0, 0.3, 0]} scale={[4.8, 0.3, 0.1]} geometry={CAJA} material={mat('#141A3C')} />
      <mesh position={[-2.4 + 2.4 * f, 0.3, 0.08]} scale={[Math.max(0.001, 4.8 * f), 0.3, 0.1]} geometry={CAJA} material={f >= 1 ? M.verde : M.cian} />
      <mesh position={[0, 1.7, 0]} scale={[3.6, 1.2, 1]} geometry={PLANO}><meshBasicMaterial map={contador(n)} transparent toneMapped={false} /></mesh>
      <Puntos f={f} />
      {f >= 1 ? <Brillo pos={[0, 1.7, 0.2]} esc={7} color={C.verde} op={0.35 * pulso + 0.2} /> : null}
    </>);
  }
  if (k === 2) {   // Progreso > Trucos, lista bloqueada
    cont = (<>
      {Array.from({ length: 6 }, (_, i) => { const a = ease((u - 0.1 - i * 0.08) * 4); const y = 3.2 - i * 1.15 - (1 - a) * 1.2; if (a <= 0) return null;
        return <Panel key={i} id="ui_fila_bloq" w={5.4} h={0.9} pos={[0, y, 0]} op={a * (i === 1 ? 0.7 + 0.3 * pulso : 0.85)} dibuja={(c, w, h) => { tarjeta(c, w, h, '#3A4280', 24); c.fillStyle = '#8A93C8'; c.beginPath(); c.roundRect(w * 0.05, h * 0.25, h * 0.45, h * 0.5, 8); c.fill(); c.lineWidth = 7; c.strokeStyle = '#8A93C8'; c.beginPath(); c.arc(w * 0.05 + h * 0.225, h * 0.25, h * 0.16, Math.PI, 0); c.stroke(); c.fillStyle = '#2A3060'; c.beginPath(); c.roundRect(w * 0.2, h * 0.38, w * 0.62, h * 0.24, 10); c.fill(); }} />; })}
    </>);
  }
  if (k === 3) {   // candado que se abre y truco desbloqueado
    const abre = ease((u - 0.2) / 0.3); const r = cl((u - 0.45) / 0.3);
    cont = (<>
      <group position={[0, 1.6, 0]} scale={1.5}><Candado3D abre={abre} /></group>
      {abre > 0.9 ? <Brillo pos={[0, 1.6, 0.3]} esc={7 * (1 + 0.2 * Math.sin(t * 6))} color={C.verde} op={0.4} /> : null}
      <mesh position={[0, 1.6, 0.1]} rotation={[-Math.PI / 2 * 0, 0, 0]} scale={[1, 1, 1]} />
      {r > 0 ? <Panel id="ui_fila_ok" w={5.4} h={1.0} pos={[0, -2.0 - (1 - ease(r)) * 0.8, 0]} op={ease(r)} dibuja={(c, w, h) => { tarjeta(c, w, h, C.verde, 24); c.strokeStyle = C.verde; c.lineWidth = 12; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(w * 0.07, h * 0.52); c.lineTo(w * 0.1, h * 0.7); c.lineTo(w * 0.16, h * 0.3); c.stroke(); c.fillStyle = '#E8FFF4'; c.beginPath(); c.roundRect(w * 0.22, h * 0.38, w * 0.62, h * 0.24, 10); c.fill(); }} /> : null}
    </>);
  }
  if (k === 4) {   // guardado + alerta
    const a1 = ease(u * 4); const a2 = ease((u - 0.2) * 4);
    cont = (<>
      <group position={[-1.5, 0.6, 0]} scale={a1 * 1.5 + 0.001}>
        <mesh material={M.azul}><RB a={[1.8, 1.8, 0.16]} r={0.12} /></mesh>
        <mesh position={[0, 0.45, 0.1]} scale={[1.1, 0.6, 0.02]} geometry={CAJA} material={M.blanco} /><mesh position={[0, -0.55, 0.1]} scale={[1.2, 0.5, 0.02]} geometry={CAJA} material={M.gris} />
      </group>
      <Panel id="ui_alerta" w={1.9} h={1.7} pos={[1.9, 0.9 + 0.06 * pulso, 0.2]} esc={(a2 + 0.001) * 1.3} dibuja={(c, w, h) => { c.fillStyle = '#FFB02E'; c.strokeStyle = '#FFE9A0'; c.lineWidth = 10; c.lineJoin = 'round'; c.beginPath(); c.moveTo(w / 2, 14); c.lineTo(w - 12, h - 14); c.lineTo(12, h - 14); c.closePath(); c.fill(); c.stroke(); texto(c, '!', w / 2, h * 0.62, h * 0.55, '#1A1000'); }} />
    </>);
  }
  if (k === 7) {   // trofeo tachado + «no funcionan en GTA Online»
    const a3 = ease(u * 3);
    cont = (<>
      <group position={[0, 0.8, 0]} scale={a3 * 2.0 + 0.001}>
        <mesh position={[0, 0.3, 0]} scale={[0.55, 0.75, 0.55]} geometry={CIL} material={M.oro} /><mesh position={[0, -0.25, 0]} scale={[0.15, 0.4, 0.15]} geometry={CIL} material={M.oroOsc} /><mesh position={[0, -0.55, 0]} scale={[0.6, 0.15, 0.4]} geometry={CAJA} material={M.oroOsc} />
        {[-1, 1].map((s2) => <mesh key={s2} position={[s2 * 0.62, 0.35, 0]} material={M.oro}><torusGeometry args={[0.25, 0.07, 8, 16]} /></mesh>)}
        <mesh position={[0, 0, 0.5]} rotation={[0, 0, 0.8]} scale={[2.6, 0.2, 0.1]} geometry={CAJA} material={M.rojo} />
      </group>
      <Panel id="ui_online" w={5.4} h={0.9} pos={[0, -2.6, 0]} op={ease((u - 0.3) * 4)} dibuja={(c, w, h) => { tarjeta(c, w, h, C.rosa, 24); texto(c, 'NO FUNCIONAN EN GTA ONLINE', w / 2, h / 2, 31, '#FFFFFF'); }} />
    </>);
  }
  if (k === 5) {   // teléfono + mando: ARRIBA, L1, R1
    const p1 = ease(u * 5); const p2 = ease((u - 0.25) * 5); const p3 = ease((u - 0.5) * 5);
    cont = (<>
      <group position={[-1.5, 2.9, 0]} scale={(p1 + 0.001) * 0.8}><Telefono3D /></group>
      <Panel id="ui_f_up" w={1.5} h={1.5} pos={[1.4, 2.9, 0.1]} esc={p1 + 0.001} dibuja={(c, w, h) => c.drawImage(flecha('u', true).image as CanvasImageSource, 0, 0, w, h)} />
      <group position={[0, -0.6, 0]} scale={0.95}><Mando esc={1.5} arriba={p1 > 0.5} l1={p2 > 0.5} r1={p3 > 0.5} /></group>
      <mesh position={[-1.7, -2.4, 0.2]} scale={[(p2 + 0.001) * 1.7, (p2 + 0.001) * 0.85, 1]} geometry={PLANO}><meshBasicMaterial map={ficha('ui_l1', 'L1', C.rosa)} transparent toneMapped={false} /></mesh>
      <mesh position={[1.7, -2.4, 0.2]} scale={[(p3 + 0.001) * 1.7, (p3 + 0.001) * 0.85, 1]} geometry={PLANO}><meshBasicMaterial map={ficha('ui_r1', 'R1', C.rosa)} transparent toneMapped={false} /></mesh>
      <Panel id="ui_xbox" w={5.0} h={0.8} pos={[0, -3.6, 0]} op={ease((u - 0.6) * 4)} dibuja={(c, w, h) => { tarjeta(c, w, h, C.verde, 22); texto(c, 'XBOX SERIES X|S:  LB + RB', w / 2, h / 2, 32, '#FFFFFF'); }} />
    </>);
  }
  if (k === 6) {   // cruceta con flechas que se iluminan en secuencia (de ejemplo)
    const seq: ('u' | 'r' | 'd' | 'l')[] = ['u', 'r', 'd', 'l']; const paso = Math.min(4, Math.floor(u * 6)); const act = paso < 4 ? seq[paso] : null;
    const pos: Record<string, [number, number]> = { u: [0, 1.6], d: [0, -1.6], l: [-1.6, 0], r: [1.6, 0] };
    cont = (<>
      <group position={[0, -1.0, 0]}>
        {(['u', 'r', 'd', 'l'] as const).map((d) => <Panel key={d} id={`ui_c_${d}_${act === d}`} w={1.5} h={1.5} pos={[pos[d][0], pos[d][1], 0]} esc={act === d ? 1.12 : 1} dibuja={(c, w, h) => c.drawImage(flecha(d, act === d).image as CanvasImageSource, 0, 0, w, h)} />)}
        <mesh position={[0, 0, 0]} scale={[1.1, 1.1, 0.2]} geometry={CAJA} material={mat('#141A3C')} />
        {act ? <Brillo pos={[pos[act][0], pos[act][1], 0.3]} esc={4} color={C.cian} op={0.5} /> : null}
      </group>
      {seq.map((d, i) => <Panel key={d + i} id={`ui_slot_${d}_${i < paso}`} w={1.0} h={1.0} pos={[-1.65 + i * 1.1, 3.0, 0]} dibuja={(c, w, h) => { if (i < paso) c.drawImage(flecha(d, true).image as CanvasImageSource, 0, 0, w, h); else { tarjeta(c, w, h, '#3A4280', 16); } }} />)}
      <Panel id="ui_ejemplo" w={4.2} h={0.6} pos={[0, 2.0, 0]} dibuja={(c, w, h) => { texto(c, 'SECUENCIA DE EJEMPLO', w / 2, h / 2, 24, '#8A93C8'); }} />
    </>);
  }
  return (<><Fondo t={t} /><group position={[0, 0.0, 0]} scale={0.68}>{cont}</group></>);
};
const PUNTO = new THREE.PlaneGeometry(0.2, 0.2); const PUNTO_M = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
const Puntos: React.FC<{ f: number }> = ({ f }) => {
  const r = React.useRef<THREE.InstancedMesh>(null); const N = 91; const on = new THREE.Color(C.cian), off = new THREE.Color('#1C2250'), fin = new THREE.Color(C.verde), col = new THREE.Color();
  React.useLayoutEffect(() => { const im = r.current; if (!im) return; const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { m.makeTranslation(-2.6 + (i % 13) * 0.43, -1.2 - Math.floor(i / 13) * 0.45, 0); im.setMatrixAt(i, m); im.setColorAt(i, col.copy(i < Math.round(91 * f) ? (f >= 1 ? fin : on) : off)); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  return <instancedMesh ref={r} args={[PUNTO, PUNTO_M, N]} frustumCulled={false} />;
};
