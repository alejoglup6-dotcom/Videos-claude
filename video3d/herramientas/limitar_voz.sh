#!/usr/bin/env bash
# Limita los picos de la voz para que la mezcla final (ia.sh acabado) no pase de -1 dBTP.
#   herramientas/limitar_voz.sh [entrada=voz/narracion_raw.wav] [salida=voz/narracion.wav]
# Usa el filtro alimiter de ffmpeg (limit=0.6 · attack=2 ms · release=40 ms). Rutas relativas a la carpeta actual.
set -euo pipefail
ENTRADA="${1:-voz/narracion_raw.wav}"; SALIDA="${2:-voz/narracion.wav}"
[ -f "$ENTRADA" ] || { echo "No existe $ENTRADA (genera antes la voz con voz_elevenlabs.py)." >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg no está en el PATH." >&2; exit 1; }
ffmpeg -y -loglevel error -i "$ENTRADA" -af "alimiter=limit=0.6:attack=2:release=40" -c:a pcm_s16le "$SALIDA"
echo "voz limitada: $SALIDA"
