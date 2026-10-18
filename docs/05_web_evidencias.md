# 05 · Evidencias de la App Web + API

> Complementa `docs/04_evidencias.md` (proyecto BD) con las salidas reales que
> respaldan los gates **A0 → A8** del `SDD-App-Web-Campeonato.md`.
> Comandos ejecutados contra `127.0.0.1:3306`, base `campeonato_futbol`,
> usuario `campla_dev@localhost` (solo `SELECT`) para validación, y
> `app_campeonato@127.0.0.1` (solo `SELECT`) para la app.

---

## A0 · Prerrequisitos (gate cerrado ✅)

### Entorno

| Comprobación | Resultado |
|---|---|
| `node --version` | v24.16.0 (LTS) |
| `npm --version` | 11.13.0 |
| `mysql --version` | 8.4.10 (Linux x86_64) |
| MySQL escuchando | `*:3306` (verificado con `ss -ltnp`) |

### Conteos de §1.3 del SDD

```
equipo          12
jornada         22
estadio          6
gol            137
arbitro         18
jugador        180
partido        132
partido_arbitro 396
resultado       48
```

Coinciden **exactamente** con los esperados: `12 / 22 / 6 / 18 / 180 / 132 / 48 / 396 / 137`.

### Conciliaciones y controles cruzados

| Control | Resultado | Esperado |
|---|---:|---:|
| Partidos jugados con diferencia goles↔marcador | 0 | 0 |
| Suma `goles_local` | 86 | — |
| Suma `goles_visitante` | 51 | — |
| Suma total de goles (`gol`) | 137 | 137 |
| Goles de autor ajeno a los equipos del partido (RN-19) | 0 | 0 |
| Goles en partidos pendientes | 0 | 0 |
| Partidos pendientes (sin `resultado`) | 84 | 84 |
| Partidos por jornada (22×6) | 6 cada una | 6 cada una |
| Partidos con terna arbitral ≠ `{P,A1,A2}` | 0 | 0 |

> **Resultado:** Gate A0 cerrado.

---

## A1 · Usuario solo-SELECT y entorno (gate cerrado ✅)

### Script entregado

- `sql/05_usuario_app.sql` — crea `app_campeonato@'127.0.0.1'`, concede solo
  `SELECT` sobre `campeonato_futbol.*`. La contraseña va como
  `<tu-clave>` (placeholder) y se sustituye antes de ejecutar; nunca se
  commitea la contraseña real.

### Aislamiento — pruebas en `mysql` cliente

```
$ mysql -h 127.0.0.1 -u app_campeonato -D campeonato_futbol \
    -e "SELECT COUNT(*) FROM equipo;"
12

$ mysql -h 127.0.0.1 -u app_campeonato -D campeonato_futbol \
    -e "INSERT INTO equipo VALUES (999, 'TEST');"
ERROR 1142 (42000): INSERT command denied to user 'app_campeonato'@'localhost'

$ mysql ... -e "UPDATE ..." -> ERROR 1142: UPDATE command denied
$ mysql ... -e "DELETE ..." -> ERROR 1142: DELETE command denied
```

### Aislamiento — desde la app (`scripts/a1_aislamiento.ts`)

`npx tsx ./scripts/a1_aislamiento.ts`:

```
✔ SELECT  COUNT(*) FROM equipo = 12
✔ DENEGADO  (errno 1142): INSERT INTO equipo VALUES (999, 'TEST')
✔ DENEGADO  (errno 1142): UPDATE equipo SET nombre='X' WHERE equipo_id=1
✔ DENEGADO  (errno 1142): DELETE FROM equipo WHERE equipo_id=1

Gate A1 · Aislamiento del usuario de la app: OK
```

### Variables de entorno

- `web/.env.example` (versionado) con placeholders.
- `web/.env` (NO versionado) con valores reales.
- Verificación de ignore: `git check-ignore -v web/.env` →
  `web/.gitignore:17:.env   web/.env`.

> El usuario solo existe para el host `127.0.0.1`. Por seguridad,
> `localhost` (sin `-h`) da `ERROR 1045`. Coherente con R5 del SDD.

