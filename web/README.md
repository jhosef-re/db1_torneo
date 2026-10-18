# App Web · Liga Universitaria del Valle · Campeonato 2026

> Aplicación **de solo lectura** sobre la base MySQL `campeonato_futbol`,
> construida según `SDD-App-Web-Campeonato.md`. Expone los mismos datos
> como **vistas HTML** (Astro SSR + Tailwind v4) y como **API REST JSON**
> (`snake_case`, `GET` solamente, UTF-8).

![checks 87/87](.docs/badges/checks.svg)
![astro check 0E/0W/0H](.docs/badges/astro-check.svg)
![build OK](.docs/badges/build.svg)
![A4 paridad 21/21](.docs/badges/a4.svg)
![A5 API 26/26](.docs/badges/a5.svg)
![A6 vistas 40/40](.docs/badges/a6.svg)
![A1 aislamiento OK](.docs/badges/a1.svg)

| | |
|---|---|
| **Vistas** | `/`, `/calendario`, `/goleadores`, `/partidos/:id`, `/equipos/:id` *(DA1)* |
| **API**    | `/api/salud`, `/api/posiciones`, `/api/calendario`, `/api/goleadores`, `/api/partidos/:id`, `/api/equipos[/:id]` *(DA1)* |
| **Estado** | **A0–A8 cerrados** · **87 checks automatizados** · `astro check` 0/0/0 · `astro build` ✓ |
| **Stack**  | Astro v7.4 SSR · Node standalone · Drizzle ORM + `mysql2` · Tailwind v4 · TS estricto |

> La aplicación **no escribe** jamás en la base. Se conecta con un usuario
> MySQL al que solo se le ha concedido `SELECT` sobre `campeonato_futbol.*`.
> Cumple la constitución `A1` del SDD principal.

### Badges

Los SVG del encabezado se generan localmente desde resultados reales con
`npm run badges` (ver "Generación de badges" más abajo). No usan CDN
externo y cambian de color si un check falla: verde `#4c1` cuando todo
pasa, rojo `#e05d44` en caso contrario.

---

## Índice

