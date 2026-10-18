// src/lib/queries/equipo.ts (opcional, DA1).
//
// Q01 + Q02: equipo y plantilla de jugadores ordenados por dorsal.
//   - Devuelve null si el id no existe.
//   - 15 jugadores por equipo (RN-10).
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { jugador } from '../../db/schema';
import type { EquipoDetalle, JugadorEquipo } from './types';

export async function equipoDetalle(
  id: number,
): Promise<EquipoDetalle | null> {
  const executed = await db.execute(
    (await import('drizzle-orm')).sql`SELECT equipo_id, nombre FROM equipo WHERE equipo_id = ${id}`,
  );
  const cab = (Array.isArray(executed) ? executed[0] : executed) as unknown as Array<{
    equipo_id: number;
    nombre: string;
  }>;
  const head = cab[0];
  if (!head) return null;

  const jugadores = (await db
    .select({
      jugadorId: jugador.jugadorId,
      nombre: jugador.nombre,
      fechaNacimiento: jugador.fechaNacimiento,
      dorsal: jugador.dorsal,
      posicion: jugador.posicion,
    })
    .from(jugador)
    .where(eq(jugador.equipoId, id))
    .orderBy(asc(jugador.dorsal))) as {
      jugadorId: number;
      nombre: string;
      fechaNacimiento: string;
      dorsal: number;
      posicion: string;
    }[];

  return {
    equipo_id: head.equipo_id,
    nombre: head.nombre,
    jugadores: jugadores.map<JugadorEquipo>((j) => ({
      jugador_id: j.jugadorId,
      nombre: j.nombre,
      fecha_nacimiento: j.fechaNacimiento,
      dorsal: Number(j.dorsal),
      posicion: j.posicion,
    })),
  };
}
