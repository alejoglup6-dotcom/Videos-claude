// Transiciones entre tomas: intensidad del «latigazo» (whip pan) y del corte, calculadas solo con el tiempo.
export type TomaT = { t0: number; t1: number; i: number };
export const tomaEn = <T extends TomaT>(t: number, tomas: T[]): T => { let tm = tomas[0]; for (const x of tomas) if (t >= x.t0) tm = x; return tm; };
// -1…1: positivo al final de una toma (la cámara se va de lado), negativo al comenzar la siguiente (llega del otro lado)
export const latigazo = (t: number, tomas: TomaT[], dur = 0.14): number => {
  const tm = tomaEn(t, tomas);
  const salida = tm.t1 - t < dur && tm.i < tomas.length - 1 ? Math.pow(1 - (tm.t1 - t) / dur, 2) : 0;
  const entrada = t - tm.t0 < dur && tm.i > 0 ? -Math.pow(1 - (t - tm.t0) / dur, 2) : 0;
  return salida + entrada;
};
// qué tipo de transición lleva cada corte (alterna para que no se sienta repetido)
export const tipoCorte = (i: number): 'destello' | 'latigazo' | 'glitch' | 'zoom' => (['destello', 'latigazo', 'zoom', 'latigazo', 'glitch', 'destello'] as const)[i % 6];
