#!/usr/bin/env bash
# Instalación reproducible del kit de video 3D. Idempotente y sin permisos de administrador.
#   ./instalar.sh            plantilla + whisper (large-v3-turbo)
#   ./instalar.sh --kokoro   además Kokoro (voz abierta; ~6 GB con torch y modelo)
# Variables: NAVEGADOR (ruta a Chromium/Chrome), PYTHON (intérprete base), MODELOS_DIR (carpeta de modelos)
# Nota: av<17 porque faster-whisper 1.2.1 no abre archivos con av 19 (metadata_errors).
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$AQUI/.venv"; MODELOS_DIR="${MODELOS_DIR:-$AQUI/modelos}"
KOKORO=0; for a in "$@"; do case "$a" in --kokoro) KOKORO=1;; -h|--help) sed -n 2,6p "$0"; exit 0;; *) echo "Opción desconocida: $a" >&2; exit 2;; esac; done
ok(){ echo "  [OK] $*"; }; falla(){ echo "  [FALLA] $*" >&2; exit 1; }

echo "1/4 Requisitos"
command -v node >/dev/null || falla "Node no está instalado (se necesita 22 o superior)."
NV="$(node -p 'process.versions.node.split(".")[0]')"; [ "$NV" -ge 22 ] || falla "Node $(node -v): se necesita 22 o superior."
ok "Node $(node -v)"
command -v ffmpeg >/dev/null || falla "ffmpeg no está en el PATH."
ok "$(ffmpeg -version | head -1 | cut -d' ' -f1-3)"
NAV="${NAVEGADOR:-}"
if [ -z "$NAV" ]; then for n in chromium chromium-browser google-chrome google-chrome-stable chrome /opt/pw-browsers/chromium; do p="$(command -v "$n" 2>/dev/null || true)"; [ -z "$p" ] && [ -x "$n" ] && p="$n"; [ -n "$p" ] && { NAV="$p"; break; }; done; fi
[ -n "$NAV" ] && [ -x "$NAV" ] || falla "No encuentro Chromium/Chrome. Instálalo o define NAVEGADOR=/ruta/al/navegador."
ok "Navegador: $NAV"

echo "2/4 Plantilla (npm)"
cd "$AQUI/plantilla"
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund --loglevel=error; else npm install --no-audit --no-fund --loglevel=error; fi
ok "dependencias de la plantilla instaladas"

echo "3/4 Python y whisper"
PY="${PYTHON:-python3}"
prueba(){ "$VENV/bin/python" -I -c 'import faster_whisper, numpy, soundfile' 2>/dev/null; }
if [ ! -x "$VENV/bin/python" ] || ! prueba; then
  rm -rf "$VENV"; "$PY" -m venv "$VENV" 2>/dev/null || true
  [ -x "$VENV/bin/python" ] && "$VENV/bin/pip" install -q faster-whisper numpy soundfile "av<17" 2>/dev/null || true
  if ! prueba; then
    echo "  faster-whisper no instaló con $("$PY" --version 2>&1); pruebo Python 3.11 con uv"
    command -v uv >/dev/null || falla "faster-whisper no funciona con el Python del sistema y no hay 'uv' (pip install --user uv)."
    rm -rf "$VENV"; uv python install 3.11 && uv venv --python 3.11 "$VENV" && uv pip install -q --python "$VENV/bin/python" faster-whisper numpy soundfile "av<17"
    prueba || falla "faster-whisper no se pudo instalar ni con Python 3.11."
  fi
fi
ok "venv $("$VENV/bin/python" --version) con faster-whisper"
MOD="$MODELOS_DIR/whisper/large-v3-turbo"
if [ -f "$MOD/model.bin" ]; then ok "modelo ya descargado en $MOD"; else
  mkdir -p "$MOD"
  "$VENV/bin/python" -I -c "
from huggingface_hub import snapshot_download
snapshot_download('mobiuslabsgmbh/faster-whisper-large-v3-turbo', local_dir='$MOD')" \
    || falla "No pude descargar el modelo. Dominios necesarios: huggingface.co, cdn-lfs.huggingface.co, cas-bridge.xethub.hf.co y *.hf.co"
  ok "modelo descargado en $MOD"
fi

echo "4/4 Kokoro (opcional)"
if [ "$KOKORO" = 1 ]; then
  "$VENV/bin/pip" install -q kokoro soundfile numpy || falla "no pude instalar kokoro"
  "$VENV/bin/python" -I -c "from huggingface_hub import snapshot_download; snapshot_download('hexgrad/Kokoro-82M')" || falla "no pude bajar Kokoro-82M"
  ok "Kokoro instalado (para español también hace falta espeak-ng en el sistema)"
else echo "  omitido (usa --kokoro)"; fi
echo; echo "Listo. Render: node $AQUI/herramientas/render.mjs --modo borrador --frames 0-59"
