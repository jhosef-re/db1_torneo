// src/pages/api/calendario.ts
// GET /api/calendario — Q03/Q04/Q05 con filtros validados.
import type { APIRoute } from 'astro';
import { calendario } from '../../lib/queries/calendario';
import {
  jsonResponse,
  okBody,
  failBody,
  jornadaValida,
  estadoValido,
} from '../../lib/api';
import { allSoloGet } from '../../lib/handlers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  // Parametros desconocidos se ignoran (DA5 + §1.8).
  const jornadaRaw = url.searchParams.get('jornada');
  const estadoRaw = url.searchParams.get('estado');

  const filtros: { jornada?: number; estado?: 'jugado' | 'pendiente' } = {};

  if (jornadaRaw !== null) {
    const [jornada, msg] = jornadaValida(jornadaRaw);
    if (jornada === null) {
      return jsonResponse(400, failBody('PARAMETRO_INVALIDO', msg));
    }
    filtros.jornada = jornada;
  }

  if (estadoRaw !== null) {
    const [estado, msg] = estadoValido(estadoRaw);
    if (estado === null && estadoRaw !== '') {
      // sólo fallamos si el param fue explícito e inválido
      return jsonResponse(400, failBody('PARAMETRO_INVALIDO', msg));
    }
    if (estado) filtros.estado = estado;
  }

  try {
    const datos = await calendario(filtros);
    return jsonResponse(200, okBody(datos, datos.length));
  } catch (err) {
    console.error('[api/calendario]', err);
    return jsonResponse(500, failBody('ERROR_INTERNO', 'Error interno del servidor.'));
  }
};

export const ALL = allSoloGet;
