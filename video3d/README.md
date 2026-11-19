# video3d — videos verticales 9:16 con escenas 3D, sin tarjeta de video

Plantilla Remotion + three.js (se dibuja por CPU). Detalles del kit y mediciones: [LEEME.md](LEEME.md).

## Requisitos
- Node 22 o superior, ffmpeg y un Chromium/Chrome (si no está en el PATH: `NAVEGADOR=/ruta/al/navegador`).
- Python 3.10 o superior (se probó con 3.13; si `faster-whisper` no instala, `instalar.sh` usa `uv` para bajar 3.11).
- Red hacia: `registry.npmjs.org`, `pypi.org`, Hugging Face (`huggingface.co` y sus servidores de descarga, p. ej. `cdn-lfs.huggingface.co`, `cas-bridge.xethub.hf.co`) y, para la voz, `api.elevenlabs.io`.
- No necesita permisos de administrador.

## Instalar
```bash
./instalar.sh            # npm ci + entorno de Python (.venv) + modelo whisper large-v3-turbo (~1,6 GB, en modelos/)
./instalar.sh --kokoro   # además Kokoro, voz abierta opcional (~6 GB; en español también pide espeak-ng)
```
Es idempotente: se puede repetir sin volver a descargar nada.
Variables: `NAVEGADOR`, `PYTHON`, `MODELOS_DIR` (por defecto `video3d/modelos`).

## Hacer un video
Los scripts de voz y música se corren **desde la carpeta de tu proyecto** (donde está `guion.json`) y usan el Python de `.venv`.
1. **Guion:** `guion.json` con frases (`id`, `bloque`, `texto`) y `fuentes.md` (marca como DUDA lo no confirmado).
2. **Voz:** `export ELEVENLABS_API_KEY=...`, luego `python3 herramientas/voz_elevenlabs.py <voice_id> 1.1 --simulacro` (valida y muestra cuántos caracteres gastaría, sin llamar a la API) y, si todo está bien, sin `--simulacro`.
   Genera `voz/narracion_raw.wav` y `voz/tiempos.json`. Guarda cada respuesta en `voz/r_<id>.json` antes de procesarla y la reutiliza si el texto no cambió (no vuelve a gastar créditos). Hay un guion de ejemplo en `ejemplos/guion_ejemplo.json` (`--guion ruta` para usarlo).
   La respuesta guardada solo se reutiliza si coinciden texto, voz, modelo, idioma y ajustes (`--modelo`, `--idioma`, `--estabilidad`, `--similitud`, `--estilo`, velocidad); si cambia algo, vuelve a llamar.
   `ELEVENLABS_BASE_URL` cambia la dirección de la API (solo para pruebas).
   Si existe `voz/r_<id>.json` sin su `.meta.json`, se detiene (no se sabe con qué voz y ajustes se generó); `--reutilizar-sin-meta` la reutiliza bajo tu responsabilidad. Rangos: velocidad 0.7-1.2; estabilidad, similitud y estilo 0-1 (se validan antes de llamar).
   Con Kokoro: `voz_kokoro.py` y luego `tiempos_whisper.py` (usa `MODELOS_DIR`).
   Después limita los picos de la voz: `./herramientas/limitar_voz.sh` → `voz/narracion.wav` (para que la mezcla no pase de −1 dBTP).
3. **Música:** `python3 herramientas/musica_synthwave.py` → `audio/musica.wav` y `audio/efectos.wav`.
4. **Contenido del video:** parte de un borrador automático: `node herramientas/nuevo_video.mjs --tiempos voz/tiempos.json --salida video.config.json` (reparte tomas por duración, elige decorados y cámaras, saca textos y palabras clave del guion; `--decorados a,b`, `--toma-seg 1.8`, `--etiqueta "..."`; no sobrescribe sin `--forzar`). Antes de renderizar, **valídalo**: `node herramientas/validar_config.mjs --config video.config.json --tiempos voz/tiempos.json` (frases, decorados, variantes, cámaras, textos, orden, duración de las tomas y palabras clave; no renderices si dice ERROR).
   Después retócalo a mano: edita `plantilla/src/video.config.json` (o crea el tuyo; ejemplo en `ejemplos/villaluna/video.config.json`): por cada toma, la frase, el `decorado` (y su `variante`), la `camara` (nombre de `plantilla/src/camaras.json` o valores propios) y el `texto` grande; además las palabras clave de cada frase, los colores de las píldoras y la etiqueta fija. Los decorados y sus variantes están en `plantilla/src/escena3d/decorados.tsx`. Ya no se edita código para cambiar de tema, salvo que necesites un decorado nuevo.
