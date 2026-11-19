#!/usr/bin/env bash
# Primer comando: genera un video vertical de prueba de 5 s (1080x1920, 30 fps) con audio y lo exporta en H.264/AAC listo para TikTok, Reels y Shorts.
#   ffmpeg/01_exportar_vertical_prueba.sh [salida.mp4]        (por defecto salida/prueba_vertical.mp4)
# Sin archivos de entrada: la imagen es un degradado animado y el audio un tono. Sustituye -f lavfi ... por tus propios -i video.mp4 -i audio.wav.
set -euo pipefail
SALIDA="${1:-salida/prueba_vertical.mp4}"; mkdir -p "$(dirname "$SALIDA")"
ffmpeg -hide_banner -y \
  -f lavfi -i "gradients=s=1080x1920:r=30:d=5:c0=0x1E0B52:c1=0xE0307A:nb_colors=2:speed=0.05" \
  -f lavfi -i "sine=frequency=440:duration=5:sample_rate=48000" \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.2 -pix_fmt yuv420p -maxrate 14M -bufsize 28M \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart -shortest "$SALIDA"
echo "listo: $SALIDA"
