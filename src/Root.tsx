import React from 'react';
import { Composition } from 'remotion';
import { VideoVertical } from './compositions/VideoVertical';
import { FPS, cuadrosTotales } from './lib/guion';
import type { Guion } from './lib/guion';
import { Miniaturas } from './biblioteca/Miniaturas';
import type { PropsMiniaturas } from './biblioteca/Miniaturas';
import guionPorDefecto from '../guiones/vice-city-35s.json';

// El guion completo es la entrada («props»): `remotion render --props=archivo.json`. Sin props se usa el guion de ejemplo.
export const Root: React.FC = () => (
  <>
  <Composition id="Miniaturas" component={Miniaturas as React.FC<any>} width={1792} height={1536} fps={1} durationInFrames={1}
    defaultProps={{ modelos: [], columnas: 7, celda: 256, etiquetas: false } as PropsMiniaturas}
    calculateMetadata={({ props }) => { const p = props as PropsMiniaturas; return { width: p.columnas * p.celda, height: Math.ceil(p.modelos.length / p.columnas) * p.celda }; }} />
  <Composition
    id="VideoVertical"
    component={VideoVertical as React.FC<any>}
    width={1080} height={1920} fps={FPS}
    durationInFrames={cuadrosTotales(guionPorDefecto as unknown as Guion)}
    defaultProps={guionPorDefecto as unknown as Guion}
    calculateMetadata={({ props }) => ({ durationInFrames: cuadrosTotales(props as Guion) })}
  />
  </>
);
