import type { Calidad } from './guion';
// Calidad = resolución interna del 3D (se reescala a 1080x1920) y suavizado de bordes. Todo lo 2D siempre va a 1080x1920.
export const CALIDADES: Record<Calidad, { escala3d: number; antialias: boolean; lluvia3d: number }> = {
  rapido: { escala3d: 0.5, antialias: false, lluvia3d: 0.5 },
  normal: { escala3d: 0.75, antialias: false, lluvia3d: 1 },
  alta: { escala3d: 1, antialias: true, lluvia3d: 1 },
};
