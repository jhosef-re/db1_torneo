-- =============================================================================
-- 03_consultas.sql
-- Proyecto 2026 · Campeonato de Fútbol · Liga Universitaria del Valle
-- =============================================================================
-- Catorce consultas SELECT (Anexo A del SDD). No se usan UPDATE ni DELETE.
-- Notas de implementación por consulta en comentarios al inicio de cada bloque.
-- =============================================================================

USE campeonato_futbol;

SET NAMES utf8mb4;

-- =============================================================================
-- Q01 · Equipos y plantillas
-- ID, nombre y cantidad de jugadores por equipo, INCLUIDOS equipos sin
-- jugadores (LEFT JOIN). Salida: 12 filas, 15 jugadores por equipo.
-- =============================================================================
SELECT '-- Q01 Equipos y plantillas' AS '';
SELECT  e.equipo_id,
        e.nombre,
        COUNT(j.jugador_id) AS jugadores
FROM    equipo e
LEFT JOIN jugador j ON j.equipo_id = e.equipo_id
GROUP BY e.equipo_id, e.nombre
ORDER BY e.equipo_id;

-- =============================================================================
-- Q02 · Jugadores de Aurora FC
-- Nombre, nacimiento, dorsal y posición del equipo 1. Orden por dorsal.
-- Salida: 15 filas.
-- =============================================================================
SELECT '-- Q02 Jugadores de Aurora FC' AS '';
SELECT  j.nombre,
        j.fecha_nacimiento,
        j.dorsal,
        j.posicion
FROM    jugador j
WHERE   j.equipo_id = 1
ORDER BY j.dorsal;

-- =============================================================================
-- Q03 · Calendario completo
-- ID del partido, jornada, fecha, nombres de local, visitante y estadio.
-- Orden: jornada, partido. Salida: 132 filas.
-- =============================================================================
SELECT '-- Q03 Calendario completo' AS '';
SELECT  p.partido_id,
        p.jornada_numero,
        j.dia,
        el.nombre AS local,
        ev.nombre AS visitante,
        es.nombre AS estadio
FROM    partido p
JOIN    jornada j  ON j.numero = p.jornada_numero
JOIN    equipo  el ON el.equipo_id = p.local_id
JOIN    equipo  ev ON ev.equipo_id = p.visitante_id
JOIN    estadio es ON es.estadio_id = p.estadio_id
ORDER BY p.jornada_numero, p.partido_id;

-- =============================================================================
-- Q04 · Partidos jugados
-- Jornada, fecha, local, goles locales, goles visitantes y visitante.
-- INNER JOIN resultado. Salida: 48 filas.
-- =============================================================================
SELECT '-- Q04 Partidos jugados' AS '';
SELECT  p.jornada_numero,
        j.dia,
        el.nombre  AS local,
        r.goles_local,
        r.goles_visitante,
        ev.nombre  AS visitante
FROM    partido p
JOIN    jornada j   ON j.numero = p.jornada_numero
JOIN    equipo el   ON el.equipo_id = p.local_id
JOIN    equipo ev   ON ev.equipo_id = p.visitante_id
JOIN    resultado r ON r.partido_id = p.partido_id
ORDER BY p.jornada_numero, p.partido_id;

-- =============================================================================
-- Q05 · Partidos pendientes
-- ID, jornada, fecha, local y visitante de los partidos SIN resultado.
-- LEFT JOIN resultado WHERE NULL. Salida: 84 filas.
-- =============================================================================
SELECT '-- Q05 Partidos pendientes' AS '';
SELECT  p.partido_id,
        p.jornada_numero,
        j.dia,
        el.nombre  AS local,
        ev.nombre  AS visitante
FROM    partido p
JOIN    jornada j ON j.numero = p.jornada_numero
JOIN    equipo el ON el.equipo_id = p.local_id
JOIN    equipo ev ON ev.equipo_id = p.visitante_id
LEFT JOIN resultado r ON r.partido_id = p.partido_id
WHERE   r.partido_id IS NULL
ORDER BY p.jornada_numero, p.partido_id;

-- =============================================================================
-- Q06 · Resumen por jornada
-- Jornada, programados, jugados y pendientes. INCLUIR las 22 jornadas.
-- Programados = COUNT(*) de partido; Jugados y Pendientes con CASE.
-- Salida: 22 filas.
-- =============================================================================
SELECT '-- Q06 Resumen por jornada' AS '';
SELECT  p.jornada_numero                       AS jornada,
        COUNT(*)                               AS programados,
        SUM(CASE WHEN r.partido_id IS NOT NULL THEN 1 ELSE 0 END) AS jugados,
        SUM(CASE WHEN r.partido_id IS NULL     THEN 1 ELSE 0 END) AS pendientes
FROM    partido p
LEFT JOIN resultado r ON r.partido_id = p.partido_id
GROUP BY p.jornada_numero
ORDER BY p.jornada_numero;

