#!/usr/bin/env bash
# scripts/a7_produccion.sh — Pruebas contra el build de producción (A7).
BASE=http://127.0.0.1:4321

run() {
  local method="$1"; shift
  local path="$1";   shift
  local note="$1";   shift
  echo
  echo "── ${note}"
  echo "   ${method} ${path}"
  curl -sS -o /tmp/last.body -w "HTTP %{http_code}\n" -X "$method" "${BASE}${path}"
  head -c 400 /tmp/last.body; echo
}

# Vistas
run GET    /                          'V1 Posiciones 200'
run GET    /calendario                'V2 Calendario 200 (todas)'
run GET    "/calendario?jornada=3"    'V2 Calendario jornada=3'
run GET    /calendario?estado=pendiente 'V2 Calendario pendientes'
run GET    /goleadores                'V3 Goleadores 200'
run GET    /partidos/1                'V4 Partido 1 (jugado)'
run GET    /partidos/49               'V4 Partido 49 (pendiente)'
run GET    /partidos/9999             'V4 Partido 9999 → 404'
run GET    /partidos/abc              'V4 Partido abc → 404'
run GET    /equipos/1                 'V5 Equipo 1 (Aurora)'
run GET    /equipos/12                'V5 Equipo 12 (Titanes)'
run GET    /equipos/9999              'V5 Equipo 9999 → 404'

# API
run GET    /api/salud                 'API salud 200'
run GET    /api/posiciones            'API posiciones 200'
run GET    /api/calendario            'API calendario 200'
run GET    "/api/calendario?jornada=3" 'API calendario jornada=3'
run GET    "/api/calendario?jornada=23" 'API calendario jornada=23 → 400'
run GET    /api/goleadores            'API goleadores 200'
run GET    /api/partidos/1            'API partido/1 200'
run GET    /api/partidos/49           'API partido/49 200 pendiente'
run GET    /api/partidos/abc          'API partido/abc → 400'
run GET    /api/partidos/9999         'API partido/9999 → 404'
run GET    /api/equipos               'API equipos 200'
run GET    /api/equipos/1             'API equipo/1 200'
run GET    /api/equipos/9999          'API equipo/9999 → 404'

# 405
for path in /api/salud /api/posiciones /api/calendario /api/goleadores \
            /api/partidos/1 /api/equipos /api/equipos/1; do
  run POST "$path" "POST $path → 405 Allow: GET"
done
