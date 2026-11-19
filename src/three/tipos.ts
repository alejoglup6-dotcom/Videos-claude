import type React from 'react';
import type { CieloTipo } from './piezas';

/** Lo que recibe el componente 3D de cada tipo de escena. */
export type PropsEscena = { t: number; u: number; k: number; datos?: number[] };   // t: segundo del video · u: avance de la escena (0-1) · k: índice de variante
export type Luz = { amb: [string, number]; sol: [string, number]; relleno: [string, number] };
export type DefinicionEscena = {
  variantes: string[];
  niebla: [string, number, number];            // color, cerca, lejos
  cielo: (k: number) => CieloTipo;
  luz: Luz;
  camara: string;                              // nombre de cámara por defecto (src/camaras.ts)
  usaDatos?: boolean;
  Componente: React.FC<PropsEscena>;
};
