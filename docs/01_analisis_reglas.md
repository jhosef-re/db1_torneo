# 01 · Análisis y reglas de negocio

> **Liga Universitaria del Valle · Campeonato de Fútbol 2026**
> Documento de la Fase 1 del proyecto. Resume objetivos, alcance, entidades,
> hechos representados, las 21 reglas de negocio (RN-01…RN-21) con su origen,
> los supuestos explícitos y la matriz de garantía (declarativa vs verificada).

---

## 1.1 Propósito del proyecto

Construir la base de datos relacional del campeonato de la **Liga Universitaria
del Valle** y demostrar que su carga, restricciones y consultas reflejan las
reglas del torneo.

El entregable cubre:

1. Análisis de requisitos y reglas de negocio (este documento).
2. Modelo E-R (Fase 2).
3. Modelo relacional, diccionario y normalización (Fase 3).
4. Script DDL ejecutable (Fase 4).
5. Carga de datos desde `Proyecto-2026-Carga.txt` (Fase 5).
6. Pruebas de rechazo y controles de reglas multi-fila (Fase 6).
7. Catorce consultas `SELECT` (Fase 7).
8. Documentación de cierre (Fase 8).

## 1.2 Alcance

**Dentro del alcance:**

- Campeonato 2026 de la Liga Universitaria del Valle.
- Registro individual de los **goles y sus autores**.
- 14 consultas SELECT (Anexo A del SDD).

**Fuera del alcance:**

- Aplicación cliente.
- Aplazamientos, sanciones, eliminatorias, temporadas adicionales.
- Transferencias de jugadores entre equipos.
- Autogoles y tandas de penales.
- `UPDATE`/`DELETE` sobre la carga.

## 1.3 Alcance cuantitativo

| Elemento | Cantidad |
|---|---|
| Equipos | 12 |
| Jugadores por equipo | 15 |
| Total jugadores | 180 |
| Jornadas | 22 |
| Partidos por jornada | 6 |
| Total partidos | 132 |
| Resultados | 48 (jornadas 1 a 8) |
| Pendientes | 84 (jornadas 9 a 22) |
| Sedes | 6 |
| Árbitros | 18 |
| Asignaciones arbitrales | 396 (132 × 3) |
| Goles | 137 |

> **Corte ficticio:** 20 de septiembre de 2026. Se consideran jugadas las
> jornadas 1 a 8; las jornadas 9 a 22 están pendientes y **no tienen fila en
> `resultado`**.

## 1.4 Entidades y hechos representados

### Entidades

| # | Entidad | Identificador |
|---|---|---|
| 1 | `equipo` | `equipo_id` |
| 2 | `jornada` | `numero` |
| 3 | `estadio` | `estadio_id` |
| 4 | `arbitro` | `arbitro_id` |
| 5 | `jugador` | `jugador_id` |
| 6 | `partido` | `partido_id` |
| 7 | `resultado` | `partido_id` (PK = FK) |
| 8 | `partido_arbitro` (asociación N:M con rol) | `(partido_id, rol)` |
| 9 | `gol` | `gol_id` |

### Hechos

- **Jugador pertenece a equipo** (1:N).
- **Partido se juega en jornada y estadio** (N:1 a `jornada`, N:1 a `estadio`).
- **Partido enfrenta local y visitante** (dos roles sobre la misma entidad `equipo`).
- **Partido puede tener un resultado** (1:0..1).
- **Partido es arbitrado por tres árbitros con roles P, A1, A2** (N:M con atributo `rol`).
- **Resultado tiene cero o muchos goles** (1:0..N).
- **Jugador puede marcar cero o muchos goles** (1:0..N).
- **Cada gol tiene un minuto** (D1, ver supuestos).

## 1.5 Reglas de negocio

Cada regla tiene un **ID** para trazarla al DDL, a la carga o a las pruebas.

### Competición y calendario

