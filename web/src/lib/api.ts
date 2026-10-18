// src/lib/api.ts
//
// Helpers para endpoints Astro en /api (A5 del SDD-App-Web-Campeonato.md).
//   - ok(datos, total?)        -> 200 con { total?, datos } en JSON
//   - fail(estado, codigo, msg) -> 4xx/5xx con { error: { codigo, mensaje } }
//   - Validaciones: enteroPositivo, jornadaValida, estadoValido
//   - Cabeceras: Cache-Control, Content-Type, no exponer detalles internos.
import type { APIContext } from 'astro';

export interface ErrorBody {
  error: { codigo: string; mensaje: string };
}

export const CHARSET = 'utf-8';

const okHeaders = {
  'Content-Type': `application/json; charset=${CHARSET}`,
  'Cache-Control': 'public, max-age=60',
};

const errHeaders = {
  'Content-Type': `application/json; charset=${CHARSET}`,
  'Cache-Control': 'no-store',
};

export type ApiOkBody<T> = { total?: number; datos: T };
export type ApiOk<T> = { status: 200; body: ApiOkBody<T> };

export function okBody<T>(datos: T, total?: number): ApiOkBody<T> {
  return typeof total === 'number' ? { total, datos } : { datos };
}

export function failBody(codigo: string, mensaje: string): ErrorBody {
  return { error: { codigo, mensaje } };
}

/** Envuelve el Response estándar para Astro. */
export function jsonResponse(
  status: 200 | 400 | 404 | 405 | 500 | 503,
  body: unknown,
  extra?: Record<string, string>,
): Response {
  const base = status === 200 ? okHeaders : errHeaders;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...base, ...(extra ?? {}) },
  });
}

// -----------------------------------------------------------------------------
// Validaciones
// -----------------------------------------------------------------------------

/** `parseInt` con fallback a `null` si no es entero positivo. */
export function enteroPositivo(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export type ErrorCodigo =
  | 'PARAMETRO_INVALIDO'
  | 'NO_ENCONTRADO'
  | 'METODO_NO_PERMITIDO'
  | 'ERROR_INTERNO'
  | 'BASE_NO_DISPONIBLE';

const MENSAJES: Record<ErrorCodigo, string> = {
  PARAMETRO_INVALIDO: 'Algún parámetro de la consulta no es válido.',
  NO_ENCONTRADO: 'Recurso no encontrado.',
  METODO_NO_PERMITIDO: 'Método no permitido. Use GET.',
  ERROR_INTERNO: 'Error interno del servidor.',
  BASE_NO_DISPONIBLE: 'La base de datos no está disponible.',
};

/** Devuelve `[numero, mensaje]` si es válida (1..22), si no `[null, mensaje]`. */
export function jornadaValida(
  raw: string | null | undefined,
): [number, string] | [null, string] {
  const n = enteroPositivo(raw ?? null);
  if (n === null) return [null, 'La jornada debe ser un entero positivo.'];
  if (n < 1 || n > 22) return [null, 'La jornada debe estar entre 1 y 22.'];
  return [n, ''];
}

export type EstadoValido = 'jugado' | 'pendiente' | null;

export function estadoValido(
  raw: string | null | undefined,
): [EstadoValido, string] {
  if (raw === undefined || raw === null || raw === '') return [null, ''];
  if (raw === 'jugado' || raw === 'pendiente') return [raw, ''];
  return [null, 'El estado debe ser "jugado" o "pendiente".'];
}

// -----------------------------------------------------------------------------
// Helpers de método y respuesta
// -----------------------------------------------------------------------------

/**
 * Si el método es distinto de GET, responde 405 con `Allow: GET`.
 * Devuelve `null` cuando el método es GET (sigue).
 */
export function rechazaSiNoEsGet(ctx: APIContext): Response | null {
  if (ctx.request.method === 'GET') return null;
  return jsonResponse(
    405,
    failBody('METODO_NO_PERMITIDO', MENSAJES.METODO_NO_PERMITIDO),
    { Allow: 'GET' },
  );
}

/** Envoltorio seguro para ejecutar un handler y responder 500 genérico. */
export async function responder<T>(
  handler: () => Promise<{ status: 200 | 404; body: T | ErrorBody }>,
  logPrefix: string,
): Promise<Response> {
  try {
    const r = await handler();
    return jsonResponse(r.status as 200 | 404, r.body);
  } catch (err) {
    console.error(`[${logPrefix}]`, err);
    return jsonResponse(500, failBody('ERROR_INTERNO', MENSAJES.ERROR_INTERNO));
  }
}