---

## A2 · Proyecto base Astro (gate cerrado ✅)

- `npm create astro@latest web --template minimal --typescript strict`
- `npm install @astrojs/node` (modo `standalone`) → `output: 'server'`
- `npm install -D @astrojs/check typescript drizzle-kit tsx`
- `npx astro add tailwind --yes` (Tailwind v4 con `@tailwindcss/vite`)
- `src/layouts/Base.astro` con `lang="es"`, viewport, nav V1/V2/V3 y
  `import '../styles/global.css'`.

```
npm run check  → 0 errors, 0 warnings, 0 hints
npm run build  → output:"server", adapter:@astrojs/node, complete
GET /          → HTTP 200 en ~82 ms (cumple RNF-01 < 1 s)
```

---

## A3 · Capa de datos Drizzle (gate cerrado ✅)

### Pull desde la base

Variable de entorno con la `DATABASE_URL_ADMIN` (no persistida) y
`npm run db:pull`:

```
[✓] 9  tables fetched
[✓] 32 columns fetched
[✓] 21 indexes fetched
[✓] 14 foreign keys fetched
[✓] 11 check constraints fetched
[✓] Your schema file is ready ➜ src/db/pulled/schema.ts 🚀
[✓] Your relations file is ready ➜ src/db/pulled/relations.ts 🚀
```

> Los artefactos viven en `src/db/pulled/` (excluido de git y del type-check
> con `tsconfig.json`). Las versiones **versionadas** son
> `src/db/schema.ts` y `src/db/relations.ts`, copiadas a mano y revisadas.

### Cambios aplicados al schema

- **A8 · fechas como texto** (R4): `jornada.dia` y `jugador.fechaNacimiento`
  quedaron en `date({ mode: 'string' })` automáticamente en el pull.
- **`ck_jugador_posicion` corregido** a mano: el pull original mostró 5
  valores (`POR, DEF, RED, MED, DEL`); el DDL base fija 4
  (`POR, DEF, MED, DEL`), verificado con `SELECT DISTINCT posicion FROM jugador`.
- **Alias doble local/visitante**: NO se usa `relationName` en `references()`
  (la app corre con `mode: 'default'`). En su lugar se usa
  `alias(equipo, 'local' / 'visitante' / 'autor')` de
  `drizzle-orm/mysql-core` directamente en cada consulta.

### Pool y drizzle (`src/db/index.ts`)

- `createPool` con `uri: DATABASE_URL`, `connectionLimit: 10`,
  `decimalNumbers: true`, `dateStrings: true` (R3 + R4 + A8).
- `drizzle(pool, { schema: { ...schema, ...relations }, mode: 'default' })`.

### Smoke test (`scripts/a3_humo.ts`)

```
✔ SELECT COUNT(*) FROM equipo = 12 (vía Drizzle count())
✔ VERSION() = 8.4.10
✔ @@sql_mode = IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,...

Gate A3 · Capa de datos: OK
```

### `astro check` post-pull

```
Result (9 files):
- 0 errors
- 0 warnings
- 0 hints
```

---

## A4 · Consultas y paridad (gate cerrado ✅)

### Módulos de `src/lib/queries/`

| Módulo            | Equivale a    | Notas |
|-------------------|---------------|-------|
| `posiciones.ts`   | Q12           | UNION ALL local+visitante; puntos = pg*3 + pe. pj=8 en cada equipo. |
| `calendario.ts`   | Q03/Q04/Q05   | LEFT JOIN resultado; filtros `jornada` y `estado`; pendientes con `resultado:null`. |
| `goleadores.ts`   | Q14           | LEFT JOIN desde `jugador` para incluir 0 goles; Σ=137. |
| `partido.ts`      | Q08 + Q13     | Cabecera + árbitros ordenados P,A1,A2 + goles con autor y equipo. |
| `equipo.ts` *(DA1 opcional)* | Q01/Q02 | 15 jugadores ordenados por dorsal. |

### `npm run verificar` (21/21)

