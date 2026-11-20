import React from 'react';
import * as THREE from 'three';
import { cl, rnd } from '../lib/motor';
import { lienzo } from '../three/piezas';
import { Brillo } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';

// Pantalla de «registro de fauna»: cuadrícula de fichas con siluetas de aves y otros animales que se van marcando.
// Todo es UI propia dibujada en canvas (sin capturas del juego). Una sola geometría y 15 materiales compartidos para las 24 fichas.
const COLORES = ['#44E6FF', '#FF4FA8', '#FFE45C'];
const TIPOS = ['vuelo', 'posada', 'zancuda', 'caiman', 'pez'] as const;
const COLS = 4, FILAS = 6, LADO = 1.32;
const dibuja = (tipo: (typeof TIPOS)[number], col: string) => lienzo(`ficha_${tipo}_${col}`, 192, 192, (c) => {
  c.fillStyle = 'rgba(8,10,34,0.92)'; c.beginPath(); c.roundRect(6, 6, 180, 180, 28); c.fill(); c.lineWidth = 6; c.strokeStyle = col; c.stroke();
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
  if (tipo === 'vuelo') { c.beginPath(); c.moveTo(30, 100); c.quadraticCurveTo(62, 56, 96, 104); c.quadraticCurveTo(130, 56, 162, 100); c.stroke(); c.beginPath(); c.ellipse(96, 112, 13, 8, 0, 0, 7); c.fill(); }
  if (tipo === 'posada') { c.beginPath(); c.ellipse(90, 108, 38, 26, -0.25, 0, 7); c.fill(); c.beginPath(); c.arc(124, 80, 16, 0, 7); c.fill(); c.beginPath(); c.moveTo(138, 78); c.lineTo(160, 86); c.lineTo(138, 90); c.fill(); c.beginPath(); c.moveTo(56, 118); c.lineTo(28, 140); c.stroke(); c.beginPath(); c.moveTo(88, 134); c.lineTo(88, 156); c.moveTo(102, 134); c.lineTo(102, 156); c.stroke(); }
  if (tipo === 'zancuda') { c.beginPath(); c.ellipse(86, 100, 30, 20, 0.2, 0, 7); c.fill(); c.beginPath(); c.moveTo(108, 92); c.quadraticCurveTo(140, 70, 120, 44); c.stroke(); c.beginPath(); c.arc(122, 40, 10, 0, 7); c.fill(); c.beginPath(); c.moveTo(80, 116); c.lineTo(80, 164); c.moveTo(94, 116); c.lineTo(100, 164); c.stroke(); }
  if (tipo === 'caiman') { c.beginPath(); c.ellipse(86, 100, 54, 16, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(138, 94); c.lineTo(170, 98); c.lineTo(138, 108); c.fill(); c.beginPath(); c.moveTo(34, 100); c.lineTo(14, 112); c.lineTo(34, 108); c.fill(); c.fillStyle = '#08102A'; c.beginPath(); c.arc(128, 90, 4, 0, 7); c.fill(); }
  if (tipo === 'pez') { c.beginPath(); c.ellipse(88, 100, 44, 24, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(128, 100); c.lineTo(164, 76); c.lineTo(164, 124); c.fill(); c.fillStyle = '#08102A'; c.beginPath(); c.arc(62, 94, 5, 0, 7); c.fill(); }
});
const visto = () => lienzo('ficha_ok', 64, 64, (c) => { c.beginPath(); c.arc(32, 32, 28, 0, 7); c.fillStyle = '#25C98B'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#FFFFFF'; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(18, 34); c.lineTo(28, 44); c.lineTo(47, 21); c.stroke(); });
const cabecera = () => lienzo('registro_cab', 768, 128, (c) => {
  c.fillStyle = 'rgba(8,10,34,0.95)'; c.beginPath(); c.roundRect(4, 8, 760, 112, 30); c.fill(); c.lineWidth = 6; c.strokeStyle = '#44E6FF'; c.stroke();
  c.font = 'bold 54px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#FFFFFF'; c.fillText('REGISTRO DE FAUNA', 384, 66);
});
const GEO = new THREE.PlaneGeometry(LADO - 0.14, LADO - 0.14);
export const RegistroFauna: React.FC<PropsEscena> = ({ t, u }) => {
  const fichas = Array.from({ length: COLS * FILAS }, (_, i) => {
    const ultima = i >= COLS * FILAS - 4; const tipo = ultima ? TIPOS[3 + (i % 2)] : TIPOS[Math.floor(rnd(i * 5 + 2) * 3)]; const col = COLORES[Math.floor(rnd(i * 7 + 1) * 3)];
    return { i, tipo, col, x: ((i % COLS) - (COLS - 1) / 2) * LADO, y: 7.9 - Math.floor(i / COLS) * LADO };
  });
  const scan = 8.3 - 8.4 * cl(u * 1.1);
  return (
    <>
      <mesh position={[0, 5.0, -0.3]}><planeGeometry args={[7, 12]} /><meshBasicMaterial color="#060A24" /></mesh>
      <mesh position={[0, 9.4, 0]}><planeGeometry args={[6, 0.8]} /><meshBasicMaterial map={cabecera()} transparent /></mesh>
      {fichas.map((f) => {
        const a = cl((u - 0.05 - f.i * 0.028) / 0.08); const ok = cl((u - 0.12 - f.i * 0.028) / 0.05);
        return (
          <group key={f.i} position={[f.x, f.y, 0]} scale={a > 0 ? (a < 1 ? 0.7 + 0.45 * Math.sin(a * Math.PI * 0.6) : 1) : 0.0001}>
            <mesh geometry={GEO}><meshBasicMaterial map={dibuja(f.tipo, f.col)} transparent /></mesh>
            {ok > 0 ? <mesh position={[0.4, -0.4, 0.02]} scale={0.3 * (1 + 0.3 * (1 - ok))}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={visto()} transparent /></mesh> : null}
          </group>
        );
      })}
      <mesh position={[0, scan, 0.05]}><planeGeometry args={[6.4, 0.12]} /><meshBasicMaterial color="#44E6FF" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <Brillo pos={[0, scan, 0.1]} esc={[7, 1.6, 1]} color="#44E6FF" op={0.35} />
      {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[(rnd(i * 2) - 0.5) * 12, 1 + ((rnd(i + 30) * 10 + t * 0.6) % 10), -0.6]}><sphereGeometry args={[0.04, 6, 5]} /><meshBasicMaterial color={['#FF4FA8', '#44E6FF', '#B07CFF'][i % 3]} /></mesh>)}
    </>
  );
};
