import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import type { ConfigVideo, PropsVideo, Tiempos } from './config';
import config from './video.config.json';
import tiempos from './tiempos.json';
// 9:16 vertical, 1080×1920 a 30 cuadros por segundo. El contenido (tomas, textos, cámaras) sale de video.config.json y la
// duración de tiempos.json. Se pueden sustituir al renderizar con --props (render.mjs: --config / --tiempos / --ejemplo).
const FPS = 30;
const defaults: PropsVideo = { config: config as unknown as ConfigVideo, tiempos: tiempos as unknown as Tiempos };
export const Root: React.FC = () => (
  <Composition id="Video" component={Video} fps={FPS} width={1080} height={1920}
    durationInFrames={Math.ceil(defaults.tiempos.dur * FPS)} defaultProps={defaults}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(props.tiempos.dur * FPS) })} />
);
