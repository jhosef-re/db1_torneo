# 03 · Modelo relacional, diccionario y normalización

> **Liga Universitaria del Valle · Campeonato de Fútbol 2026**
> Documento de la Fase 3 del proyecto. Esquema PK/FK de las 9 tablas,
> diccionario de columnas y dominios, argumentos de normalización 1FN/2FN/3FN
> y límites declarativos.

---

## 3.1 Esquema relacional

Resultado de la transformación E-R → relacional. PK en **negrita**, UK
subrayado. Las FK se listan explícitamente; el **origen** entre paréntesis
mapea cada decisión a la regla del SDD o decisión D1–D5.

### `equipo`
- **PK:** `equipo_id`
- **UK:** `nombre`
- **Atributos:** `equipo_id INT`, `nombre VARCHAR(60) NOT NULL`

### `jornada`
- **PK:** `numero`
- **UK:** `dia`
- **Atributos:** `numero INT NOT NULL`, `dia DATE NOT NULL`
- **CHECK:** `numero BETWEEN 1 AND 22` (RN-04, §1.8)

### `estadio`
- **PK:** `estadio_id`
- **UK:** `nombre`
- **Atributos:** `estadio_id INT`, `nombre VARCHAR(60) NOT NULL`,
  `ubicacion VARCHAR(80) NOT NULL`, `capacidad INT NOT NULL`
- **CHECK:** `capacidad > 0` (§1.8)

### `arbitro`
- **PK:** `arbitro_id`
- **UK:** `codigo`
- **Atributos:** `arbitro_id INT`, `nombre VARCHAR(80) NOT NULL`,
  `codigo VARCHAR(8) NOT NULL`

### `jugador`
- **PK:** `jugador_id`
- **FK:** `equipo_id → equipo(equipo_id)` (RESTRICT)
- **UK:** `(equipo_id, dorsal)` (RN-11)
- **Atributos:** `jugador_id INT`, `equipo_id INT NOT NULL`,
  `nombre VARCHAR(80) NOT NULL`, `fecha_nacimiento DATE NOT NULL`,
  `dorsal INT NOT NULL`, `posicion VARCHAR(3) NOT NULL`
- **CHECK:** `dorsal BETWEEN 1 AND 99`; `posicion IN ('POR','DEF','MED','DEL')`;
  `fecha_nacimiento < '2026-08-01'` (§1.8)

### `partido`
- **PK:** `partido_id`
- **FK:** `jornada_numero → jornada(numero)` (RESTRICT);
  `local_id → equipo(equipo_id)` (RESTRICT);
  `visitante_id → equipo(equipo_id)` (RESTRICT);
  `estadio_id → estadio(estadio_id)` (RESTRICT)
- **UK:** `(local_id, visitante_id)` (RN-03);
  `(jornada_numero, local_id)` (RN-12);
  `(jornada_numero, visitante_id)` (RN-12);
  `(jornada_numero, estadio_id)` (RN-12)
- **Atributos:** `partido_id INT`, `jornada_numero INT NOT NULL`,
  `local_id INT NOT NULL`, `visitante_id INT NOT NULL`,
  `estadio_id INT NOT NULL`
- **CHECK:** `local_id <> visitante_id` (RN-03)

### `resultado`
- **PK:** `partido_id` (= FK, identificación por partido)
- **FK:** `partido_id → partido(partido_id)` (RESTRICT)
- **Atributos:** `partido_id INT`, `goles_local INT NOT NULL`,
  `goles_visitante INT NOT NULL`
- **CHECK:** `goles_local >= 0`, `goles_visitante >= 0` (RN-08, §1.8)

### `partido_arbitro`
- **PK compuesta:** `(partido_id, rol)`
- **FK:** `partido_id → partido(partido_id)` (RESTRICT);
  `arbitro_id → arbitro(arbitro_id)` (RESTRICT)
