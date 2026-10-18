/**
 * scripts/a1_aislamiento.ts
 *
 * Prueba de aislamiento del usuario de la app:
 *   - app_campeonato@127.0.0.1 debe tener SELECT (12 equipos).
 *   - app_campeonato@127.0.0.1 NO debe tener INSERT/UPDATE/DELETE.
 *
 * Conexión solo-lectura desde src/db/index.ts en producción; aquí usamos
 * createPool para ser fiel al patrón que usará la app.
 */
import 'dotenv/config';
import { createPool } from 'mysql2/promise';
import assert from 'node:assert/strict';

const url = process.env.DATABASE_URL;
assert(url, 'Falta DATABASE_URL en .env');

const pool = createPool({ uri: url, connectionLimit: 2 });

async function main() {
  // 1) SELECT debe funcionar y devolver 12 equipos.
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM equipo');
  const n = Number((rows as { n: number | string }[])[0].n);
  assert.equal(n, 12, `Esperaba 12 equipos, recibí ${n}`);
  console.log(`✔ SELECT  COUNT(*) FROM equipo = ${n}`);

  // 2) INSERT/UPDATE/DELETE deben ser rechazados con código 1142.
  for (const sql of [
    "INSERT INTO equipo VALUES (999, 'TEST')",
    "UPDATE equipo SET nombre='X' WHERE equipo_id=1",
    "DELETE FROM equipo WHERE equipo_id=1",
  ]) {
    let codigo: number | null = null;
    try {
      await pool.query(sql);
      assert.fail(`El usuario de la app NO debería poder ejecutar: ${sql}`);
    } catch (err) {
      codigo = (err as { errno?: number }).errno ?? null;
      assert.equal(codigo, 1142, `Esperaba errno 1142, recibí ${codigo} para: ${sql}`);
      console.log(`✔ DENEGADO  (errno 1142): ${sql}`);
    }
  }

  await pool.end();
  console.log('\nGate A1 · Aislamiento del usuario de la app: OK');
}

main().catch((err) => {
  console.error('Gate A1 · FALLÓ:', err);
  process.exit(1);
});
