// Sistema de transiciones. Una transición es un EFECTO alrededor del corte (no hay dos escenas 3D a la vez: sería el doble de caro en CPU).
// Cada escena declara cómo ENTRA; aquí se convierte el instante t en intensidades que usan la cámara 3D y las capas 2D.
import type { Tramo, TipoTransicion } from './guion';
import { cl } from './motor';

export const DURACION_DEFECTO: Record<TipoTransicion, number> = { corte: 0, flash: 0.3, zoom: 0.35, whip: 0.36, glitch: 0.4, fade: 0.6, slide: 0.5, camara_rapida: 0.4 };
export type Estado = {
  tipo: TipoTransicion | 'ninguna';
  k: number;        // 0-1: intensidad general del efecto en este cuadro
  w: number;        // -1…1: giro de cámara (whip pan); + = se va hacia un lado, − = llega del otro
  punch: number;    // 0-1: golpe de zoom (cierra el campo de visión)
  negro: number;    // 0-1: velo negro (fade)
  panel: number;    // -1…1: posición del panel que barre la pantalla (slide); 99 = fuera
  sacude: number;   // 0-1: vibración extra de cámara
};
export const NINGUNA: Estado = { tipo: 'ninguna', k: 0, w: 0, punch: 0, negro: 0, panel: 99, sacude: 0 };

/** Estado de la transición más cercana a t. La ventana va un 40 % antes del corte y un 60 % después. */
export const estadoTransicion = (t: number, tl: Tramo[]): Estado => {
  for (const tr of tl) {
    const cfg = tr.escena.transicion; if (!cfg || cfg.tipo === 'corte') continue;
    const d = cfg.duracion ?? DURACION_DEFECTO[cfg.tipo]; const pre = tr.i === 0 ? 0 : d * 0.4, post = d * 0.6; const s = t - tr.t0;
    if (s < -pre || s >= post) continue;
    const a = s < 0 ? 1 - (-s) / pre : 1 - s / post;          // 0 en los extremos de la ventana, 1 en el corte
    const pos = s >= 0, e = { ...NINGUNA, tipo: cfg.tipo };
    switch (cfg.tipo) {
      case 'flash': e.k = pos ? Math.exp(-s * 11) : a * a * 0.6; e.punch = pos ? 0.35 * Math.exp(-s * 12) : 0; break;
      case 'zoom': e.k = a; e.punch = pos ? Math.exp(-s * 8) : a * a * 0.8; break;
      case 'whip': e.k = a; e.w = pos ? -a * a : a * a; break;
      case 'camara_rapida': e.k = a; e.w = (pos ? -a * a : a * a) * 1.3; e.punch = pos ? 0.6 * Math.exp(-s * 9) : 0.4 * a * a; e.sacude = pos ? Math.exp(-s * 8) : 0; break;
      case 'glitch': e.k = pos ? Math.exp(-s * 8) : a * a * a; e.sacude = 0.5 * e.k; break;
      case 'fade': e.negro = cl(a * 1.15); e.k = e.negro; break;
      case 'slide': e.panel = (s / d) * 2.0; e.k = a; break;
    }
    return e;
  }
  return NINGUNA;
};
