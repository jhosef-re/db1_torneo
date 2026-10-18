// src/pages/api/equipos/[id].ts (opcional DA1)
// GET /api/equipos/:id — Equipo y sus 15 jugadores (Q01/Q02).
import type { APIRoute } from 'astro';
import { equipoDetalle } from '../../../lib/queries/equipo';
import {
  jsonResponse,
  okBody,
  failBody,
  enteroPositivo,
} from '../../../lib/api';
import { allSoloGet } from '../../../lib/handlers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = enteroPositivo(params.id);
  if (id === null) {
    return jsonResponse(
      400,
      failBody('PARAMETRO_INVALIDO', 'El id debe ser un entero positivo.'),
    );
  }
  try {
    const datos = await equipoDetalle(id);
    if (datos === null) {
      return jsonResponse(404, failBody('NO_ENCONTRADO', 'El equipo no existe.'));
    }
    return jsonResponse(200, okBody(datos));
  } catch (err) {
    console.error('[api/equipos/:id]', err);
    return jsonResponse(500, failBody('ERROR_INTERNO', 'Error interno del servidor.'));
  }
};

export const ALL = allSoloGet;
