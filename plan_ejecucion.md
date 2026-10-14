# Plan de ejecución · Proyecto 2026 · Base de datos del campeonato

**Origen:** `Proyecto-2026-SDD.md` (constitución, SPEC, PLAN, TASKS y Decisiones D1–D5).
**Estado actual:** Fase 0 (entorno) cerrada; archivo `Proyecto-2026-Carga.txt` auditado y validado.

---

## 0. Contexto verificado (línea base)

| Comprobación | Resultado |
|---|---|
| MySQL servidor | **8.4.10** (≥ 8.0.16 → `CHECK` aplica) |
| Motor por defecto | **InnoDB** |
| Charset / collation servidor | **utf8mb4** / `utf8mb4_0900_ai_ci` |
| `sql_mode` | `STRICT_TRANS_TABLES` activo |
| Archivo `Proyecto-2026-Carga.txt` | 9 secciones, **12/22/6/18/180/132/48/396/137** filas — ✅ |
| Codificación del `.txt` | **cp1252** (CRLF, sin BOM); se transforma a UTF-8 al cargar |
| `lower_case_table_names` | 0 (sensible a mayúsculas) |
| Credenciales de carga | usuario limitado `campla@localhost` con `SELECT, PROCESS` |

Datos validados en el `.txt`:

- 12 plantillas × 15 jugadores · dorsales únicos · posiciones {POR 24, DEF 60, MED 60, DEL 36}
- Fechas nacimiento: 1999-01-01 → 2006-12-28 (todas < 2026-08-01)
- 132 partidos · 22 jornadas × 6 · 12 equipos y 6 estadios distintos por jornada
- Inversión de cruces (jornadas 12–22 vs 1–11) verificada
- 48 resultados · 84 pendientes · suma de goles = **137** (86 local + 51 visitante)
- 396 asignaciones arbitrales · ternas {P, A1, A2} completas · 22 por árbitro
- 4 partidos con dos goles en el mismo minuto (confirma `gol.minuto` sin `UNIQUE`)
- Conciliación goles vs marcador: **0** diferencias
- 0 autores ajenos a los equipos del partido · 0 goles en partidos sin Resultado

---

## 1. Estructura de archivos a crear

```
campeonato_futbol/
├── docs/
│   ├── 01_analisis_reglas.md          # Fase 1
│   ├── 02_modelo_er.png              # Fase 2 (diagrama)
│   ├── 03_modelo_relacional.md       # Fase 3 (esquema, diccionario, normalización)
│   └── 04_evidencias.md              # capturas SHOW CREATE de resultados
├── scripts/
│   └── generar_carga.py              # Fase 5 — lee cp1252 → emite 02_carga.sql UTF-8
└── sql/
    ├── 01_estructura.sql             # Fase 4
    ├── 02_carga.sql                  # Fase 5
    ├── 03_consultas.sql              # Fase 7 (solo SELECT)
    └── 04_pruebas_y_controles.sql    # Fase 6 (rechazos con ROLLBACK + controles)
```

---

## 2. Plan por fases

### Fase 0 · Entorno y línea base ✅ **CERRADA**
Salidas: MySQL 8.4.10, InnoDB, utf8mb4, codificación cp1252 confirmada.

### Fase 1 · Análisis y reglas (15 pts) — `docs/01_analisis_reglas.md`
- Transcribir RN-01…RN-21 con origen y mecanismo de garantía
- Listar supuestos (incluye D1–D5 explícitos)
- Incluir la **matriz declarativa vs verificada** (§1.10 del SDD)
- **Gate 1:** toda RN tiene ID, origen y mecanismo de garantía

### Fase 2 · Modelo E-R (25 pts) — `docs/02_modelo_er.png` (+ prosa)
- 9 entidades: Equipo, Jugador, Jornada, Estadio, Árbitro, Partido, Resultado, Asignación, Gol
- Roles `local` y `visitante` sobre una sola entidad `Equipo`
- `Partido—Resultado` 1:0..1 · `Partido—Árbitro` N:M con atributo `rol`
- Justificación de `gol` como **entidad** (no atributo) con `minuto`
- Lectura de cardinalidades en prosa
- **Gate 2:** todos los elementos exigidos; nombres coinciden con el contrato

