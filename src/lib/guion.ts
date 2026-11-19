// Tipos del guion JSON y cálculos de tiempo. El guion completo es la entrada («props») de la composición.
import type { CieloTipo } from '../three/piezas';

export type TipoTransicion = 'corte' | 'flash' | 'zoom' | 'whip' | 'glitch' | 'fade' | 'slide' | 'camara_rapida';
export type EstiloTexto = 'slam' | 'letras' | 'glitch' | 'neon' | 'escribir';
export type Camara = { pos: [number, number, number]; mira: [number, number, number]; fov: number; empuje: number };
export type Elemento = { tipo: 'lluvia' | 'particulas' | 'neon' | 'lineas_velocidad'; color?: string; intensidad?: number };
export type Calidad = 'rapido' | 'normal' | 'alta';

export type Escena = {
  id: string;
  tipo: string;                                  // clave de src/scenes/index.ts
  variante?: string;
  duracion: number;                              // segundos
  camara?: string | Camara;                      // nombre de src/camaras.ts o valores propios
  fondo?: { cielo?: CieloTipo; niebla?: [string, number, number] };
  elementos?: Elemento[];                        // capas 2D encima del 3D
  texto?: { contenido: string; estilo?: EstiloTexto; color?: string; tam?: number; sub?: string; posicion?: 'arriba' | 'centro' | 'abajo' };
  animacion?: { empuje?: number; shake?: number; zoom_punch?: boolean };
  transicion?: { tipo: TipoTransicion; duracion?: number };   // cómo ENTRA esta escena
  musica?: { intensidad?: number; golpe?: boolean; riser?: boolean };
  sfx?: (string | { nombre: string; t?: number; volumen?: number })[];
  voz?: { texto: string; inicio?: number; claves?: string[] };
  datos?: number[];
  config?: Record<string, any>;                  // opciones libres que recibe el componente de la escena
};

export type Guion = {
  id: string;
  titulo: string;
  tema: string;
  etiqueta?: { txt: string };
  audio?: {
    musica?: { generar?: { bpm?: number; escala?: 'Am' | 'Dm' | 'Em'; semilla?: number }; archivo?: string; volumen?: number };
    voz?: { volumen?: number };
    sfx?: { volumen?: number };
    ducking?: number;                            // cuánto baja la música mientras habla la voz (0-1)
  };
  fuentes?: { dato: string; estado: 'verificado' | 'no_verificado'; nota?: string }[];
  escenas: Escena[];
  // los inyecta scripts/render.mjs; no van en el JSON del guion:
  grano?: boolean;                                // grano de película (por defecto sí); cuesta CPU por la mezcla a pantalla completa
  _calidad?: Calidad;
  _voces?: Record<string, { archivo: string; duracion: number; desde?: number; hasta?: number; palabras?: { w: string; s: number; e: number }[] }>;
  _version?: string;                 // hash corto del commit (se imprime en el video)
  _vozProveedor?: string;
};

export const FPS = 30;
export type Tramo = { i: number; escena: Escena; t0: number; t1: number; f0: number; f1: number };

/** Las escenas van una tras otra (sin solape: las transiciones son efectos sobre el corte). */
export const lineaTiempo = (g: Pick<Guion, 'escenas'>, fps = FPS): Tramo[] => {
  let t = 0; const out: Tramo[] = [];
  g.escenas.forEach((e, i) => { out.push({ i, escena: e, t0: t, t1: t + e.duracion, f0: Math.round(t * fps), f1: Math.round((t + e.duracion) * fps) }); t += e.duracion; });
  return out;
};
export const duracionTotal = (g: Pick<Guion, 'escenas'>) => g.escenas.reduce((s, e) => s + e.duracion, 0);
export const cuadrosTotales = (g: Pick<Guion, 'escenas'>, fps = FPS) => Math.round(duracionTotal(g) * fps);
export const tramoEn = (t: number, tl: Tramo[]): Tramo => { let r = tl[0]; for (const x of tl) if (t >= x.t0 - 1e-9) r = x; return r; };
