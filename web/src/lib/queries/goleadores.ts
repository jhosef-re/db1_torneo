// src/lib/queries/goleadores.ts
//
// Q14: Tabla de goleadores.
//   - 180 jugadores, INCLUIDOS los de 0 goles (LEFT JOIN).
//   - Orden: goles DESC, nombre ASC, jugador_id ASC.
//   - Suma de goles = 137 (filas de `gol`).
//
// A3: convertido a `decimalNumbers`/`dateStrings` en el pool para mantener
// números y fechas correctos (R3 y R4).
import { sql, count, eq } from 'drizzle-orm';
import { db } from '../../db';
import { equipo, gol, jugador } from '../../db/schema';
import type { Goleador } from './types';

export async function goleadores(): Promise<Goleador[]> {
  const rows = await db
    .select({
      jugadorId: jugador.jugadorId,
      nombre: jugador.nombre,
      equipoId: jugador.equipoId,
      equipo: equipo.nombre,
      goles: sql<number>`COUNT(${gol.golId})`.mapWith(Number).as('goles'),
    })
    .from(jugador)
    .innerJoin(equipo, eq(equipo.equipoId, jugador.equipoId))
    .leftJoin(gol, eq(gol.jugadorId, jugador.jugadorId))
    .groupBy(jugador.jugadorId, jugador.nombre, jugador.equipoId, equipo.nombre)
    .orderBy(
      sql`COUNT(${gol.golId}) DESC`,
      jugador.nombre,
      jugador.jugadorId,
    );

  return rows.map((r) => ({
    jugador_id: r.jugadorId,
    nombre: r.nombre,
    equipo_id: r.equipoId,
    equipo: r.equipo,
    goles: r.goles,
  }));
}

/** Suma total de goles (debe ser 137). Útil para verificar. */
export async function totalGoles(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(gol);
  return Number(row?.n ?? 0);
}