### Fase 3 · Modelo relacional + diccionario + normalización (20 pts) — `docs/03_modelo_relacional.md`
- Esquema con PK/FK de las 9 tablas (§2.4)
- Diccionario: tabla, columna, tipo, nulabilidad, PK/FK/UQ, dominio, descripción
- 1FN / 2FN / 3FN: argumentos clave del SDD §2.6
- Límites declarativos (§1.10): matriz de qué se implementa y qué se verifica
- **Gate 3:** diccionario cubre las 9 tablas y cada FK documentada existe

### Fase 4 · DDL (parte de 25 pts) — `sql/01_estructura.sql`
- `CREATE DATABASE campeonato_futbol DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
- 9 tablas en orden de dependencias (Nivel 0 → 3) según §2.2
- `ENGINE=InnoDB` explícito
- PK, FK (`ON DELETE RESTRICT ON UPDATE RESTRICT`), `NOT NULL`, `UNIQUE`, `CHECK` por §2.4
- `gol.minuto` **última columna**, `NULL` permitido (D1)
- 5 índices explícitos con nombre (D3)
- **Sin** `INSERT`, `DROP`, `TRUNCATE` (C8)
- **Gate 4:** corre de punta a punta en base vacía; `SHOW CREATE TABLE` coincide

### Fase 5 · Carga de datos (parte de 25 pts) — `scripts/generar_carga.py` + `sql/02_carga.sql`
- Script Python: lee `Proyecto-2026-Carga.txt` (cp1252), filtra líneas vacías y comentarios, `strip` y quita comas finales
- Emite un `INSERT INTO <tab> (<cols>) VALUES (...)` por fila, en orden dependencias
- Cabecera del `.sql`: `SET NAMES utf8mb4;` y orden FK-safe
- En `gol` usa `(gol_id, partido_id, jugador_id, minuto)` (D1)
- IDs explícitos sin `AUTO_INCREMENT` (D2)
- Carga con `FOREIGN_KEY_CHECKS=1`
- Validar conteos y conciliación en MySQL tras ejecutar
- **Gate 5:** todos los conteos coinciden, conciliación en 0

### Fase 6 · Pruebas y controles (parte de 25 pts) — `sql/04_pruebas_y_controles.sql`

**6A · Rechazos** (cada uno dentro de `BEGIN…ROLLBACK`, conservando el `ERROR`):

| ID | Caso | Restricción ejercida |
|---|---|---|
| T6.1 | Jugador con `equipo_id` inexistente | FK jugador → equipo |
| T6.2 | Dorsal duplicado dentro del mismo equipo | `UNIQUE (equipo_id, dorsal)` |
| T6.3 | `goles_local` o `goles_visitante` negativos | `CHECK >= 0` |
| T6.4 | Dos `resultado` para un mismo `partido_id` | PK en `resultado.partido_id` |
| T6.5 | Autoenfrentamiento (`local_id = visitante_id`) | `CHECK` |
| T6.6 | Gol con `jugador_id` inexistente | FK gol → jugador |
| T6.7 | Gol sobre partido sin `resultado` | FK gol → resultado |
| T6.8 | Gol con `minuto = 0` o `minuto = 121` | `CHECK` de minuto (D1) |

**6B · Controles** (consultas que **deben devolver 0 filas**):

| ID | Regla |
|---|---|
| T6.9 | Autor ajeno a los equipos del encuentro (RN-19) |
| T6.10 | Diferencias goles vs marcador (RN-21) |
| T6.11 | Plantillas ≠ 15 jugadores (RN-11) |
| T6.12 | Partidos con terna incompleta o árbitros repetidos (RN-14) |
| T6.13 | Árbitro con >1 partido en la misma jornada (RN-15) |
| T6.14 | Jornadas con ≠ 6 partidos o equipo que aparece ≠ 1 vez (RN-03, RN-12) |
| T6.15 | Cruces de 12–22 que no invierten los de 1–11 (RN-02) |

- **Gate 6:** cada rechazo muestra el error esperado; cada control devuelve 0

### Fase 7 · Consultas Q01–Q14 (15 pts) — `sql/03_consultas.sql`
- Solo `SELECT`; cada consulta con su enunciado comentado
- Notas por consulta (Anexo A del SDD):
  - `LEFT JOIN` con filtro en el `ON` cuando se pidan entidades "vacías" (Q01, Q07, Q09, Q14)
  - Q04 + Q05 = 132 (INNER vs LEFT WHERE NULL)
  - Q06/Q07: agregaciones condicionales para no multiplicar filas
  - Q11/Q12: desdoble `UNION ALL` local/visitante solo sobre partidos con resultado
  - Q13/Q14: equipo del autor desde `jugador`, no de `gol`
- **Gate 7:** conteos y órdenes coinciden; sin `UPDATE`/`DELETE`

### Fase 8 · Documentación y cierre
- Coherencia de nombres E-R / diccionario / DDL (C2)
- Documentación distingue reglas implementadas vs verificadas (§1.10)
- Prueba final: base nueva → `01_estructura.sql` → `02_carga.sql` → `03_consultas.sql` sin tocar manualmente
- **Definition of Done:** 4 ítems del Gate 8 cumplidos

---

## 3. Orden de ejecución

1. **Fase 1** → `docs/01_analisis_reglas.md`
2. **Fase 2** → `docs/02_modelo_er.png`
3. **Fase 3** → `docs/03_modelo_relacional.md`
4. **Fase 4** → `sql/01_estructura.sql` (validado con `SHOW CREATE TABLE`)
5. **Fase 5** → `scripts/generar_carga.py` + `sql/02_carga.sql` (validado con conteos)
6. **Fase 6** → `sql/04_pruebas_y_controles.sql` (rechazos + controles)
7. **Fase 7** → `sql/03_consultas.sql`
8. **Fase 8** → Cierre y `docs/04_evidencias.md`

---

## 4. Decisiones tomadas (recordatorio)

- **D1** `gol.minuto INT NULL DEFAULT NULL` (última columna). Rango 1–120. Sin `UNIQUE(partido_id,minuto)` por los 4 casos observados.
- **D2** IDs explícitos. Sin `AUTO_INCREMENT` ni SP `MAX(id)+1`.
- **D3** 5 índices explícitos con nombre: `idx_partido_visitante`, `idx_partido_estadio`, `idx_partido_arbitro_arbitro`, `idx_gol_partido`, `idx_gol_jugador`.
- **D4** Script Python para `cp1252 → UTF-8`, separado de `01_estructura.sql` (cumple C8).
- **D5** Rechazos y controles en `04_pruebas_y_controles.sql`. `03_consultas.sql` solo `SELECT`.

---

## 5. Riesgos residuales

- `minuto` es **interpretación** del 4.º valor (anexo B.3). Si el docente indicara otro significado, solo cambia nombre/dominio de la columna.
- `STRICT_TRANS_TABLES` rechaza truncamientos; el `.txt` no parece tenerlos, pero debe validarse en la primera ejecución.
- Cargar con `FOREIGN_KEY_CHECKS=1` exige haber insertado por niveles. El script generará los `INSERT` en orden dependencias (Nivel 0 → 3).

---

## 6. Cómo se aprueban las gates

| Gate | Cómo se demuestra |
|---|---|
| Gate 0 | Salidas reales de `SELECT VERSION()`, `SHOW VARIABLES`, `SHOW ENGINES` ✅ |
| Gate 1 | `01_analisis_reglas.md` con las 21 RN + matriz |
| Gate 2 | Diagrama E-R con todos los elementos |
| Gate 3 | Diccionario cubre las 9 tablas; FK documentada = FK implementada |
| Gate 4 | `SHOW CREATE TABLE` de las 9 tablas en base nueva |
| Gate 5 | Conteos de las 9 tablas + conciliación 0 |
| Gate 6 | Errores MySQL de los 8 rechazos + 7 controles con 0 filas |
| Gate 7 | Q01–Q14 ejecutadas y cotejadas con conteos del Anexo A |
| Gate 8 | Reproducción completa sin intervención manual |

---

## 7. Próximo paso al aprobar

Salir de **Plan mode** (cambiar de agente). Empezar por **Fase 1**: redactar `docs/01_analisis_reglas.md` a partir de §1 del SDD y de las validaciones ya realizadas contra el `.txt`.