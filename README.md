# Campeonato de Fútbol · Liga Universitaria del Valle · 2026

Proyecto de **Bases de Datos I** sobre MySQL 8 (probado con MySQL 8.4.10 sobre
Linux y WAMP sobre Windows). Modela el campeonato con 12 equipos, 22 jornadas,
132 partidos, e identifica individualmente cada gol con su autor.

> Documento maestro del proyecto: `Proyecto-2026-SDD.md` (especificación SDD).
> Fuente de datos cruda: `Proyecto-2026-Carga.txt` (codificación cp1252, CRLF).

---

## Estructura del repositorio

```
campeonato_futbol/
├── README.md                          ← este archivo
├── Proyecto-2026-Carga.txt            ← datos crudos (cp1252)
├── Proyecto-2026-SDD.md               ← especificación SDD del enunciado
├── docs/
│   ├── 01_analisis_reglas.md          ← análisis, RN-01…RN-21, supuestos
│   ├── 02_modelo_er.md               ← diagrama E-R (Mermaid) y cardinalidades
│   ├── 03_modelo_relacional.md       ← esquema PK/FK, diccionario, normalización
│   └── 04_evidencias.md              ← salidas reales del servidor y DoD
├── scripts/
│   └── generar_carga.py              ← cp1252 → UTF-8 → 02_carga.sql
└── sql/
    ├── 01_estructura.sql             ← DDL de las 9 tablas (InnoDB, utf8mb4)
    ├── 02_carga.sql                  ← INSERT generados (orden dependencias)
    ├── 03_consultas.sql              ← Q01–Q14 (solo SELECT)
    └── 04_pruebas_y_controles.sql    ← rechazos (ROLLBACK) + controles
```

## Requisitos

- MySQL **≥ 8.0.16** (las restricciones `CHECK` se aplican desde esta versión).
- Motor **InnoDB** y charset **`utf8mb4`** (configurados en cada tabla).
- Permisos para crear y borrar la base `campeonato_futbol`, y para leer/escribir
  sobre `campeonato_futbol.*`.

## Reproducción desde cero

```bash
# 1. Crear la base y las 9 tablas
mysql -u <usuario> -p < sql/01_estructura.sql

# 2. Cargar los datos (orden dependencias, FK activas)
mysql -u <usuario> -p < sql/02_carga.sql

# 3. Ejecutar pruebas de rechazo y consultas de control
mysql -u <usuario> -p --force < sql/04_pruebas_y_controles.sql

# 4. Ejecutar las 14 consultas del proyecto
mysql -u <usuario> -p --force < sql/03_consultas.sql
```

`--force` es necesario para que el cliente MySQL continúe tras los errores
esperados de los rechazos (cada rechazo se ejecuta dentro de
`START TRANSACTION` … `ROLLBACK`, por lo que la base queda intacta).

## Regenerar la carga desde el TXT

Si `Proyecto-2026-Carga.txt` cambia, regenera `sql/02_carga.sql` con:

```bash
python3 scripts/generar_carga.py \
  --input Proyecto-2026-Carga.txt \
  --output sql/02_carga.sql
```

El script decodifica cp1252, aplica `trim` y quita comas finales, escapa
comillas dentro de strings y emite `NULL` para `gol.minuto` cuando viene
vacío. Conserva los IDs explícitos (D2) y emite los `INSERT` en el orden de
dependencias del modelo.

## Conteos esperados (y reales, post-carga)

| Tabla            | Esperado | Real |
|------------------|---------:|-----:|
| equipo           |       12 |   12 |
| jornada          |       22 |   22 |
| estadio          |        6 |    6 |
| arbitro          |       18 |   18 |
| jugador          |      180 |  180 |
| partido          |      132 |  132 |
| resultado        |       48 |   48 |
| partido_arbitro  |      396 |  396 |
| gol              |      137 |  137 |

Conciliación `gol × resultado`: **0 inconsistencias**.

## Reglas de negocio (resumen)

- **RN-01 / RN-03:** 12 equipos a doble vuelta, 22 jornadas, 6 partidos por
  jornada. Cada equipo juega una vez por jornada (11 localías + 11 visitas).
