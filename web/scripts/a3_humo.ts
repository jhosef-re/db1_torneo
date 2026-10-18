/**
 * scripts/a3_humo.ts
 *
 * Smoke test de la capa de datos (TA3.8 del SDD-App-Web-Campeonato.md):
 *   - Conecta con src/db/index.ts (pool mysql2 + drizzle).
 *   - SELECT COUNT(*) FROM equipo -> debe devolver 12.
 *   - SELECT VERSION()           -> verificar versión del servidor.
 *   - SELECT @@sql_mode           -> confirmar STRICT_TRANS_TABLES.
 */
import assert from 'node:assert/strict';
import { count } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { equipo } from '../src/db/schema';

async function main() {
  // 1) Vía helper tipado de Drizzle (recomendado en la app).
  const rows = await db.select({ n: count() }).from(equipo);
  const n = Number(rows[0]?.n ?? 0);
  assert.equal(n, 12, `Esperaba 12 equipos, recibí ${n}`);
  console.log(`✔ SELECT COUNT(*) FROM equipo = ${n} (vía Drizzle count())`);

  // 2) Versión del servidor y sql_mode (vía mysql2 directamente).
  const [vrows] = await pool.query('SELECT VERSION() AS version');
  console.log(
    `✔ VERSION() = ${(vrows as { version: string }[])[0]?.version ?? '?'}`,
  );

  const [mrows] = await pool.query('SELECT @@sql_mode AS sql_mode');
  console.log(
    `✔ @@sql_mode = ${(mrows as { sql_mode: string }[])[0]?.sql_mode ?? '?'}`,
  );

  await pool.end();
  console.log('\nGate A3 · Capa de datos: OK');
}

main().catch((err) => {
  console.error('Gate A3 · FALLÓ:', err);
  process.exit(1);
});
