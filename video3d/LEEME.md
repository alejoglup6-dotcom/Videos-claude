# Kit de video 3D (Remotion + three.js) — versión 2

Plantilla y herramientas para hacer videos verticales 9:16 con escenas 3D, textos animados, transiciones y efectos, **sin tarjeta de video**
(todo se dibuja por CPU). Sale de producir los videos «La Tierra tuvo fiebre» y «GTA 6 · 3 rumores».

## Qué hay
```
plantilla/                       proyecto Remotion listo (copiar, npm install, editar)
  src/Video.tsx                  composición: tomas, textos, subtítulos, efectos
  src/escena3d/Escena.tsx        cámara por tomas (zoom + latigazo) y decorados
  src/escena3d/Piezas.tsx        modelos: palmeras, farolas, nubes, edificios, auto, persona, OVNI, Bigfoot, perro, moto, torre, art déco…
  src/lib/textoImg.tsx           texto rasterizado UNA vez (contorno + brillo neón)
  src/lib/textoAnim.tsx          Letras · Slam · Sello · TextoGlitch · NeonParpadeo · Escribir
  src/lib/efectos.tsx            LineasVelocidad · Aberracion · EstelaLatigazo · Glitch · FugaDeLuz · Destello · Grano (opcional)
  src/lib/transiciones.ts        latigazo(t) y tipo de corte por toma
  src/calidad.ts                 interruptores de velocidad/calidad (se leen de REMOTION_*)
  herramientas/render.mjs        render con modos borrador / normal / final y acabado (viñeta + grano en ffmpeg)
herramientas/
  voz_elevenlabs.py              narración por frase con ElevenLabs (tiempos exactos por letra, pausas por bloque)
  voz_kokoro.py + tiempos_whisper.py   alternativa abierta (Kokoro) y alineación palabra por palabra con faster-whisper
  musica_synthwave.py            música synthwave con golpes de bajo en cada dato
```

## Flujo
1. `guion.json` (frases con `id`, `bloque`, `texto`) y `fuentes.md` (marca como DUDA lo que no puedas confirmar).
2. Voz → `voz/narracion.wav` y `voz/tiempos.json` (`python3 herramientas/voz_elevenlabs.py <voice_id> 1.1`).
3. Música → `audio/musica.wav` y `audio/efectos.wav`.
4. Copiar `tiempos.json` a `plantilla/src/tiempos.json`; ajustar `PLAN`, `DEFS` (cámaras), `TEXTOS` y `CLAVES`.
5. `node herramientas/render.mjs --modo borrador` para revisar; luego `--modo normal` (o `final`).
6. Mezcla final con el plugin (`ia.py acabado`) y medición (`ia.py medir`).

## Velocidad: medido, no supuesto (60 cuadros de la escena más pesada, 3 núcleos, sin GPU)
| Cambio | Tiempo |
|---|---|
| Sistema anterior | 76 s |
| + texturas de edificios y carretera en caché (se recreaban en cada cuadro) | 63 s |
| + 3D al 75 % y sin antialias; anisotropía 1 | 35 s |
| + texto grande rasterizado una vez (las sombras desenfocadas por CSS costaban ~18 s de 34) | ~31 s |
| Sistema nuevo con modelos, efectos y transiciones extra | 31 s |
Modos de `render.mjs` en esas mismas pruebas: borrador 20 s · normal 31 s · final 43 s.
Video completo de 35 s (1046 cuadros): antes ~17 min; ahora ~6.8 min en modo normal.

Hallazgos útiles:
- `mix-blend-mode: overlay` a pantalla completa costaba ~13 s de cada 44 → el grano y la viñeta se aplican al final con ffmpeg.
- Los materiales Lambert no aceleraron nada: el sombreado no era el límite.
- Concurrencia: usa núcleos−1; más procesos no ayudan con SwiftShader.
- Para medir una capa, `REMOTION_SIN=txt,sub,grano,vel,estela,glitch,fuga,ab` y `REMOTION_SIN3D=1` las apagan.

## Límites honestos
- Es 3D estilizado con primitivas, no fotorrealista. Los modelos más débiles son el edificio art déco y las caras.
- Con ElevenLabs gratis solo funcionan las voces predefinidas (acento no latino); las de biblioteca y la creación de voces piden plan de pago.
- No puedo ver el movimiento ni oír el audio: solo reviso cuadros fijos y mediciones.
