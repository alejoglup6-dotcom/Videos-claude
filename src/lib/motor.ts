// Curvas de animación y utilidades numéricas (todo puro y determinista: Remotion renderiza cada cuadro por separado).
export type Curva = (x: number) => number;
export const cl = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const suave: Curva = (x) => { x = cl(x); return x * x * x * (x * (6 * x - 15) + 10); };   // sin saltos de velocidad
export const sale: Curva = (x) => 1 - Math.pow(1 - cl(x), 3);                                       // arranca rápido y frena
export const cae: Curva = (x) => { x = cl(x); return x * x; };
export const lineal: Curva = (x) => cl(x);
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // pseudoaleatorio estable por índice
