# Ejemplo: «GTA 6: La nueva era de Vice City» (8 escenas, 38,8 s)

Video fan de comentario sobre un videojuego, con **decorados originales** (sin logos, sin marcas gráficas, sin personas reales; la pareja son siluetas sin rostro).

| Archivo | Qué es |
|---|---|
| `guion.json` | las 8 frases de voz en off, literales, 539 caracteres |
| `tiempos.json` | salida real de `voz_elevenlabs.py` (voz Liam, velocidad 1.15): 38,78 s |
| `video.config.json` | 14 tomas: decorados `vice`, `mapa`, `persecucion`, `atardecer` y `fondo` |
| `efectos.json` | efectos de sonido por escena para `herramientas/efectos_escenas.py` |

Render: `node herramientas/render.mjs --modo normal --ejemplo vice` (sin audio; ver README para voz, música, efectos, limitador y `acabado`).

## Decisiones y límites (honestos)
- **Duración:** el guion dice «35 segundos» pero sus escenas suman 40 s; se siguió el texto de las escenas y la voz real dura 38,8 s.
- **Hechos sin verificar, dejados literales por decisión del autor:** «GTA 6 llegó el 19 de noviembre de 2026» (las fuentes encontradas solo dicen que está *programado* para esa fecha) y «Rockstar lo describe como la evolución más grande e inmersiva de la saga» (no se halló esa cita).
- **Nombres comerciales:** no hay logos, pero los textos del guion nombran GTA, Rockstar, PS5 y Xbox, y los subtítulos los repiten.
- **Pronunciación:** `medir` marca 3 de 105 palabras distintas (2,86 %): la voz lee «GTA 6» como «GTA vi» y «X|S» de forma rara. No se regeneró para no gastar más créditos.
- **Cortes:** la mayoría de las tomas dura de 2,5 a 4,5 s; la 2.ª escena se partió en 2 tomas de 2,5 s y el montaje final en 3 de 1,3 s. El golpe de bajo suena en cada corte.
- **Sonido:** música synthwave del kit (no «épica»); sirenas, lluvia, motor, llantas, whoosh, glitch e impactos son síntesis sencilla. No se oyó el resultado.
- **No hay** flash blanco ni fade a negro entre escenas (el kit alterna destello, latigazo, glitch y zoom por corte).
