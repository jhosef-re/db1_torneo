#!/usr/bin/env bash
# scripts/curl_sondas.sh
# Comprueba a mano cada endpoint de /api (usado durante A5 para depurar).
set -e
BASE=http://localhost:4321/api

run() {
  local method="$1"; shift
  local path="$1";   shift
  local note="$1";   shift
  echo
  echo "── ${note}"
  echo "   ${method} ${path}"
  curl -sS -o /tmp/last.json -w "HTTP %{http_code}\n" -X "$method" "${BASE}${path}"
  head -c 400 /tmp/last.json; echo
}

# Sano y conteos
run GET    /salud                              'salud 200'
run GET    /posiciones                         'posiciones total=12'
run GET    /calendario                         'calendario total=132'
run GET    '/calendario?estado=pendiente'      'calendario pendientes total=84, resultado=null'
run GET    '/calendario?estado=jugado'         'calendario jugados total=48, resultado!=null'
run GET    '/calendario?jornada=3'             'calendario jornada=3 total=6'
run GET    '/calendario?jornada=23'            'calendario jornada=23 → 400 PARAMETRO_INVALIDO'
run GET    '/calendario?estado=otro'           'calendario estado=otro → 400 PARAMETRO_INVALIDO'
run GET    /goleadores                         'goleadores total=180 Σ=137'
run GET    /partidos/1                         'partido id=1 (jugado, 3 árbitros P,A1,A2)'
run GET    /partidos/49                        'partido id=49 (pendiente, resultado=null)'
run GET    /partidos/abc                       'partido id=abc → 400 PARAMETRO_INVALIDO'
run GET    /partidos/9999                      'partido id=9999 → 404 NO_ENCONTRADO'
run GET    /equipos                            'equipos total=12 cada uno con 15 jugadores'
run GET    /equipos/1                          'equipos/1 Aurora FC con 15 jugadores'
run GET    /equipos/9999                       'equipos/9999 → 404 NO_ENCONTRADO'

# 405
for path in /salud /posiciones /calendario /goleadores /partidos/1 /equipos /equipos/1; do
  run POST    "$path"  "POST $path → 405 con Allow: GET"
done