-- =============================================================================
-- Q07 · Uso de estadios
-- Estadio, capacidad, partidos programados y jugados; INCLUIR sedes sin partidos.
-- Salida: 6 filas.
-- =============================================================================
SELECT '-- Q07 Uso de estadios' AS '';
SELECT  es.nombre                              AS estadio,
        es.capacidad,
        COUNT(p.partido_id)                    AS programados,
        SUM(CASE WHEN r.partido_id IS NOT NULL THEN 1 ELSE 0 END) AS jugados
FROM    estadio es
LEFT JOIN partido   p ON p.estadio_id = es.estadio_id
LEFT JOIN resultado r ON r.partido_id = p.partido_id
GROUP BY es.estadio_id, es.nombre, es.capacidad
ORDER BY es.estadio_id;

-- =============================================================================
-- Q08 · Árbitros de la jornada 1
-- Partido, local, visitante, nombre del árbitro y rol. Orden por partido y rol.
-- Salida: 18 filas.
-- =============================================================================
SELECT '-- Q08 Árbitros de la jornada 1' AS '';
SELECT  pa.partido_id,
        el.nombre     AS local,
        ev.nombre     AS visitante,
        a.nombre      AS arbitro,
        pa.rol
FROM    partido_arbitro pa
JOIN    partido p  ON p.partido_id = pa.partido_id
JOIN    equipo el  ON el.equipo_id = p.local_id
JOIN    equipo ev  ON ev.equipo_id = p.visitante_id
JOIN    arbitro a  ON a.arbitro_id = pa.arbitro_id
WHERE   p.jornada_numero = 1
ORDER BY pa.partido_id, FIELD(pa.rol, 'P', 'A1', 'A2');

-- =============================================================================
-- Q09 · Carga arbitral
-- Código, nombre, total de asignaciones y por rol; INCLUIDOS los no asignados.
-- Salida: 18 filas; 22 asignaciones por persona.
-- =============================================================================
SELECT '-- Q09 Carga arbitral' AS '';
SELECT  a.codigo,
        a.nombre,
        COUNT(pa.arbitro_id) AS asignaciones,
        SUM(CASE WHEN pa.rol = 'P'  THEN 1 ELSE 0 END) AS como_principal,
        SUM(CASE WHEN pa.rol = 'A1' THEN 1 ELSE 0 END) AS como_asistente1,
        SUM(CASE WHEN pa.rol = 'A2' THEN 1 ELSE 0 END) AS como_asistente2
FROM    arbitro a
LEFT JOIN partido_arbitro pa ON pa.arbitro_id = a.arbitro_id
GROUP BY a.arbitro_id, a.codigo, a.nombre
ORDER BY a.codigo;

-- =============================================================================
-- Q10 · Goles por jornada jugada
-- Jornada, total de goles y promedio por partido con 2 decimales.
-- Solo jornadas con resultados. Salida: 8 filas.
-- =============================================================================
SELECT '-- Q10 Goles por jornada jugada' AS '';
SELECT  p.jornada_numero                                    AS jornada,
        SUM(r.goles_local + r.goles_visitante)              AS total_goles,
        ROUND(AVG(r.goles_local + r.goles_visitante), 2)    AS promedio
FROM    partido p
JOIN    resultado r ON r.partido_id = p.partido_id
GROUP BY p.jornada_numero
ORDER BY p.jornada_numero;

-- =============================================================================
-- Q11 · Goles por equipo
-- Equipo, goles a favor, en contra y diferencia; integrando localías y visitas;
-- solo partidos jugados; INCLUIR los 12 equipos.
-- Estrategia: UNION ALL local/visitante -> cada partido cuenta como dos filas
-- (una por equipo), luego agregamos y restamos del marcador.
-- Salida: 12 filas.
-- =============================================================================
SELECT '-- Q11 Goles por equipo' AS '';
WITH
  per_team AS (
    -- Como local: a favor = goles_local; en contra = goles_visitante
    SELECT  p.local_id AS equipo_id,
            r.goles_local     AS goles_favor,
            r.goles_visitante AS goles_contra
    FROM    partido p
    JOIN    resultado r ON r.partido_id = p.partido_id
    UNION ALL
    -- Como visitante: a favor = goles_visitante; en contra = goles_local
    SELECT  p.visitante_id AS equipo_id,
            r.goles_visitante AS goles_favor,
            r.goles_local     AS goles_contra
    FROM    partido p
    JOIN    resultado r ON r.partido_id = p.partido_id
  ),
  agg AS (
    SELECT  equipo_id,
            SUM(goles_favor)  AS gf,
            SUM(goles_contra) AS gc
    FROM    per_team
    GROUP BY equipo_id
  )
SELECT  e.equipo_id,
        e.nombre,
        COALESCE(a.gf, 0)               AS goles_a_favor,
        COALESCE(a.gc, 0)               AS goles_en_contra,
        COALESCE(a.gf, 0) - COALESCE(a.gc, 0) AS diferencia