| ID | Regla | Origen |
|---|---|---|
| **RN-01** | Los 12 equipos se enfrentan todos contra todos, **a ida y vuelta**. Cada pareja disputa dos encuentros con localía inversa. | Calendario deportivo |
| **RN-02** | Las jornadas 12 a 22 **invierten los cruces** de las jornadas 1 a 11. | Calendario deportivo |
| **RN-03** | Cada equipo juega **una vez por jornada**, con 11 localías y 11 visitas; nunca se enfrenta a sí mismo. | Calendario deportivo |
| **RN-04** | Las jornadas son **sábados** del **1 de agosto al 26 de diciembre de 2026** a las **15:00**. Se almacena la fecha; la hora es constante (no se almacena). | Calendario deportivo |
| **RN-05** | No hay aplazamientos, sanciones, eliminatorias ni temporadas adicionales. | Alcance |

### Resultados y pendientes

| ID | Regla | Origen |
|---|---|---|
| **RN-06** | **Corte ficticio 20-09-2026**: jugadas las jornadas 1 a 8 (48 resultados). Las jornadas 9 a 22 contienen 84 pendientes sin fila en `resultado`. | Alcance |
| **RN-07** | Un **0–0** es un empate **jugado**, no un pendiente. | Regla deportiva |
| **RN-08** | Cada partido tiene **cero o un** resultado. Cada resultado pertenece a un partido y contiene goles de local y visitante, enteros **no negativos**. | Modelo |
| **RN-09** | Victoria = 3 puntos; empate = 1 por equipo; derrota = 0. Puntos y estadísticas **se calculan con consultas**, no se almacenan. | Regla deportiva |

### Plantillas y estadios

| ID | Regla | Origen |
|---|---|---|
| **RN-10** | Cada jugador pertenece a **un solo equipo** durante el campeonato. Sin transferencias. | Alcance |
| **RN-11** | Cada plantilla tiene **15 jugadores** y **dorsales únicos dentro del equipo**. Se registran nombre completo, fecha de nacimiento, dorsal y posición. | Plantilla |
| **RN-12** | Cada partido usa uno de los seis estadios. Los seis encuentros de cada jornada son **simultáneos**: **no se repite sede en una jornada**. La localía no implica propiedad de la sede. | Calendario |

### Árbitros por encuentro

| ID | Regla | Origen |
|---|---|---|
| **RN-13** | 18 árbitros con **código único**. | Padrón |
| **RN-14** | Cada partido tiene **tres personas distintas**: principal (`P`), asistente 1 (`A1`) y asistente 2 (`A2`). Cada rol se cubre una vez por partido. | Regla deportiva |
| **RN-15** | **Nadie arbitra dos encuentros de la misma jornada.** | Calendario arbitral |
| **RN-16** | La relación Partido–Árbitro se resuelve con `partido_arbitro`. La carga incluye **396 asignaciones** (132 × 3). El **rol pertenece a la asignación**, no al árbitro. | Modelo |

### Goles y autores

| ID | Regla | Origen |
|---|---|---|
| **RN-17** | Cada gol se registra en `gol` con identificador propio, partido y jugador autor. | Modelo |
| **RN-18** | Un jugador puede marcar **varios goles en un mismo partido**; cada anotación ocupa una fila distinta. | Regla deportiva |
| **RN-19** | El autor debe pertenecer al equipo **local o visitante** del encuentro. | Regla deportiva |
| **RN-20** | Los goles cuentan **a favor del equipo del autor**. No hay autogoles ni penales. | Alcance |
| **RN-21** | Por equipo y encuentro, el **número de filas de `gol` = valor del marcador** en `resultado`. Un 0–0 no tiene filas de gol; un pendiente tampoco (se distingue por carecer de `resultado`). | Consistencia |

## 1.6 Supuestos explícitos

