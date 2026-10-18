// src/pages/api/goleadores.ts
// GET /api/goleadores — Q14 como JSON.
import type { APIRoute } from 'astro';
import { goleadores } from '../../lib/queries/goleadores';
import {
  jsonResponse,
  okBody,
  failBody,
} from '../../lib/api';
import { allSoloGet } from '../../lib/handlers';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const datos = await goleadores();
    return jsonResponse(200, okBody(datos, datos.length));
  } catch (err) {
    console.error('[api/goleadores]', err);
    return jsonResponse(500, failBody('ERROR_INTERNO', 'Error interno del servidor.'));
  }
};

export const ALL = allSoloGet;
