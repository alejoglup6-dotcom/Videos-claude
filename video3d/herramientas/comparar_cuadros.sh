#!/usr/bin/env bash
# Compara dos carpetas de cuadros PNG con el mismo nombre y muestra SSIM y PSNR por cuadro (ffmpeg).
#   herramientas/comparar_cuadros.sh <carpetaA> <carpetaB>
# idéntico = PSNR infinito · equivalente = SSIM >= 0.9999 y PSNR >= 60 dB (ruido de render: dos pasadas del mismo código ya
# no son idénticas bit a bit) · DIFIERE = cualquier otra cosa. Código de salida 1 si algún cuadro DIFIERE o falta.
set -euo pipefail
A="${1:?uso: comparar_cuadros.sh carpetaA carpetaB}"; B="${2:?uso: comparar_cuadros.sh carpetaA carpetaB}"
n=0; dif=0
for fa in "$A"/*.png; do
  nombre="$(basename "$fa")"; fb="$B/$nombre"
  [ -f "$fb" ] || { echo "$nombre: FALTA en $B"; dif=$((dif+1)); continue; }
  salida="$(ffmpeg -hide_banner -nostats -i "$fa" -i "$fb" -lavfi "[0:v][1:v]ssim;[0:v][1:v]psnr" -f null - 2>&1)"
  ssim="$(grep -o ' All:[0-9.]*' <<<"$salida" | tail -1 | cut -d: -f2 || true)"; psnr="$(grep -o 'average:[a-z0-9.]*' <<<"$salida" | tail -1 | cut -d: -f2 || true)"
  n=$((n+1)); marca="DIFIERE"
  if [ "$psnr" = "inf" ]; then marca="idéntico"
  elif awk -v s="${ssim:-0}" -v p="${psnr:-0}" 'BEGIN{exit !(s>=0.9999 && p>=60)}'; then marca="equivalente"; fi
  [ "$marca" = "DIFIERE" ] && dif=$((dif+1))
  printf '%-14s SSIM %s  PSNR %s dB  %s\n' "$nombre" "${ssim:-?}" "${psnr:-?}" "$marca"
done
echo "$n cuadros comparados, $dif con diferencias"; [ "$dif" -eq 0 ]