| Supuesto | Decisión | Justificación |
|---|---|---|
| **S1** La hora del partido es siempre 15:00 y **no se almacena**. | No existe columna `hora` en `partido`. | RN-04 dice "no se almacena". |
| **S2** La columna `gol.minuto` **es opcional** (`NULL`) y va al final. | `gol.minuto INT NULL DEFAULT NULL` con `CHECK (minuto IS NULL OR minuto BETWEEN 1 AND 120)`. | D1 del SDD; la única excepción a "todas las columnas son NOT NULL". |
| **S3** El 4.º valor de la sección `GOL` del `.txt` se interpreta como **minuto del gol**. | Mapeo a `gol.minuto`. | Evidencia: 137 filas; dentro de cada partido los valores no decrecen al avanzar `gol_id`; rango 1–89; 4 casos de dos goles en el mismo minuto (no podría ser `UNIQUE(partido_id,minuto)`). |
| **S4** **Sin autogoles**. | No se modela "gol en contra propia"; el equipo del autor es siempre el que suma. | RN-20; tampoco hay penales. |
| **S5** **IDs explícitos**. | Se insertan los IDs que trae la carga. Sin `AUTO_INCREMENT` y sin SP que calcule `MAX(id)+1`. | D2 del SDD. |
| **S6** **`pendiente` se distingue por la ausencia de fila en `resultado`**, no por una bandera. | No existe columna `pendiente` ni estado. | C6 del SDD: 0–0 ≠ pendiente. |
| **S7** El equipo del autor de un gol **se obtiene vía `jugador`**, no se duplica en `gol`. | Sin `equipo_id` en `gol`. | Normalización (D del SDD §1.7). |
| **S8** El **rol del árbitro** vive en la asignación, no en la entidad `arbitro`. | Sin columna `rol` en `arbitro`. | RN-16; un árbitro puede cambiar de rol en otro partido. |
| **S9** **Local y visitante son dos FK a `equipo`** con nombres `local_id` y `visitante_id`. | No se duplica la entidad `equipo`. | C2 del SDD; una sola fuente de nombres. |
| **S10** Las posiciones son exactamente `POR`, `DEF`, `MED`, `DEL` y los dorsales entre 1 y 99. | `CHECK` y `UNIQUE` correspondientes en `jugador`. | RN-11; dominios del SDD §1.8. |
| **S11** `fecha_nacimiento < 2026-08-01`.** | `CHECK` en `jugador`. | SDD §1.8. |
| **S12** La carga se ejecuta **después** de crear todas las tablas, con `FOREIGN_KEY_CHECKS=1`. | `02_carga.sql` se ejecuta tras `01_estructura.sql`. | C8 y T5.4 del SDD. |
| **S13** Los rechazos y las consultas de control viven en `04_pruebas_y_controles.sql`, separado de las consultas `SELECT` del enunciado. | D5 del SDD. |
| **S14** Los índices sobre FK que no queden cubiertos por PK/UNIQUE **se declaran explícitos y con nombre** (`idx_<tabla>_<columna>`). | D3 del SDD; 5 índices explícitos. |
| **S15** La codificación del `.txt` es **cp1252**; el `.sql` generado se entrega en **UTF-8** con `SET NAMES utf8mb4`. | D4 del SDD; el servidor tiene `character_set_server=utf8mb4`. |

## 1.7 Matriz de garantía: reglas declarativas vs verificadas

Esta matriz implementa la constitución C4 del SDD (honestidad declarativa):
ninguna FK ni `CHECK` garantiza por sí sola una cantidad o una regla entre
varias filas. Las reglas de la columna derecha se **verifican** con consultas,
no se *implementan* con restricciones.