- **RN-02:** las jornadas 12-22 invierten los cruces de las jornadas 1-11.
- **RN-06:** corte ficticio el **20-09-2026** — jugadas las jornadas 1-8
  (48 resultados); las jornadas 9-22 son **84 pendientes** (sin fila en
  `resultado`, no por una bandera).
- **RN-09:** victoria = 3, empate = 1, derrota = 0. Puntos y posiciones se
  **calculan** con consultas, no se almacenan (constitución C7).
- **RN-10 / RN-11:** cada jugador pertenece a un solo equipo; plantillas de
  **15 jugadores** con dorsales únicos dentro del equipo.
- **RN-14 / RN-15:** cada partido lo arbitran **3 personas distintas** con
  roles `P`, `A1`, `A2`; ningún árbitro repite jornada.
- **RN-18 / RN-21:** un jugador puede marcar varios goles en el mismo
  partido (filas distintas); el número de filas de `gol` por equipo y partido
  debe coincidir con el marcador.
- **RN-04:** las jornadas son sábados del **1 de agosto al 26 de diciembre
  de 2026** a las **15:00** (la hora no se almacena, es constante).

## Decisiones aplicadas (D1–D5)

- **D1** — `gol.minuto` opcional (`NULL` por defecto), última columna de la
  tabla, `CHECK (minuto IS NULL OR minuto BETWEEN 1 AND 120)`. No se define
  `UNIQUE(partido_id, minuto)` porque la carga trae 4 casos de dos goles en
  el mismo minuto del mismo partido.
- **D2** — IDs explícitos, sin `AUTO_INCREMENT` ni procedimiento almacenado
  que calcule `MAX(id)+1`.
- **D3** — Índices explícitos y con nombre (`idx_<tabla>_<columna>`) en las
  FK que ninguna PK/UNIQUE cubre como primera columna:
  `idx_partido_visitante`, `idx_partido_estadio`,
  `idx_partido_arbitro_arbitro`, `idx_gol_partido`, `idx_gol_jugador`.
- **D4** — Conversión `cp1252 → UTF-8` mediante `generar_carga.py`; el
  `.sql` resultante se entrega con `SET NAMES utf8mb4`.
- **D5** — Rechazos y controles viven en `04_pruebas_y_controles.sql`,
  separados de las consultas del enunciado (`03_consultas.sql` solo tiene
  `SELECT`).

## Constitución del proyecto (resumen)

| # | Resumen |
|---|---|
| C1 | El DDL se ejecuta sin correcciones manuales en una base nueva. |
| C2 | Una sola fuente de nombres: E-R, diccionario y script coinciden. |
| C3 | No se añaden columnas obligatorias que rompan la carga. |
| C4 | Las reglas multi-fila se **verifican** con consultas, no se atribuyen a FK/CHECK. |
| C5 | Todas las FK usan `ON DELETE RESTRICT ON UPDATE RESTRICT`. |
| C6 | `pendiente` = ausencia de fila en `resultado`; un 0–0 es empate jugado. |
| C7 | Puntos y posiciones se calculan, no se almacenan. |
| C8 | `01_estructura.sql` sin `INSERT`/`DROP`/`TRUNCATE`. |
| C9 | Toda restricción tiene evidencia de salida MySQL. |

## Documentación

Toda la justificación técnica (decisiones de modelado, normalización,
diccionario de columnas, errores y conteos verificados) vive en `docs/`:

- `docs/01_analisis_reglas.md` — análisis, RN, supuestos, matriz declarativa
  vs verificada.
- `docs/02_modelo_er.md` — diagrama E-R (Mermaid), lectura de cardinalidades,
  justificaciones de `Partido–Resultado 1:0..1` y `Partido–Árbitro N:M`.
- `docs/03_modelo_relacional.md` — esquema, diccionario, índices, normalización
  1FN/2FN/3FN, límites declarativos.
- `docs/04_evidencias.md` — salidas reales del servidor, errores, Definition
  of Done.

## Limpieza opcional

Tras terminar el proyecto, puedes eliminar los usuarios creados para la
verificación:

```sql
DROP USER IF EXISTS 'campla'@'localhost';
DROP USER IF EXISTS 'campla_dev'@'localhost';
```