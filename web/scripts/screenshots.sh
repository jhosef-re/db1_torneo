#!/usr/bin/env bash
# scripts/screenshots.sh
# Regenera las capturas PNG de las vistas con Brave Browser headless.
#
# Requisitos:
#   - brave-browser instalado y accesible en /opt/brave.com/brave/brave-browser
#     (o en PATH como "brave-browser").
#   - MySQL con la base `campeonato_futbol` cargada y accesible para
#     `app_campeonato@127.0.0.1`.
#
# Uso:
#   npm run dev        # en otra terminal
#   npm run screenshots

set -e

# Detecta brave-browser automáticamente
if command -v brave-browser >/dev/null 2>&1; then
  BROWSER=$(command -v brave-browser)
elif [ -x "/opt/brave.com/brave/brave-browser" ]; then
  BROWSER="/opt/brave.com/brave/brave-browser"
else
  echo "✗ No se encuentra brave-browser. Instálalo o añade su ruta a \$PATH." >&2
  exit 1
fi

# URL del dev server (puerto 4321 por defecto).
URL="${BASE_URL:-http://localhost:4321}"
OUT=".docs/screens"

# Comprueba que el dev server responde (puede ser localhost o 127.0.0.1)
if ! curl -sS -o /dev/null --max-time 3 "$URL/"; then
  echo "✗ El dev server no responde en $URL. Arranca 'npm run dev' primero." >&2
  exit 1
fi

mkdir -p "$OUT"
# Limpia capturas antiguas
rm -f "$OUT"/*.png

shoot() {
  local path="$1"
  local name="$2"
  echo "  ▸ $name ($path)"
  "$BROWSER" \
    --headless --disable-gpu --no-sandbox \
    --hide-scrollbars \
    --window-size=1280,720 \
    --virtual-time-budget=3000 \
    --screenshot="$OUT/$name.png" \
    "$URL$path" >/dev/null 2>&1
}

shoot "/"                 "v1-posiciones"
shoot "/calendario"       "v2-calendario"
shoot "/calendario?jornada=3&estado=jugado" "v2-calendario-j3"
shoot "/goleadores"        "v3-goleadores"
shoot "/partidos/1"        "v4-partido-jugado"
shoot "/partidos/49"       "v4-partido-pendiente"
shoot "/partidos/9999"     "v4-partido-404"
shoot "/equipos/1"         "v5-equipo"

echo
echo "✔ Capturas generadas en $OUT/"
ls "$OUT" | sed 's/^/  /'
