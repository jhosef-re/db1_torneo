// src/pages/api/salud.ts
// GET /api/salud — 200 si la base responde; 503 si no.
//
// El pool mysql2 en src/db/index.ts queda vivo entre peticiones; se cierra
// automáticamente al apagar el proceso Node (Astro SSR).
import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  jsonResponse,
  okBody,
  failBody,
} from '../../lib/api';
import { allSoloGet } from '../../lib/handlers';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return jsonResponse(200, okBody({ ok: true, ts: new Date().toISOString() }));
  } catch (err) {
    console.error('[api/salud]', err);
    return jsonResponse(
      503,
      failBody('BASE_NO_DISPONIBLE', 'La base de datos no está disponible.'),
    );
  }
};

export const ALL = allSoloGet;