- **UK:** `(partido_id, arbitro_id)` (RN-14)
- **Atributos:** `partido_id INT NOT NULL`, `rol VARCHAR(2) NOT NULL`,
  `arbitro_id INT NOT NULL`
- **CHECK:** `rol IN ('P','A1','A2')` (§1.8)

### `gol`
- **PK:** `gol_id`
- **FK:** `partido_id → resultado(partido_id)` (RESTRICT);
  `jugador_id → jugador(jugador_id)` (RESTRICT)
- **Atributos:** `gol_id INT`, `partido_id INT NOT NULL`,
  `jugador_id INT NOT NULL`, **`minuto INT NULL DEFAULT NULL`**
- **CHECK:** `minuto IS NULL OR minuto BETWEEN 1 AND 120` (D1)
- **Sin** `UNIQUE (partido_id, jugador_id)` (RN-18) ni
  `UNIQUE (partido_id, minuto)` (4 casos observados en el `.txt`).

## 3.2 Tabla de referencias (FK)

| Desde | Columna | Hacia | Columna referenciada |
|---|---|---|---|
| `jugador` | `equipo_id` | `equipo` | `equipo_id` |
| `partido` | `jornada_numero` | `jornada` | `numero` |
| `partido` | `local_id` | `equipo` | `equipo_id` |
| `partido` | `visitante_id` | `equipo` | `equipo_id` |
| `partido` | `estadio_id` | `estadio` | `estadio_id` |
| `resultado` | `partido_id` | `partido` | `partido_id` |
| `partido_arbitro` | `partido_id` | `partido` | `partido_id` |
| `partido_arbitro` | `arbitro_id` | `arbitro` | `arbitro_id` |
| `gol` | `partido_id` | `resultado` | `partido_id` |
| `gol` | `jugador_id` | `jugador` | `jugador_id` |

> **Política de borrado:** todas las FK usan `ON DELETE RESTRICT ON UPDATE
> RESTRICT` (constitución C5: historia protegida).

## 3.3 Diccionario de columnas y dominios

| Tabla | Columna | Tipo | Nulo | Restricciones | Dominio / descripción |
|---|---|---|---|---|---|
| equipo |equipo_id |INT |NO |PK |ID del equipo |
| equipo |nombre |VARCHAR(60) |NO |UQ |Nombre del equipo |
| jornada |numero |INT |NO |PK; CK `BETWEEN 1 AND 22` |Número de jornada (1..22) |
| jornada |dia |DATE |NO |UQ |Fecha del sábado |
| estadio |estadio_id |INT |NO |PK |ID del estadio |
| estadio |nombre |VARCHAR(60) |NO |UQ |Nombre del estadio |
| estadio |ubicacion |VARCHAR(80) |NO |— |Ubicación |
| estadio |capacidad |INT |NO |CK `> 0` |Capacidad (personas) |
| arbitro |arbitro_id |INT |NO |PK |ID del árbitro |
| arbitro |nombre |VARCHAR(80) |NO |— |Nombre completo |
| arbitro |codigo |VARCHAR(8) |NO |UQ |Código único del árbitro |
| jugador |jugador_id |INT |NO |PK |ID del jugador |
| jugador |equipo_id |INT |NO |FK → equipo; UQ(equipo_id, dorsal) |Equipo al que pertenece |
| jugador |nombre |VARCHAR(80) |NO |— |Nombre completo |
| jugador |fecha_nacimiento |DATE |NO |CK `< '2026-08-01'` |Fecha de nacimiento |
| jugador |dorsal |INT |NO |CK `BETWEEN 1 AND 99`; UQ(equipo_id, dorsal) |Dorsal del jugador |
| jugador |posicion |VARCHAR(3) |NO |CK `IN ('POR','DEF','MED','DEL')` |Posición |
| partido |partido_id |INT |NO |PK |ID del partido |
| partido |jornada_numero |INT |NO |FK → jornada; UQ(jornada_numero,local_id); UQ(jornada_numero,visitante_id); UQ(jornada_numero,estadio_id) |Jornada en la que se juega |
| partido |local_id |INT |NO |FK → equipo; UQ(jornada_numero,local_id); UQ(local_id,visitante_id); CK `<> visitante_id` |Equipo local |
| partido |visitante_id |INT |NO |FK → equipo; UQ(jornada_numero,visitante_id); CK `<> local_id` |Equipo visitante |
| partido |estadio_id |INT |NO |FK → estadio; UQ(jornada_numero,estadio_id) |Sede del partido |
| resultado |partido_id |INT |NO |PK; FK → partido |ID del partido (PK=FK) |
| resultado |goles_local |INT |NO |CK `>= 0` |Goles del local |
| resultado |goles_visitante |INT |NO |CK `>= 0` |Goles del visitante |
| partido_arbitro |partido_id |INT |NO |PK; FK → partido |ID del partido |
| partido_arbitro |rol |VARCHAR(2) |NO |PK; CK `IN ('P','A1','A2')` |Rol del árbitro |
| partido_arbitro |arbitro_id |INT |NO |FK → arbitro; UQ(partido_id, arbitro_id) |ID del árbitro |
| gol |gol_id |INT |NO |PK |ID del gol |
| gol |partido_id |INT |NO |FK → resultado |Partido (debe tener resultado) |
| gol |jugador_id |INT |NO |FK → jugador |Autor del gol |
| gol |minuto |INT |**YES** |CK `IS NULL OR BETWEEN 1 AND 120` |Minuto del gol (D1, opcional) |

