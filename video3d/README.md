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
2. **Voz:** `export ELEVENLABS_API_KEY=...` y `python3 herramientas/voz_elevenlabs.py <voice_id> 1.1` → `voz/narracion.wav` y `voz/tiempos.json`.
   Con Kokoro: `voz_kokoro.py` y luego `tiempos_whisper.py` (usa `MODELOS_DIR`).
3. **Música:** `python3 herramientas/musica_synthwave.py` → `audio/musica.wav` y `audio/efectos.wav`.
4. Copia `tiempos.json` a `plantilla/src/tiempos.json` y ajusta `PLAN`, `DEFS`, `TEXTOS` y `CLAVES` en `plantilla/src/`.
5. **Render:** `node herramientas/render.mjs --modo borrador|normal|final [--frames 0-59] [--salida ruta.mp4]`
   (funciona desde cualquier carpeta; salida por defecto `plantilla/salida/render.mp4`; `--proyecto` o `VIDEO3D_PROYECTO` para otra plantilla).
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
