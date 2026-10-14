-- =============================================================================
-- 01_estructura.sql
-- Proyecto 2026 · Campeonato de Fútbol · Liga Universitaria del Valle
-- =============================================================================
-- Crea la base `campeonato_futbol` y las 9 tablas del modelo relacional.
-- Ejecutar en un servidor MySQL >= 8.0.16 (las restricciones CHECK se aplican).
-- Cumple constitución C1 (corre sin correcciones manuales), C2 (nombres del
-- contrato), C3 (extensión `gol.minuto` opcional), C5 (RESTRICT en FK),
-- C8 (sin INSERT, DROP, TRUNCATE).
-- =============================================================================

-- 1) Crear y seleccionar la base de datos -------------------------------------
DROP DATABASE IF EXISTS campeonato_futbol;
CREATE DATABASE campeonato_futbol
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE campeonato_futbol;

-- 2) Nivel 0: tablas sin dependencias ----------------------------------------

CREATE TABLE equipo (
    equipo_id  INT          NOT NULL,
    nombre     VARCHAR(60)  NOT NULL,
    CONSTRAINT pk_equipo        PRIMARY KEY (equipo_id),
    CONSTRAINT uq_equipo_nombre UNIQUE      (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE jornada (
    numero  INT  NOT NULL,
    dia     DATE NOT NULL,
    CONSTRAINT pk_jornada        PRIMARY KEY (numero),
    CONSTRAINT uq_jornada_dia    UNIQUE      (dia),
    CONSTRAINT ck_jornada_numero CHECK       (numero BETWEEN 1 AND 22)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE estadio (
    estadio_id INT          NOT NULL,
    nombre     VARCHAR(60)  NOT NULL,
    ubicacion  VARCHAR(80)  NOT NULL,
    capacidad  INT          NOT NULL,
    CONSTRAINT pk_estadio          PRIMARY KEY (estadio_id),
    CONSTRAINT uq_estadio_nombre   UNIQUE      (nombre),
    CONSTRAINT ck_estadio_capacidad CHECK      (capacidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE arbitro (
    arbitro_id INT         NOT NULL,
    nombre     VARCHAR(80) NOT NULL,
    codigo     VARCHAR(8)  NOT NULL,
    CONSTRAINT pk_arbitro        PRIMARY KEY (arbitro_id),
    CONSTRAINT uq_arbitro_codigo UNIQUE      (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Nivel 1: jugador (depende de equipo); partido (depende de jornada, estadio y equipo×2)

CREATE TABLE jugador (
    jugador_id        INT          NOT NULL,
    equipo_id         INT          NOT NULL,
    nombre            VARCHAR(80)  NOT NULL,
    fecha_nacimiento  DATE         NOT NULL,
    dorsal            INT          NOT NULL,
    posicion          VARCHAR(3)   NOT NULL,
    CONSTRAINT pk_jugador               PRIMARY KEY (jugador_id),
    CONSTRAINT fk_jugador_equipo        FOREIGN KEY (equipo_id)
        REFERENCES equipo (equipo_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_jugador_equipo_dorsal UNIQUE      (equipo_id, dorsal),
    CONSTRAINT ck_jugador_dorsal         CHECK       (dorsal BETWEEN 1 AND 99),
    CONSTRAINT ck_jugador_posicion       CHECK       (posicion IN ('POR','DEF','MED','DEL')),
    CONSTRAINT ck_jugador_nacimiento    CHECK       (fecha_nacimiento < '2026-08-01')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE partido (
    partido_id      INT NOT NULL,
    jornada_numero  INT NOT NULL,
    local_id        INT NOT NULL,
    visitante_id    INT NOT NULL,
    estadio_id      INT NOT NULL,
    CONSTRAINT pk_partido                       PRIMARY KEY (partido_id),
    CONSTRAINT fk_partido_jornada               FOREIGN KEY (jornada_numero)
        REFERENCES jornada (numero)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_partido_local                 FOREIGN KEY (local_id)
        REFERENCES equipo (equipo_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_partido_visitante             FOREIGN KEY (visitante_id)
        REFERENCES equipo (equipo_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_partido_estadio               FOREIGN KEY (estadio_id)
        REFERENCES estadio (estadio_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_partido_pareja                UNIQUE      (local_id, visitante_id),
    CONSTRAINT uq_partido_jornada_local         UNIQUE      (jornada_numero, local_id),
    CONSTRAINT uq_partido_jornada_visitante     UNIQUE      (jornada_numero, visitante_id),
    CONSTRAINT uq_partido_jornada_estadio       UNIQUE      (jornada_numero, estadio_id),
    CONSTRAINT ck_partido_local_vs_visitante    CHECK       (local_id <> visitante_id),
    -- Índices explícitos por FK que no son primera columna de UK (D3) ----------
    INDEX idx_partido_visitante (visitante_id),
    INDEX idx_partido_estadio   (estadio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Nivel 2: resultado (depende de partido); partido_arbitro (depende de partido y arbitro)

CREATE TABLE resultado (
    partido_id        INT NOT NULL,
    goles_local       INT NOT NULL,
    goles_visitante   INT NOT NULL,
    CONSTRAINT pk_resultado                 PRIMARY KEY (partido_id),
    CONSTRAINT fk_resultado_partido       FOREIGN KEY (partido_id)
        REFERENCES partido (partido_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_resultado_gol_local     CHECK       (goles_local     >= 0),
    CONSTRAINT ck_resultado_gol_visit     CHECK       (goles_visitante >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE partido_arbitro (
    partido_id  INT         NOT NULL,
    rol         VARCHAR(2)  NOT NULL,
    arbitro_id  INT         NOT NULL,
    CONSTRAINT pk_partido_arbitro          PRIMARY KEY (partido_id, rol),
    CONSTRAINT fk_pa_partido               FOREIGN KEY (partido_id)
        REFERENCES partido (partido_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_pa_arbitro               FOREIGN KEY (arbitro_id)
        REFERENCES arbitro (arbitro_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_pa_partido_arbitro       UNIQUE      (partido_id, arbitro_id),
    CONSTRAINT ck_pa_rol                   CHECK       (rol IN ('P','A1','A2')),
    -- Índice explícito por FK que no es primera columna de UK (D3) ----------
    INDEX idx_partido_arbitro_arbitro (arbitro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Nivel 3: gol (depende de resultado y jugador)

CREATE TABLE gol (
    gol_id      INT NOT NULL,
    partido_id  INT NOT NULL,
    jugador_id  INT NOT NULL,
    minuto      INT          DEFAULT NULL,   -- D1: opcional, NULL por defecto
    CONSTRAINT pk_gol                       PRIMARY KEY (gol_id),
    CONSTRAINT fk_gol_partido               FOREIGN KEY (partido_id)
        REFERENCES resultado (partido_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_gol_jugador               FOREIGN KEY (jugador_id)
        REFERENCES jugador (jugador_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_gol_minuto                CHECK       (minuto IS NULL OR minuto BETWEEN 1 AND 120),
    -- Índices explícitos por FK (D3) ------------------------------------------
    INDEX idx_gol_partido (partido_id),
    INDEX idx_gol_jugador (jugador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- Fin de 01_estructura.sql
-- =============================================================================