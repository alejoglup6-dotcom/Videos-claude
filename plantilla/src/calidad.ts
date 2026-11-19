// Interruptores de calidad/velocidad del 3D. Se leen de variables REMOTION_* al empaquetar (ver herramientas/render.mjs).
const e: Record<string, string | undefined> = (typeof process !== 'undefined' && (process as any).env) || {};
export const CAL = {
  escala3d: Number(e.REMOTION_ESCALA3D ?? 1),      // 0.5 borrador · 0.75 normal · 1 máxima (el texto siempre sale a 1080×1920)
  antialias: (e.REMOTION_AA ?? '1') !== '0',
  lambert: (e.REMOTION_LAMBERT ?? '0') === '1',    // materiales baratos en todo el 3D
};