## 3.4 Índices explícitos (D3)

MySQL crea automáticamente un índice por cada FK, pero el SDD exige **nombrarlos
explícitamente** solo para los que no quedan cubiertos por una PK/UK con la
columna de la FK como primera columna. Los 5 índices explícitos:

| Índice | Tabla | Columna | Justificación |
|---|---|---|---|
| `idx_partido_visitante` | partido | `visitante_id` | FK a equipo; en `UQ(jornada_numero, visitante_id)` no es primera columna |
| `idx_partido_estadio` | partido | `estadio_id` | FK a estadio; en `UQ(jornada_numero, estadio_id)` no es primera columna |
| `idx_partido_arbitro_arbitro` | partido_arbitro | `arbitro_id` | FK a arbitro; en `UQ(partido_id, arbitro_id)` no es primera columna. Útil para Q09 |
| `idx_gol_partido` | gol | `partido_id` | FK a resultado |
| `idx_gol_jugador` | gol | `jugador_id` | FK a jugador. Útil para Q14 |

**No necesitan índice extra** (ya son primera columna de una PK o UK):

- `jugador.equipo_id` → `UQ(equipo_id, dorsal)`
- `partido.jornada_numero` → `UQ(jornada_numero, local_id)`
- `partido.local_id` → `UQ(local_id, visitante_id)`
- `resultado.partido_id` → PK
- `partido_arbitro.partido_id` → PK

## 3.5 Normalización

### 1FN — Primera Forma Normal

- **Atributos atómicos:** todos los `VARCHAR` almacenan un solo valor textual
  (`nombre`, `codigo`, `posicion`). No hay listas ni grupos repetidos en
  ninguna fila.
- **Sin grupos repetidos:** los goles no son un atributo multivaluado de
  `resultado` (eso rompería 1FN); se modelan como entidad propia `gol` con
  filas individuales. Igual sucede con los árbitros del partido, que viven en
  la asociativa `partido_arbitro`.

### 2FN — Segunda Forma Normal

- **No hay dependencias parciales en claves compuestas:**
  - `partido_arbitro(partido_id, rol)` → sus atributos no-PK son solo
    `arbitro_id`, que depende de **toda** la clave (un árbitro no se asocia a
    un partido sin rol). No hay dependencia de solo `partido_id` ni de solo `rol`.
  - No existen otras claves compuestas con atributos no-clave adicionales.
