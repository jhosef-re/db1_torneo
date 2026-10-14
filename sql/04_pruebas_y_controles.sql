-- =============================================================================
-- 04_pruebas_y_controles.sql
-- Proyecto 2026 · Campeonato de Fútbol · Liga Universitaria del Valle
-- =============================================================================
-- Cumple la decisión D5 del SDD: pruebas de rechazo + controles en archivo
-- separado de las consultas del enunciado (03_consultas.sql).
--
-- 6A · Rechazos: cada intento dentro de BEGIN/ROLLBACK; se conserva el ERROR
--     como evidencia (C9).
-- 6B · Controles: consultas que validan reglas NO implementadas por FK/CHECK.
--     Deben devolver 0 filas para que la carga sea consistente.
-- =============================================================================

USE campeonato_futbol;

SET NAMES utf8mb4;

-- =============================================================================
-- 6A · PRUEBAS DE RECHAZO (con ROLLBACK)
-- =============================================================================

SELECT '====== 6A · RECHAZOS ESPERADOS ======' AS '';

-- T6.1  Jugador con equipo_id inexistente (FK jugador -> equipo) -------------
SELECT '-- T6.1 Jugador con equipo_id inexistente' AS '';
START TRANSACTION;
-- El equipo_id=999 no existe en `equipo`
INSERT INTO jugador
  (jugador_id, equipo_id, nombre, fecha_nacimiento, dorsal, posicion)
VALUES
  (9999, 999, 'Fantasma FC', '2000-01-01', 1, 'POR');
-- El ROLLBACK deja la base sin cambios
ROLLBACK;

-- T6.2  Dorsal duplicado dentro del mismo equipo (UNIQUE (equipo_id, dorsal))
SELECT '-- T6.2 Dorsal duplicado en el mismo equipo' AS '';
START TRANSACTION;
-- jugador_id=1 ya existe (equipo=1, dorsal=1). Repetimos la combinación.
INSERT INTO jugador
  (jugador_id, equipo_id, nombre, fecha_nacimiento, dorsal, posicion)
VALUES
  (9998, 1, 'Dorsal repetido', '2000-01-01', 1, 'POR');
ROLLBACK;

-- T6.3  Goles negativos en resultado (CHECK >= 0) ----------------------------
SELECT '-- T6.3 Goles negativos en resultado' AS '';
START TRANSACTION;
INSERT INTO resultado (partido_id, goles_local, goles_visitante)
VALUES (1, -1, 0);
ROLLBACK;

START TRANSACTION;
INSERT INTO resultado (partido_id, goles_local, goles_visitante)
VALUES (1, 0, -2);
ROLLBACK;

-- T6.4  Dos resultados para un mismo partido (PK partido_id en resultado) ----
SELECT '-- T6.4 Dos resultados para el mismo partido' AS '';
START TRANSACTION;
INSERT INTO resultado (partido_id, goles_local, goles_visitante)
VALUES (1, 3, 3);   -- partido 1 ya tiene resultado
ROLLBACK;

-- T6.5  Autoenfrentamiento (local_id = visitante_id) -------------------------
SELECT '-- T6.5 Autoenfrentamiento' AS '';
START TRANSACTION;
INSERT INTO partido
  (partido_id, jornada_numero, local_id, visitante_id, estadio_id)
VALUES
  (9997, 1, 5, 5, 1);   -- mismo local y visitante
ROLLBACK;

-- T6.6  Gol con autor inexistente (FK gol -> jugador) ------------------------
SELECT '-- T6.6 Gol con jugador_id inexistente' AS '';
START TRANSACTION;
INSERT INTO gol (gol_id, partido_id, jugador_id, minuto)
VALUES (99999, 1, 99999, 30);
ROLLBACK;

-- T6.7  Gol en un partido sin Resultado (FK gol -> resultado) ----------------
SELECT '-- T6.7 Gol en partido sin Resultado' AS '';
START TRANSACTION;
-- partido 49 está pendiente (jornada 9, no hay fila en resultado)
INSERT INTO gol (gol_id, partido_id, jugador_id, minuto)
VALUES (99997, 49, 1, 30);
ROLLBACK;

-- T6.8  Gol con minuto fuera de rango (CHECK 1..120) -------------------------
SELECT '-- T6.8 Gol con minuto fuera de rango' AS '';
START TRANSACTION;
INSERT INTO gol (gol_id, partido_id, jugador_id, minuto) VALUES (99996, 1, 1, 0);
ROLLBACK;

START TRANSACTION;
INSERT INTO gol (gol_id, partido_id, jugador_id, minuto) VALUES (99995, 1, 1, 121);
ROLLBACK;

-- =============================================================================
-- 6B · CONSULTAS DE CONTROL (deben devolver 0 filas)
-- =============================================================================

SELECT '====== 6B · CONTROLES (deben devolver 0 filas) ======' AS '';

-- T6.9  Autor ajeno a los equipos del encuentro (RN-19) -----------------------
SELECT '-- T6.9 Autor ajeno a los equipos del partido' AS '';
SELECT COUNT(*) AS autores_ajenos
FROM gol g
JOIN partido p ON p.partido_id = g.partido_id
JOIN jugador j ON j.jugador_id = g.jugador_id
WHERE j.equipo_id NOT IN (p.local_id, p.visitante_id);

