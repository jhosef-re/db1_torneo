// src/pages/api/partidos/[id].ts
// GET /api/partidos/:id — Q08+Q13 como JSON.
//   - 400 si id no es entero positivo.
//   - 404 si id válido pero no existe.
import type { APIRoute } from 'astro';
import { partidoDetalle } from '../../../lib/queries/partido';
import {
  jsonResponse,
  okBody,
  failBody,
  enteroPositivo,
} from '../../../lib/api';
import { allSoloGet } from '../../../lib/handlers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const rawId = params.id;
  const id = enteroPositivo(rawId);
  if (id === null) {
    return jsonResponse(
      400,
      failBody('PARAMETRO_INVALIDO', 'El id debe ser un entero positivo.'),
    );
  }
  try {
    const datos = await partidoDetalle(id);
    if (datos === null) {
      return jsonResponse(
        404,
        failBody('NO_ENCONTRADO', 'El partido no existe.'),
      );
    }
    return jsonResponse(200, okBody(datos));
  } catch (err) {
    console.error('[api/partidos/:id]', err);
    return jsonResponse(500, failBody('ERROR_INTERNO', 'Error interno del servidor.'));
  }
};

export const ALL = allSoloGet;
