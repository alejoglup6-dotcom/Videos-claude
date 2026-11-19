// Temas visuales reutilizables: paleta de textos, tinte de color (grading) y viñeta. El guion elige uno con "tema".
export type Tema = { nombre: string; textos: string[]; acento: string; sub: string; contorno: string; tinte: string; tinteOp: number; vineta: number; lluvia: string; neon: [string, string]; exposicion: number };
export const TEMAS: Record<string, Tema> = {
  'neon-costero': { nombre: 'Neón costero nocturno', textos: ['#FF4FA8', '#44E6FF', '#FFE45C', '#FFFFFF'], acento: '#FF4FA8', sub: '#44E6FF', contorno: '#12082E', tinte: '#3A1A8A', tinteOp: 0.12, vineta: 0.55, lluvia: '#BFD0FF', neon: ['#FF4FA8', '#44E6FF'], exposicion: 1.05 },
  'atardecer-dorado': { nombre: 'Atardecer dorado', textos: ['#FFB454', '#FF6AA8', '#FFFFFF', '#FFE45C'], acento: '#FF9A5A', sub: '#FFD9A8', contorno: '#2A0A2E', tinte: '#FF7A3A', tinteOp: 0.1, vineta: 0.45, lluvia: '#FFD9C0', neon: ['#FF9A5A', '#FF4FA8'], exposicion: 1.1 },
  'mapa-frio': { nombre: 'Mapa frío', textos: ['#44E6FF', '#FFFFFF', '#B07CFF', '#FF4FA8'], acento: '#44E6FF', sub: '#B07CFF', contorno: '#070B26', tinte: '#1A3AFF', tinteOp: 0.1, vineta: 0.5, lluvia: '#9ADFFF', neon: ['#44E6FF', '#B07CFF'], exposicion: 1.0 },
};
export const tema = (n: string): Tema => { const t = TEMAS[n]; if (!t) throw new Error(`Tema «${n}» no existe (hay: ${Object.keys(TEMAS).join(', ')})`); return t; };