- `gol` tiene PK simple (`gol_id`), por lo que la 2FN aplica trivialmente.

### 3FN — Tercera Forma Normal

- **Sin dependencias transitivas** entre atributos no-clave:
  - El **equipo del autor del gol** se obtiene vía `jugador.equipo_id`. No
    se almacena en `gol` (RN-19; evita redundancia y dependencia
    transitiva `gol_id → jugador_id → equipo_id`).
  - **Puntos y posiciones** no se almacenan: se calculan con `SUM`/`CASE`
    (constitución C7, RN-09). Evita atributos derivados que cambiarían con
    cada resultado.
  - El **rol del árbitro** vive en `partido_arbitro.rol`, no en `arbitro`. Un
    árbitro puede tener un rol distinto en otro partido (RN-16); si el rol
    estuviera en `arbitro`, sería una dependencia funcional falsa del
    identificador de la persona.
  - Local y visitante son **dos FK distintas** a la **misma** entidad
    `equipo`; no se duplica la entidad para tener "equipo_local" y
    "equipo_visitante" como tablas separadas.
  - `gol.minuto` depende únicamente de `gol_id` (es un atributo del hecho
    "gol"), por lo que no introduce 2FN ni 3FN.

### Conclusión

El esquema cumple **1FN, 2FN y 3FN**. Los argumentos críticos están
respaldados por las decisiones D1–D5 y la constitución C2, C6, C7.

## 3.6 Límites declarativos

Las reglas que **no** se implementan con restricciones sino que se **verifican**
con consultas de control (Fase 6, archivo `04_pruebas_y_controles.sql`):

| Regla | Por qué no se implementa | Cómo se verifica |
|---|---|---|
| Plantillas de 15 jugadores por equipo | Una UNIQUE no garantiza "exacto 15", solo unicidad. | `GROUP BY equipo_id HAVING COUNT(*) <> 15`. |
| Ternas completas (P, A1, A2 distintos) por partido | UNIQUE por partido no limita a 3 roles distintos. | `COUNT(DISTINCT rol)` = 3 por partido. |
| Ningún árbitro repite jornada | UNIQUE por jornada+árbitro sería una restricción que el enunciado **no pide** (limitaría el calendario, no la integridad). | Conteo de asignaciones por árbitro y jornada. |
| 6 partidos por jornada y jornada 6 días cada equipo exactamente una vez | UNIQUE(jornada_numero, local_id) y UNIQUE(jornada_numero, visitante_id) **junto** lo prohíben, pero ningún CHECK puede afirmar "hay exactamente 6". | Conteo por jornada. |
| Inversión de cruces 12-22 vs 1-11 | No es una invariante local; depende de comparar dos conjuntos. | `SET` de ida contra `SET` de vuelta invertida. |
| Autor pertenece a un equipo del partido (RN-19) | Una CHECK con subquery no se permite en MySQL. | `INNER JOIN equipo` por rol (local o visitante). |
| Filas de `gol` por equipo/partido = marcador (RN-21) | Depende de varias filas. | Conciliación `COUNT(gol)` vs `resultado`. |
| Cantidades totales (12/22/132/48/180/18/6/396/137) | "Cantidad exigida" ≠ "cardinalidad" del modelo. | `SELECT COUNT(*)` por tabla. |

> Esto cumple la constitución C4: **no se atribuye a una FK o CHECK la
> validación de cantidades o condiciones entre varias filas**.

## 3.7 Cierre de la Fase 3

- ✅ Esquema relacional completo con PK, FK (`RESTRICT`), UNIQUE, CHECK y
  las 9 tablas del contrato.
- ✅ Diccionario de columnas y dominios cubre todas las tablas y
  restricciones.
- ✅ Índices explícitos justificados (5 índices, D3).
- ✅ Argumentos de normalización 1FN/2FN/3FN coherentes con las
  decisiones D1–D5.
- ✅ Límites declarativos explícitos; matriz de qué se implementa y qué se
  verifica.