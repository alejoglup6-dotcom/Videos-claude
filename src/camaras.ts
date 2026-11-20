// Cámaras con nombre. pos = dónde está · mira = a dónde mira · fov = campo de visión (grados) · empuje = cuánto avanza durante la escena.
import type { Camara } from './lib/guion';
const c = (pos: Camara['pos'], mira: Camara['mira'], fov: number, empuje: number): Camara => ({ pos, mira, fov, empuje });
export const CAMARAS: Record<string, Camara> = {
  'vice-aerea': c([16, 66, 54], [-30, 6, -44], 60, 28), 'vice-aerea-lateral': c([-34, 30, 8], [0, 5, -40], 55, 8),
  'vice-calle': c([0, 1.7, 6], [0, 1.6, -12], 50, 2), 'vice-calle-baja': c([1.5, 0.7, 4], [0, 1.2, -10], 45, 1.5), 'vice-playa': c([-6, 1.8, 10], [4, 2, -20], 55, 4),
  'mapa-cenital': c([0, 18, 10], [0, 0, -0.5], 60, 3), 'mapa-costa': c([8, 15, 11], [3, 0, -0.5], 55, 3), 'mapa-ciudad': c([6, 9, 8], [3, 0.5, 0.8], 50, 2),
  'mapa-pantano': c([-3, 10, 14], [-0.5, 0, 5], 50, 2), 'mapa-carreteras': c([0, 15, 11], [0, 0, -1], 55, 3),
  'persecucion-detras': c([0, 3.2, 10], [0, 1.2, -12], 60, 3), 'persecucion-lateral': c([9, 2.2, -6], [0, 1, -13], 55, 2), 'persecucion-alta': c([0, 8, 6], [0, 0, -10], 60, 3),
  'atardecer-aerea': c([16, 42, 58], [-14, 0, -28], 55, 6), 'atardecer-heli': c([36, 16, -6], [0, 13, -30], 50, 8), 'atardecer-costa': c([6, 2.5, 24], [-2, 3, -30], 55, 3),
  'fondo-frente': c([0, 3, 14], [0, 3, 0], 50, 2),
  'calle-avenida': c([0, 1.7, 14], [0, 3.2, -30], 55, 6), 'calle-plaza': c([0, 2.2, 16], [0, 2.5, -10], 55, 4), 'calle-plaza-alta': c([7, 6, 12], [0, 1.2, -6], 50, 3), 'calle-esquina': c([7, 3.2, 13], [-1.5, 2, -3], 55, 3),
  'interior-frente': c([0, 2.4, 7], [0, 1.6, -8], 55, 3), 'interior-mesa': c([3.5, 2.2, -1], [0, 1.2, -6], 45, 2.5), 'interior-detalle': c([1, 1.8, -3], [0, 1.2, -6], 38, 1.5), 'interior-ventana': c([-4, 2.2, 2], [0, 3, -12], 52, 2),
  'agua-baja': c([1.9, 1.05, 4.4], [0, 0.95, 0], 50, 1.2), 'agua-caiman': c([1.4, 1.05, 4.6], [0, 0.2, -3.2], 44, 0.8), 'agua-montaje': c([1.2, 0.9, 4.6], [0, 0.6, -1], 50, 2.2),
  'detalle-basura': c([6.9, 1.95, 5.8], [4.1, 1.25, 0], 50, 0.9), 'detalle-pared': c([-0.9, 2.0, 1.6], [-1.4, 1.95, -1.2], 42, 0.4),
  'mapa-fauna': c([5, 17, 15], [1.5, 0, 0.8], 55, 2.5),
  'datos-frente': c([0, 3.4, 22], [0, 2.4, 0], 55, 3), 'datos-lateral': c([12, 4.5, 16], [0, 2.4, 0], 50, 2), 'datos-cerca': c([0, 3.2, 15], [0, 2.4, 0], 46, 1.5),
};
Object.assign(CAMARAS, {
  'pantano-lancha': c([4.2, 2.0, 9.5], [0, 0.7, -1], 55, 1.4),
  'registro-frente': c([0, 5.0, 13], [0, 5.0, 0], 50, 1.2),
  'mapa-secretos': c([5, 17, 15], [1.5, 0, 0.8], 55, 3),
});
Object.assign(CAMARAS, {
  'conduccion-lado': c([8.5, 2.0, 3.5], [0, 0.8, -5], 50, 2),
  'playa-atardecer': c([2.2, 1.5, 7], [0, 2.4, -30], 50, 1.5),
  'gasolinera': c([5.2, 2.0, 7.5], [-0.8, 1.5, -2.5], 55, 1.5),
  'local-bar': c([0.8, 1.7, 4.2], [0, 1.5, -6], 55, 1.5),
  'telefono-mano': c([0.4, 1.6, 5.4], [0.1, 1.6, 0], 44, 0.6),
  'pantano-orilla': c([2.6, 1.7, 5.4], [0, 1.2, -1], 48, 0.8),
});
Object.assign(CAMARAS, {
  'puerta-cerca': c([0.15, 1.5, 5.2], [0.15, 1.5, 0], 40, 1.2),
  'puerta-neon': c([0.15, 1.5, 4.4], [0.15, 1.5, 0], 38, 0.8),
  'puerta-media': c([1.2, 1.7, 6.0], [0.2, 1.5, 0], 46, 1.6),
  'radio-frente': c([0, 2.6, 13.5], [0, 2.3, 0], 42, 1.2),
});
Object.assign(CAMARAS, { 'radio-cerca': c([0.8, 2.7, 8], [0.8, 2.5, 0], 36, 0.8) });
Object.assign(CAMARAS, { 'ui-frente': c([0, 0, 15], [0, 0, 0], 48, 0.6) });
Object.assign(CAMARAS, {
  'ovni-cielo': c([0, 2.4, 14], [0, 5.5, -24], 58, 2.5), 'ovni-lejos': c([3, 2.0, 18], [0, 6, -30], 50, 1.5), 'ovni-reloj': c([0, 3.2, 13], [0, 3.6, 0], 46, 0.8),
  'ovni-carro': c([3.6, 1.7, 3.2], [0, 1.0, -6], 52, 1.2), 'ovni-rastro': c([0.6, 1.5, 9], [1.5, 2.6, -24], 56, 6), 'ovni-abduccion': c([5.5, 2.0, 5], [1.6, 3.6, -6], 58, 1.2), 'ovni-trofeo': c([0, 2.8, 17], [0, 2.6, 0], 44, 1.0),
});
