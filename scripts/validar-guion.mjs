// Valida un guion antes de gastar minutos de render. Uso: node scripts/validar-guion.mjs vice-city-35s
import { leerGuion, catalogo, TRANSICIONES, ESTILOS, ELEMENTOS, SFX } from './comun.mjs';

export const validar = (g) => {
  const err = [], av = [];
  const { tipos, camaras, temas } = catalogo();
  if (!g.id || !/^[a-z0-9-]+$/.test(g.id)) err.push('id: obligatorio, solo minúsculas, números y guiones');
  if (!temas.includes(g.tema)) err.push(`tema «${g.tema}» no existe (hay: ${temas.join(', ')})`);
  if (!Array.isArray(g.escenas) || !g.escenas.length) { err.push('escenas: debe haber al menos una'); return { err, av, total: 0 }; }
  let total = 0; const ids = new Set();
  g.escenas.forEach((e, i) => {
    const n = `escenas[${i}] «${e.id ?? '?'}»`;
    if (!e.id) err.push(`${n}: falta id`); else if (ids.has(e.id)) err.push(`${n}: id repetido`); else ids.add(e.id);
    if (!(e.duracion > 0)) err.push(`${n}: duracion debe ser > 0`); else {
      total += e.duracion;
      if (e.duracion < 3 || e.duracion > 5.5) av.push(`${n}: dura ${e.duracion} s (lo ideal es 3–5 s para mantener el ritmo)`);
      if (Math.abs(e.duracion * 2 - Math.round(e.duracion * 2)) > 1e-9) av.push(`${n}: duración no múltiplo de 0.5 s (los cortes no caerán en el pulso de la música a 120 bpm)`);
    }
    if (!tipos[e.tipo]) err.push(`${n}: tipo «${e.tipo}» no existe (hay: ${Object.keys(tipos).join(', ')})`);
    else if (e.variante && !tipos[e.tipo].includes(e.variante)) err.push(`${n}: «${e.tipo}» no tiene variante «${e.variante}» (hay: ${tipos[e.tipo].join(', ')})`);
    if (typeof e.camara === 'string' && !camaras.includes(e.camara)) err.push(`${n}: cámara «${e.camara}» no existe (hay: ${camaras.join(', ')})`);
    if (e.transicion && !TRANSICIONES.includes(e.transicion.tipo)) err.push(`${n}: transición «${e.transicion.tipo}» no existe (hay: ${TRANSICIONES.join(', ')})`);
    if (e.texto) {
      if (!e.texto.contenido) err.push(`${n}: texto sin contenido`);
      else if (e.texto.contenido.length > 22) av.push(`${n}: texto de ${e.texto.contenido.length} letras; se verá pequeño (ideal ≤ 18)`);
      if (e.texto.estilo && !ESTILOS.includes(e.texto.estilo)) err.push(`${n}: estilo de texto «${e.texto.estilo}» no existe (hay: ${ESTILOS.join(', ')})`);
    } else av.push(`${n}: sin texto en pantalla`);
    (e.elementos ?? []).forEach((x) => { if (!ELEMENTOS.includes(x.tipo)) err.push(`${n}: elemento «${x.tipo}» no existe (hay: ${ELEMENTOS.join(', ')})`); });
    (e.sfx ?? []).forEach((s) => { const nom = typeof s === 'string' ? s : s.nombre; if (!SFX.includes(nom)) err.push(`${n}: sfx «${nom}» no existe (hay: ${SFX.join(', ')})`); });
    if (e.voz?.texto) {
      const pal = e.voz.texto.trim().split(/\s+/).length; const dispo = e.duracion - (e.voz.inicio ?? 0.15) - 0.2;
      if (pal / 3.2 > dispo) av.push(`${n}: la voz (${pal} palabras) puede no caber en ${e.duracion} s; la voz se acelerará o conviene acortar el texto`);
    }
  });
  if (total < 30 || total > 40) av.push(`duración total ${total} s (objetivo: 30–40 s)`);
  const t0 = g.escenas[0]?.duracion; if (t0 > 3.5) av.push('la primera escena dura más de 3.5 s: el gancho visual debe pasar en los primeros 2 s');
  (g.fuentes ?? []).filter((f) => f.estado === 'no_verificado').forEach((f) => av.push(`dato SIN VERIFICAR: ${f.dato}`));
  return { err, av, total };
};

if (process.argv[1] && process.argv[1].endsWith('validar-guion.mjs')) {
  const nombre = process.argv[2]; if (!nombre) { console.error('Uso: node scripts/validar-guion.mjs <guion>'); process.exit(2); }
  try {
    const { guion } = leerGuion(nombre); const r = validar(guion);
    r.av.forEach((a) => console.log('⚠ ' + a)); r.err.forEach((e) => console.log('✗ ' + e));
    console.log(r.err.length ? `\nGuion NO válido (${r.err.length} errores)` : `\nGuion válido: ${guion.escenas.length} escenas, ${r.total} s`);
    process.exit(r.err.length ? 1 : 0);
  } catch (e) { console.error(e.message); process.exit(2); }
}
