// src/pages/api/equipos/index.ts (opcional DA1)
// GET /api/equipos — 12 equipos con su nombre (Q01 compacto).
import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import {
  jsonResponse,
  okBody,
  failBody,
} from '../../../lib/api';
import { allSoloGet } from '../../../lib/handlers';

export const prerender = false;

interface EquipoRow {
  equipo_id: number;
  nombre: string;
  jugadores: number | string;
}

export const GET: APIRoute = async () => {
  try {
    const res = await db.execute<EquipoRow[]>(
      sql`
        SELECT  e.equipo_id, e.nombre, COUNT(j.jugador_id) AS jugadores
        FROM    equipo e
        LEFT JOIN jugador j ON j.equipo_id = e.equipo_id
        GROUP BY e.equipo_id, e.nombre
        ORDER BY e.equipo_id
      `,
    );
    const rows = (Array.isArray(res) ? res[0] : res) as unknown as Array<{
      equipo_id: number | string;
      nombre: string;
      jugadores: number | string;
    }>;
    const datos = rows.map((r) => ({
      equipo_id: Number(r.equipo_id),
      nombre: String(r.nombre),
      jugadores: Number(r.jugadores ?? 0),
    }));
    return jsonResponse(200, okBody(datos, datos.length));
  } catch (err) {
    console.error('[api/equipos]', err);
    return jsonResponse(500, failBody('ERROR_INTERNO', 'Error interno del servidor.'));
  }
};

export const ALL = allSoloGet;
