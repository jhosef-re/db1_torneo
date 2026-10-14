# 04 · Evidencias y cierre

> **Liga Universitaria del Valle · Campeonato de Fútbol 2026**
> Documento de la Fase 8 del proyecto. Captura el entorno, las salidas reales
> de MySQL que demuestran cada gate y la lista final de entregables.

---

## 4.1 Entorno verificado

| Comprobación | Salida real |
|---|---|
| Versión MySQL | `8.4.10` |
| Motor por defecto | `InnoDB` (DEFAULT) |
| Charset del servidor | `utf8mb4` |
| Collation del servidor | `utf8mb4_0900_ai_ci` |
| `sql_mode` | `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION` |
| `lower_case_table_names` | `0` (sensible a mayúsculas) |
| Codificación de `Proyecto-2026-Carga.txt` | `ISO-8859 text, with CRLF line terminators` (cp1252) |

Comandos ejecutados:

```sql
SELECT VERSION();
SHOW VARIABLES WHERE Variable_name IN (
  'character_set_server','collation_server',
  'default_storage_engine','innodb_version',
  'lower_case_table_names','sql_mode','time_zone');
SHOW ENGINES;
```

## 4.2 Estructura creada

```
+-----------------------------+
| Tables_in_campeonato_futbol |
+-----------------------------+
| arbitro                     |
| equipo                      |
| estadio                     |
| gol                         |
| jornada                     |
| jugador                     |
| partido                     |
| partido_arbitro             |
| resultado                   |
+-----------------------------+
```

### `SHOW CREATE TABLE gol` (resumen)

