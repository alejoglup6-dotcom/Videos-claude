#!/usr/bin/env bash
# Corre TODAS las pruebas del kit que no gastan créditos ni usan la API real. Sale con código 1 si alguna falla.
#   pruebas/todo.sh [--sin-render]     (--sin-render omite las que renderizan: generador con render y decorados; tarda ~15 s en vez de ~2 min)
# Requisitos: instalar.sh ya ejecutado (node_modules y .venv no son obligatorios para las pruebas de Node; la de voz usa python3 del sistema).
set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; RAIZ="$(dirname "$AQUI")"
SIN_RENDER=0; for a in "$@"; do case "$a" in --sin-render) SIN_RENDER=1;; -h|--help) sed -n 2,4p "$0"; exit 0;; *) echo "Opción desconocida: $a" >&2; exit 2;; esac; done
[ -d "$RAIZ/plantilla/node_modules" ] || { echo "Faltan dependencias: ejecuta primero $RAIZ/instalar.sh" >&2; exit 2; }
command -v node >/dev/null && command -v ffmpeg >/dev/null || { echo "Se necesitan node y ffmpeg en el PATH." >&2; exit 2; }
LOG="$(mktemp -d)"; trap 'rm -rf "$LOG"' EXIT
FALLAS=(); TOTAL=0; T0=$(date +%s)
corre() {  # corre "nombre" comando...
  local nombre="$1"; shift; TOTAL=$((TOTAL+1)); local t=$(date +%s)
  if (cd "$RAIZ" && "$@") >"$LOG/$TOTAL.log" 2>&1; then printf '  [OK]    %-52s %3d s\n' "$nombre" $(( $(date +%s)-t ))
  else printf '  [FALLA] %-52s %3d s\n' "$nombre" $(( $(date +%s)-t )); FALLAS+=("$nombre"); { echo "    ---- salida de «$nombre» (últimas líneas) ----"; grep -E "FALLA|ERROR|error|Error" "$LOG/$TOTAL.log" | head -8 | sed 's/^/    /'; tail -6 "$LOG/$TOTAL.log" | sed 's/^/    /'; } >&2; fi
}
sintaxis_py() { python3 - "$RAIZ"/herramientas/*.py "$RAIZ"/pruebas/*.py <<'PY'
import sys
for f in sys.argv[1:]: compile(open(f, encoding='utf-8').read(), f, 'exec')
PY
}
sintaxis_sh() { for f in "$RAIZ"/*.sh "$RAIZ"/herramientas/*.sh "$RAIZ"/pruebas/*.sh; do bash -n "$f" || return 1; done; }
sintaxis_js() { for f in "$RAIZ"/herramientas/*.mjs "$RAIZ"/pruebas/*.mjs "$RAIZ"/plantilla/*.mjs; do node --check "$f" || return 1; done; }
echo "Pruebas del kit (sin créditos):"
corre "sintaxis de scripts (.sh, .mjs, .py)" bash -c "$(declare -f sintaxis_sh sintaxis_js sintaxis_py); RAIZ='$RAIZ'; sintaxis_sh && sintaxis_js && sintaxis_py"
corre "tipos (npm run tipos)" bash -c "cd plantilla && npm run tipos"
corre "validador de configuración" node pruebas/prueba_validador.mjs
if [ "$SIN_RENDER" = 1 ]; then corre "generador de borrador (sin render)" node pruebas/prueba_generador.mjs; else corre "generador de borrador (con render de 3 cuadros)" node pruebas/prueba_generador.mjs --con-render; corre "decorados genéricos (render de 15 cuadros)" node pruebas/prueba_decorados.mjs; fi
corre "voz con servidor falso (python)" python3 pruebas/prueba_voz_sin_creditos.py
echo
if [ ${#FALLAS[@]} -eq 0 ]; then echo "TODO OK: $TOTAL pruebas en $(( $(date +%s)-T0 )) s"; exit 0; fi
echo "FALLARON ${#FALLAS[@]} de $TOTAL:"; for f in "${FALLAS[@]}"; do echo "  - $f"; done; exit 1