| Regla o invariante | Mecanismo | ¿Declarativa? |
|---|---|---|
| PK, FK, NOT NULL, UNIQUE, dominios (CHECK) | DDL | ✅ Implementada |
| Local ≠ visitante | `CHECK (local_id <> visitante_id)` | ✅ Implementada |
| Un partido tiene cero o un resultado | PK = FK en `resultado.partido_id` | ✅ Implementada |
| Gol con autor inexistente / partido sin resultado | FK `gol` → `resultado`, FK `gol` → `jugador` | ✅ Implementada |
| Dorsal único dentro del equipo | `UNIQUE (equipo_id, dorsal)` | ✅ Implementada |
| Código único por árbitro | `UNIQUE codigo` | ✅ Implementada |
| Nombre único de equipo | `UNIQUE nombre` | ✅ Implementada |
| Nombre único de estadio | `UNIQUE nombre` | ✅ Implementada |
| Fecha única por jornada | `UNIQUE dia` | ✅ Implementada |
| Rango de `numero` de jornada, `dorsal`, `minuto`, `capacidad`, `fecha_nacimiento` | `CHECK` | ✅ Implementada |
| Posiciones válidas | `CHECK posicion IN (...)` | ✅ Implementada |
| Roles válidos | `CHECK rol IN ('P','A1','A2') | ✅ Implementada |
| Goles no negativos | `CHECK goles_local >= 0`, `goles_visitante >= 0` | ✅ Implementada |
| Un equipo no juega **a la vez** de local y visitante en la misma jornada | `UNIQUE (jornada_numero, local_id)` + `UNIQUE (jornada_numero, visitante_id)` | ❌ Verificada (las UNIQUE por separado no lo prohíben) |
| Plantillas de 15 jugadores por equipo | Conteo por equipo | ❌ Verificada |
| Ternas completas de árbitros (P, A1, A2 distintos) | Conteo por partido | ❌ Verificada |
| Árbitro sin simultaneidad en una jornada | Conteo por jornada/árbitro | ❌ Verificada |
| Seis partidos por jornada y jornada de 6 días cada equipo exactamente una vez | Conteo | ❌ Verificada |
| Inversión de cruces de la segunda vuelta | Cuantificación: cada partido de ida invertido está en vuelta | ❌ Verificada |
| Autor pertenece a un equipo del partido | JOIN de control | ❌ Verificada |
| Filas de `gol` por equipo/partido = marcador | Conciliación `gol` vs `resultado` | ❌ Verificada |
| Cantidades totales (12/22/132/48/180/18/6/396/137) | Conteo general | ❌ Verificada |

> Las reglas "verificadas" se ejecutan en `04_pruebas_y_controles.sql` (Fase 6)
> y **deben devolver 0 filas** para que la carga sea consistente.

## 1.8 Validación contra el archivo de carga

Se ejecutó un auditor (Python) sobre `Proyecto-2026-Carga.txt` decodificado
como `cp1252`. Resultados completos (todos ✅):

| Verificación | Esperado | Real |
|---|---|---|
| Conteo de equipos | 12 | 12 |
| Conteo de jornadas | 22 | 22 |
| Conteo de estadios | 6 | 6 |
| Conteo de árbitros | 18 | 18 |
| Conteo de jugadores | 180 | 180 |
| Conteo de partidos | 132 | 132 |
| Conteo de resultados | 48 | 48 |
| Conteo de `partido_arbitro` | 396 | 396 |
| Conteo de `gol` | 137 | 137 |
| Plantillas de 15 | 12 de 15 | ✅ |
| Dorsales duplicados por equipo | 0 | 0 |
| Distribución de posiciones | POR 24 · DEF 60 · MED 60 · DEL 36 | ✅ |
| Fechas de nacimiento < 2026-08-01 | todas | 1999-01-01 → 2006-12-28 ✅ |
| Autoenfrentamientos | 0 | 0 |
| Parejas (local, visitante) únicas | 132 | 132 |
| Partidos por jornada | 6 | 6 en las 22 jornadas |
| Equipos distintos por jornada | 12 | 12 en las 22 jornadas |
| Estadios distintos por jornada | 6 | 6 en las 22 jornadas |
| Inversión de cruces 12-22 vs 1-11 | ida invertida = vuelta | ✅ |
| Pendientes | 84 | 84 |
| Suma de goles en `resultado` | 137 | 137 (86 local + 51 visitante) |
| Ternas {P, A1, A2} completas | 132 | 132 |
| Árbitros distintos por partido | 3 | 3 |
| Árbitros con >1 partido en una jornada | 0 | 0 |
| Asignaciones por árbitro | 22 cada uno | ✅ |
| Minuto observado | 1–89 | 1–89 (sin nulos) |
| Partidos con minutos no monótonos | 0 | 0 |
| Partidos con 2+ goles en el mismo minuto | 4 (esperado por SDD) | 4 |
| Conciliación goles vs marcador | 0 diferencias | 0 |
| Goles con autor ajeno | 0 | 0 |
| Goles en partidos sin Resultado | 0 | 0 |

> Estos son los valores que las pruebas de control de la Fase 6 deben
> reproducir. Si en la base cargada aparece una cifra distinta, el error
> está en la transformación a `INSERT`, no en los datos.

## 1.9 Cierre de la Fase 1

- ✅ Las 21 reglas RN-01…RN-21 tienen ID, origen y mecanismo de garantía.
- ✅ Los 5 decisiones D1–D5 del SDD están reflejadas como supuestos explícitos.
- ✅ La matriz declarativa vs verificada distingue qué protege el DDL y qué
  se verifica por consultas.
- ✅ La auditoría del `.txt` confirma que los datos cumplen las reglas RN y
  que los conteos coinciden con la constitución.