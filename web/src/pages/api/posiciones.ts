// src/pages/api/posiciones.ts
// GET /api/posiciones — Q12 como JSON.
import type { APIRoute } from 'astro';
import { posiciones } from '../../lib/queries/posiciones';
import {
  jsonResponse,
  okBody,
  failBody,
} from '../../lib/api';
import { allSoloGet } from '../../lib/handlers';

export const prerender = false;

interface PosApi {
  posicion: number;
  equipo_id: number;
  equipo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
}

export const GET: APIRoute = async () => {
  try {
    const rows = await posiciones();
    const datos: PosApi[] = rows.map((r, i) => ({
      posicion: i + 1,
      equipo_id: r.equipo_id,
      equipo: r.equipo,
      pj: r.pj,
      pg: r.pg,
      pe: r.pe,
      pp: r.pp,
      gf: r.gf,
      gc: r.gc,
      dg: r.dg,
      puntos: r.puntos,
    }));
    return jsonResponse(200, okBody(datos, datos.length));
  } catch (err) {
    console.error('[api/posiciones]', err);
    return jsonResponse(500, failBody('ERROR_INTERNO', 'Error interno del servidor.'));
  }
};

export const ALL = allSoloGet;
