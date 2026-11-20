// Clip de video de fondo (de public/) con franjas difuminadas que tapan los subtítulos incrustados del original. El clip va sin sonido: la voz y los efectos los pone AudioVideo.
import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { FPS } from '../lib/guion';
import type { Escena } from '../lib/guion';

export const CapaVideo: React.FC<{ v: NonNullable<Escena['video']>; f0: number; f1: number }> = ({ v, f0, f1 }) => {
  const franjas = v.cubrir ?? [[64, 84]];
  return (
    <Sequence from={f0} durationInFrames={Math.max(1, f1 - f0)} layout="none">
      <AbsoluteFill>
        <OffthreadVideo src={staticFile(v.archivo)} muted startFrom={Math.round((v.desde ?? 0) * FPS)} playbackRate={v.velocidad ?? 1} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {franjas.map(([a, b], i) => <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${a}%`, height: `${b - a}%`, backdropFilter: 'blur(28px) brightness(0.5)', WebkitBackdropFilter: 'blur(28px) brightness(0.5)', background: 'rgba(6,8,24,0.45)' }} />)}
      </AbsoluteFill>
    </Sequence>
  );
};