5. **Render:** `node herramientas/render.mjs --modo borrador|normal|final [--frames 0-59] [--salida ruta.mp4]`
   con tu contenido: `--config mi.config.json --tiempos voz/tiempos.json` (o `--ejemplo villaluna`); sin esas opciones usa `plantilla/src/video.config.json` y `tiempos.json` (el ejemplo de GTA 6).
   Funciona desde cualquier carpeta; salida por defecto `plantilla/salida/render.mp4`; `--proyecto` o `VIDEO3D_PROYECTO` para otra plantilla.
6. **Mezcla y medición:** `herramientas/ia.sh acabado|medir|hoja ...` (plug-in, ver abajo) o los reemplazos con ffmpeg.

### Sin el plug-in (ffmpeg)
```bash
# acabado: voz + música 18 dB abajo, a -14 LUFS, pegada al video
ffmpeg -i render.mp4 -i voz/narracion.wav -i audio/musica.wav -filter_complex \
 "[2:a]volume=-18dB[m];[1:a][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest final.mp4
# medir: volumen, picos y duración
ffmpeg -nostats -i final.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:"; ffprobe -v error -show_entries format=duration -of csv=p=0 final.mp4
# hoja de contacto: un cuadro por segundo
ffmpeg -i final.mp4 -vf "fps=1,scale=270:-1,tile=6x4" -frames:v 1 hoja.png
```
(La comparación de la transcripción contra el guion, que hace `medir`, no tiene reemplazo simple: usa `faster-whisper` del `.venv`.)

## Pruebas
Sin red ni créditos: `node pruebas/prueba_validador.mjs` (45 comprobaciones del validador), `node pruebas/prueba_generador.mjs [--con-render]` (generador) y `python3 pruebas/prueba_voz_sin_creditos.py` (voz).
`cd plantilla && npm run tipos` revisa los tipos con `tsc --noEmit`. `herramientas/comparar_cuadros.sh carpetaA carpetaB` compara cuadros PNG (SSIM y PSNR con ffmpeg), útil para comprobar que un cambio de código no altera la imagen.
`python3 pruebas/prueba_voz_sin_creditos.py` prueba la ruta de voz contra un servidor local falso (sin red, sin clave, sin créditos): que la respuesta se guarda antes de procesarla, que se reutiliza con 0 llamadas y qué cambios obligan a llamar de nuevo.

## Plug-in `animaciones-ia` (opcional)
```bash
claude plugin marketplace add davidviraliza/animaciones-ia
claude plugin install animaciones-ia@animaciones-con-ia
python3.11 <carpeta-del-plugin>/herramientas/ia.py instalar   # una vez; pide Python 3.10-3.12 (~2 min, ~1,6 GB)
```
`herramientas/ia.sh` lo localiza solo (o `IA_HERRAMIENTAS` / `IA_PYTHON`).

## Qué NO incluye el repo
- Claves (`ELEVENLABS_API_KEY` va en el entorno o en un secreto, nunca en archivos).
- Modelos (`modelos/`, `.venv/`), `node_modules`, renders (`salida/`), voz y audios: están en `.gitignore`.
- El plug-in `animaciones-ia` ni su entorno de Python.

## Límites
- El 3D se dibuja por CPU y es estilizado, no fotorrealista.
- Con ElevenLabs gratis solo funcionan las voces predefinidas.
- Quien revisa el resultado sin verlo ni oírlo solo puede mirar cuadros fijos y mediciones.