```
✔ CONTEO equipo/jornada/estadio/arbitro/jugador/partido/resultado/partido_arbitro/gol
                                            12/22/6/18/180/132/48/396/137
✔ GOL Σ                              — 137
✔ CAL total/jugados/pendientes       — 132/48/84
✔ CAL pend resultado=null            — 84/84 cumplen
✔ POS 12                             — 12 equipos
✔ POS pj=8 todos
✔ POS top-3 ↔ Q12                    — coincide con snapshot SQL puro
✔ GOLEADORES 180 / Σ 137 / totalGoles
✔ GOLEADORES top-3 ↔ Q14             — coincide con snapshot SQL puro

Resumen · pasaron 21 / 21
Gate A4 · Consultas y paridad: OK
```

### `astro check` post-A4

```
Result (22 files):
- 0 errors
- 0 warnings
- 0 hints
```

---

## A5 · API REST JSON (gate cerrado ✅)

### Endpoints implementados

| Ruta                                  | Equivale a    | Códigos esperados               |
|---------------------------------------|---------------|---------------------------------|
| `GET /api/salud`                      | —             | 200 / 503 BASE_NO_DISPONIBLE    |
| `GET /api/posiciones`                 | Q12           | 200 / 500 ERROR_INTERNO         |
| `GET /api/calendario[?jornada&estado]`| Q03/Q04/Q05   | 200 / 400 PARAMETRO_INVALIDO / 500 |
| `GET /api/goleadores`                 | Q14           | 200 / 500                       |
| `GET /api/partidos/:id`               | Q08+Q13       | 200 / 400 / 404 / 500           |
| `GET /api/equipos` *(DA1, opcional)*  | Q01 compacto  | 200 / 500                       |
| `GET /api/equipos/:id` *(DA1, opcional)* | Q01/Q02    | 200 / 400 / 404 / 500           |
| **Cualquier `POST/PUT/DELETE` arriba** | —             | **405 + `Allow: GET`**          |

Cumple A10 (solo `GET`), RNF-06 (sin SQL/credenciales en respuestas) y
Cabeceras §1.8 (`Content-Type`, `Cache-Control`).

### `npm run verificar:api` (26/26)

```
✔ salud 200 — status=200
✔ posiciones total=12 / pj=8 / 1..12
✔ calendario total=132 / jugados=48 / pendientes=84 / jornada=3 total=6
✔ calendario jornada=23 → 400 / estado=otro → 400
✔ goleadores total=180 Σ=137
✔ partido 1 (jugado) 200 + árbitros P,A1,A2
✔ partido 49 (pendiente) resultado=null, goles=[]  → 200
✔ partido abc → 400 / 9999 → 404
✔ equipos total=12 (15 c/u) / 1 Aurora 15 jugadores / 9999 → 404
✔ POST a 7 endpoints distintos → 405 con Allow: GET

Resumen · pasaron 26 / 26
Gate A5 · API REST: OK
```

### `curl` rápido (TA5.11)

```
GET  /api/posiciones                → 200  (12 equipos)
GET  /api/calendario?estado=j       → 200  (48 jugados)
GET  /api/calendario?estado=p       → 200  (84 pendientes, todos con resultado null)
GET  /api/calendario?jornada=23     → 400  PARAMETRO_INVALIDO
POST /api/posiciones                → 405  METODO_NO_PERMITIDO + Allow: GET
```

> Todos los errores se sirven con `{"error":{"codigo":"...", "mensaje":"..."}}`
> y `Cache-Control: no-store`. Nada de stack, SQL ni rutas internas.

---

## A6 · Vistas (gate cerrado ✅)

### Páginas entregadas

| Vista | Ruta                  | Componentes (Tailwind)                       |
|-------|-----------------------|----------------------------------------------|
| V1    | `/`                   | Tabla 12 equipos con PJ, PG, PE, PP, GF, GC, DG, Pts. |
| V2    | `/calendario`         | 22 jornadas × 6 partidos; filtros `?jornada` y `?estado`. |
| V3    | `/goleadores`         | 180 jugadores, dorsales, equipo, goles.      |
| V4    | `/partidos/[id]`      | Cabecera, árbitros (P,A1,A2), goles; 404 si no existe. |
| V5    | `/equipos/[id]` *(DA1, opcional)* | 15 jugadores por dorsal; 404 si no existe. |

