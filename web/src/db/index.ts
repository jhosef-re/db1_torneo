// src/db/index.ts
//
// Conexión a MySQL usada por TODA la app.
//
// Cumple:
//   - A1 / A8: usuario `app_campeonato@127.0.0.1` con solo SELECT.
//   - §2.4 del SDD:
//       * createPool compartido por todas las páginas/API.
//       * Host 127.0.0.1 (no 'localhost', R5).
//       * mode: 'default' del adapter mysql2 de Drizzle (compatible con el
//         tipo de consultas usadas en Q01–Q14).
//   - A9: misma instancia exportada que usan los módulos de `src/lib/queries/`,
//     garantizando que páginas y API comparten lógica.
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import * as schema from './schema';
import * as relations from './relations';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('Falta DATABASE_URL en el entorno. Revisa web/.env.example.');
}

export const pool: Pool = createPool({
  uri: url,
  connectionLimit: 10,
  waitForConnections: true,
  // mysql2 devuelve COUNT/SUM como string por defecto; lo arreglamos en cada
  // consulta con `.mapWith(Number)` (A8 / R3).
  decimalNumbers: true,
  // Fechas como texto para conservar el formato "AAAA-MM-DD" (A8 / R4).
  dateStrings: true,
});

export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
  mode: 'default',
});

export type DB = typeof db;