```sql
CREATE TABLE `gol` (
  `gol_id` int NOT NULL,
  `partido_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `minuto` int DEFAULT NULL,
  PRIMARY KEY (`gol_id`),
  KEY `idx_gol_partido` (`partido_id`),
  KEY `idx_gol_jugador` (`jugador_id`),
  CONSTRAINT `fk_gol_jugador` FOREIGN KEY (`jugador_id`)
      REFERENCES `jugador` (`jugador_id`)
      ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_gol_partido` FOREIGN KEY (`partido_id`)
      REFERENCES `resultado` (`partido_id`)
      ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_gol_minuto`
      CHECK ((`minuto` is null) or (`minuto` between 1 and 120))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```

> Cumple D1: `minuto` es la última columna, admite `NULL` por defecto, y su
> `CHECK` permite el rango 1–120.

### `SHOW CREATE TABLE partido` (resumen)

```sql
CREATE TABLE `partido` (
  `partido_id` int NOT NULL,
  `jornada_numero` int NOT NULL,
  `local_id` int NOT NULL,
  `visitante_id` int NOT NULL,
  `estadio_id` int NOT NULL,
  PRIMARY KEY (`partido_id`),
  UNIQUE KEY `uq_partido_pareja`            (`local_id`,`visitante_id`),
  UNIQUE KEY `uq_partido_jornada_local`     (`jornada_numero`,`local_id`),
  UNIQUE KEY `uq_partido_jornada_visitante` (`jornada_numero`,`visitante_id`),
  UNIQUE KEY `uq_partido_jornada_estadio`   (`jornada_numero`,`estadio_id`),
  KEY `idx_partido_visitante` (`visitante_id`),
  KEY `idx_partido_estadio`   (`estadio_id`),
  CONSTRAINT `fk_partido_jornada`   FOREIGN KEY (`jornada_numero`)
      REFERENCES `jornada` (`numero`)         ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_partido_local`     FOREIGN KEY (`local_id`)
      REFERENCES `equipo`  (`equipo_id`)      ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_partido_visitante` FOREIGN KEY (`visitante_id`)
      REFERENCES `equipo`  (`equipo_id`)      ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_partido_estadio`   FOREIGN KEY (`estadio_id`)
      REFERENCES `estadio` (`estadio_id`)     ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_partido_local_vs_visitante` CHECK (`local_id` <> `visitante_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```

> Cumple D3: los 5 índices explícitos con nombre están presentes en las
> 9 tablas.

## 4.3 Gate 4 · DDL ejecutable

```text
$ mysql ... < sql/01_estructura.sql
$ mysql ... -e "USE campeonato_futbol; SHOW TABLES;"
[9 tablas creadas sin errores]
```

## 4.4 Gate 5 · Carga y conteos

| Tabla | Esperado | Real |
|---|---|---|
| `equipo` | 12 | 12 |
| `jornada` | 22 | 22 |
| `estadio` | 6 | 6 |
| `arbitro` | 18 | 18 |
| `jugador` | 180 | 180 |
| `partido` | 132 | 132 |
| `resultado` | 48 | 48 |
| `partido_arbitro` | 396 | 396 |
| `gol` | 137 | 137 |

Conciliación `gol × resultado` (consulta `T6.10`):

```
+-----------------+
| inconsistencias |
+-----------------+
|               0 |
+-----------------+
```

## 4.5 Gate 6 · Pruebas de rechazo y controles

Cada rechazo ejecutado dentro de `START TRANSACTION;`/`ROLLBACK;` con la
salida real del error de MySQL:

| Test | Restricción ejercida | Mensaje real |
|---|---|---|
| T6.1 | FK `jugador.equipo_id` | `ERROR 1452 ... Cannot add or update a child row: a foreign key constraint fails (jugador, fk_jugador_equipo)` |
| T6.2 | `UNIQUE (equipo_id, dorsal)` | `ERROR 1062 ... Duplicate entry '1-1' for key 'jugador.uq_jugador_equipo_dorsal'` |
| T6.3a | `CHECK goles_local >= 0` | `ERROR 3819 ... Check constraint 'ck_resultado_gol_local' is violated` |
| T6.3b | `CHECK goles_visitante >= 0` | `ERROR 3819 ... Check constraint 'ck_resultado_gol_visit' is violated` |
| T6.4 | PK `resultado.partido_id` | `ERROR 1062 ... Duplicate entry '1' for key 'resultado.PRIMARY'` |
| T6.5 | `CHECK local_id <> visitante_id` | `ERROR 3819 ... Check constraint 'ck_partido_local_vs_visitante' is violated` |
| T6.6 | FK `gol.jugador_id` | `ERROR 1452 ... Cannot add or update a child row (gol, fk_gol_jugador)` |
| T6.7 | FK `gol.partido_id → resultado.partido_id` | `ERROR 1452 ... a foreign key constraint fails (gol, fk_gol_partido)` |
| T6.8 | `CHECK (minuto IS NULL OR minuto BETWEEN 1 AND 120)` | `ERROR 3819 ... Check constraint 'ck_gol_minuto' is violated` |

Controles que **deben devolver 0 filas**:

| Test | Regla | Resultado |
|---|---|---|
| T6.9 | Autor ajeno (RN-19) | `0` |
| T6.10 | Diferencias goles vs marcador (RN-21) | `0` |
| T6.11 | Plantillas ≠ 15 (RN-11) | 0 filas |
| T6.12 | Ternas incompletas o repetidas (RN-14) | 0 filas |
| T6.13 | Árbitro con >1 partido en una jornada (RN-15) | 0 filas |
| T6.14 | Jornadas con ≠ 6 partidos, equipo ≠ 1 vez, sede repetida | 0 filas |
| T6.15 | Cruces no invertidos 12–22 vs 1–11 (RN-02) | `0` |

## 4.6 Gate 7 · Q01–Q14

| Q | Filas esperadas | Filas reales |
|---|---|---|
| Q01 Equipos y plantillas | 12 | 12 |
| Q02 Jugadores Aurora FC | 15 | 15 |
| Q03 Calendario completo | 132 | 132 |
| Q04 Partidos jugados | 48 | 48 |
| Q05 Partidos pendientes | 84 | 84 |
| Q06 Resumen por jornada | 22 | 22 |
| Q07 Uso de estadios | 6 | 6 |
| Q08 Árbitros jornada 1 | 18 | 18 |
| Q09 Carga arbitral | 18 | 18 |
| Q10 Goles por jornada jugada | 8 | 8 |
| Q11 Goles por equipo | 12 | 12 |
| Q12 Tabla de posiciones | 12 | 12 |
| Q13 Detalle de goles | 137 | 137 |
| Q14 Tabla de goleadores | 180 | 180 |

Validaciones cruzadas:

- `SUM(goles_a_favor) = SUM(goles_en_contra) = 137` (conservación).
- `PJ = 8` para los 12 equipos.
- Suma de goles por jornada jugada (Q10): 10+22+19+19+13+21+12+21 = **137** ✅
- Suma de puntos en Q12 = 131 (consistente con 48 partidos y reglas 3-1-0).

## 4.7 Procedure final reproducible

Para reproducir todo desde cero (cumple Gate 8):

```bash
# 1) Crear base y tablas
mysql -u campla_dev -p < sql/01_estructura.sql

# 2) Cargar datos (orden dependencias, FK activas)
mysql -u campla_dev -p < sql/02_carga.sql

# 3) Ejecutar pruebas y controles
mysql -u campla_dev -p --force < sql/04_pruebas_y_controles.sql

# 4) Ejecutar las 14 consultas
mysql -u campla_dev -p --force < sql/03_consultas.sql
```

Los scripts usan `campla_dev@localhost` con permisos sobre `campeonato_futbol.*`
y `CREATE, DROP` globales (para el `DROP DATABASE IF EXISTS` del paso 1).

## 4.8 Cierre — Definition of Done

- [x] El DDL corre sin correcciones (`SHOW TABLES` muestra las 9 tablas).
- [x] Conteos de carga correctos y conciliación en 0.
- [x] Todos los rechazos demostrados con la salida real del error.
- [x] Q01–Q14 con conteos esperados.
- [x] Documentación consistente y completa (docs/01, 02, 03, 04).
- [x] Constitución C1–C9 cumplidas (ver `docs/01_analisis_reglas.md`).

## 4.9 Entregables

| Archivo | Descripción |
|---|---|
| `docs/01_analisis_reglas.md` | Análisis, RN, supuestos, matriz declarativa vs verificada |
| `docs/02_modelo_er.md` | Diagrama E-R (Mermaid) + lectura de cardinalidades + justificaciones |
| `docs/03_modelo_relacional.md` | Esquema PK/FK, índices, diccionario, límites declarativos, normalización |
| `docs/04_evidencias.md` | Salidas reales del servidor, errores, conteos, Definition of Done |
| `scripts/generar_carga.py` | Generador de `02_carga.sql` (cp1252 → UTF-8, D1–D5) |
| `sql/01_estructura.sql` | DDL: 9 tablas, PK, FK RESTRICT, UNIQUE, CHECK, ENGINE=InnoDB, utf8mb4 |
| `sql/02_carga.sql` | 951 INSERT en orden de dependencias (Nivel 0 → 3) |
| `sql/03_consultas.sql` | Q01–Q14 con enunciados comentados |
| `sql/04_pruebas_y_controles.sql` | 8 rechazos (con ROLLBACK) + 7 controles (devuelven 0 filas) |