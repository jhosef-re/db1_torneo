# Proyecto 2026 · Base de Datos del Campeonato de Fútbol
**Liga Universitaria del Valle** · Bases de Datos I · Ingeniería en Sistemas
Universidad Mariano Gálvez de Guatemala · Centro Universitario El Naranjo

> Documento en formato **Spec-Driven Development (SDD)**: primero la especificación (qué y por qué), luego el plan técnico (cómo), después las tareas por fases con criterios de aceptación verificables.
> Fuentes: `Proyecto-2026.pdf` (enunciado) y `Proyecto-2026-Carga.txt` (datos de carga).
> **Versión 2:** decisiones D1–D5 resueltas e incorporadas en todo el documento (ver [Decisiones tomadas](#decisiones-tomadas)).

---

## Índice

0. [Constitución del proyecto](#0-constitución-del-proyecto)
1. [Especificación (SPEC)](#1-especificación-spec)
2. [Plan técnico (PLAN)](#2-plan-técnico-plan)
3. [Fases y tareas (TASKS)](#3-fases-y-tareas-tasks)
4. [Anexo A · Consultas Q01–Q14](#anexo-a--consultas-q01q14)
5. [Anexo B · Hallazgos sobre el archivo de carga](#anexo-b--hallazgos-sobre-el-archivo-de-carga)
6. [Anexo C · Evaluación y entregables](#anexo-c--evaluación-y-entregables)
7. [Decisiones tomadas](#decisiones-tomadas)

---

## 0. Constitución del proyecto

Principios no negociables que gobiernan todas las fases. Si una decisión los contradice, se rechaza.

| # | Principio | Origen |
|---|-----------|--------|
| C1 | **El DDL se ejecuta sin correcciones manuales** en una base nueva. | Coherencia de la entrega |
| C2 | **Una sola fuente de nombres**: modelo E-R, diccionario y script usan los mismos nombres de tablas, columnas y relaciones. | Coherencia de la entrega |
| C3 | **Contrato de compatibilidad**: los nombres de tablas/columnas del contrato no se alteran; no se agregan columnas obligatorias sin `DEFAULT` que impidan la carga. Única extensión: `gol.minuto`, **opcional** (`NULL` por defecto), ver D1. | Contrato de datos |
| C4 | **Honestidad declarativa**: no se atribuye a una FK o `CHECK` la validación de cantidades o condiciones entre varias filas. Esas reglas se *verifican* con consultas de control, no se *implementan*. | Reglas sobre varios registros |
| C5 | **Historia protegida**: FK con `RESTRICT` (o equivalente); sin `ON DELETE CASCADE`. | Script de estructura |
| C6 | **Pendiente ≠ 0–0**: un partido pendiente se distingue por la **ausencia de fila en `resultado`**; un 0–0 es un empate jugado. | Resultados y pendientes |
| C7 | **Cálculo, no almacenamiento**: puntos, posiciones y estadísticas se obtienen con consultas, no con columnas. | Resultados y pendientes |
| C8 | **Separación de scripts**: `01_estructura.sql` sin `INSERT` ni operaciones destructivas; carga después de crear todas las tablas; consultas sin modificar la carga. | Script de estructura |
| C9 | **Toda regla tiene evidencia**: cada restricción o control se demuestra con salida real de MySQL (incluyendo el error esperado de los rechazos). | Procedimiento de revisión |

---

## 1. Especificación (SPEC)

### 1.1 Propósito y producto esperado

Analizar el campeonato de la Liga Universitaria del Valle, construir su **modelo entidad-relación**, transformarlo en **modelo relacional** y crear la base de datos mediante **DDL**. El estudiante justifica requisitos, relaciones, claves, tipos de datos y restricciones.

El alcance se concentra en la base de datos e **incluye el registro individual de los goles y sus autores**. Como práctica complementaria se entregan **catorce consultas SELECT** (Anexo A).

**Fuera de alcance:** desarrollo de aplicación; aplazamientos, sanciones, eliminatorias, temporadas adicionales; transferencias de jugadores; autogoles y tandas de penales; `UPDATE`/`DELETE` en las consultas.

### 1.2 Alcance cuantitativo

| Elemento | Cantidad o alcance |
|---|---|
| Equipos y jugadores | 12 equipos con 15 jugadores cada uno; 180 jugadores |
| Jornadas y partidos | 22 jornadas, 6 partidos por jornada y 132 partidos |
| Resultados | 48 marcadores de las jornadas 1 a 8; 84 pendientes |
| Sedes | 6 estadios compartidos; uno por encuentro de cada jornada |
| Árbitros | 18 árbitros; principal y dos asistentes por partido |
| Goles y autores | Una fila por gol, vinculada al partido jugado y al jugador autor; total coherente con los 48 marcadores |

### 1.3 Entorno de trabajo

- MySQL de **WAMP** + **phpMyAdmin** o cliente `mysql`. Apache/PHP solo si se usa phpMyAdmin.
- Registrar la versión con `SELECT VERSION();`
- **MySQL ≥ 8.0.16** (necesario para que las restricciones `CHECK` se apliquen).
- Tablas **InnoDB**, juego de caracteres **utf8mb4**.
- Nombre de la base: **`campeonato_futbol`**.
- La carga se ejecuta **después** de crear todas las tablas.

### 1.4 Reglas de negocio

Cada regla tiene un ID para trazarla hasta el DDL, la carga o las pruebas.

#### Competición y calendario
- **RN-01** Los 12 equipos se enfrentan todos contra todos, **a ida y vuelta**. Cada pareja disputa dos encuentros con localía inversa.
- **RN-02** Las jornadas 12 a 22 **invierten los cruces** de las jornadas 1 a 11.
- **RN-03** Cada equipo juega **una vez por jornada**, con 11 localías y 11 visitas; nunca se enfrenta a sí mismo.
- **RN-04** Las jornadas son **sábados**, del **1 de agosto al 26 de diciembre de 2026**, a las **15:00**. Se almacena la fecha; la hora es constante (no se almacena).
- **RN-05** No hay aplazamientos, sanciones, eliminatorias ni temporadas adicionales.

#### Resultados y pendientes
- **RN-06** Corte ficticio: **20 de septiembre de 2026**. Están jugadas las jornadas **1 a 8** (48 resultados). Las jornadas **9 a 22** contienen **84 pendientes** sin filas en `resultado`.
- **RN-07** Un **0–0** es un empate jugado, no un pendiente.
- **RN-08** Cada partido tiene **cero o un** resultado. Cada resultado pertenece a un partido y contiene goles de local y visitante, enteros **no negativos**.
- **RN-09** Victoria = 3 puntos; empate = 1 por equipo; derrota = 0. Puntos y estadísticas **se calculan con consultas**.

#### Plantillas y estadios
- **RN-10** Cada jugador pertenece a **un solo equipo** durante el campeonato. Sin transferencias.
- **RN-11** Cada plantilla tiene **15 jugadores** y **dorsales únicos dentro del equipo**. Se registran nombre completo, fecha de nacimiento, dorsal y posición.
- **RN-12** Cada partido usa uno de los seis estadios. Los seis encuentros de cada jornada son simultáneos: **no se repite sede en una jornada**. La localía no implica propiedad de la sede.

#### Árbitros por encuentro
- **RN-13** 18 árbitros con **código único**.
- **RN-14** Cada partido tiene **tres personas distintas**: principal (`P`), asistente 1 (`A1`) y asistente 2 (`A2`). Cada rol se cubre una vez por partido.
- **RN-15** **Nadie arbitra dos encuentros de la misma jornada.**
- **RN-16** La relación Partido–Árbitro se resuelve con `partido_arbitro`. La carga incluye **396 asignaciones** (132 × 3). El **rol pertenece a la asignación**, no al árbitro.

#### Goles y autores
- **RN-17** Cada gol se registra en `gol` con identificador propio, partido y jugador autor.
- **RN-18** Un jugador puede marcar **varios goles en un mismo partido**; cada anotación ocupa una fila distinta.
- **RN-19** El autor debe pertenecer al equipo **local o visitante** del encuentro.
- **RN-20** Los goles cuentan **a favor del equipo del autor**. No hay autogoles ni penales.
- **RN-21** Por equipo y encuentro, el **número de filas de `gol` = valor del marcador** en `resultado`. Un 0–0 no tiene filas de gol; un pendiente tampoco (se distingue por carecer de `resultado`).

### 1.5 Modelo conceptual (requisitos del E-R)

El diagrama debe mostrar: entidades, atributos, identificadores, relaciones, roles, cardinalidades y participación.

- Distinguir los roles **local** y **visitante** **sin duplicar** `Equipo`.
- **Partido–Resultado**: **1 a 0..1**.
- **Partido–Árbitro**: **muchos a muchos** (se resuelve con `Partido_Arbitro`, que lleva el atributo `rol`).
- **Gol es entidad**: cada gol corresponde a **un** Resultado y a **un** Jugador; un resultado y un jugador pueden tener **cero o muchos** goles.
- El partido se identifica mediante `Resultado.partido_id`.

### 1.6 Contrato de datos (tablas y columnas de referencia)

Estos nombres son el **contrato de compatibilidad** con los INSERT docentes.

| Tabla | Columnas y tipos de referencia |
|---|---|
| `equipo` | `equipo_id` INT; `nombre` VARCHAR(60) |
| `jornada` | `numero` INT; `dia` DATE |
| `estadio` | `estadio_id` INT; `nombre` VARCHAR(60); `ubicacion` VARCHAR(80); `capacidad` INT |
| `arbitro` | `arbitro_id` INT; `nombre` VARCHAR(80); `codigo` VARCHAR(8) |
| `jugador` | `jugador_id` INT; `equipo_id` INT; `nombre` VARCHAR(80); `fecha_nacimiento` DATE; `dorsal` INT; `posicion` VARCHAR(3) |
| `partido` | `partido_id` INT; `jornada_numero` INT; `local_id` INT; `visitante_id` INT; `estadio_id` INT |
| `resultado` | `partido_id` INT; `goles_local` INT; `goles_visitante` INT |
| `partido_arbitro` | `partido_id` INT; `arbitro_id` INT; `rol` VARCHAR(2) |
| `gol` | `gol_id` INT; `partido_id` INT; `jugador_id` INT; **`minuto` INT** *(extensión, ver D1)* |

> ✅ **Decisión D1:** el archivo de carga trae un 4.º valor en `gol` que el contrato no lista. Se interpreta como el **minuto del gol** y se agrega `gol.minuto` como columna **opcional y última** de la tabla. Ver [Anexo B](#anexo-b--hallazgos-sobre-el-archivo-de-carga) y [Decisiones tomadas](#decisiones-tomadas).

### 1.7 Transformación relacional (requisitos)

- **PK/FK**: en `resultado`, `partido_id` es PK **y** FK.
- `partido_arbitro`: **PK `(partido_id, rol)`** y **UNIQUE `(partido_id, arbitro_id)`**.
- **Todos los atributos son obligatorios** (`NOT NULL`), **excepto `gol.minuto`** (D1); la ausencia de `resultado` representa un pendiente.
- `gol`: `gol_id` PK; `partido_id` FK → `resultado(partido_id)`; `jugador_id` FK → `jugador(jugador_id)`.
- **No** definir `UNIQUE (partido_id, jugador_id)` en `gol` (un autor puede marcar varias veces). Tampoco `UNIQUE (partido_id, minuto)`: la carga tiene 4 casos de dos goles en el mismo minuto del mismo partido.
- El equipo del autor se obtiene vía `jugador`; **no se duplica en `gol`**.

**Referencias a documentar:**

| Desde | Hacia |
|---|---|
| `jugador` | `equipo` |
| `partido` | `jornada`, `estadio`, `equipo` (×2: local y visitante) |
| `resultado` | `partido` |
| `partido_arbitro` | `partido`, `arbitro` |
| `gol` | `resultado`, `jugador` |

### 1.8 Dominios y unicidad

| Tipo | Regla |
|---|---|
| Únicos | `equipo.nombre`, `estadio.nombre`, `arbitro.codigo`, `jornada.dia`, `(jugador.equipo_id, jugador.dorsal)` |
| `posicion` | `POR`, `DEF`, `MED`, `DEL` |
| `rol` | `P`, `A1`, `A2` |
| `jornada.numero` | 1 a 22 |
| `dorsal` | 1 a 99 |
| `capacidad` | positiva (> 0) |
| goles (`goles_local`, `goles_visitante`) | no negativos |
| `fecha_nacimiento` | anterior al inicio del torneo (`< 2026-08-01`) |
| `gol.minuto` | si no es nulo, entre 1 y 120 (la carga va de 1 a 89) |

> Los identificadores **no expresan cantidades**: limitar IDs no garantiza doce equipos o quince jugadores. Se distingue la **cardinalidad** (captura) de la **cantidad exigida** (carga completa).

### 1.9 Restricciones declarativas mínimas (en `partido`)

- `CHECK (local_id <> visitante_id)`
- `UNIQUE (local_id, visitante_id)`
- `UNIQUE (jornada_numero, local_id)`
- `UNIQUE (jornada_numero, visitante_id)`
- `UNIQUE (jornada_numero, estadio_id)`

### 1.10 Matriz de garantía: ¿declarativa o verificada?

Núcleo de la constitución C4. Las reglas de la columna derecha **no** las garantiza ninguna FK ni CHECK.

| Regla | ¿Cómo se garantiza? |
|---|---|
| PK, FK, NOT NULL, UNIQUE, dominios (CHECK) | **Implementada** en el DDL |
| Local ≠ visitante | **Implementada** (CHECK) |
| Un partido tiene cero o un resultado | **Implementada** (PK = FK en `resultado`) |
| Gol con autor inexistente / partido sin resultado | **Implementada** (FK) |
| Un equipo no actúa de local *y* visitante en la misma jornada | **Verificada** (los UNIQUE por jornada+local y jornada+visitante no lo impiden) |
| Plantillas de 15 jugadores | **Verificada** en la carga |
| Ternas completas de árbitros (P, A1, A2 distintos) | **Verificada** en la carga |
| Árbitro sin simultaneidad en una jornada | **Verificada** en la carga |
| Seis partidos por jornada | **Verificada** en la carga |
| Inversión de cruces de vuelta (jornadas 12–22) | **Verificada** en la carga |
| Autor pertenece a un equipo del partido | **Verificada** (consulta de control) |
| Filas de `gol` = marcador por equipo y partido | **Verificada** (consulta de conciliación) |
| Cantidades totales (12/22/132/48/180/18/6/396) | **Verificada** en la carga |

---

## 2. Plan técnico (PLAN)

### 2.1 Estructura de archivos

```
campeonato_futbol/
├── docs/
│   ├── 01_analisis_reglas.md
│   ├── 02_modelo_er.(png|pdf)          # diagrama E-R
│   ├── 03_modelo_relacional.md         # esquema PK/FK, diccionario, normalización
│   └── 04_evidencias.md                # versión, motor, charset, salidas, rechazos
├── scripts/
│   └── generar_carga.py                # lee el .txt (cp1252) y genera sql/02_carga.sql (D4)
└── sql/
    ├── 01_estructura.sql               # CREATE DATABASE, USE, 9 CREATE TABLE
    ├── 02_carga.sql                    # INSERTs generados por el script
    ├── 03_consultas.sql                # Q01–Q14 (enunciado, consulta, evidencia)
    └── 04_pruebas_y_controles.sql      # rechazos (con ROLLBACK) + consultas de control
```

> El enunciado nombra `01_estructura.sql` y `03_consultas.sql`. Los otros nombres son sugeridos y mantienen la numeración. `03_consultas.sql` contiene solo `SELECT`; pruebas de rechazo y controles viven aparte en `04_pruebas_y_controles.sql` (D5).

### 2.2 Orden de creación de tablas (dependencias)

```
Nivel 0 (sin dependencias):  equipo · jornada · estadio · arbitro
Nivel 1:                     jugador (→equipo) · partido (→jornada, estadio, equipo×2)
Nivel 2:                     resultado (→partido) · partido_arbitro (→partido, arbitro)
Nivel 3:                     gol (→resultado, jugador)
```

El **orden de carga** es el mismo: Equipo, Jornada, Estadio, Árbitro → Jugador, Partido → Resultado, Partido_Arbitro → Gol.

### 2.3 Convenciones de DDL

- `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` en cada tabla.
- Tipos de PK y FK **idénticos** entre tablas relacionadas.
- Todas las columnas `NOT NULL`, salvo `gol.minuto` (D1).
- Nombres de restricciones **explícitos y consistentes**, por ejemplo: `pk_<tabla>`, `fk_<hija>_<padre>[_<rol>]`, `uq_<tabla>_<columnas>`, `ck_<tabla>_<regla>`.
- FK con `ON DELETE RESTRICT ON UPDATE RESTRICT`.
- **IDs explícitos (D2):** se insertan tal como vienen en la carga. Sin `AUTO_INCREMENT` y sin procedimiento almacenado que calcule `MAX(id) + 1`.
- **Índices explícitos y con nombre (D3):** `idx_<tabla>_<columna>`, declarados en el propio `CREATE TABLE` (ver §2.4).
- Nota técnica: MySQL no permite `CHECK` sobre columnas usadas en FK con acciones referenciales `CASCADE`/`SET NULL`; con `RESTRICT` no hay conflicto.

### 2.4 Mapa de restricciones por tabla

| Tabla | PK | FK | UNIQUE | CHECK |
|---|---|---|---|---|
| `equipo` | `equipo_id` | — | `nombre` | — |
| `jornada` | `numero` | — | `dia` | `numero BETWEEN 1 AND 22` |
| `estadio` | `estadio_id` | — | `nombre` | `capacidad > 0` |
| `arbitro` | `arbitro_id` | — | `codigo` | — |
| `jugador` | `jugador_id` | `equipo_id → equipo` | `(equipo_id, dorsal)` | `dorsal BETWEEN 1 AND 99`; `posicion IN ('POR','DEF','MED','DEL')`; `fecha_nacimiento < '2026-08-01'` |
| `partido` | `partido_id` | `jornada_numero → jornada`; `local_id → equipo`; `visitante_id → equipo`; `estadio_id → estadio` | `(local_id, visitante_id)`; `(jornada_numero, local_id)`; `(jornada_numero, visitante_id)`; `(jornada_numero, estadio_id)` | `local_id <> visitante_id` |
| `resultado` | `partido_id` | `partido_id → partido` | — | `goles_local >= 0`; `goles_visitante >= 0` |
| `partido_arbitro` | `(partido_id, rol)` | `partido_id → partido`; `arbitro_id → arbitro` | `(partido_id, arbitro_id)` | `rol IN ('P','A1','A2')` |
| `gol` | `gol_id` | `partido_id → resultado(partido_id)`; `jugador_id → jugador` | *(ninguno sobre `(partido_id, jugador_id)` ni `(partido_id, minuto)`)* | `minuto IS NULL OR minuto BETWEEN 1 AND 120` |

#### Índices explícitos (D3)

MySQL exige un índice por cada FK, y lo crea solo (con nombre automático) si no existe. Se declaran explícitos solo los que **no** quedan cubiertos por una PK o UNIQUE donde la columna de la FK sea la **primera**:

| Índice | Tabla | Columna | Motivo |
|---|---|---|---|
| `idx_partido_visitante` | `partido` | `visitante_id` | FK a `equipo`; en `UNIQUE (jornada_numero, visitante_id)` no es la primera columna |
| `idx_partido_estadio` | `partido` | `estadio_id` | FK a `estadio`; en `UNIQUE (jornada_numero, estadio_id)` no es la primera columna |
| `idx_partido_arbitro_arbitro` | `partido_arbitro` | `arbitro_id` | FK a `arbitro`; en `UNIQUE (partido_id, arbitro_id)` no es la primera columna. Además ayuda a Q09 |
| `idx_gol_partido` | `gol` | `partido_id` | FK a `resultado` |
| `idx_gol_jugador` | `gol` | `jugador_id` | FK a `jugador`. Además ayuda a Q14 |

**No necesitan índice extra** (ya son primera columna de una PK o UNIQUE): `jugador.equipo_id` (`UNIQUE (equipo_id, dorsal)`), `partido.jornada_numero` (`UNIQUE (jornada_numero, local_id)`), `partido.local_id` (`UNIQUE (local_id, visitante_id)`), `resultado.partido_id` (PK) y `partido_arbitro.partido_id` (PK).

### 2.5 Estrategia de verificación

1. **Estructura**: `SHOW CREATE TABLE` de las 9 tablas; registrar versión, motor, codificación.
2. **Carga con FK activas**; conteos esperados + conciliación de goles.
3. **Rechazos** dentro de transacción con `ROLLBACK`, conservando el error de MySQL como evidencia.
4. **Controles** de reglas multi-fila (consultas que deben devolver **0** inconsistencias).
5. **Consultas Q01–Q14** comparadas con los conteos de referencia.

### 2.6 Normalización (qué debe argumentarse)

Para el documento de modelos: demostrar **1FN** (atributos atómicos, sin grupos repetidos), **2FN** (sin dependencias parciales en claves compuestas como `partido_arbitro(partido_id, rol)`) y **3FN** (sin dependencias transitivas). Argumentos clave:

- El **equipo del autor** no se guarda en `gol` (se obtiene por `jugador`) → evita dependencia transitiva y redundancia.
- Puntos y posiciones **no se almacenan** → evita datos derivados.
- El **rol** vive en `partido_arbitro`, no en `arbitro` → depende de la asignación, no de la persona.
- Local y visitante son **dos FK a `equipo`** → sin duplicar la entidad.
- `minuto` depende únicamente de `gol_id` (es un atributo del hecho "gol"), por lo que no rompe 2FN ni 3FN.

---

## 3. Fases y tareas (TASKS)

Cada fase termina con una **puerta de calidad (gate)**: no se avanza si no se cumple.

### Resumen

| Fase | Nombre | Entregable principal | Puntos que alimenta |
|---|---|---|---|
| 0 | Entorno y línea base | Versión/motor/charset registrados | DDL (25) |
| 1 | Análisis y reglas | `01_analisis_reglas.md` | Análisis (15) |
| 2 | Modelo E-R | Diagrama E-R + justificación | E-R (25) |
| 3 | Modelo relacional | Esquema, diccionario, normalización | Relacional (20) |
| 4 | DDL | `01_estructura.sql` | DDL (25) |
| 5 | Carga | Script `generar_carga.py` + `02_carga.sql` + conteos | DDL (25) |
| 6 | Pruebas y controles | `04_pruebas_y_controles.sql` + evidencia | DDL (25) |
| 7 | Consultas | `03_consultas.sql` (Q01–Q14) | Consultas (15) |
| 8 | Documentación y cierre | Paquete final | Todos |

---

### Fase 0 · Entorno y línea base

**Objetivo:** tener un entorno reproducible y confirmar que los `CHECK` se aplicarán.

- [ ] **T0.1** Levantar MySQL de WAMP; abrir phpMyAdmin o el cliente `mysql`.
- [ ] **T0.2** Ejecutar `SELECT VERSION();` y guardar la salida.
- [ ] **T0.3** Confirmar versión **≥ 8.0.16**. Si es menor, `CHECK` se parsea pero **no se aplica**: resolver antes de seguir.
- [ ] **T0.4** Confirmar motor por defecto (`SHOW ENGINES;`) y charset (`SHOW VARIABLES LIKE 'character_set%';`).
- [ ] **T0.5** Revisar la codificación de `Proyecto-2026-Carga.txt` (ver Anexo B: viene en **ISO-8859/cp1252**, no UTF-8).

**Gate 0:** versión, motor y codificación documentados; versión ≥ 8.0.16.

---

### Fase 1 · Análisis y reglas (15 pts)

**Objetivo:** documentar reglas y supuestos.

- [ ] **T1.1** Redactar objetivos y alcance (usar §1.1–1.2).
- [ ] **T1.2** Listar entidades y hechos representados (equipo, jugador, jornada, partido, estadio, árbitro, resultado, asignación arbitral, gol).
- [ ] **T1.3** Transcribir la matriz de reglas RN-01…RN-21 con su origen.
- [ ] **T1.4** Registrar supuestos explícitos (ej.: la hora 15:00 no se almacena; sin autogoles; el 4.º dato de `gol` se toma como **minuto** (D1); IDs explícitos, sin `AUTO_INCREMENT` ni SP de `MAX+1` (D2)).
- [ ] **T1.5** Construir la **matriz declarativa vs verificada** (§1.10).

**Gate 1:** toda RN tiene ID, origen y un mecanismo de garantía asignado.

---

### Fase 2 · Modelo E-R (25 pts)

**Objetivo:** diagrama legible y justificado.

- [ ] **T2.1** Definir entidades, atributos e identificadores.
- [ ] **T2.2** Definir relaciones con **roles**, **cardinalidades** y **participación**:
  - `Equipo` —(local)— `Partido` y `Equipo` —(visitante)— `Partido` (dos roles, una sola entidad `Equipo`).
  - `Equipo` 1 — N `Jugador`.
  - `Jornada` 1 — N `Partido`; `Estadio` 1 — N `Partido`.
  - `Partido` **1 — 0..1** `Resultado`.
  - `Partido` N — M `Árbitro` (con atributo `rol` en la asociación).
  - `Resultado` 1 — 0..N `Gol`; `Jugador` 1 — 0..N `Gol`.
- [ ] **T2.3** Representar `Gol` como **entidad** (no como atributo), con atributos `gol_id` y `minuto`.
- [ ] **T2.4** Escribir la **lectura de cardinalidades** (en prosa, en ambos sentidos).
- [ ] **T2.5** Justificar `Partido–Resultado 1:0..1` y `Partido–Árbitro N:M`.

**Gate 2:** el diagrama muestra todos los elementos exigidos; los nombres coinciden con el contrato (C2).

---

### Fase 3 · Modelo relacional, diccionario y normalización (20 pts)

**Objetivo:** esquema relacional completo.

- [ ] **T3.1** Derivar el esquema relacional con **PK y FK** (§1.7, §2.4).
- [ ] **T3.2** Documentar las referencias (§1.7, tabla de referencias).
- [ ] **T3.3** Construir el **diccionario de columnas y dominios** (tabla, columna, tipo, nulabilidad, PK/FK/UQ, dominio, descripción).
- [ ] **T3.4** Redactar la **normalización** (§2.6).
- [ ] **T3.5** Documentar los **límites declarativos** (§1.10).

**Gate 3:** el diccionario cubre las 9 tablas y cada FK documentada existe en el esquema.

---

### Fase 4 · DDL (parte de 25 pts)

**Objetivo:** `01_estructura.sql` ejecutable sin correcciones.

- [ ] **T4.1** `CREATE DATABASE campeonato_futbol` con `utf8mb4`; `USE campeonato_futbol;`
- [ ] **T4.2** Crear las 9 tablas **en orden de dependencias** (§2.2).
- [ ] **T4.3** Aplicar PK, FK (`RESTRICT`), `NOT NULL`, `UNIQUE`, `CHECK` según §2.4, incluyendo `gol.minuto` (opcional, **última columna**) y los **5 índices explícitos** (D3).
- [ ] **T4.4** Verificar que **no hay** `INSERT`, `DROP` ni `TRUNCATE` en el archivo (C8).
- [ ] **T4.5** Ejecutar en **base nueva** y revisar con `SHOW CREATE TABLE` las 9 tablas.
- [ ] **T4.6** Guardar evidencia (versión, motor InnoDB, charset utf8mb4).

**Gate 4:** el script corre de punta a punta en una base vacía sin editarlo; las 9 tablas existen con sus restricciones.

---

### Fase 5 · Carga de datos

**Objetivo:** `02_carga.sql` que cargue con FK activas y deje los conteos exactos.

- [ ] **T5.1** Escribir el script `generar_carga.py` (D4): lee `Proyecto-2026-Carga.txt` decodificando **cp1252**, ignora los comentarios `-- SECCIÓN` y las líneas vacías, hace `trim` de espacios y comas finales, y escribe `02_carga.sql` en **UTF-8** con `SET NAMES utf8mb4;` al inicio.
- [ ] **T5.2** El script emite un `INSERT` por sección, **con lista explícita de columnas**, en este orden: `equipo` → `jornada` → `estadio` → `arbitro` → `jugador` → `partido` → `resultado` → `partido_arbitro` → `gol`. En `gol` la lista es `(gol_id, partido_id, jugador_id, minuto)` (D1).
- [ ] **T5.3** Comprobar que el script es **reproducible** (mismo `.txt` → mismo `.sql`) y que los IDs se insertan tal cual vienen, sin `AUTO_INCREMENT` ni cálculo de `MAX(id)+1` (D2).
- [ ] **T5.4** Ejecutar `02_carga.sql` con `FOREIGN_KEY_CHECKS=1` (no desactivarlas).
- [ ] **T5.5** Verificar conteos:

| Tabla | Esperado |
|---|---|
| `equipo` | 12 |
| `jornada` | 22 |
| `partido` | 132 |
| `resultado` | 48 |
| `jugador` | 180 |
| `arbitro` | 18 |
| `estadio` | 6 |
| `partido_arbitro` | 396 |
| `gol` | = `SUM(goles_local + goles_visitante)` de `resultado` (**137** según el archivo recibido) |

- [ ] **T5.6** Verificar la conciliación **por partido y equipo** (goles individuales vs marcador).
- [ ] **T5.7** Verificar `minuto`: `COUNT(*) WHERE minuto IS NULL` = 0 y rango observado 1–89; dentro de cada partido el minuto no decrece al avanzar `gol_id`.

**Gate 5:** todos los conteos coinciden; la conciliación devuelve 0 diferencias.

---

### Fase 6 · Pruebas de rechazo y consultas de control

**Objetivo:** demostrar que las restricciones funcionan y que las reglas multi-fila se cumplen.

**6A. Rechazos esperados** (cada intento dentro de transacción, con `ROLLBACK`; guardar el mensaje de error):

- [ ] **T6.1** Referencia inexistente (FK) — p. ej., jugador con `equipo_id` que no existe.
- [ ] **T6.2** Dorsal duplicado dentro del mismo equipo.
- [ ] **T6.3** Goles negativos en `resultado`.
- [ ] **T6.4** Dos resultados para un mismo partido (viola la PK de `resultado`).
- [ ] **T6.5** Autoenfrentamiento (`local_id = visitante_id`).
- [ ] **T6.6** Gol con **autor inexistente** (FK a `jugador`).
- [ ] **T6.7** Gol sobre un **partido sin Resultado** (FK a `resultado`).
- [ ] **T6.8** Gol con **minuto fuera de rango** (por ejemplo 0 o 121; `CHECK` de `minuto`, D1).

**6B. Consultas de control** (reglas que las FK **no** garantizan; todas deben devolver **0** filas):

- [ ] **T6.9** **Autor ajeno** a los equipos del encuentro (RN-19).
- [ ] **T6.10** **Diferencias** entre goles individuales y marcador, por equipo y partido (RN-21).
- [ ] **T6.11** Plantillas ≠ 15 jugadores (RN-11).
- [ ] **T6.12** Partidos con terna incompleta o con árbitros repetidos (RN-14).
- [ ] **T6.13** Árbitro con más de un partido en la misma jornada (RN-15).
- [ ] **T6.14** Jornadas con ≠ 6 partidos; equipo que aparece ≠ 1 vez en una jornada (RN-03, RN-12).
- [ ] **T6.15** Cruces de las jornadas 12–22 que **no** invierten los de 1–11 (RN-02).

**Gate 6:** cada rechazo tiene evidencia del error esperado y cada control devuelve cero inconsistencias.

---

### Fase 7 · Consultas Q01–Q14 (15 pts)

**Objetivo:** `03_consultas.sql` con enunciado comentado, consulta y evidencia.

- [ ] **T7.1** Escribir cada consulta con su enunciado como comentario (Anexo A).
- [ ] **T7.2** Ejecutarlas y comparar con los conteos de referencia.
- [ ] **T7.3** Comprobar que los **pendientes no alteran** puntos, promedios ni estadísticas de partidos jugados.
- [ ] **T7.4** Comprobar **ausencia de duplicaciones por JOIN** (especialmente Q06, Q07, Q09, Q11, Q12, Q14).
- [ ] **T7.5** Comprobar el **orden** solicitado en cada consulta.
- [ ] **T7.6** No usar `UPDATE` ni `DELETE`; no modificar la carga.

**Gate 7:** Q01–Q14 cuadran con las referencias; los controles de autores y conciliación devuelven 0.

---

### Fase 8 · Documentación y cierre

- [ ] **T8.1** Ensamblar la documentación mínima: objetivos y alcance; entidades y hechos; lectura de cardinalidades; esquema PK/FK; diccionario; **matriz de reglas y restricciones**; procedimiento de creación y carga; versión de MySQL; evidencias.
- [ ] **T8.2** La documentación **distingue reglas implementadas de reglas verificadas** (§1.10).
- [ ] **T8.3** Revisión de coherencia: mismos nombres en E-R, diccionario y DDL (C2).
- [ ] **T8.4** Prueba final: base nueva → `01_estructura.sql` → `02_carga.sql` → `03_consultas.sql` sin intervención manual.

**Gate 8 (Definition of Done):**
- [ ] El DDL corre sin correcciones.
- [ ] Conteos de carga correctos y conciliación en 0.
- [ ] Todos los rechazos demostrados con evidencia.
- [ ] Q01–Q14 correctas.
- [ ] Documentación consistente y completa.

---

## Anexo A · Consultas Q01–Q14

> Se usa DML según el manual de MySQL (que incluye SELECT); otras clasificaciones lo llaman DQL. No se solicitan `UPDATE` ni `DELETE`. Archivo: `03_consultas.sql`.

| ID | Nombre | Requisito | Orden | Referencia |
|---|---|---|---|---|
| **Q01** | Equipos y plantillas | ID, nombre y cantidad de jugadores por equipo, **incluidos equipos sin jugadores** (`LEFT JOIN`) | ID | 12 filas, 15 jugadores por equipo |
| **Q02** | Jugadores de Aurora FC | Nombre, nacimiento, dorsal y posición del equipo 1 | dorsal | 15 filas |
| **Q03** | Calendario completo | ID del partido, jornada, fecha, nombres de local, visitante y estadio | jornada, ID | 132 filas |
| **Q04** | Partidos jugados | Jornada, fecha, local, goles locales, goles visitantes y visitante | jornada, ID | 48 filas |
| **Q05** | Partidos pendientes | ID, jornada, fecha, local y visitante de los encuentros **sin Resultado** | jornada, ID | 84 filas |
| **Q06** | Resumen por jornada | Jornada y cantidades de programados, jugados y pendientes. **Incluir las 22 jornadas** | jornada | 6 jugados en las primeras 8; 6 pendientes en las restantes |
| **Q07** | Uso de estadios | Estadio, capacidad, partidos programados y jugados; **incluir sedes sin partidos** | — | 6 filas; 22 programados y 8 jugados por sede |
| **Q08** | Árbitros de la jornada 1 | Partido, local, visitante, nombre del árbitro y rol | partido y rol (P, A1, A2) | 18 filas |
| **Q09** | Carga arbitral | Código, nombre, total de asignaciones y cantidad por rol de cada árbitro, **incluidos los no asignados** | — | 18 filas; 22 asignaciones por persona |
| **Q10** | Goles por jornada jugada | Jornada, total de goles y promedio por partido **con dos decimales**; solo jornadas con resultados | — | 8 filas |
| **Q11** | Goles por equipo | Equipo, goles a favor, en contra y diferencia; **integrar localías y visitas**; solo partidos jugados; incluir los 12 equipos | — | 12 filas |
| **Q12** | Tabla de posiciones | Equipo, PJ, PG, PE, PP, GF, GC, DG y puntos | puntos, DG, GF **desc**; nombre **asc** | 12 equipos, cada uno con 8 PJ |
| **Q13** | Detalle de goles y autores | ID del gol, ID del partido, jornada, local, visitante, nombre del autor y su equipo. **Una fila por gol** | jornada, partido, ID del gol | total de filas = suma de marcadores de `resultado` |
| **Q14** | Tabla de goleadores | ID y nombre del jugador, equipo y total de goles. **Incluir los 180 jugadores**, también con total 0 | goles **desc**, nombre e ID **asc** | suma de totales = filas de `gol` |

**Notas de implementación por consulta (para evitar errores comunes):**

- **Q01, Q09, Q14, Q07** exigen incluir filas "vacías" → `LEFT JOIN` con la condición de filtro en el `ON`, no en el `WHERE`.
- **Q04/Q05** son complementarias: Q04 usa `INNER JOIN resultado`; Q05 usa `LEFT JOIN … WHERE resultado.partido_id IS NULL`. `Q04 + Q05 = 132`.
- **Q06/Q07** deben contar sin multiplicar filas: contar `partido` y `resultado` por separado o con agregación condicional.
- **Q11/Q12** requieren "desdoblar" cada partido en dos filas (una por equipo) — por ejemplo con `UNION ALL` de la perspectiva local y visitante — y operar **solo** sobre partidos con resultado.
- **Q12**: PG/PE/PP y puntos (3/1/0) se calculan; `PJ = PG + PE + PP`.
- **Q13/Q14**: el equipo del autor sale de `jugador`; no se duplica en `gol`. Cuidado con duplicar filas al unir con `partido` y dos veces con `equipo`.

---

## Anexo B · Hallazgos sobre el archivo de carga

Análisis hecho sobre `Proyecto-2026-Carga.txt`.

### B.1 Formato

- **No es SQL ejecutable**: son tuplas de valores separadas por comas, agrupadas por secciones con comentarios (`-- EQUIPOS`, `-- JORNADAS`, `-- ESTADIOS`, `-- ARBITROS`, `-- JUGADOR`, `-- PARTIDO`, `-- RESULTADO`, `-- PARTIDO_ARBITRO`, `-- GOL`). Falta `INSERT INTO …`, paréntesis y `;`. El enunciado lo confirma: *"Los INSERT deben ser resueltos por el estudiante."*
- **Codificación ISO-8859 (cp1252) con saltos CRLF.** Contiene tildes y `ñ` (*Atlético Central*, *Cóndores FC*, *Óscar*…). Al usar `utf8mb4` hay que **convertir a UTF-8** o declarar el charset al importar; si no, los nombres quedan corruptos.
- Algunas filas terminan en coma (sección `EQUIPOS`) y otras no; hay filas con espacios iniciales (`JUGADOR`, `PARTIDO`, `RESULTADO`). Un script de transformación debe limpiar con `trim`.

### B.2 Columnas por sección

| Sección | Columnas en el archivo | Filas | ¿Coincide con el contrato? |
|---|---|---|---|
| EQUIPOS | `equipo_id, nombre` | 12 | ✅ |
| JORNADAS | `numero, dia` | 22 | ✅ |
| ESTADIOS | `estadio_id, nombre, ubicacion, capacidad` | 6 | ✅ |
| ARBITROS | `arbitro_id, nombre, codigo` | 18 | ✅ |
| JUGADOR | `jugador_id, equipo_id, nombre, fecha_nacimiento, dorsal, posicion` | 180 | ✅ |
| PARTIDO | `partido_id, jornada_numero, local_id, visitante_id, estadio_id` | 132 | ✅ |
| RESULTADO | `partido_id, goles_local, goles_visitante` | 48 | ✅ |
| PARTIDO_ARBITRO | `partido_id, arbitro_id, rol` | 396 | ✅ |
| **GOL** | `gol_id, partido_id, jugador_id, minuto` | 137 | ⚠️ 4 valores; el contrato lista 3 → **extensión D1** |

### B.3 La 4.ª columna de `gol` (resuelta: D1)

Cada fila de `GOL` trae un cuarto valor entero (rango **1 a 89**). Ejemplo (`gol_id, partido_id, jugador_id, minuto`): `1, 2, 164, 6`. El enunciado no lo menciona y el contrato solo define tres columnas. **Se toma como minuto del gol** por esta evidencia:

- Dentro de cada uno de los 48 partidos, el valor **no decrece** al avanzar `gol_id` (orden cronológico).
- No coincide con el dorsal del autor ni con su equipo (3 y 1 coincidencias de 137: casualidad).
- El rango 1–89 es el de un partido de fútbol.
- Hay **4 casos de dos goles en el mismo minuto** del mismo partido → no puede haber `UNIQUE (partido_id, minuto)`.

Es una **interpretación**, no un dato confirmado por el enunciado: debe quedar escrita como supuesto en la documentación (Fase 1). Implementación en [Decisiones tomadas](#decisiones-tomadas).

### B.4 Validación de la carga contra las reglas (resultado)

Se verificó programáticamente que **el archivo recibido cumple las reglas**:

| Verificación | Resultado |
|---|---|
| Conteos (12 / 22 / 6 / 18 / 180 / 132 / 48 / 396) | ✅ correctos |
| Plantillas de 15 jugadores en los 12 equipos | ✅ |
| Dorsales duplicados dentro de un equipo | ✅ ninguno |
| Posiciones | POR 24 · DEF 60 · MED 60 · DEL 36 |
| Fechas de nacimiento | rango 1999-01-01 a 2006-12-28 (todas < 2026-08-01) ✅ |
| Fecha de la jornada 22 | 2026-12-26 ✅ |
| Autoenfrentamientos | ✅ ninguno |
| 132 parejas (local, visitante) distintas | ✅ |
| Inversión de cruces jornadas 12–22 vs 1–11 | ✅ |
| 6 partidos por jornada, 12 equipos distintos, 6 estadios distintos | ✅ en las 22 jornadas |
| Ternas P/A1/A2 completas con 3 árbitros distintos | ✅ en los 132 partidos |
| Árbitro repetido dentro de una jornada | ✅ ninguno |
| Asignaciones por árbitro | ✅ 22 cada uno |
| Resultados solo en jornadas 1–8 | ✅ |
| **Filas de `gol`** | **137** |
| **`SUM(goles_local + goles_visitante)`** | **137** ✅ coincide |
| Goles sobre partidos sin Resultado | ✅ ninguno |
| Autores ajenos a los equipos del partido | ✅ 0 |
| Diferencias por partido y equipo (gol vs marcador) | ✅ 0 |

> Estos son los valores que deben reproducir las consultas de control de la Fase 6 en MySQL. Si en la base cargada aparece una cifra distinta, el error está en la transformación a INSERT, no en los datos.

---

## Anexo C · Evaluación y entregables

### C.1 Entregables

| Entregable | Contenido obligatorio |
|---|---|
| **Modelo E-R** | Diagrama legible con entidades, atributos, identificadores, relaciones, roles, cardinalidades y participación |
| **Script DDL** | `01_estructura.sql` para crear `campeonato_futbol` y sus nueve tablas, restricciones e índices necesarios en MySQL WAMP |
| **Catorce consultas DML** | `03_consultas.sql` con Q01–Q14: enunciado comentado, consulta y evidencia de ejecución; sin modificar la carga |
| **Documentación de modelos** | Análisis, reglas, explicación del E-R, transformación relacional, diccionario, normalización, restricciones y límites declarativos |

### C.2 Criterios (sobre 100 puntos)

| Criterio | Puntos | Fases |
|---|---|---|
| Análisis y documentación de reglas y supuestos | 15 | 1 |
| Modelo E-R y justificación de relaciones | 25 | 2 |
| Modelo relacional, diccionario y normalización | 20 | 3 |
| DDL válido y restricciones verificadas en MySQL | 25 | 0, 4, 5, 6 |
| Catorce consultas correctas y evidencia de resultados | 15 | 7 |
| **Total** | **100** | |

Las catorce consultas se evalúan **en conjunto** sobre 15 puntos. Se valora: corrección, tratamiento de pendientes, ausencia de duplicaciones por JOIN, identificación de los autores y orden solicitado. Los demás criterios se puntúan según requisitos **demostrados y justificados**.

### C.3 Documentación mínima

Objetivos y alcance · entidades y hechos representados · lectura de cardinalidades · esquema con PK y FK · diccionario de columnas y dominios · matriz de reglas y restricciones · procedimiento de creación y carga · versión de MySQL y evidencias.

### C.4 Fuentes

- MySQL Reference Manual · CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL Reference Manual · Data Manipulation Statements: https://dev.mysql.com/doc/refman/8.0/en/sql-data-manipulation-statements.html

---

## Decisiones tomadas

Las cinco decisiones que estaban abiertas quedaron resueltas. Cada una ya está reflejada en las fases correspondientes.

| # | Decisión | Resolución | Dónde se aplica |
|---|---|---|---|
| **D1** | Cuarto valor de `gol` en la carga | Se **toma como `minuto`**. Columna `gol.minuto INT NULL DEFAULT NULL`, **última** de la tabla, con `CHECK (minuto IS NULL OR minuto BETWEEN 1 AND 120)`. Sin `UNIQUE` con `partido_id` | §1.6, §1.7, §1.8, §2.4, T1.4, T2.3, T4.3, T5.2, T5.7, T6.8, Anexo B.3 |
| **D2** | Generación de IDs | **IDs explícitos** tal como vienen en la carga. **Sin `AUTO_INCREMENT`** y **sin procedimiento almacenado** que calcule `MAX(id) + 1` | §2.3, T1.4, T5.3 |
| **D3** | Índices sobre FK | **Explícitos y con nombre** (`idx_<tabla>_<columna>`), solo para las FK que ningún `UNIQUE`/PK cubre como primera columna (5 índices) | §2.3, §2.4, T4.3 |
| **D4** | Conversión del `.txt` a SQL | **Script** (`generar_carga.py`, lenguaje libre) que lee cp1252, limpia y genera `02_carga.sql` en UTF-8 | §2.1, T5.1–T5.3 |
| **D5** | Ubicación de rechazos y controles | **Archivo aparte**: `04_pruebas_y_controles.sql`. `03_consultas.sql` contiene solo `SELECT` | §2.1, Fase 6 |

### Por qué `minuto` es opcional (`NULL`) y va al final

- Si la carga se ejecuta **por posición** (4 valores por fila), `minuto` debe ser la 4.ª columna. Si se ejecuta con lista de **3 columnas**, `minuto` queda en `NULL` y la carga no falla. Con esto, `gol` acepta ambas formas.
- Cumple la regla del enunciado de no añadir columnas obligatorias sin valor por defecto que impidan la carga.
- Es la **única excepción** a "todos los atributos son obligatorios" y debe documentarse como tal.
- La carga de este archivo siempre la llena: tras cargar, `minuto IS NULL` debe dar 0 filas (T5.7).

### Riesgos residuales a documentar

- `minuto` es una **interpretación** del cuarto valor (Anexo B.3). Si el docente indicara otro significado, solo cambia el nombre y la descripción de la columna.
- Si se valida que `gol` tenga **exactamente** las 3 columnas del contrato, `minuto` sería la única diferencia. Está justificada y es compatible con un INSERT de 3 columnas.
