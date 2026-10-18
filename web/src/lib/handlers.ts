// src/lib/handlers.ts
//
// Helper reutilizable para endpoints de /api.
// Astro invoca `ALL` cuando el método no coincide con GET; devolvemos 405.
import type { APIRoute } from 'astro';
import { jsonResponse, failBody } from './api';

export const allSoloGet: APIRoute = () =>
  jsonResponse(
    405,
    failBody('METODO_NO_PERMITIDO', 'Método no permitido. Use GET.'),
    { Allow: 'GET' },
  );
