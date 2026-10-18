// src/lib/queries/partido.ts
//
// Q08 + Q13: Detalle de un partido (para V4 y `GET /api/partidos/:id`).
//   - partido + jornada + fecha + 15:00
//   - local, visitante y estadio completo
//   - resultado (null ⇔ pendiente, NUNCA 0–0)
//   - 3 árbitros en orden P, A1, A2 (RP-05)
//   - goles en orden por gol_id, con autor y equipo del autor
import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db, pool } from '../../db';
import {
  arbitro,
  equipo,
  gol,
  jugador,
  partidoArbitro,
} from '../../db/schema';
import type {
  ArbitroPartido,
  EstadoPartido,
  GolPartido,
  PartidoDetalle,
} from './types';

const equipoAutor = alias(equipo, 'autor');

export async function partidoDetalle(
  id: number,
): Promise<PartidoDetalle | null> {
  // 1) Cabecera (mysql2 directo para placeholders ?).
  const sqlCab = `
    SELECT  p.partido_id,
            p.jornada_numero,
            j.dia              AS fecha,
            el.equipo_id       AS local_id,
            el.nombre          AS local_nombre,
            ev.equipo_id       AS visitante_id,
            ev.nombre          AS visitante_nombre,
            es.estadio_id      AS estadio_id,
            es.nombre          AS estadio_nombre,
            es.ubicacion       AS estadio_ubicacion,
            es.capacidad       AS estadio_capacidad,
            r.goles_local      AS goles_local,
            r.goles_visitante  AS goles_visitante
    FROM    partido p
    JOIN    jornada j   ON j.numero     = p.jornada_numero
    JOIN    equipo  el  ON el.equipo_id = p.local_id
    JOIN    equipo  ev  ON ev.equipo_id = p.visitante_id
    JOIN    estadio es  ON es.estadio_id = p.estadio_id
    LEFT JOIN resultado r ON r.partido_id = p.partido_id
    WHERE   p.partido_id = ?
  `;
  const [headerRows] = await pool.query(sqlCab, [id]);
  const cab = (headerRows as unknown as Array<{
    partido_id: number;
    jornada_numero: number;
    fecha: string;
    local_id: number;
    local_nombre: string;
    visitante_id: number;
    visitante_nombre: string;
    estadio_id: number;
    estadio_nombre: string;
    estadio_ubicacion: string;
    estadio_capacidad: number;
    goles_local: number | null;
    goles_visitante: number | null;
  }>)[0];

  if (!cab) return null;

  // 2) Árbitros (ordenados P, A1, A2 desde TS).
  const arbitrosRows = await db
    .select({
      rol: partidoArbitro.rol,
      arbitroId: arbitro.arbitroId,
      nombre: arbitro.nombre,
      codigo: arbitro.codigo,
    })
    .from(partidoArbitro)
    .innerJoin(arbitro, eq(arbitro.arbitroId, partidoArbitro.arbitroId))
    .where(eq(partidoArbitro.partidoId, id));

  const ordenRol: Record<'P' | 'A1' | 'A2', number> = { P: 1, A1: 2, A2: 3 };
  const arbitros: ArbitroPartido[] = arbitrosRows
    .slice()
    .sort(
      (a, b) =>
        (ordenRol[a.rol as 'P' | 'A1' | 'A2'] ?? 9) -
        (ordenRol[b.rol as 'P' | 'A1' | 'A2'] ?? 9),
    )
    .map((a) => ({
      rol: a.rol as 'P' | 'A1' | 'A2',
      arbitro_id: a.arbitroId,
      nombre: a.nombre,
      codigo: a.codigo,
    }));

  // 3) Goles (ordenados por gol_id) con equipo del autor.
  const golesRows = await db
    .select({
      golId: gol.golId,
      minuto: gol.minuto,
      equipoId: equipoAutor.equipoId,
      jugadorId: jugador.jugadorId,
      jugadorNombre: jugador.nombre,
    })
    .from(gol)
    .innerJoin(jugador, eq(jugador.jugadorId, gol.jugadorId))
    .innerJoin(equipoAutor, eq(equipoAutor.equipoId, jugador.equipoId))
    .where(eq(gol.partidoId, id))
    .orderBy(asc(gol.golId));

  const goles: GolPartido[] = golesRows.map((g) => ({
    gol_id: g.golId,
    minuto: g.minuto === null ? null : Number(g.minuto),
    equipo_id: g.equipoId,
    jugador: { jugador_id: g.jugadorId, nombre: g.jugadorNombre },
  }));

  const estado: EstadoPartido =
    cab.goles_local === null || cab.goles_visitante === null
      ? 'pendiente'
      : 'jugado';

  return {
    partido_id: cab.partido_id,
    jornada: cab.jornada_numero,
    fecha: cab.fecha,
    hora: '15:00',
    local: { equipo_id: cab.local_id, nombre: cab.local_nombre },
    visitante: { equipo_id: cab.visitante_id, nombre: cab.visitante_nombre },
    estadio: {
      estadio_id: cab.estadio_id,
      nombre: cab.estadio_nombre,
      ubicacion: cab.estadio_ubicacion,
      capacidad: Number(cab.estadio_capacidad ?? 0),
    },
    estado,
    resultado:
      estado === 'jugado'
        ? {
            goles_local: Number(cab.goles_local ?? 0),
            goles_visitante: Number(cab.goles_visitante ?? 0),
          }
        : null,
    arbitros,
    goles,
  };
}
