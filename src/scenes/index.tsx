// Registro de tipos de escena: un componente React por tipo. Para añadir uno: crea el archivo en src/scenes/ y regístralo aquí.
import React from 'react';
import type { DefinicionEscena, PropsEscena } from '../three/tipos';
import { CiudadAerea } from './CiudadAerea';
import { CalleSiluetas } from './CalleSiluetas';
import { PlayaNocturna } from './PlayaNocturna';
import { Mapa } from './MapaEstado';
import { Persecucion } from './Persecucion';
import { Atardecer } from './AtardecerAereo';
import { Fondo } from './FondoParticulas';
import { Calle } from './CalleDia';
import { Interior } from './Interior';
import { Datos } from './Datos';

const Vice: React.FC<PropsEscena> = (p) => (p.k === 1 ? <CalleSiluetas {...p} /> : p.k === 2 ? <PlayaNocturna {...p} /> : <CiudadAerea {...p} />);
const NOCHE_LUZ = { amb: ['#7A5AFF', 0.7], sol: ['#8AA0FF', 1.2], relleno: ['#FF4FA8', 1.3] } as const;
// Un solo tipo «vice» con tres variantes de cámara/decorado (aerea, calle, playa), como en el kit.
export const ESCENAS: Record<string, DefinicionEscena> = {
  vice: { variantes: ['aerea', 'calle', 'playa'], niebla: ['#12082E', 30, 170], cielo: () => 'noche', luz: { amb: [...NOCHE_LUZ.amb], sol: [...NOCHE_LUZ.sol], relleno: ['#FFE2CC', 1.0] }, camara: 'vice-aerea',
    Componente: Vice },
  mapa: { variantes: ['costa', 'ciudad', 'pantano', 'carreteras'], niebla: ['#070B26', 45, 130], cielo: () => 'estudio', luz: { amb: ['#9AA8FF', 1.0], sol: ['#FFFFFF', 1.5], relleno: ['#FF4FA8', 0.8] }, camara: 'mapa-cenital', Componente: Mapa },
  persecucion: { variantes: ['detras', 'lateral', 'giro'], niebla: ['#12082E', 25, 160], cielo: () => 'noche', luz: { amb: ['#7A5AFF', 0.7], sol: ['#8AA0FF', 1.0], relleno: ['#FFE2CC', 0.9] }, camara: 'persecucion-detras', Componente: Persecucion },
  atardecer: { variantes: ['orbita', 'helicoptero', 'costa'], niebla: ['#8A2A7A', 60, 260], cielo: () => 'ocaso', luz: { amb: ['#E08AFF', 0.75], sol: ['#FF9A5A', 2.2], relleno: ['#FFD9C0', 0.9] }, camara: 'atardecer-aerea', Componente: Atardecer },
  fondo: { variantes: ['particulas', 'negro'], niebla: ['#000000', 30, 120], cielo: () => 'negro', luz: { amb: ['#FFFFFF', 0.6], sol: ['#B07CFF', 0.6], relleno: ['#FF4FA8', 0.6] }, camara: 'fondo-frente', Componente: Fondo },
  calle: { variantes: ['avenida', 'plaza', 'esquina'], niebla: ['#CFE6FA', 45, 180], cielo: () => 'dia', luz: { amb: ['#FFFFFF', 1.0], sol: ['#FFF1D0', 2.4], relleno: ['#BFD8FF', 0.9] }, camara: 'calle-avenida', Componente: Calle },
  interior: { variantes: ['mesa', 'ventana', 'estante'], niebla: ['#EBDCC8', 40, 120], cielo: () => 'dia', luz: { amb: ['#FFE9CC', 1.0], sol: ['#FFF0DA', 1.7], relleno: ['#FFD9A8', 0.9] }, camara: 'interior-frente', Componente: Interior },
  datos: { variantes: ['barras', 'cifra', 'ascenso'], usaDatos: true, niebla: ['#0B1030', 30, 110], cielo: () => 'estudio', luz: { amb: ['#9AA8FF', 0.9], sol: ['#FFFFFF', 1.6], relleno: ['#FF4FA8', 0.8] }, camara: 'datos-frente', Componente: Datos },
};
