#!/usr/bin/env bash
# Recetas de FFmpeg para video vertical, una por subcomando. Son comandos sueltos (no necesitan Python) y cada una está probada por pruebas/test_recetas.py.
#   ffmpeg/recetas.sh <receta> <argumentos...>
#   vertical     entrada salida                 recorta/escala cualquier video a 1080x1920 sin deformar
#   zoom         entrada salida [z_final=1.3] [seg]       zoom de entrada con aceleración suave (ease-out)
#   shake        entrada salida [amplitud=0.02]            temblor de cámara
#   glitch       entrada salida [t=1] [dur=0.3]            desfase RGB + ruido solo en la ventana indicada
#   flash        entrada salida [t=1] [intensidad=0.9]     destello blanco que decae
#   motion_blur  entrada salida                            desenfoque de movimiento barato (mezcla de 3 cuadros)
#   bloom        entrada salida                            resplandor en las zonas claras (neón)
#   grade        entrada salida [neon|calido|frio]         color grading con curvas y balance de color + viñeta + grano
#   transicion   a b salida [tipo=fade] [dur=0.5]          transición xfade entre dos clips del mismo tamaño y fps (tipos: ffmpeg -h filter=xfade)
#   ducking      voz musica salida                         baja la música cuando habla la voz y normaliza a -14 LUFS
#   loudnorm     entrada salida [lufs=-14]                 normaliza el volumen (una pasada; el pipeline Python usa dos)
#   exportar     entrada salida                            H.264 High + AAC para TikTok/Reels/Shorts
set -euo pipefail
r="${1:?uso: recetas.sh <receta> ...}"; shift
dim() { ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$1"; }
case "$r" in
  vertical)    ffmpeg -hide_banner -y -i "$1" -vf "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,format=yuv420p" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  zoom)        IFS=, read -r W H D <<<"$(dim "$1")"; Z="${3:-1.3}"; T="${4:-$D}"
               ffmpeg -hide_banner -y -i "$1" -vf "scale=w='${W}*(1+(${Z}-1)*(1-pow(1-min(t/${T},1),3)))':h='${H}*(1+(${Z}-1)*(1-pow(1-min(t/${T},1),3)))':eval=frame:flags=bicubic,crop=${W}:${H}" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  shake)       IFS=, read -r W H D <<<"$(dim "$1")"; A="${3:-0.02}"
               ffmpeg -hide_banner -y -i "$1" -vf "scale=iw*(1+4*${A}):ih*(1+4*${A}),crop=${W}:${H}:x='(iw-${W})/2+${A}*${W}*(sin(t*43)+0.6*sin(t*97+1.3))':y='(ih-${H})/2+${A}*${W}*(cos(t*51)+0.6*sin(t*83+0.7))'" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  glitch)      T="${3:-1}"; D="${4:-0.3}"; EN="between(t,${T},${T}+${D})"
               ffmpeg -hide_banner -y -i "$1" -vf "rgbashift=rh=-14:bh=14:gv=7:edge=smear:enable='${EN}',noise=alls=50:allf=t:enable='${EN}'" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  flash)       T="${3:-1}"; I="${4:-0.9}"
               ffmpeg -hide_banner -y -i "$1" -vf "eq=brightness='min(1,${I}*exp(-20*(t-${T})))*gte(t,${T})':eval=frame" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  motion_blur) ffmpeg -hide_banner -y -i "$1" -vf "tmix=frames=3:weights='1 2 1'" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  bloom)       ffmpeg -hide_banner -y -i "$1" -filter_complex "[0:v]split[a][b];[b]lutrgb=r='if(gt(val,175),val,0)':g='if(gt(val,175),val,0)':b='if(gt(val,175),val,0)',gblur=sigma=18[c];[a][c]blend=all_mode=screen:all_opacity=0.55,format=yuv420p" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  grade)       case "${3:-neon}" in
                 neon)   G="eq=contrast=1.12:saturation=1.3:gamma=0.95,colorbalance=rs=-0.04:gs=-0.02:bs=0.08:rm=0.02:bm=0.05:rh=0.10:gh=-0.03:bh=-0.02,curves=all='0/0 0.2/0.14 0.6/0.62 1/1'" ;;
                 calido) G="eq=contrast=1.08:saturation=1.2,colorbalance=rs=0.06:bs=-0.05:rm=0.05:bm=-0.03:rh=0.08:bh=-0.06" ;;
                 frio)   G="eq=contrast=1.1:saturation=1.05,colorbalance=rs=-0.06:bs=0.08:rm=-0.02:bm=0.04:rh=0.07:gh=0.02:bh=-0.05" ;;
                 *) echo "grade: neon|calido|frio" >&2; exit 2 ;; esac
               ffmpeg -hide_banner -y -i "$1" -vf "${G},vignette=angle=PI/5,noise=alls=6:allf=t+u,format=yuv420p" -c:v libx264 -crf 14 -preset veryfast -c:a copy "$2" ;;
  transicion)  D="${5:-0.5}"; TIPO="${4:-fade}"; LA="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")"; OFF="$(python3 -c "print(max(0,${LA}-${D}))")"
               ffmpeg -hide_banner -y -i "$1" -i "$2" -filter_complex "[0:v][1:v]xfade=transition=${TIPO}:duration=${D}:offset=${OFF},format=yuv420p" -c:v libx264 -crf 14 -preset veryfast "$3" ;;
  ducking)     ffmpeg -hide_banner -y -i "$1" -i "$2" -filter_complex "[0:a]asplit=2[voz][sc];[1:a][sc]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=400[musd];[voz][musd]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -ac 2 "$3" ;;
  loudnorm)    ffmpeg -hide_banner -y -i "$1" -af "loudnorm=I=${3:--14}:TP=-1.5:LRA=11" -ar 48000 -ac 2 "$2" ;;
  exportar)    ffmpeg -hide_banner -y -i "$1" -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.2 -pix_fmt yuv420p -maxrate 14M -bufsize 28M -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$2" ;;
  *) echo "receta desconocida: $r (ver la cabecera de este archivo)" >&2; exit 2 ;;
esac
