// Configuración del video (video.config.json) y su resolución contra los tiempos de la voz (tiempos.json).
// Funciones puras, sin React: las usan Video.tsx y Escena.tsx.
import CAMARAS from './camaras.json';

export type V3 = [number, number, number];
export type Pal = { w: string; s: number; e: number };
export type Frase = { id: string; texto: string; ini: number; fin: number; palabras: Pal[] };
export type Tiempos = { dur: number; frases: Frase[] };
export type CamaraCfg = { pos: V3; mira: V3; fov: number; empuje: number; para?: string[] };   // para = decorados para los que está pensada (solo orienta al generador y al validador)
export type TextoCfg = { txt: string; color: string; sub?: string; tam?: number };   // tam = tamaño máximo en px (solo puede achicar el automático)
export type TomaCfg = { frase: string; decorado: string; variante?: string; camara: string | CamaraCfg; texto: TextoCfg; datos?: number[] };
export type ConfigVideo = {
  version: 1;
  titulo?: string;
  etiqueta: { txt: string; desdeToma?: number; hastaToma?: number } | null;
  pildoras: string[];
  frases: Record<string, { claves: string[] }>;
  tomas: TomaCfg[];
};
export type PropsVideo = { config: ConfigVideo; tiempos: Tiempos };

// Cámara de una toma: la de este 3D (set = decorado). p = posición, l = punto al que mira, f = campo de visión, push = cuánto avanza.
export type Def = { set: string; p: V3; l: V3; f: number; push: number };
export type Toma = { id: string; k: number; n: number; t0: number; t1: number; i: number; def: Def; variante?: string; texto: TextoCfg; datos?: number[] };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const camaraDe = (c: string | CamaraCfg, camaras: Record<string, CamaraCfg> = CAMARAS as unknown as Record<string, CamaraCfg>): CamaraCfg => {
  if (typeof c !== 'string') return c;
  const r = camaras[c];
  if (!r) throw new Error(`Cámara «${c}» no existe en camaras.json (hay: ${Object.keys(camaras).join(', ')})`);
  return r;
};

// Las tomas se reparten dentro de cada frase (en el orden en que aparecen las frases en la config).
export const crearTomas = (cfg: ConfigVideo, T: Tiempos): Toma[] => {
  const orden: string[] = []; cfg.tomas.forEach((x) => { if (!orden.includes(x.frase)) orden.push(x.frase); });
  const out: Toma[] = []; let i = 0;
  orden.forEach((id, pi) => {
    const propias = cfg.tomas.filter((x) => x.frase === id); const n = propias.length;
    const t0 = pi === 0 ? 0 : T.frases[pi].ini - 0.05;
    const t1 = pi === orden.length - 1 ? T.dur : T.frases[pi + 1].ini - 0.05;
    propias.forEach((x, k) => {
      const c = camaraDe(x.camara);
      out.push({ id, k, n, t0: lerp(t0, t1, k / n), t1: lerp(t0, t1, (k + 1) / n), i: i++, variante: x.variante, texto: x.texto, datos: x.datos,
        def: { set: x.decorado, p: c.pos, l: c.mira, f: c.fov, push: c.empuje } });
    });
  });
  return out;
};

// Subtítulos en trozos de hasta 4 palabras; las palabras clave llevan píldora de color.
export type Trozo = { id: string; palabras: (Pal & { clave: boolean; col: string })[]; ini: number; fin: number };
const limpia = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const crearTrozos = (cfg: ConfigVideo, T: Tiempos): Trozo[] => {
  const out: Trozo[] = [];
  for (const f of T.frases) {
    let cur: Trozo['palabras'] = []; let k = 0;
    const cierra = () => { if (cur.length) { out.push({ id: f.id, palabras: cur, ini: cur[0].s - 0.05, fin: cur[cur.length - 1].e + 0.3 }); cur = []; } };
    f.palabras.forEach((p) => {
      const clave = (cfg.frases[f.id]?.claves ?? []).includes(limpia(p.w));
      cur.push({ ...p, clave, col: cfg.pildoras[k++ % cfg.pildoras.length] });
      if (/[.,:?!…]$/.test(p.w) || cur.length >= 4) cierra();
    });
    cierra();
  }
  return out;
};