-- T6.10 Diferencias goles vs marcador, por equipo y partido (RN-21) ---------
SELECT '-- T6.10 Diferencias goles vs marcador' AS '';
SELECT COUNT(*) AS inconsistencias
FROM (
  SELECT r.partido_id, r.goles_local, r.goles_visitante,
         COALESCE(SUM(CASE WHEN j.equipo_id = p.local_id     THEN 1 ELSE 0 END), 0) AS gl_real,
         COALESCE(SUM(CASE WHEN j.equipo_id = p.visitante_id THEN 1 ELSE 0 END), 0) AS gv_real
  FROM resultado r
  JOIN partido p   ON p.partido_id = r.partido_id
  LEFT JOIN gol g  ON g.partido_id = r.partido_id
  LEFT JOIN jugador j ON j.jugador_id = g.jugador_id
  GROUP BY r.partido_id, r.goles_local, r.goles_visitante
  HAVING gl_real <> r.goles_local OR gv_real <> r.goles_visitante
) AS t;

-- T6.11 Plantillas != 15 jugadores (RN-11) -----------------------------------
SELECT '-- T6.11 Plantillas con tamaño != 15' AS '';
SELECT equipo_id, COUNT(*) AS jugadores
FROM jugador
GROUP BY equipo_id
HAVING COUNT(*) <> 15;

-- T6.12 Partidos con terna incompleta o con árbitros repetidos (RN-14) -------
SELECT '-- T6.12 Partidos con terna incompleta o repetidos' AS '';
SELECT partido_id, COUNT(DISTINCT rol) AS roles, COUNT(DISTINCT arbitro_id) AS arbitros
FROM partido_arbitro
GROUP BY partido_id
HAVING COUNT(DISTINCT rol) <> 3 OR COUNT(DISTINCT arbitro_id) <> 3;

-- T6.13 Árbitro con >1 partido en la misma jornada (RN-15) ------------------
SELECT '-- T6.13 Árbitros con más de un partido en la misma jornada' AS '';
SELECT p.jornada_numero AS jornada, pa.arbitro_id, COUNT(*) AS partidos
FROM partido p
JOIN partido_arbitro pa ON pa.partido_id = p.partido_id
GROUP BY p.jornada_numero, pa.arbitro_id
HAVING COUNT(*) > 1;

-- T6.14 Jornadas con != 6 partidos o equipo que aparece != 1 vez (RN-03/12) --
SELECT '-- T6.14a Jornadas con != 6 partidos' AS '';
SELECT jornada_numero, COUNT(*) AS partidos
FROM partido
GROUP BY jornada_numero
HAVING COUNT(*) <> 6;

SELECT '-- T6.14b Equipos que aparecen más de una vez en una jornada' AS '';
SELECT jornada_numero, equipo_id, COUNT(*) AS apariciones
FROM (
  SELECT jornada_numero, local_id     AS equipo_id FROM partido
  UNION ALL
  SELECT jornada_numero, visitante_id AS equipo_id FROM partido
) AS roles
GROUP BY jornada_numero, equipo_id
HAVING COUNT(*) <> 1;

SELECT '-- T6.14c Sedes repetidas en una jornada' AS '';
SELECT jornada_numero, estadio_id, COUNT(*) AS veces
FROM partido
GROUP BY jornada_numero, estadio_id
HAVING COUNT(*) <> 1;

-- T6.15 Cruces de las jornadas 12-22 que NO invierten los de 1-11 (RN-02) ---
SELECT '-- T6.15 Cruces de vuelta que no invierten los de ida' AS '';
SELECT COUNT(*) AS cruces_no_invertidos
FROM (
  SELECT visitante_id AS local_v, local_id AS visitante_v
  FROM partido
  WHERE jornada_numero BETWEEN 12 AND 22
) AS vuelta
LEFT JOIN (
  SELECT local_id AS local_i, visitante_id AS visitante_i
  FROM partido
  WHERE jornada_numero BETWEEN 1 AND 11
) AS ida
  ON ida.local_i = vuelta.local_v
 AND ida.visitante_i = vuelta.visitante_v
WHERE ida.local_i IS NULL;

-- =============================================================================
-- Verificaciones finales de cobertura
-- =============================================================================

SELECT '====== COBERTURA DE LAS 21 REGLAS RN ======' AS '';
SELECT 'RN-01 a RN-09 (competición/resultados): ver controles T6.10, T6.14, T6.15 y SELECTs Q03-Q12.' AS '';
SELECT 'RN-10 (1 jugador = 1 equipo): ver FK jugador.equipo_id.' AS '';
SELECT 'RN-11 (plantillas 15): ver T6.11.' AS '';
SELECT 'RN-12 (sedes distintas por jornada): ver T6.14c.' AS '';
SELECT 'RN-13 (18 árbitros con código único): ver SELECT COUNT(*) FROM arbitro = 18 y UK codigo.' AS '';
SELECT 'RN-14 (ternas P/A1/A2): ver T6.12.' AS '';
SELECT 'RN-15 (árbitro no repite jornada): ver T6.13.' AS '';
SELECT 'RN-16 (rol en partido_arbitro): ver esquema.' AS '';
SELECT 'RN-17 a RN-21 (goles): ver T6.9 y T6.10 y SELECTs Q11-Q14.' AS '';