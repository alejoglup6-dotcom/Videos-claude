# Videos verticales automáticos (Remotion + Three.js + GitHub Actions)

Genera videos de **30–40 s, 1080×1920, 30 fps** (TikTok / Reels / Shorts) **sin tu computadora y sin gastar dinero**:
tú pides el video, se escribe un *guion* (un archivo JSON), pulsas **Run workflow** en GitHub y el MP4 aparece para descargar.

## Cómo hacer un video desde el móvil

1. Pídele a Claude el video («hazme un video de 35 s sobre…»). Claude crea o edita `guiones/<nombre>.json` y lo sube al repositorio.
2. En el navegador del móvil abre el repositorio en GitHub → pestaña **Actions** → **Renderizar video** en la lista de la izquierda
   (en el móvil: toca el menú «☰ All workflows»).
3. Toca **Run workflow** (arriba a la derecha de la lista de ejecuciones) y rellena:
   - **guion**: el nombre del archivo sin `.json` (el de ejemplo es `vice-city-35s`).
   - **calidad**: `normal` (recomendado). `rapido` es un borrador; `alta` tarda más.
   - **voz**: activada = voz en off gratis con Piper.
   - **publicar_release**: actívalo si quieres descargar el MP4 directo (sin zip).
4. Toca el botón verde **Run workflow**. Espera ~6–9 min (se ve en amarillo; al terminar queda en verde ✔).
5. Entra a esa ejecución y baja hasta **Artifacts**. Toca **video-<guion>** → se descarga un `.zip` con el MP4 dentro
   (descomprímelo con «Archivos» en iPhone/Android). Con *publicar_release* lo tienes en **Releases** como MP4 normal.

> Los Artifacts caducan a los 14 días. Si tocas «Run workflow» y no aparece el botón, el workflow debe estar en la rama por defecto del repositorio.

## Qué es gratis y qué no (sin letra pequeña)

| Pieza | Cómo se resuelve | Coste |
|---|---|---|
| Render | GitHub Actions, runner `ubuntu-24.04` (CPU, sin GPU). 3D por software (WebGL con SwiftShader/ANGLE) | Gratis en repos **públicos**. En privados cuenta contra los minutos gratis de tu plan |
| 3D | Three.js + `@react-three/fiber` + `@remotion/three`, escenas estilizadas hechas con formas simples (no hay modelos descargados) | Gratis |
| Música | Synthwave **generada por código** a 120 bpm (`scripts/generar-audio.mjs`); los cortes caen en el pulso | Gratis, sin derechos de terceros |
| Efectos de sonido | Generados por código (impacto, whoosh, riser, glitch, ping, suave) | Gratis |
| Voz en off | **Piper** (open source, `es_MX-claude-high`) corriendo en el runner. Suena a voz sintética, no a locutor humano | Gratis |

**No es posible gratis (y no se intenta):** video generado por IA (Wan, Sora, etc.), voces de ElevenLabs/similares, GPU en la nube.
Tampoco hay modelos 3D realistas ni personas: los personajes son siluetas originales.

## Estructura

```
src/index.ts · src/Root.tsx      entrada de Remotion; el guion JSON son las "props"
src/compositions/VideoVertical.tsx  compone 3D + capas 2D + texto + subtítulos + audio
src/scenes/                      un componente React por tipo de escena (registro en scenes/index.tsx)
src/three/                       piezas 3D (cielo, edificios, autos, palmeras…) y Escenario3D (cámara, luces, niebla)
src/components/                  texto animado, subtítulos, transiciones, lluvia/partículas/neón, efectos, audio
src/themes/index.ts              temas visuales (colores de texto, tinte, viñeta)
src/camaras.ts                   cámaras con nombre
src/lib/                         tipos del guion, línea de tiempo, transiciones
guiones/                         los guiones (JSON)
scripts/                         validar, generar audio, voz, render
.github/workflows/               render-video.yml (el que usas) y comprobar.yml (revisa tipos y guiones)
public/audio/                    audio generado (no se sube a git)
remotion.config.ts · package.json · tsconfig.json
```

## El guion (JSON)

Cada escena dura 3–5 s (múltiplos de 0.5 s para que el corte caiga en el pulso de la música). Campos:

```jsonc
{
  "id": "mi-video", "titulo": "…", "tema": "neon-costero",     // temas: neon-costero · atardecer-dorado · mapa-frio
  "etiqueta": { "txt": "FAN VIDEO" },                           // sello opcional, siempre visible
  "audio": { "musica": { "generar": { "bpm": 120, "escala": "Am" }, "volumen": 0.55 }, "ducking": 0.5 },
  "fuentes": [ { "dato": "…", "estado": "verificado | no_verificado", "nota": "…" } ],
  "escenas": [{
    "id": "e1", "tipo": "vice", "variante": "aerea", "duracion": 3.5,   // tipos y variantes: ver src/scenes/index.tsx
    "camara": "vice-aerea",                                            // nombre de src/camaras.ts o {pos, mira, fov, empuje}
    "elementos": [{ "tipo": "lluvia" }, { "tipo": "particulas" }, { "tipo": "neon" }],
    "texto": { "contenido": "VICE CITY", "estilo": "slam", "sub": "…", "color": "#FF4FA8" },   // slam · letras · glitch · neon · escribir
    "animacion": { "shake": 0.6, "empuje": 20, "zoom_punch": true },
    "transicion": { "tipo": "flash", "duracion": 0.3 },     // corte · flash · zoom · whip · glitch · fade · slide · camara_rapida (así ENTRA la escena)
    "musica": { "intensidad": 0.9, "golpe": true, "riser": false },
    "sfx": ["impacto", { "nombre": "ping", "t": 2.5 }],     // impacto · riser_corto · riser · whoosh · glitch · suave · ping
    "voz": { "texto": "Bienvenido a Leonida.", "claves": ["Leonida"] }   // «claves» salen en píldora de color en los subtítulos
  }]
}
```

Tipos de escena: `vice` (aerea · calle · playa), `mapa` (costa · ciudad · pantano · carreteras), `persecucion` (detras · lateral · giro),
`atardecer` (orbita · helicoptero · costa), `fondo` (particulas · negro), `calle` (avenida · plaza · esquina), `interior` (mesa · ventana · estante),
`datos` (barras · cifra · ascenso; con `"datos": [..números..]`).

Antes de renderizar, el workflow valida el guion y te dice exactamente qué campo está mal.

## Probar en un ordenador (opcional)

```bash
npm ci
node scripts/validar-guion.mjs vice-city-35s
node scripts/generar-audio.mjs vice-city-35s
node scripts/render.mjs vice-city-35s --calidad rapido      # → out/vice-city-35s.mp4
npm run estudio                                              # vista previa interactiva de Remotion
```
Voz local: `pip install piper-tts==1.8.0`, descarga `es_MX-claude-high.onnx` y su `.json` de
`huggingface.co/rhasspy/piper-voices` a `modelos/`, y ejecuta `PIPER_PYTHON=python node scripts/voz-piper.mjs <guion>`.

## Video de ejemplo: «GTA 6: La nueva era de Vice City» (35 s)

Es un **fan video 100 % original**: sin logos, sin personas reales, sin personajes ni escenas de Rockstar; las siluetas, edificios y autos son formas propias.
Solo usa datos que Rockstar ha publicado (ver `fuentes` en el guion). Dos datos están marcados **no_verificado** y debes confirmarlos antes de publicar:
1. La frase «depender el uno del otro para sobrevivir» (no se localizó la redacción exacta en una fuente primaria).
2. «**Salió** el 19 de noviembre de 2026»: la fecha es la oficial, pero el pasado «salió» solo es cierto si el juego ya está a la venta el día que publiques.

## Video 2: «GTA 6: detalles que nadie esperaba» (37,5 s)

- Guion: `guiones/gta6-detalles-35s.json` · prompts: `guiones/gta6-detalles-35s.prompts.md` · voz ya generada: `public/voces/gta6-detalles-35s/`.
- Desde el móvil: Actions → **Renderizar video** → **Run workflow** → guion `gta6-detalles-35s`, calidad `normal`, **voz desactivada** (la voz de ElevenLabs ya está en el repositorio; Piper no se usa).
- Datos: cada curiosidad tiene su fuente en `fuentes` del guion. Dos ajustes respecto a la idea original, por no encontrarse en fuentes:
  «osos» se quitó de la lista de especies y «milkshake» se cambió por «vaso» (Kotaku confirma tirar el vaso vacío de una bebida al basurero).
- Fauna (perro, moto de agua, caimán, lagartija, vaso, basurero): piezas 3D procedurales propias (`src/three/fauna.tsx`); la biblioteca CC0 no trae animales.
- Música y efectos: generados por código (sin pistas externas ni licencias de terceros).
- Costo medido (renders cortos, 1 proceso): ~7,5 min estimados en esta máquina; en GitHub suele tardar algo más.

## Límites y avisos honestos

- **Tiempo de render:** medido localmente en 4 núcleos: ~5,5 min para los 35 s en calidad `normal`. En el runner depende de la máquina que te toque; el workflow corta a los 25 min.
- **Color grading:** el ffmpeg incluido en Remotion no trae filtros de corrección de color, así que el *grading* es tinte + viñeta + tonemapping del 3D, no un LUT.
- **Desenfoque de movimiento:** se simula con estelas y líneas de velocidad en los cortes (no es motion blur real por cuadro, que triplicaría el tiempo).
- **Calidad visual:** es 3D estilizado y ligero (low-poly neón), pensado para que se renderice en CPU en minutos; no es fotorrealista.
