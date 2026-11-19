// Línea de tiempo del guion (copia en JS de lineaTiempo() de src/lib/guion.ts) para los scripts de Node.
export const lineaTiempoJS = (g, fps = 30) => { let t = 0; return g.escenas.map((e, i) => { const x = { i, escena: e, t0: t, t1: t + e.duracion, f0: Math.round(t * fps), f1: Math.round((t + e.duracion) * fps) }; t += e.duracion; return x; }); };
