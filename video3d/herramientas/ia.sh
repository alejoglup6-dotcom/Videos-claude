#!/usr/bin/env bash
# Envoltorio del plug-in animaciones-ia:  herramientas/ia.sh acabado|medir|hoja|musica ... (mismos argumentos que ia.py)
# Variables: IA_HERRAMIENTAS (carpeta herramientas/ del plug-in), IA_PYTHON (Python del entorno del plug-in)
set -euo pipefail
H="${IA_HERRAMIENTAS:-$(ls -d "$HOME"/.claude/plugins/cache/animaciones-con-ia/animaciones-ia/*/herramientas 2>/dev/null | sort -V | tail -1)}"
[ -n "$H" ] && [ -f "$H/ia.py" ] || { echo "No encuentro el plug-in animaciones-ia. Instálalo (ver README) o define IA_HERRAMIENTAS." >&2; exit 1; }
PY="${IA_PYTHON:-${ANIMACIONES_IA_DATOS:-${XDG_DATA_HOME:-$HOME/.local/share}/animaciones-ia}/env/bin/python}"
[ -x "$PY" ] || { echo "Falta el entorno del plug-in ($PY). Ejecútalo una vez con Python 3.10-3.12: python3.11 $H/ia.py instalar" >&2; exit 1; }
exec "$PY" "$H/ia.py" "$@"
