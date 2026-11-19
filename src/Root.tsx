import React from 'react';
import { Composition } from 'remotion';
import { VideoVertical } from './compositions/VideoVertical';
import { FPS, cuadrosTotales } from './lib/guion';
import type { Guion } from './lib/guion';
import guionPorDefecto from '../guiones/vice-city-35s.json';

// El guion completo es la entrada («props»): `remotion render --props=archivo.json`. Sin props se usa el guion de ejemplo.
export const Root: React.FC = () => (
  <Composition
    id="VideoVertical"
    component={VideoVertical as React.FC<any>}
    width={1080} height={1920} fps={FPS}
    durationInFrames={cuadrosTotales(guionPorDefecto as unknown as Guion)}
    defaultProps={guionPorDefecto as unknown as Guion}
    calculateMetadata={({ props }) => ({ durationInFrames: cuadrosTotales(props as Guion) })}
  />
);
