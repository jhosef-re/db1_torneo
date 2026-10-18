# SDD · Aplicación web y API del Campeonato (extra opcional)
**Liga Universitaria del Valle** · Bases de Datos I · Universidad Mariano Gálvez de Guatemala

> Documento **independiente** en formato Spec-Driven Development: especificación (qué y por qué), plan técnico (cómo) y tareas por fases con criterios de aceptación.
> **Depende de** `Proyecto-2026-SDD.md` (SDD de la base de datos). Este documento **no** lo modifica.
> **Stack:** Astro (SSR) · TypeScript estricto · Drizzle ORM · `mysql2` · MySQL ≥ 8.0.16.
> **Versión 2:** incorpora la **API REST de solo lectura** (§1.8, Fase A5). Con Astro no hay backend separado: páginas y API viven en el mismo proyecto y comparten los módulos de consulta.

---

## Índice

0. [Constitución](#0-constitución)
1. [Especificación (SPEC)](#1-especificación-spec)
2. [Plan técnico (PLAN)](#2-plan-técnico-plan)
3. [Fases y tareas (TASKS)](#3-fases-y-tareas-tasks)
4. [Anexo A · Criterios de aceptación por vista](#anexo-a--criterios-de-aceptación-por-vista)
5. [Anexo B · Comandos de referencia](#anexo-b--comandos-de-referencia)
6. [Anexo C · Riesgos conocidos](#anexo-c--riesgos-conocidos)
7. [Decisiones abiertas](#decisiones-abiertas)

---

## 0. Constitución

Principios que gobiernan todas las fases. Si una decisión los contradice, se rechaza.

| # | Principio | Razón |
|---|---|---|
| **A1** | **La app es de solo lectura.** Se conecta con un usuario de MySQL que solo tiene `SELECT`. | El enunciado no pide `UPDATE`/`DELETE` y la carga no se modifica |
| **A2** | **La base manda.** El DDL escrito a mano (`01_estructura.sql`) es la fuente de verdad. Drizzle **lee** la base con `pull`; **nunca** la crea ni la altera (prohibido `push`, `generate` y `migrate` contra `campeonato_futbol`). | El DDL es parte de lo evaluado |
| **A3** | **Paridad con Q01–Q14.** Cada consulta de la app debe devolver los mismos resultados que su Q equivalente. | Evita que la app contradiga la entrega principal |
| **A4** | **Pendiente ≠ 0–0 también en pantalla.** Un partido sin `resultado` se muestra como "Pendiente", nunca como 0–0. | Regla RN-07 del SDD base |
| **A5** | **Las credenciales viven solo en el servidor.** `.env` fuera del repositorio; solo se versiona `.env.example`. | Seguridad básica |
| **A6** | **Alcance pequeño.** Cuatro vistas y su API de consulta (solo `GET`). Sin CRUD, sin autenticación, sin administración. | Es un extra; no debe poner en riesgo el entregable |
| **A7** | **El entregable principal no depende de la app.** Si la app falla, el proyecto de base de datos sigue completo. | La app no es requisito del enunciado |
| **A8** | **Números y fechas correctos.** `COUNT`/`SUM` se convierten a número; las fechas `DATE` viajan como texto `AAAA-MM-DD`. | Evita errores típicos de MySQL con Node |
| **A9** | **Una sola fuente de consulta.** Páginas y API llaman a los mismos módulos de `src/lib/queries/`; no se duplica SQL. | Vistas y API devuelven lo mismo y heredan la paridad con Q01–Q14 |
| **A10** | **La API solo expone `GET`.** Cualquier otro método responde 405. | Refuerza A1 también a nivel HTTP |

---

## 1. Especificación (SPEC)

### 1.1 Propósito

Ofrecer una interfaz web de **consulta** sobre la base `campeonato_futbol` ya creada y cargada, para demostrar de forma visual el resultado de las consultas Q01–Q14 del proyecto: posiciones, calendario, goleadores y detalle de partido. Los mismos datos se exponen mediante una **API REST de solo lectura** en JSON.

### 1.2 Alcance

| Dentro | Fuera |
|---|---|
| Tabla de posiciones | Crear, editar o borrar datos |
| Calendario con partidos jugados y pendientes | Login, roles o sesiones |
| Tabla de goleadores | Registro de resultados desde la web |
| Detalle de partido (árbitros, marcador, goles y autores) | Despliegue en producción |
| Plantilla por equipo *(opcional, ver DA1)* | Pruebas automatizadas extensas |
| API REST JSON de consulta (`GET`) | Endpoints de escritura y versionado de la API |

### 1.3 Prerrequisitos (gate de entrada)

La app solo se empieza cuando el SDD base cumple los **Gates 0 a 7**: base creada, carga con los conteos correctos y Q01–Q14 validadas.

| Dato de la base | Esperado |
|---|---|
| `equipo` / `jornada` / `estadio` / `arbitro` | 12 / 22 / 6 / 18 |
| `jugador` | 180 |
| `partido` / `resultado` | 132 / 48 |
| `partido_arbitro` | 396 |
| `gol` | 137 (igual a `SUM(goles_local + goles_visitante)`) |

### 1.4 Vistas y requisitos funcionales

| ID | Vista | Ruta | Equivale a | Requisito |
|---|---|---|---|---|
| **V1** | Posiciones | `/` | Q12 | Tabla de 12 equipos con PJ, PG, PE, PP, GF, GC, DG y puntos, en el orden de Q12 |
| **V2** | Calendario | `/calendario` | Q03, Q04, Q05 | Los 132 partidos agrupados por jornada, filtrables por jornada (`?jornada=n`) y por estado (jugado/pendiente) |
| **V3** | Goleadores | `/goleadores` | Q14 | Los 180 jugadores, incluidos los de 0 goles, en el orden de Q14 |
| **V4** | Detalle de partido | `/partidos/[id]` | Q08, Q13 | Local vs visitante, fecha, hora, estadio, los 3 árbitros con su rol, marcador (o "Pendiente") y la lista de goles con autor, equipo y minuto |
| **V5** | Plantilla de equipo *(opcional)* | `/equipos/[id]` | Q01, Q02 | Nombre del equipo y sus 15 jugadores ordenados por dorsal |

### 1.5 Reglas de presentación

- **RP-01** El marcador se muestra como `local 2 – 1 visitante`. Un partido sin `resultado` muestra la etiqueta **Pendiente** (A4).
- **RP-02** La hora **15:00** es una constante del campeonato (RN-04) y no se lee de la base: se muestra como texto fijo junto a la fecha.
- **RP-03** Las fechas se muestran en formato día/mes/año.
- **RP-04** En la tabla de posiciones, el desempate sigue el orden de Q12: puntos, DG y GF descendentes; nombre ascendente.
- **RP-05** En el detalle de partido los árbitros se listan en orden P, A1, A2.
- **RP-06** Un `id` de partido o equipo inexistente o no numérico responde **404**. Un `?jornada` fuera de 1–22 se ignora o responde 404 (ver DA5).
- **RP-07** Si falla la base, la página responde **500** genérico, sin mostrar SQL, credenciales ni rutas internas.

### 1.6 Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Cada página carga en menos de 1 segundo en local |
| RNF-02 | `astro check` sin errores con TypeScript estricto |
| RNF-03 | Diseño usable en pantalla de teléfono (tablas con desplazamiento horizontal) |
| RNF-04 | Sin JavaScript en el navegador por defecto; las páginas son HTML renderizado en el servidor |
| RNF-05 | Todas las consultas usan parámetros de Drizzle; nunca se concatena texto en el SQL |
| RNF-06 | La API devuelve JSON válido en UTF-8 y nunca expone SQL, credenciales ni rutas internas |
| RNF-07 | Cada endpoint responde en menos de 500 ms en local |

### 1.7 Contrato de datos (lectura)

Tablas y columnas que la app consume. Deben coincidir con el esquema que genere `drizzle-kit pull`.

| Tabla | Columnas usadas |
|---|---|
| `equipo` | `equipo_id`, `nombre` |
| `jornada` | `numero`, `dia` |
| `estadio` | `estadio_id`, `nombre`, `ubicacion`, `capacidad` |
| `arbitro` | `arbitro_id`, `nombre`, `codigo` |
| `jugador` | `jugador_id`, `equipo_id`, `nombre`, `fecha_nacimiento`, `dorsal`, `posicion` |
| `partido` | `partido_id`, `jornada_numero`, `local_id`, `visitante_id`, `estadio_id` |
| `resultado` | `partido_id`, `goles_local`, `goles_visitante` |
| `partido_arbitro` | `partido_id`, `arbitro_id`, `rol` |
| `gol` | `gol_id`, `partido_id`, `jugador_id`, `minuto` *(opcional, ver D1 del SDD base)* |

### 1.8 API REST de solo lectura

#### Reglas generales

- **Base:** `/api`. Sin versionado (DA7).
- **Solo `GET`.** Cualquier otro método responde **405** con la cabecera `Allow: GET` (A10).
- **Formato:** JSON en UTF-8. Las claves van en `snake_case` y, cuando existen, usan el mismo nombre que las columnas del contrato (§1.7).
- **Éxito (200):** las listas devuelven `{ "total": n, "datos": [...] }`; el detalle devuelve `{ "datos": {...} }`.
- **Tipos:** números como número; fechas como `"AAAA-MM-DD"`; la hora es la constante `"15:00"` (RN-04).
- **Pendiente:** `"estado": "pendiente"` y `"resultado": null`. **Nunca** `0–0` (A4).
- **Sin paginación** (el máximo es 180 filas) y **sin CORS** por defecto (DA6, DA7).
- **Cabeceras:** `Content-Type: application/json; charset=utf-8`; `Cache-Control: public, max-age=60` en éxito y `no-store` en errores.

#### Endpoints

| Ruta | Equivale a | Parámetros | Resultado esperado |
|---|---|---|---|
| `GET /api/salud` | — | — | 200 si la base responde; 503 si no |
| `GET /api/posiciones` | Q12 | — | `total` = 12 |
| `GET /api/calendario` | Q03 / Q04 / Q05 | `jornada` (1–22), `estado` (`jugado` \| `pendiente`) | 132 sin filtros; 48 jugados; 84 pendientes; 6 con una jornada |
| `GET /api/goleadores` | Q14 | — | `total` = 180; suma de `goles` = 137 |
| `GET /api/partidos/:id` | Q08 + Q13 | `id` entero positivo | Detalle con árbitros y goles |
| `GET /api/equipos` *(opcional)* | Q01 | — | `total` = 12 |
| `GET /api/equipos/:id` *(opcional)* | Q02 | `id` entero positivo | Equipo y sus 15 jugadores por dorsal |

#### Validación y errores

| Situación | Estado | `codigo` |
|---|---|---|
| `jornada` no entera o fuera de 1–22 | 400 | `PARAMETRO_INVALIDO` |
| `estado` distinto de `jugado` / `pendiente` | 400 | `PARAMETRO_INVALIDO` |
| `id` no numérico o no positivo | 400 | `PARAMETRO_INVALIDO` |
| `id` válido que no existe | 404 | `NO_ENCONTRADO` |
| Método distinto de `GET` | 405 | `METODO_NO_PERMITIDO` |
| Fallo de la base en cualquier endpoint de datos | 500 | `ERROR_INTERNO` (mensaje genérico) |
| Fallo de la base en `/api/salud` | 503 | `BASE_NO_DISPONIBLE` |

Los parámetros de consulta desconocidos se ignoran. Formato de error:

```json
{ "error": { "codigo": "PARAMETRO_INVALIDO", "mensaje": "La jornada debe estar entre 1 y 22." } }
```

> A diferencia de las páginas (RP-06 y DA5), la API es **estricta**: un parámetro inválido siempre da 400.

#### Contratos de respuesta

Los valores son **ilustrativos**; los reales salen de Q12, Q03–Q05, Q14, Q08 y Q13.

`GET /api/posiciones`
```json
{ "total": 12, "datos": [
  { "posicion": 1, "equipo_id": 0, "equipo": "...", "pj": 8, "pg": 4, "pe": 2, "pp": 2,
    "gf": 11, "gc": 7, "dg": 4, "puntos": 14 }
] }
```
`posicion` es el lugar en el orden de Q12 (1 a 12), sin tratamiento especial de empates.

`GET /api/calendario` (cada elemento de `datos`)
```json
{ "partido_id": 0, "jornada": 1, "fecha": "2026-08-01", "hora": "15:00",
  "local":     { "equipo_id": 0, "nombre": "..." },
  "visitante": { "equipo_id": 0, "nombre": "..." },
  "estadio":   { "estadio_id": 0, "nombre": "..." },
  "estado": "jugado",
  "resultado": { "goles_local": 2, "goles_visitante": 1 } }
```
Un partido pendiente trae `"estado": "pendiente"` y `"resultado": null`.

`GET /api/goleadores` (cada elemento de `datos`)
```json
{ "jugador_id": 0, "nombre": "...", "equipo_id": 0, "equipo": "...", "goles": 0 }
```

`GET /api/partidos/:id`
```json
{ "datos": {
  "partido_id": 0, "jornada": 1, "fecha": "2026-08-01", "hora": "15:00",
  "local":     { "equipo_id": 0, "nombre": "..." },
  "visitante": { "equipo_id": 0, "nombre": "..." },
  "estadio":   { "estadio_id": 0, "nombre": "...", "ubicacion": "...", "capacidad": 0 },
  "estado": "jugado",
  "resultado": { "goles_local": 0, "goles_visitante": 0 },
  "arbitros": [ { "rol": "P", "arbitro_id": 0, "nombre": "...", "codigo": "..." } ],
  "goles": [ { "gol_id": 0, "minuto": 0, "equipo_id": 0, "jugador": { "jugador_id": 0, "nombre": "..." } } ]
} }
```
`arbitros` va en orden P, A1, A2 y `goles` en orden de `gol_id`. En un partido pendiente: `"resultado": null` y `"goles": []`. En un 0–0 jugado: `"goles": []`. `minuto` puede ser `null` si la base lo permite (ver D1 del SDD base).

`GET /api/equipos/:id` *(opcional)*: `{ "datos": { "equipo_id": 0, "nombre": "...", "jugadores": [ { "jugador_id": 0, "nombre": "...", "fecha_nacimiento": "AAAA-MM-DD", "dorsal": 1, "posicion": "POR" } ] } }`.

---

## 2. Plan técnico (PLAN)

### 2.1 Stack

| Capa | Tecnología | Rol |
|---|---|---|
| Base de datos | MySQL ≥ 8.0.16 (WAMP) | `campeonato_futbol` con sus 9 tablas |
| Runtime | Node.js (LTS) | Ejecuta Astro y los scripts |
| Lenguaje | TypeScript estricto | Tipado en consultas y páginas |
| Framework | Astro con `output: 'server'` y `@astrojs/node` (modo `standalone`) | SSR sin backend aparte |
| Acceso a datos | Drizzle ORM + `mysql2` | Consultas tipadas, cercanas a SQL |
| Herramientas | `drizzle-kit` (solo `pull`), `dotenv`, `tsx`, `@astrojs/check` | Lectura del esquema, variables de entorno, scripts, verificación de tipos |
| Estilos | Tailwind *(opcional, ver DA2)* | Tablas y layout rápidos |

Se fijan las versiones exactas en `package.json`. Drizzle cambia su API entre versiones: se consulta su documentación vigente al instalar.

### 2.2 Arquitectura

```
01_estructura.sql ──► MySQL (campeonato_futbol) ◄── 02_carga.sql
                         │
          drizzle-kit pull  (una vez, con usuario administrador)
                         │
                  src/db/schema.ts
                         │
Navegador ◄── Astro SSR ◄── src/lib/queries/*.ts ◄── mysql2 (usuario solo SELECT)
```

### 2.3 Estructura del proyecto

```
web/
├── src/
│   ├── db/
│   │   ├── index.ts            # pool mysql2 + instancia drizzle
│   │   ├── schema.ts           # copiado desde la salida de drizzle-kit pull
│   │   └── pulled/             # salida cruda de pull (no se edita; fuera de git si se desea)
│   ├── lib/
│   │   ├── queries/
│   │   │   ├── posiciones.ts   # Q12
│   │   │   ├── calendario.ts   # Q03 / Q04 / Q05
│   │   │   ├── goleadores.ts   # Q14
│   │   │   ├── partido.ts      # Q08 + Q13 (por id)
│   │   │   └── equipo.ts       # Q01 / Q02 (opcional)
│   │   ├── formato.ts          # fechas, marcador, etiqueta "Pendiente"
│   │   └── api.ts              # helpers de la API: respuesta JSON, errores, validación
│   ├── layouts/Base.astro
│   └── pages/
│       ├── index.astro
│       ├── calendario.astro
│       ├── goleadores.astro
│       ├── partidos/[id].astro
│       ├── equipos/[id].astro  # opcional
│       └── api/
│           ├── salud.ts
│           ├── posiciones.ts
│           ├── calendario.ts
│           ├── goleadores.ts
│           ├── partidos/[id].ts
│           ├── equipos/index.ts      # opcional
│           └── equipos/[id].ts       # opcional
├── scripts/
│   ├── verificar.ts            # paridad de los módulos de consulta con los conteos
│   └── verificar-api.ts        # prueba los endpoints HTTP (servidor en marcha)
├── drizzle.config.ts
├── astro.config.mjs
├── .env                        # fuera del repositorio
├── .env.example
└── README.md
```

### 2.4 Decisiones técnicas

1. **Conexión.** Un único `createPool` de `mysql2` en `src/db/index.ts`, compartido por todas las páginas. Host `127.0.0.1` (no `localhost`) para evitar problemas de resolución IPv6 en Windows/WAMP.
2. **Dos variables de entorno.**
   - `DATABASE_URL_ADMIN`: solo para `drizzle-kit pull`.
   - `DATABASE_URL`: la usa la app, con el usuario de solo lectura.
3. **Usuario de solo lectura.** Se crea con un script administrativo aparte (`sql/05_usuario_app.sql`), que **no** se mezcla con `01_estructura.sql` (el SDD base prohíbe operaciones de preparación ahí). Concede únicamente `SELECT` sobre `campeonato_futbol.*`.
4. **Fechas.** Las columnas `DATE` se declaran en modo texto (`date(..., { mode: 'string' })`) para que lleguen como `2026-08-01`, sin desfase de zona horaria (A8).
5. **Agregaciones.** `COUNT` y `SUM` se mapean a número con `sql<number>` y `.mapWith(Number)`.
6. **Local y visitante.** `partido` apunta dos veces a `equipo`: en las consultas se usan **alias** de Drizzle (`alias(equipo, 'local')` y `alias(equipo, 'visitante')`) para unir la misma tabla dos veces.
7. **Posiciones (Q12).** Cada partido jugado se "desdobla" en dos filas (perspectiva local y visitante) con `UNION ALL`, y sobre eso se agrega. Se implementa con el fragmento `sql` de Drizzle y se tipa el resultado a mano. Se calcula **solo** sobre partidos con `resultado`.
8. **Pendientes.** Se obtienen con `LEFT JOIN resultado` y se distinguen por `resultado.partido_id IS NULL`, igual que Q05.
9. **Validación de parámetros.** Los `id` de ruta se validan (entero positivo); si no, 404 (RP-06).
10. **Errores.** Las consultas se llaman dentro de `try/catch`; ante un fallo se responde 500 genérico (RP-07) y el detalle se registra solo en la consola del servidor.
11. **Caché.** Los datos no cambian durante la demostración; se admite una cabecera `Cache-Control` corta, sin caché propia en la app.
12. **Endpoints como rutas de Astro.** Cada archivo de `src/pages/api/` exporta `GET` y un manejador `ALL` que devuelve 405 con `Allow: GET` (A10). Validar la sintaxis contra la documentación vigente de Astro.
13. **Helpers en `lib/api.ts`.** `ok(datos, total?)`, `fail(estado, codigo, mensaje)` y funciones de validación (`enteroPositivo`, `jornadaValida`, `estadoValido`) fijan las cabeceras y el formato de §1.8 en un solo lugar.
14. **Serialización.** `JSON.stringify` falla con `BigInt`. Como todas las agregaciones se convierten a número (A8), la API nunca recibe `BigInt`.
15. **Forma de los datos.** Los módulos de consulta devuelven objetos listos para usar; el anidado (`local`, `visitante`, `estadio`, `jugador`) se arma en funciones de mapeo dentro del mismo módulo, de modo que páginas y API lo compartan (A9).
16. **Validación antes de consultar.** Los parámetros se validan antes de tocar la base; los desconocidos se ignoran.
17. **Sin autenticación y sin CORS por defecto.** Si un cliente externo lo necesita, se habilita CORS de forma explícita y solo para `GET` (DA6).
18. **Errores.** El detalle técnico se registra únicamente en la consola del servidor; al cliente solo llega el mensaje genérico (RNF-06).

Referencia de conexión (validar contra la documentación vigente de Drizzle; en MySQL puede requerirse indicar `mode` al usar el API relacional):

```ts
// src/db/index.ts
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const pool = createPool({ uri: import.meta.env.DATABASE_URL });
export const db = drizzle(pool, { schema, mode: "default" });
```

### 2.5 Mapa de vistas, consultas y verificación

| Vista | Módulo | Equivale a | Verificación de paridad |
|---|---|---|---|
| V1 | `posiciones.ts` | Q12 | 12 filas; cada equipo con PJ = 8; mismo orden que Q12 |
| V2 | `calendario.ts` | Q03 / Q04 / Q05 | 132 partidos en total; 48 jugados; 84 pendientes; 48 + 84 = 132 |
| V3 | `goleadores.ts` | Q14 | 180 filas; `SUM(goles)` = 137 = filas de `gol` |
| V4 | `partido.ts` | Q08 / Q13 | Para un partido jugado: goles del local y del visitante = marcador; 3 árbitros con roles P, A1, A2 |
| V5 | `equipo.ts` | Q01 / Q02 | 15 jugadores por equipo, ordenados por dorsal |

### 2.6 Estrategia de verificación

Un script `scripts/verificar.ts` (ejecutado con `tsx`) llama a los mismos módulos de consulta que usan las páginas y valida con `node:assert` los conteos de §2.5 y la suma de goles. `scripts/verificar-api.ts` hace lo mismo contra los **endpoints HTTP** con `fetch` (servidor en marcha): estados, conteos, filtros, errores 400/404/405 y que `resultado` sea `null` en los pendientes. No se agrega un framework de pruebas.

---

## 3. Fases y tareas (TASKS)

Cada fase termina con una **puerta de calidad (gate)**.

| Fase | Nombre | Entregable principal |
|---|---|---|
| A0 | Prerrequisitos | Gate de entrada confirmado |
| A1 | Usuario de solo lectura y entorno | `05_usuario_app.sql`, `.env`, `.env.example` |
| A2 | Proyecto base Astro | Proyecto que arranca en modo servidor |
| A3 | Capa de datos | `schema.ts` y conexión funcionando |
| A4 | Consultas y paridad | Módulos de consulta + `verificar.ts` en verde |
| A5 | API REST (JSON) | Endpoints `GET` de solo lectura + `verificar-api.ts` |
| A6 | Vistas | V1–V4 (y V5 opcional) |
| A7 | Calidad y robustez | 404/500, responsive, build de producción |
| A8 | Documentación y cierre | `README.md` y evidencias |

---

### Fase A0 · Prerrequisitos

- [ ] **TA0.1** Confirmar que el SDD base cumple los Gates 0–7 (§1.3).
- [ ] **TA0.2** Verificar los conteos de la tabla de §1.3 directamente en MySQL.
- [ ] **TA0.3** Verificar `node --version` (LTS) y `npm --version`.
- [ ] **TA0.4** Confirmar que MySQL de WAMP escucha en `127.0.0.1:3306`.

**Gate A0:** conteos correctos y Node instalado. Si la base no cuadra, se corrige el proyecto principal antes de seguir.

---

### Fase A1 · Usuario de solo lectura y entorno

- [ ] **TA1.1** Escribir `sql/05_usuario_app.sql`: crear el usuario de la app y conceder solo `SELECT` sobre `campeonato_futbol.*`.
- [ ] **TA1.2** Ejecutarlo con el usuario administrador.
- [ ] **TA1.3** Comprobar el aislamiento: con el usuario de la app, un `SELECT` funciona y un `INSERT`/`UPDATE`/`DELETE` falla con error de permisos. Guardar la salida como evidencia.
- [ ] **TA1.4** Crear `.env` con `DATABASE_URL` (usuario de la app) y `DATABASE_URL_ADMIN` (solo para `pull`), y `.env.example` con valores de ejemplo.
- [ ] **TA1.5** Añadir `.env` a `.gitignore`.

**Gate A1:** el usuario de la app solo puede leer; `.env` no está versionado.

---

### Fase A2 · Proyecto base Astro

- [ ] **TA2.1** Crear el proyecto con la plantilla mínima y TypeScript en modo **estricto**.
- [ ] **TA2.2** Añadir el adaptador de Node: `output: 'server'`, modo `standalone`.
- [ ] **TA2.3** *(Opcional, DA2)* Añadir Tailwind.
- [ ] **TA2.4** Instalar `@astrojs/check` y verificar que `astro check` pasa.
- [ ] **TA2.5** Crear el layout `Base.astro` con navegación entre las vistas.

**Gate A2:** `npm run dev` arranca y `astro check` no reporta errores.

---

### Fase A3 · Capa de datos

- [ ] **TA3.1** Instalar `drizzle-orm`, `mysql2` y `dotenv`; y `drizzle-kit`, `tsx` como dependencias de desarrollo.
- [ ] **TA3.2** Crear `drizzle.config.ts` con `dialect: "mysql"`, `dbCredentials.url` tomada de `DATABASE_URL_ADMIN` y `out: ./src/db/pulled`.
- [ ] **TA3.3** Ejecutar **solo** `drizzle-kit pull`. No ejecutar `push`, `generate` ni `migrate` (A2).
- [ ] **TA3.4** Revisar el esquema generado: las 9 tablas, tipos, claves primarias y claves foráneas. Copiar `schema.ts` a `src/db/schema.ts`.
- [ ] **TA3.5** Ajustar `jornada.dia` y `jugador.fecha_nacimiento` a modo texto (A8).
- [ ] **TA3.6** Verificar que `gol` incluye `minuto` si el DDL base lo definió.
- [ ] **TA3.7** Crear `src/db/index.ts` con el pool y la instancia de Drizzle usando `DATABASE_URL`.
- [ ] **TA3.8** Prueba de humo: contar filas de `equipo` (debe dar 12).
- [ ] **TA3.9** *(Plan B)* Si `pull` falla (ver Anexo C, R1), escribir `schema.ts` a mano a partir del contrato de §1.7: son solo 9 tablas.

**Gate A3:** `schema.ts` refleja las 9 tablas y la prueba de humo devuelve 12.

---

### Fase A4 · Consultas y paridad

- [ ] **TA4.1** `posiciones.ts` (Q12): `UNION ALL` de perspectivas local y visitante, solo partidos con `resultado`; PJ = PG + PE + PP; puntos 3/1/0; orden de Q12.
- [ ] **TA4.2** `calendario.ts` (Q03/Q04/Q05): partidos con alias `local` y `visitante`, `LEFT JOIN resultado`; filtros por jornada y por estado.
- [ ] **TA4.3** `goleadores.ts` (Q14): `LEFT JOIN` desde `jugador` para incluir a los de 0 goles; orden de Q14.
- [ ] **TA4.4** `partido.ts` (Q08/Q13): detalle por `id` con árbitros ordenados P, A1, A2 y goles con autor, equipo y minuto.
- [ ] **TA4.5** *(Opcional)* `equipo.ts` (Q01/Q02).
- [ ] **TA4.6** Convertir `COUNT`/`SUM` a número en todas las consultas (A8).
- [ ] **TA4.7** Escribir `scripts/verificar.ts` con los conteos de §2.5 y ejecutarlo con `tsx`.
- [ ] **TA4.8** Comparar la salida de V1 y V3 con la evidencia de Q12 y Q14 del proyecto principal.

**Gate A4:** `verificar.ts` pasa sin fallas y las posiciones y goleadores coinciden con Q12 y Q14.

---

### Fase A5 · API REST (JSON)

**Objetivo:** exponer en JSON, de solo lectura, los mismos datos de las vistas, reutilizando los módulos de consulta (A9).

- [ ] **TA5.1** Crear `src/lib/api.ts` con `ok`, `fail` y las funciones de validación; fijar `Content-Type` y `Cache-Control` según §1.8.
- [ ] **TA5.2** `GET /api/salud`: ejecuta una consulta mínima; 200 si responde, 503 `BASE_NO_DISPONIBLE` si falla.
- [ ] **TA5.3** `GET /api/posiciones` (Q12), con `posicion` calculada por orden.
- [ ] **TA5.4** `GET /api/calendario` (Q03/Q04/Q05) con los filtros `jornada` y `estado` validados; pendientes con `resultado: null`.
- [ ] **TA5.5** `GET /api/goleadores` (Q14), con los 180 jugadores.
- [ ] **TA5.6** `GET /api/partidos/:id` (Q08 + Q13): árbitros en orden P, A1, A2 y goles por `gol_id`; 400 si el `id` es inválido y 404 si no existe.
- [ ] **TA5.7** *(Opcional)* `GET /api/equipos` y `GET /api/equipos/:id` (Q01/Q02).
- [ ] **TA5.8** Responder 405 con `Allow: GET` ante cualquier método distinto de `GET` en todas las rutas (A10).
- [ ] **TA5.9** Unificar los errores con el formato de §1.8; en 500 y 503 no filtrar SQL, credenciales ni rutas (RNF-06).
- [ ] **TA5.10** Escribir `scripts/verificar-api.ts` con los casos del Anexo A (API) y ejecutarlo con el servidor en marcha.
- [ ] **TA5.11** Probar a mano con `curl` o Postman y guardar la salida como evidencia, incluido un `POST` que debe dar 405.
- [ ] **TA5.12** Comprobar que `total` y el contenido coinciden con la evidencia de Q12, Q14 y Q03–Q05 del proyecto principal.

**Gate A5:** `verificar-api.ts` pasa; todos los métodos distintos de `GET` dan 405; ningún error expone detalles internos; las cifras coinciden con las consultas del proyecto principal.

---

### Fase A6 · Vistas

- [ ] **TA6.1** **V1** `index.astro`: tabla de posiciones (RP-04).
- [ ] **TA6.2** **V2** `calendario.astro`: agrupado por jornada, filtros `?jornada` y estado; pendientes con etiqueta **Pendiente** y sin marcador (A4, RP-01).
- [ ] **TA6.3** **V3** `goleadores.astro`: 180 filas, con los de 0 goles incluidos.
- [ ] **TA6.4** **V4** `partidos/[id].astro`: encabezado del partido, estadio, fecha + "15:00" (RP-02), árbitros (RP-05) y lista de goles; si el partido es pendiente, mostrar "Pendiente" y omitir la sección de goles.
- [ ] **TA6.5** Enlazar el calendario con el detalle de cada partido y los nombres de equipo con V5 si existe.
- [ ] **TA6.6** *(Opcional)* **V5** `equipos/[id].astro`.
- [ ] **TA6.7** Formato de fechas y marcador centralizado en `lib/formato.ts` (RP-01, RP-03).

**Gate A6:** las cuatro vistas muestran datos reales y cumplen el Anexo A.

---

### Fase A7 · Calidad y robustez

- [ ] **TA7.1** `id` inválido o inexistente en `/partidos/[id]` (y `/equipos/[id]`) responde 404 (RP-06).
- [ ] **TA7.2** Probar un fallo de base (apagar MySQL): la página responde 500 genérico, sin SQL ni credenciales (RP-07).
- [ ] **TA7.3** Revisar las tablas en ancho de teléfono: desplazamiento horizontal sin romper el diseño (RNF-03).
- [ ] **TA7.4** Ejecutar `astro check` y corregir todos los errores (RNF-02).
- [ ] **TA7.5** Ejecutar `astro build` y arrancar con `node ./dist/server/entry.mjs`; recorrer las cuatro vistas.
- [ ] **TA7.6** Revisar que ninguna ruta o respuesta expone variables de entorno (A5).

**Gate A7:** build de producción funcional, 404 y 500 correctos, sin errores de tipos.

---

### Fase A8 · Documentación y cierre

- [ ] **TA8.1** `README.md`: requisitos, instalación, variables de entorno, cómo ejecutar `pull`, `dev`, `build` y `verificar`, y la tabla de endpoints de la API con un ejemplo de respuesta.
- [ ] **TA8.2** Documentar la regla "solo lectura" y por qué no se usan `push`/`migrate` (A1, A2).
- [ ] **TA8.3** Capturas de las cuatro vistas y salida de `verificar.ts` como evidencia.
- [ ] **TA8.4** Registrar las limitaciones: sin escritura, sin autenticación, sin pruebas extensas.
- [ ] **TA8.5** Prueba final desde cero: clonar, `npm install`, configurar `.env`, `pull` o `schema.ts`, `build` y `start`.

**Gate A8 (Definition of Done):**
- [ ] El usuario de la app solo tiene `SELECT`.
- [ ] `verificar.ts` pasa y V1/V3 coinciden con Q12/Q14.
- [ ] `verificar-api.ts` pasa y la API responde 405 a todo lo que no sea `GET`.
- [ ] Los pendientes nunca aparecen como 0–0.
- [ ] `astro check` y `astro build` sin errores.
- [ ] `README.md` permite reproducir todo desde cero.

---

## Anexo A · Criterios de aceptación por vista

| Vista | Dado… | Cuando… | Entonces… |
|---|---|---|---|
| V1 | La base cargada con 48 resultados | Se abre `/` | Aparecen 12 equipos, cada uno con PJ = 8, ordenados por puntos, DG y GF descendentes y nombre ascendente |
| V1 | Existen 84 partidos pendientes | Se calculan los puntos | Los pendientes **no** suman puntos ni PJ |
| V2 | 132 partidos programados | Se abre `/calendario` | Aparecen los 132 agrupados en 22 jornadas |
| V2 | Un partido sin `resultado` | Se muestra en la lista | Dice **Pendiente** y no muestra marcador |
| V2 | Se abre `/calendario?jornada=3` | Se aplica el filtro | Solo aparecen los 6 partidos de la jornada 3 |
| V3 | 180 jugadores | Se abre `/goleadores` | Aparecen los 180, los de 0 goles al final por nombre; la suma de goles es 137 |
| V4 | Un partido jugado | Se abre `/partidos/[id]` | Se ven marcador, estadio, fecha, 3 árbitros (P, A1, A2) y los goles; los goles de cada equipo igualan su marcador |
| V4 | Un partido pendiente | Se abre `/partidos/[id]` | Se ve "Pendiente", árbitros y estadio, sin sección de goles |
| V4 | Un `id` que no existe | Se abre `/partidos/9999` | Respuesta 404 |
| V5 | Un equipo | Se abre `/equipos/[id]` | Aparecen sus 15 jugadores ordenados por dorsal |

### Criterios de aceptación de la API

| Endpoint | Dado… | Cuando… | Entonces… |
|---|---|---|---|
| `/api/posiciones` | 48 resultados cargados | `GET` | 200; `total` = 12; cada `pj` = 8; mismo orden que Q12 |
| `/api/calendario` | 132 partidos | `GET` sin filtros | 200; `total` = 132 |
| `/api/calendario?estado=jugado` | 48 resultados | `GET` | `total` = 48 y todos con `resultado` distinto de `null` |
| `/api/calendario?estado=pendiente` | 84 sin resultado | `GET` | `total` = 84 y todos con `resultado: null` |
| `/api/calendario?jornada=3` | Jornada de 6 partidos | `GET` | `total` = 6 |
| `/api/calendario?jornada=23` | Fuera de rango | `GET` | 400 `PARAMETRO_INVALIDO` |
| `/api/calendario?estado=otro` | Estado inválido | `GET` | 400 `PARAMETRO_INVALIDO` |
| `/api/goleadores` | 180 jugadores | `GET` | `total` = 180; la suma de `goles` es 137 |
| `/api/partidos/:id` | Partido jugado | `GET` | Goles del local y del visitante = marcador; árbitros P, A1, A2 |
| `/api/partidos/:id` | Partido pendiente | `GET` | `estado: "pendiente"`, `resultado: null`, `goles: []` |
| `/api/partidos/abc` | `id` no numérico | `GET` | 400 `PARAMETRO_INVALIDO` |
| `/api/partidos/9999` | `id` inexistente | `GET` | 404 `NO_ENCONTRADO` |
| Cualquier endpoint | Método `POST`, `PUT` o `DELETE` | Se envía | 405 `METODO_NO_PERMITIDO` con `Allow: GET` |
| `/api/salud` | Base en marcha | `GET` | 200 |
| `/api/salud` | Base apagada | `GET` | 503 `BASE_NO_DISPONIBLE`, sin detalles internos |

---

## Anexo B · Comandos de referencia

```bash
# Proyecto
npm create astro@latest web          # plantilla mínima, TypeScript estricto
cd web
npx astro add node                   # output: 'server', modo standalone
# npx astro add tailwind             # opcional (DA2)

# Datos
npm i drizzle-orm mysql2 dotenv
npm i -D drizzle-kit tsx @astrojs/check typescript
npx drizzle-kit pull                 # SOLO pull; nunca push/generate/migrate (A2)

# Desarrollo y verificación
npm run dev
npx astro check
npx tsx scripts/verificar.ts
npx tsx scripts/verificar-api.ts     # con el servidor en marcha

# Probar la API a mano
curl http://localhost:4321/api/posiciones
curl "http://localhost:4321/api/calendario?estado=pendiente"
curl -i -X POST http://localhost:4321/api/posiciones   # debe responder 405

# Producción local
npm run build
node ./dist/server/entry.mjs
```

```ts
// drizzle.config.ts (referencia)
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./src/db/pulled",
  dbCredentials: { url: process.env.DATABASE_URL_ADMIN! },
});
```

> `drizzle-kit pull` escribe `schema.ts` (y relaciones) dentro de la carpeta `out`. Por eso se copia a `src/db/schema.ts` después de revisarlo.

---

## Anexo C · Riesgos conocidos

| # | Riesgo | Mitigación |
|---|---|---|
| **R1** | `drizzle-kit pull` en MySQL: existe un reporte público de un fallo ("Unknown table 'check_constraints' in information_schema") en una versión antigua de `drizzle-kit`. La tabla existe desde MySQL 8.0.16, que es justo la versión mínima del proyecto; no pude confirmar si el fallo sigue vigente. | Usar una versión reciente de `drizzle-kit`. Si falla, escribir `schema.ts` a mano desde §1.7 (TA3.9). |
| **R2** | La API de Drizzle cambia entre versiones. | Fijar versiones exactas y consultar la documentación vigente al implementar. |
| **R3** | `COUNT`/`SUM` llegan como texto desde MySQL. | `.mapWith(Number)` en todas las agregaciones (A8). |
| **R4** | Las fechas `DATE` pueden aparecer corridas un día por la zona horaria. | Modo texto en las columnas de fecha (A8). |
| **R5** | `localhost` puede resolver a IPv6 en Windows y fallar. | Usar `127.0.0.1` en las URLs. |
| **R6** | Unir `equipo` dos veces sin alias produce columnas ambiguas. | `alias(equipo, 'local')` y `alias(equipo, 'visitante')`. |
| **R7** | Duplicación de filas por JOIN en posiciones y goleadores. | `UNION ALL` para posiciones y verificación contra los conteos de §2.5. |
| **R8** | Tocar la base desde la app y alterar la carga. | Usuario con solo `SELECT` y prohibición de `push`/`migrate` (A1, A2). |
| **R9** | `JSON.stringify` lanza error con valores `BigInt`. | Convertir todas las agregaciones a número en las consultas (A8, decisión 14). |
| **R10** | Un endpoint con SQL propio duplica lógica y se desincroniza de las vistas. | Los endpoints solo llaman a `src/lib/queries/` (A9). |
| **R11** | Sin CORS, un cliente en otro origen no podrá consumir la API desde el navegador. | Es intencional; si hace falta, habilitarlo explícitamente solo para `GET` (DA6). |
| **R12** | La sintaxis de los endpoints (`GET`, `ALL`) puede variar entre versiones de Astro. | Fijar la versión y validar contra la documentación vigente (decisión 12). |

---

## Decisiones abiertas

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| **DA1** | ¿Incluir V5 (plantilla por equipo)? | Sí / no | **Sí si sobra tiempo**: reutiliza Q01/Q02 y completa la navegación. Es opcional |
| **DA2** | ¿Usar Tailwind? | Tailwind / CSS propio | **Tailwind**: tablas y layout rápidos con `astro add tailwind` |
| **DA3** | ¿El script de carga del SDD base (D4) en TypeScript o en Python? | `tsx` / Python | **TypeScript con `tsx`**, para tener un solo entorno. Leer el `.txt` como `windows-1252` (con `TextDecoder` o `iconv-lite`) |
| **DA4** | ¿Gestor de paquetes? | npm / pnpm | **npm**: viene con Node, sin instalar nada |
| **DA5** | ¿Qué hacer con `?jornada` fuera de 1–22 en las **páginas**? | Ignorar el filtro / responder 404 | **Ignorar el filtro y mostrar todo**: más tolerante para quien navega. La **API** siempre responde 400 (§1.8) |
| **DA6** | ¿Habilitar CORS en la API? | No / solo `GET` con origen definido / abierto | **No por defecto.** Habilitarlo solo si un cliente externo lo necesita, limitado a `GET` |
| **DA7** | ¿Paginación y versionado (`/api/v1`) en la API? | Sí / no | **No**: el máximo es 180 filas y la API es de solo lectura con un único consumidor |