### `npx tsx ./scripts/a6_vistas.ts` (40/40)

```
✔ V1 200 / 12 equipos / pj=8 todas (12 filas)
✔ V2 200 / 22 jornadas / 132 partidos / tiene Pendiente / tiene marcadores
✔ V2 pend 84 / sin resultado / jornada=3 total=6
✔ V2 jornada=99 ignorada (DA5) · HTTP 200
✔ V3 180 filas / Σ=137 / top 1 Pablo Martínez Vásquez
✔ V4/1 200 / Aurora vs Titanes / marcador 0 – 0
✔ V4/1 3 árbitros en orden P,A1,A2 (iP<iA1<iA2)
✔ V4/49 200 / Pendiente / sin sección Goles
✔ V4 /partidos/9999 → 404 / partido no encontrado
✔ V4 /partidos/abc   → 404
✔ V5/1 15 filas / dorsales 1..15
✔ V5/12 15 filas
✔ V5/9999 → 404 / equipo no encontrado
✔ RNF-01 / /calendario /goleadores /partidos/1 /equipos/1 — todos < 12 ms

Resumen · pasaron 40 / 40
Gate A6 · Vistas: OK
```

### `astro check` post-A6

```
Result (25 files):
- 0 errors
- 0 warnings
- 0 hints
```

> Nota técnica: `scripts/*.ts` está excluido del `tsconfig.json`
> (`scripts/**` en `exclude`) para que `astro check` no duplique los
> identificadores entre scripts. Los scripts siguen siendo ejecutables
> con `tsx` (`npm run verificar`, `npm run verificar:api`,
> `npx tsx ./scripts/a6_vistas.ts`).

---

## A7 · Calidad y robustez (gate cerrado ✅)

### Build de producción

```
npm run build
[build] output: "server"
[build] adapter: @astrojs/node
[build] Server built in 438 ms
[build] Complete!

node ./dist/server/entry.mjs
[@astrojs/node] Server listening on http://127.0.0.1:4321
```

### 404 / 405 / 400 — `bash scripts/a7_produccion.sh` contra build de producción

```
18 × HTTP 200   (todas las vistas válidas y endpoints exitosos)
 2 × HTTP 400   (?jornada=23, /api/partidos/abc → PARAMETRO_INVALIDO)
 5 × HTTP 404   (/partidos/9999|abc, /equipos/9999,
                 /api/partidos/9999, /api/equipos/9999 → NO_ENCONTRADO)
 7 × HTTP 405   (POST en cada endpoint /api/* → METODO_NO_PERMITIDO + Allow: GET)
```

> Cobertura: V1–V5 (Aurora 1, Titanes 12, 9999s), calendario 132/48/84 con
> filtro `?estado` y `?jornada`, posiciones, goleadores, partido detalle
> (jugado y pendiente), API completa con `405` uniforme.

### 500 simulado (TA7.2) — base inalcanzable

```bash
DATABASE_URL='mysql://app_campeonato:***@127.0.0.1:3399/campeonato_futbol' \
  HOST=127.0.0.1 PORT=4321 node ./dist/server/entry.mjs
```

| Ruta              | Respuesta al cliente                                  |
|-------------------|------------------------------------------------------|
| `GET /`           | 500 (cuerpo renderizado por `src/pages/500.astro`)  |
| `GET /partidos/1` | 500 (igual)                                          |
| `GET /api/posiciones` | 500 + `{"error":{"codigo":"ERROR_INTERNO","mensaje":"Error interno del servidor."}}` |
| `GET /api/salud`  | 503 + `{"error":{"codigo":"BASE_NO_DISPONIBLE",...}}` |

> La consola del servidor recibió los stacks completos (incluyendo el SQL
> crudo y la causa `ECONNREFUSED`), pero **el cliente solo ve el mensaje
> genérico** — nada de SQL, credenciales ni rutas internas. Cumple RNF-06.

### `astro check` post-A7

```
Result (26 files):
- 0 errors
- 0 warnings
- 0 hints
```

### Fugas de credenciales (TA7.6)