FROM    equipo   e
LEFT JOIN agg a ON a.equipo_id = e.equipo_id
ORDER BY e.equipo_id;

-- =============================================================================
-- Q12 · Tabla de posiciones
-- Equipo, PJ, PG, PE, PP, GC (goles en contra), DG y puntos.
-- Orden: puntos desc, DG desc, GF desc, nombre asc.
-- Salida: 12 equipos, cada uno con 8 PJ.
-- =============================================================================
SELECT '-- Q12 Tabla de posiciones' AS '';
WITH
  per_team AS (
    -- Cada partido (con resultado) produce dos filas (local y visitante)
    -- con PG/PE/PP/puntos según la perspectiva del equipo.
    SELECT  p.local_id AS equipo_id,
            CASE
              WHEN r.goles_local > r.goles_visitante THEN 1 ELSE 0 END AS pg,
            CASE
              WHEN r.goles_local = r.goles_visitante THEN 1 ELSE 0 END AS pe,
            CASE
              WHEN r.goles_local < r.goles_visitante THEN 1 ELSE 0 END AS pp,
            r.goles_local     AS gf,
            r.goles_visitante AS gc
    FROM    partido p
    JOIN    resultado r ON r.partido_id = p.partido_id
    UNION ALL
    SELECT  p.visitante_id,
            CASE WHEN r.goles_visitante > r.goles_local THEN 1 ELSE 0 END,
            CASE WHEN r.goles_visitante = r.goles_local THEN 1 ELSE 0 END,
            CASE WHEN r.goles_visitante < r.goles_local THEN 1 ELSE 0 END,
            r.goles_visitante,
            r.goles_local
    FROM    partido p
    JOIN    resultado r ON r.partido_id = p.partido_id
  ),
  agg AS (
    SELECT  equipo_id,
            COUNT(*)                     AS pj,
            SUM(pg)                      AS g,
            SUM(pe)                      AS e,
            SUM(pp)                      AS p,
            SUM(gf)                      AS gf,
            SUM(gc)                      AS gc,
            SUM(gf) - SUM(gc)            AS dg,
            SUM(pg)*3 + SUM(pe)          AS puntos
    FROM    per_team
    GROUP BY equipo_id
  )
SELECT  e.equipo_id,
        e.nombre,
        COALESCE(a.pj, 0) AS pj,
        COALESCE(a.g,  0) AS pg,
        COALESCE(a.e,  0) AS pe,
        COALESCE(a.p,  0) AS pp,
        COALESCE(a.gf, 0) AS gf,
        COALESCE(a.gc, 0) AS gc,
        COALESCE(a.dg, 0) AS dg,
        COALESCE(a.puntos, 0) AS puntos
FROM    equipo e
LEFT JOIN agg a ON a.equipo_id = e.equipo_id
ORDER BY puntos DESC, dg DESC, gf DESC, e.nombre ASC;

-- =============================================================================
-- Q13 · Detalle de goles y autores
-- ID del gol, ID del partido, jornada, local, visitante, autor y su equipo.
-- Una fila por gol. Orden: jornada, partido, gol_id. Total = 137 filas.
-- =============================================================================
SELECT '-- Q13 Detalle de goles y autores' AS '';
SELECT  g.gol_id,
        p.partido_id,
        p.jornada_numero,
        el.nombre   AS local,
        ev.nombre   AS visitante,
        ju.nombre   AS autor,
        eq.nombre   AS equipo_autor
FROM    gol g
JOIN    partido p   ON p.partido_id = g.partido_id
JOIN    resultado r ON r.partido_id = p.partido_id
JOIN    equipo el   ON el.equipo_id = p.local_id
JOIN    equipo ev   ON ev.equipo_id = p.visitante_id
JOIN    jugador ju  ON ju.jugador_id = g.jugador_id
JOIN    equipo eq   ON eq.equipo_id = ju.equipo_id
ORDER BY p.jornada_numero, p.partido_id, g.gol_id;

-- =============================================================================
-- Q14 · Tabla de goleadores
-- ID y nombre del jugador, equipo y total de goles. INCLUIR los 180 jugadores,
-- también con total 0. Orden: goles DESC, nombre e ID ASC.
-- Suma de totales = 137 (filas de `gol`).
-- =============================================================================
SELECT '-- Q14 Tabla de goleadores' AS '';
SELECT  j.jugador_id,
        j.nombre,
        e.nombre AS equipo,
        COUNT(g.gol_id) AS goles
FROM    jugador j
JOIN    equipo e ON e.equipo_id = j.equipo_id
LEFT JOIN gol g ON g.jugador_id = j.jugador_id
GROUP BY j.jugador_id, j.nombre, e.nombre
ORDER BY goles DESC, j.nombre ASC, j.jugador_id ASC;

-- =============================================================================
-- Fin de 03_consultas.sql
-- =============================================================================