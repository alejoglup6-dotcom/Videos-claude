// Capas 2D de cada transición (la parte 3D —whip, zoom— la hace la cámara en Escenario3D).
import React from 'react';
import type { Estado } from '../lib/transiciones';
import { Aberracion, Destello, EstelaLatigazo, Glitch, LineasVelocidad } from './efectos';

export const TransicionCapas: React.FC<{ est: Estado; frame: number; color: string }> = ({ est, frame, color }) => (
  <>
    {est.tipo === 'zoom' || est.tipo === 'camara_rapida' ? <LineasVelocidad k={est.k * 0.7} /> : null}
    {est.tipo === 'whip' || est.tipo === 'camara_rapida' ? <EstelaLatigazo w={est.tipo === 'camara_rapida' ? est.w * 0.4 : est.w} color={color} /> : null}
    {est.tipo === 'flash' ? <Destello k={est.k} /> : null}
    {est.tipo === 'glitch' ? <Glitch k={est.k} frame={frame} /> : null}
    {est.tipo === 'fade' ? <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: est.negro }} /> : null}
    {est.tipo === 'slide' && est.panel < 2 ? <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1080, left: `${(est.panel - 1) * 1080}px`, background: `linear-gradient(90deg, ${color}00, ${color}CC)` }} /> : null}
  </>
);
export const ConAberracion: React.FC<{ est: Estado; children: React.ReactNode }> = ({ est, children }) => (
  <Aberracion k={est.tipo === 'glitch' || est.tipo === 'zoom' ? est.k : 0}>{children}</Aberracion>
);