```
grep -rl 'Nine4ever$$' web/dist/  → (vacío)
grep -rl 'app_campeonato' web/dist/ → (vacío)
git check-ignore -v web/.env → web/.gitignore:17:.env   web/.env
```

> Ninguna credencial persiste en `dist/`. `.env` está excluido por git.

---

## A8 · Documentación y cierre (gate cerrado ✅)

### Documentación entregada

- `web/README.md` con:
  - Requisitos, variables de entorno, instalación desde cero.
  - Comandos para desarrollo, producción y verificación.
  - Estructura del proyecto mapeada a los entregables por fase.
  - Tabla de la **API REST** con códigos y un ejemplo de respuesta.
  - Limitaciones de la app.
  - Reproducción desde cero (final del Gate A8).

### Capturas de respuestas (TA8.3)

```bash
$ curl -sS http://localhost:4321/api/salud
{"datos":{"ok":true,"ts":"2026-10-18T17:38:06.796Z"}}

$ curl -sS http://localhost:4321/api/posiciones | jq '.datos[0:3]'
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

$ curl -sS http://localhost:4321/api/partidos/1 | jq '.datos.{estado,resultado,arbitros}'
{
  "estado": "jugado",
  "resultado": { "goles_local": 0, "goles_visitante": 0 },
  "arbitros": [
    { "rol": "P",  "arbitro_id": 1, "nombre": "Luis Hernández Cabrera",
      "codigo": "ARB001" },
    { "rol": "A1", "arbitro_id": 2, "nombre": "Carlos Pérez Flores",
      "codigo": "ARB002" },
    { "rol": "A2", "arbitro_id": 3, "nombre": "José Gómez Ruiz",
      "codigo": "ARB003" }
  ]
}

$ curl -sS -i -X POST http://localhost:4321/api/posiciones
HTTP/1.1 405 Method Not Allowed
allow: GET
cache-control: no-store
content-type: application/json; charset=utf-8
```

### Definition of Done (Gate A8)

- [x] **El usuario de la app solo tiene `SELECT`** — verificado en A1 con
      3 pruebas independientes (mysql cliente + `scripts/a1_aislamiento.ts`).
- [x] **`verificar.ts` pasa y V1/V3 coinciden con Q12/Q14** — 21/21
      checks en A4. Top 3 de posiciones y goleadores idéntico al snapshot
      SQL puro generado con `mysql -u campla_dev`.
- [x] **`verificar-api.ts` pasa y la API responde 405 a todo lo que no
      sea `GET`** — 26/26 checks en A5; 7 `POST`s a 7 endpoints distintos
      → 405 + `Allow: GET`.
- [x] **Los pendientes nunca aparecen como 0–0** — verificado en A4
      (`calendario.ts` siempre devuelve `resultado: null` para pendientes)
      y en A6 (`V2 pendientes 84/84 guiones`, `V4/49 sin sección Goles`).
- [x] **`astro check` y `astro build` sin errores** — `astro check`
      0/0/0 en A2, A3, A4, A6 y A7; `astro build` OK en A7.
- [x] **`web/README.md` permite reproducir todo desde cero** — sección
      "Reproducción desde cero (Definition of Done)".

### Estado final del proyecto

```
A0 Prerrequisitos     ✅  Conteos §1.3 verificados, 0 inconsistencias.
A1 Usuario solo-SELECT ✅ app_campeonato@127.0.0.1, SELECT 12 / errno 1142.
A2 Proyecto Astro     ✅ astro check 0/0/0, SSR + Tailwind v4.
A3 Capa de datos      ✅ drizzle-kit pull (9 tablas), schema.ts limpio.
A4 Consultas          ✅ verificar.ts 21/21 + paridad Q12/Q14 OK.
A5 API REST           ✅ verificar-api.ts 26/26 + 405 uniforme.
A6 Vistas             ✅ a6_vistas.ts 40/40 (V1–V5 con V5 DA1).
A7 Calidad y robustez ✅ Build prod, 400/404/500/503 correctos, sin fugas.
A8 Documentación      ✅ web/README.md + este documento de evidencias.
```