1. [Requisitos](#requisitos)
2. [Variables de entorno](#variables-de-entorno)
3. [Instalación desde cero](#instalación-desde-cero)
4. [Desarrollo y producción](#desarrollo-y-producción)
5. [Estructura del proyecto](#estructura-del-proyecto)
6. [Verificación automatizada](#verificación-automatizada)
7. [API REST — referencia](#api-rest--referencia)
8. [Vistas — Anexo A](#vistas--anexo-a)
9. [Ejemplos JSON reales](#ejemplos-json-reales)
10. [Limitaciones conocidas](#limitaciones-conocidas)
11. [Troubleshooting](#troubleshooting)
12. [Reproducción desde cero (Definition of Done)](#reproducción-desde-cero-definition-of-done)

---

## Requisitos

- **Node.js ≥ 22.22** (probado con v24.16).
- **npm ≥ 11** (probado con 11.13).
- **MySQL ≥ 8.0.16** con la base `campeonato_futbol` ya cargada según el
  proyecto BD hermano (`Proyecto-2026-SDD.md` + `sql/02_carga.sql`).
- Usuario MySQL de solo lectura `app_campeonato@127.0.0.1` con permiso
  `SELECT` sobre `campeonato_futbol.*`.
  *(Si no tienes este usuario, `sql/05_usuario_app.sql` lo crea.)*

## Variables de entorno

El archivo `web/.env` (NO versionado) tiene este contenido de partida
(ver `web/.env.example`):

```ini
# Conexión de la app en runtime. Usuario con solo SELECT.
DATABASE_URL=mysql://app_campeonato:<tu-clave>@127.0.0.1:3306/campeonato_futbol

# Solo para `npm run db:pull` (Fase A3, TA3.3). No la usa la app en runtime.
DATABASE_URL_ADMIN=mysql://root:<clave-admin>@127.0.0.1:3306/campeonato_futbol
```

| Variable | Uso | Persistente |
|---|---|---|
| `DATABASE_URL` | Conexión de runtime (páginas y API). | `web/.env` (no versionado) |
| `DATABASE_URL_ADMIN` | Solo `npm run db:pull` (TA3.3). | `web/.env` (no versionado) |

> Por seguridad R5 (SDD), la URL siempre usa `127.0.0.1` (no `localhost`)
> para evitar resolución IPv6 en Windows.

## Instalación desde cero

```bash
# 1. Crear el usuario solo-SELECT (ejecutar como root)
mysql -u root -p < ../sql/05_usuario_app.sql

# 2. Configurar variables de entorno
cp .env.example .env
$EDITOR .env             # sustituir <tu-clave> y <clave-admin>

# 3. Instalar dependencias
npm install

# 4. Generar el esquema desde la base (UNA vez, con DATABASE_URL_ADMIN)
#    El resultado se copia a src/db/schema.ts. NUNCA modificar la base
#    con drizzle-kit push/generate/migrate (cumple A2 del SDD).
npm run db:pull

# 5. Arrancar en modo desarrollo
npm run dev              # http://localhost:4321
```

## Desarrollo y producción

| Tarea | Comando |
|---|---|
| Levantar en dev (hot reload) | `npm run dev` |
| Build de producción | `npm run build` |
| Arrancar el build | `HOST=127.0.0.1 PORT=4321 node ./dist/server/entry.mjs` |
| Verificación de tipos | `npm run check` |
| Paridad con Q12–Q14 (gate A4) | `npm run verificar` |
| Pruebas HTTP de la API (gate A5) | `npm run verificar:api` |
| Pruebas de las vistas (gate A6) | `npx tsx ./scripts/a6_vistas.ts` |
| Smoke contra el build de prod (gate A7) | `bash ./scripts/a7_produccion.sh` |
| Re-generar `schema.ts` desde la base | `npm run db:pull` |

> Detalle: `scripts/*.ts` están **excluidos** del `tsconfig.json`
> (`scripts/**` en `exclude`) para que `astro check` no duplique
> identificadores entre scripts (cada uno tiene su propio `function main`).
> Los scripts siguen ejecutándose con `tsx`.

## Estructura del proyecto

```
web/
├── src/
│   ├── db/
│   │   ├── index.ts          # createPool + drizzle (mode: 'default')
│   │   ├── schema.ts         # 9 tablas (copiado de drizzle-kit pull)
│   │   ├── relations.ts      # relaciones para "with"
│   │   └── pulled/           # salida cruda del pull (gitignored)
│   ├── lib/
│   │   ├── queries/          # módulos de consulta (A4)
│   │   │   ├── posiciones.ts #   Q12
│   │   │   ├── calendario.ts #   Q03/Q04/Q05
│   │   │   ├── goleadores.ts #   Q14
│   │   │   ├── partido.ts    #   Q08 + Q13
│   │   │   └── equipo.ts     #   Q01/Q02 (DA1, opcional)
│   │   ├── formato.ts        # RP-01..RP-07 (marcador, fecha, "15:00")
│   │   ├── api.ts            # helpers JSON: ok, fail, validadores
│   │   └── handlers.ts       # helper ALL = 405 + Allow: GET
│   ├── layouts/Base.astro    # nav V1/V2/V3/V5 + footer
│   └── pages/
│       ├── index.astro           # V1 Posiciones
│       ├── calendario.astro      # V2 Calendario
│       ├── goleadores.astro       # V3 Goleadores
│       ├── partidos/[id].astro    # V4 Detalle partido (404 si no existe)
│       ├── equipos/[id].astro     # V5 Plantilla (DA1, opcional)
│       ├── 500.astro              # error 500 genérico
│       └── api/
│           ├── salud.ts
│           ├── posiciones.ts
│           ├── calendario.ts
│           ├── goleadores.ts
│           ├── partidos/[id].ts
│           ├── equipos/index.ts   # DA1 opcional
│           └── equipos/[id].ts    # DA1 opcional
├── scripts/
│   ├── a1_aislamiento.ts   # prueba de aislamiento del usuario app
│   ├── a3_humo.ts          # smoke test de src/db/
│   ├── a4_*.ts             # pruebas individuales por módulo
│   ├── verificar.ts        # A4: 21 checks (paridad Q12/Q14)
│   ├── verificar-api.ts    # A5: 26 checks HTTP
│   ├── a6_vistas.ts        # A6: 40 checks de vistas
│   ├── curl_sondas.sh      # smoke manual con curl
│   └── a7_produccion.sh    # A7: smoke contra build de prod
├── drizzle.config.ts       # mysql, out: src/db/pulled
├── astro.config.mjs        # output: 'server' + adapter node standalone
├── .env                    # NO versionado
└── .env.example
```

## Verificación automatizada

| Gate | Script | Resultado |
|---|---|---:|
| **A1** | `npx tsx scripts/a1_aislamiento.ts` | ✓ SELECT 12, INSERT/UPDATE/DELETE → errno 1142 |
| **A3** | `npx tsx scripts/a3_humo.ts` | ✓ 12 equipos, MySQL 8.4.10, STRICT_TRANS_TABLES |
| **A4** | `npm run verificar` | **21 / 21** checks |
| **A5** | `npm run verificar:api` | **26 / 26** checks |
| **A6** | `npx tsx scripts/a6_vistas.ts` | **40 / 40** checks |
| **A7** | `bash scripts/a7_produccion.sh` | 18×200 · 2×400 · 5×404 · 7×405 |
| **Total** | **automatizado** | **87 checks** del Anexo A del SDD |

Detalle de las salidas y comparaciones con Q12/Q14 del proyecto BD en
[`../docs/05_web_evidencias.md`](../docs/05_web_evidencias.md).

### Generar los badges del encabezado

El script `scripts/gen_badges.ts` corre los 3 verificadores, parsea sus
totales y produce 7 SVG en `.docs/badges/*.svg` (autoalojados, sin CDN):

```bash
# Primero, con el dev server en marcha (los scripts A5 y A6 lo necesitan):
npm run dev          # en otra terminal
# Y luego, en la terminal principal:
npm run badges
```

| Badge | Valor | Origen |
|---|---|---|
| `checks` | `87 / 87` | Suma de A4 + A5 + A6. |
| `astro-check` | `0E / 0W / 0H` | `npx astro check` (última corrida). |
| `build` | `OK` / `FAIL` | `npm run build`. |
| `a4` | `21 / 21` | `npm run verificar`. |
| `a5` | `26 / 26` | `npm run verificar:api` (necesita server). |
| `a6` | `40 / 40` | `npx tsx ./scripts/a6_vistas.ts` (necesita server). |
| `a1` | `OK` / `FAIL` | `npx tsx ./scripts/a1_aislamiento.ts`. |

Los SVG están **versionados** (cada cambio de fase debe regenerar los
badges con `npm run badges` y commitearlos junto al código).

## Integración continua

Existe un workflow de CI en `.github/workflows/ci.yml` que se dispara
en cada push y pull request a `main`:

- **Typecheck** — `astro check` (TypeScript estricto).
- **Build** — `astro build` (SSR + Node standalone).
- **Consistencia** — verifica que los scripts esperados existen en
  `package.json` (`check`, `build`, `db:pull`, `verificar`,
  `verificar:api`, `badges`).
- **Documentación** — comprueba que el README menciona cada gate A0–A8.
- **Seguridad** — confirma que no se versionan `.env` ni credenciales.

> Nota: el CI es **mínimo** y no requiere ningún servicio externo.
> Los 87 checks reales (A4–A6) se ejecutan **en local** porque requieren
> la base `campeonato_futbol` con `app_campeonato` solo-SELECT.
> Para ejecutarlos en CI, añade el servicio `mysql:8.0` al job y carga
> `01_estructura.sql` + `02_carga.sql` antes de correr los scripts.

## API REST — referencia

> Solo `GET`. Cualquier otro método devuelve `405 + Allow: GET`. JSON en
> UTF-8, claves en `snake_case`, `Cache-Control: public, max-age=60` en
> 200 y `no-store` en errores.

### Tabla de endpoints

| Ruta | Equivale a | Filtros | Códigos |
|---|---|---|---|
| `GET /api/salud` | — | — | 200 / 503 `BASE_NO_DISPONIBLE` |
| `GET /api/posiciones` | Q12 | — | 200 / 500 |
| `GET /api/calendario` | Q03+Q04+Q05 | `?jornada=1..22`, `?estado=jugado\|pendiente` | 200 / 400 `PARAMETRO_INVALIDO` / 500 |
| `GET /api/goleadores` | Q14 | — | 200 / 500 |
| `GET /api/partidos/:id` | Q08+Q13 | `id` entero positivo | 200 / 400 `PARAMETRO_INVALIDO` / 404 `NO_ENCONTRADO` / 500 |
| `GET /api/equipos` *(DA1)* | Q01 compacto | — | 200 / 500 |
| `GET /api/equipos/:id` *(DA1)* | Q01+Q02 | `id` entero positivo | 200 / 400 / 404 / 500 |
| Otros métodos | — | — | 405 `METODO_NO_PERMITIDO` + `Allow: GET` |

### Forma de las respuestas

Éxito (200):
```json
{ "total": 12, "datos": [...] }    // una lista
{ "datos": { ... } }                // un detalle
```

Error (4xx/5xx):
```json
{ "error": { "codigo": "PARAMETRO_INVALIDO", "mensaje": "La jornada debe estar entre 1 y 22." } }
```

| Código | Cuándo | `error.codigo` |
|---:|---|---|
| 400 | `GET` con parámetros inválidos (`?jornada=23`, `id=abc`) | `PARAMETRO_INVALIDO` |
| 404 | `id` válido pero no existente (`/api/partidos/9999`) | `NO_ENCONTRADO` |
| 405 | Método distinto de `GET` | `METODO_NO_PERMITIDO` (cabecera `Allow: GET`) |
| 500 | Error inesperado | `ERROR_INTERNO` |
| 503 | `/api/salud` y la base no responde | `BASE_NO_DISPONIBLE` |

> Las páginas devuelven **404** con cuerpo HTML (no JSON) cuando un `id`
> no existe o no es numérico. La API es siempre JSON estricta (§1.8).

## Vistas — Anexo A

| Vista | Ruta | Aceptación |
|---|---|---|
| **V1** | `/` | 12 equipos con PJ, PG, PE, PP, GF, GC, DG, Puntos; orden por puntos, DG, GF y nombre. Pendientes **no suman puntos ni PJ**. |
| **V2** | `/calendario` | 22 jornadas × 6 partidos; filtros `?jornada=` y `?estado=`. `?jornada` fuera de 1–22 se ignora (DA5). |
| **V3** | `/goleadores` | 180 jugadores, incluidos los de 0 goles. Σ = 137. |
| **V4** | `/partidos/:id` | Cabecera, **3 árbitros en orden P, A1, A2** (RP-05), marcador (o "Pendiente") y lista de goles con autor, equipo y minuto. **404** si `id` no existe o no es numérico. |
| **V5** | `/equipos/:id` *(DA1)* | 15 jugadores ordenados por dorsal. 404 si no existe. |

Reglas globales (RP-01..RP-07):

- **RP-01** Marcador "local 2 – 1 visitante" o "Pendiente". Un partido sin
  `resultado` **nunca** aparece como `0–0` (cumple A4 + RP-01).
- **RP-02** La hora `15:00` es **constante** del campeonato (RN-04). No se
  lee de la base.
- **RP-03** Fechas en formato `DD/MM/AAAA`.
- **RP-05** En `V4` los árbitros van en orden `P, A1, A2`.
- **RP-06** IDs inexistentes o no numéricos → `404`.
- **RP-07** Si la base falla, las páginas devuelven `500` con cuerpo
  genérico de `src/pages/500.astro`; la API, `500` con JSON genérico.

## Ejemplos JSON reales

> Capturados contra el build de producción local en `http://localhost:4321`.

### `GET /api/salud`

```bash
curl -sS http://localhost:4321/api/salud
```

```json
{ "datos": { "ok": true, "ts": "2026-10-18T17:38:06.796Z" } }
```

### `GET /api/posiciones` (top 3)

```bash
curl -sS http://localhost:4321/api/posiciones | jq '.datos[0:3]'
```

```json
[
  { "posicion": 1, "equipo_id": 10, "equipo": "Cóndores FC",
    "pj": 8, "pg": 5, "pe": 2, "pp": 1,
    "gf": 15, "gc": 7, "dg": 8, "puntos": 17 },
  { "posicion": 2, "equipo_id": 12, "equipo": "Titanes FC",
    "pj": 8, "pg": 5, "pe": 1, "pp": 2,
    "gf": 12, "gc": 9, "dg": 3, "puntos": 16 },
  { "posicion": 3, "equipo_id": 8, "equipo": "Deportivo El Naranjo",
    "pj": 8, "pg": 4, "pe": 2, "pp": 2,
    "gf": 12, "gc": 10, "dg": 2, "puntos": 14 }
]
```

### `GET /api/calendario` (primer partido, jornada 1)

```bash
curl -sS http://localhost:4321/api/calendario | jq '.datos[0]'
```

```json
{
  "partido_id": 1,
  "jornada": 1,
  "fecha": "2026-08-01",
  "hora": "15:00",
  "local":     { "equipo_id": 1,  "nombre": "Aurora FC" },
  "visitante": { "equipo_id": 12, "nombre": "Titanes FC" },
  "estadio":   { "estadio_id": 1, "nombre": "Estadio del Valle" },
  "estado": "jugado",
  "resultado": { "goles_local": 0, "goles_visitante": 0 }
}
```

> Un partido **pendiente** trae `"estado": "pendiente"` y `"resultado": null`
> (nunca `0–0`).

### `GET /api/calendario?estado=pendiente` (top 1)

```bash
curl -sS "http://localhost:4321/api/calendario?estado=pendiente" | jq '.total'
```

```json
84
```

### `GET /api/calendario?jornada=3` (jornada de 6 partidos)

```bash
curl -sS "http://localhost:4321/api/calendario?jornada=3" | jq '.total'
```

```json
6
```

### `GET /api/calendario?jornada=23` — **400**

```bash
curl -sS -w "HTTP %{http_code}\n" "http://localhost:4321/api/calendario?jornada=23"
```

```
HTTP 400
{"error":{"codigo":"PARAMETRO_INVALIDO","mensaje":"La jornada debe estar entre 1 y 22."}}
```

### `GET /api/goleadores` (top 1)

```bash
curl -sS http://localhost:4321/api/goleadores | jq '.datos[0]'
```

```json
{
  "jugador_id": 44,
  "nombre": "Pablo Martínez Vásquez",
  "equipo_id": 3,
  "equipo": "Universitarios FC",
  "goles": 6
}
```

### `GET /api/partidos/1` (Aurora vs Titanes, 0–0)

```bash
curl -sS http://localhost:4321/api/partidos/1 | jq '.datos.{estado,resultado,arbitros}'
```

```json
{
  "estado": "jugado",
  "resultado": { "goles_local": 0, "goles_visitante": 0 },
  "arbitros": [
    { "rol": "P",  "arbitro_id": 1, "nombre": "Luis Hernández Cabrera",  "codigo": "ARB001" },
    { "rol": "A1", "arbitro_id": 2, "nombre": "Carlos Pérez Flores",    "codigo": "ARB002" },
    { "rol": "A2", "arbitro_id": 3, "nombre": "José Gómez Ruiz",        "codigo": "ARB003" }
  ]
}
```

### `GET /api/partidos/49` (pendiente)

```bash
curl -sS http://localhost:4321/api/partidos/49 | jq '.datos | {estado, resultado}'
```

```json
{
  "estado": "pendiente",
  "resultado": null
}
```

### `GET /api/partidos/abc` — **400**

```
HTTP 400
{"error":{"codigo":"PARAMETRO_INVALIDO","mensaje":"El id debe ser un entero positivo."}}
```

### `GET /api/partidos/9999` — **404**

```
HTTP 404
{"error":{"codigo":"NO_ENCONTRADO","mensaje":"El partido no existe."}}
```

### `POST /api/posiciones` — **405**

```
HTTP/1.1 405 Method Not Allowed
allow: GET
cache-control: no-store
content-type: application/json; charset=utf-8

{"error":{"codigo":"METODO_NO_PERMITIDO","mensaje":"Método no permitido. Use GET."}}
```

### `GET /api/equipos/1` (Aurora FC, 15 dorsales)

```bash
curl -sS http://localhost:4321/api/equipos/1 | jq '.datos | {equipo_id,nombre, total_jugadores: (.jugadores | length)}'
```

```json
{ "equipo_id": 1, "nombre": "Aurora FC", "total_jugadores": 15 }
```

## Limitaciones conocidas

- **Solo lectura**: ningún endpoint acepta `POST` / `PUT` / `DELETE`. La app
  no modifica la base de datos en ningún caso (cumple A1 del SDD).
- **Sin autenticación ni autorización**. La base solo está expuesta a
  través de un usuario MySQL con permisos `SELECT`. La app web **no
  autentica** a sus propios usuarios (es un extra del proyecto principal).
- **Sin paginación**. La consulta mayor es `goleadores` con 180 filas
  (DA7 del SDD).
- **Sin CORS** por defecto (DA6). Si un cliente externo lo necesita, se
  activa explícitamente solo para `GET` y con un origen definido.
- **Sin pruebas E2E** con framework (Playwright, etc.). Se valida con
  scripts `tsx` propios y `bash` (87 checks acumulados). El CI mínimo
  de GitHub Actions corre `astro check` + `astro build`; los 87 checks
  de paridad requieren la BD y se ejecutan en local.

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `astro check`: *"Duplicate function implementation"* sobre `scripts/*.ts` | Tres scripts comparten identificadores (`function main`, `BASE`, etc.). | Ya está mitigado: `tsconfig.json` excluye `scripts/**`. Verifica que `exclude` está actualizado. |
| `npm run db:pull` falla con `"Unknown table 'check_constraints' in information_schema"` (R1) | MySQL < 8.0.16 o `drizzle-kit` viejo. | Actualiza a una versión reciente (`npm i -D drizzle-kit`). Si persiste, escribe `src/db/schema.ts` a mano desde §1.7 del SDD (Plan B, TA3.9). |
| `ck_jugador_posicion` incluye un quinto valor `RED` tras el pull | Bug del parser `drizzle-kit pull` MySQL. | El proyecto aplica la corrección manualmente en `src/db/schema.ts` (`POR, DEF, MED, DEL`). |
| `localhost` da `Access denied`, `127.0.0.1` no | El usuario MySQL se creó solo para `127.0.0.1`. | Coherente con R5: `DATABASE_URL` siempre debe apuntar a `127.0.0.1`. |
| `npm run verificar:api` falla con `connect ECONNREFUSED` | El dev server no está en marcha. | Arranca `npm run dev` en otra terminal antes del script. |
| Las páginas devuelven `500` con un mensaje inútil | La base no responde o el schema cambió. | Revisa `dist/server/entry.mjs` stdout/stderr; el stack técnico va a la consola del servidor (RNF-06). |
| `astro build` reporta error en `alias(equipo, …)` | NO se debe usar `relationName` en `references()` con `mode: 'default'`. | Usamos `alias(equipo, 'local' / 'visitante' / 'autor')` directamente en cada consulta. |
| `JSON.stringify` falla con `BigInt` | Las agregaciones de MySQL vienen como `BigInt` por defecto. | `pool` configurado con `decimalNumbers: true`; ver además `.mapWith(Number)` en cada `sql<number>`. |

## Reproducción desde cero (Definition of Done)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo> && cd campeonato_futbol

# 2. Crear usuario MySQL solo-SELECT y cargar la base (proyecto BD)
mysql -u root -p < sql/05_usuario_app.sql
# (cargar DDL y carga del proyecto BD si no están ya cargados)

# 3. Configurar el .env de la app
cd web
cp .env.example .env
$EDITOR .env            # sustituir <tu-clave> y <clave-admin>

# 4. Instalar dependencias, generar esquema desde la base, compilar
npm install
DATABASE_URL_ADMIN='mysql://root:<clave-admin>@127.0.0.1:3306/campeonato_futbol' \
  npm run db:pull
npm run build

# 5. Arrancar el servidor de producción
HOST=127.0.0.1 PORT=4321 node ./dist/server/entry.mjs

# 6. (En otra terminal) Verificar todo
npm run check            # 0 errores, 0 warnings, 0 hints
npm run verificar        # 21/21 (paridad con Q12/Q14)
npm run verificar:api    # 26/26 (endpoints HTTP)
npx tsx scripts/a6_vistas.ts   # 40/40 (vistas HTML)
```

Si llegaste aquí con `astro check` en 0/0/0 y todos los checks verdes,
**el entregable está completo**.

---

## Referencias cruzadas

- [`Proyecto-2026-SDD.md`](../Proyecto-2026-SDD.md) — el SDD del proyecto
  de base de datos (al que esta app consulta en modo solo-SELECT).
- [`SDD-App-Web-Campeonato.md`](../SDD-App-Web-Campeonato.md) — el SDD que
  define esta aplicación (Constitución A1–A10, SPEC, PLAN, TASKS A0–A8).
- [`docs/05_web_evidencias.md`](../docs/05_web_evidencias.md) — logs y
  salidas reales que respaldan los gates A0–A8 de este proyecto.
- [`README.md`](../README.md) — README raíz del monorepo del Campeonato.
