#!/usr/bin/env bash
# Corre todas las pruebas del pipeline (sin red, sin GPU, sin créditos). Código de salida 1 si alguna falla.
#   pruebas/todo.sh [--rapido]     --rapido omite la prueba de punta a punta (~3 min) y la de Blender real
# Variables: PYTHON (por defecto python3; debe tener requests y jsonschema), BLENDER (para la prueba real de Blender; si falta, esa prueba se omite).
set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; RAIZ="$(dirname "$AQUI")"; PY="${PYTHON:-python3}"
RAPIDO=0; for a in "$@"; do case "$a" in --rapido) RAPIDO=1;; -h|--help) sed -n 2,5p "$0"; exit 0;; *) echo "Opción desconocida: $a" >&2; exit 2;; esac; done
"$PY" -c "import requests, jsonschema" 2>/dev/null || { echo "Faltan dependencias para $PY: pip install -r $RAIZ/requirements.txt" >&2; exit 2; }
command -v ffmpeg >/dev/null || { echo "ffmpeg no está en el PATH" >&2; exit 2; }
FALLAS=(); TOTAL=0; T0=$(date +%s); LOG="$(mktemp -d)"; trap 'rm -rf "$LOG"' EXIT
corre() { local n="$1"; shift; TOTAL=$((TOTAL+1)); local t=$(date +%s)
  if (cd "$AQUI" && "$@") >"$LOG/$TOTAL.log" 2>&1; then printf '  [OK]    %-46s %4d s  %s\n' "$n" $(( $(date +%s)-t )) "$(grep -E '^Ran ' "$LOG/$TOTAL.log" | head -1)"
  else printf '  [FALLA] %-46s %4d s\n' "$n" $(( $(date +%s)-t )); FALLAS+=("$n"); grep -E "^(FAIL|ERROR)|Error|Assertion" "$LOG/$TOTAL.log" | head -8 | sed 's/^/      /' >&2; tail -4 "$LOG/$TOTAL.log" | sed 's/^/      /' >&2; fi; }
sintaxis() { for f in "$RAIZ"/ffmpeg/*.sh "$AQUI"/*.sh; do bash -n "$f" || return 1; done; "$PY" - "$RAIZ"/vidgen/*.py "$RAIZ"/vidgen/backends/*.py "$RAIZ"/blender/*.py "$RAIZ"/comfy/*.py "$AQUI"/*.py <<'PY'
import sys
for f in sys.argv[1:]: compile(open(f, encoding='utf-8').read(), f, 'exec')
PY
}
echo "Pruebas del pipeline:"
corre "sintaxis (.sh y .py)" bash -c "$(declare -f sintaxis); RAIZ='$RAIZ'; AQUI='$AQUI'; PY='$PY'; sintaxis"
for t in guion efectos unir audio exportar recetas comfy; do corre "test_$t" "$PY" -m unittest "test_$t"; done
corre "test_blender (parámetros; render real si hay Blender)" "$PY" -m unittest test_blender
[ "$RAPIDO" = 1 ] || corre "test_e2e (CLI etapa por etapa, 1080x1920)" "$PY" -m unittest test_e2e
echo; if [ ${#FALLAS[@]} -eq 0 ]; then echo "TODO OK: $TOTAL grupos en $(( $(date +%s)-T0 )) s"; exit 0; fi
echo "FALLARON ${#FALLAS[@]} de $TOTAL:"; for f in "${FALLAS[@]}"; do echo "  - $f"; done; exit 1
