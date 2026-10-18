// scripts/a4_partido.ts — prueba del módulo partido detalle.
import assert from 'node:assert/strict';
import { partidoDetalle } from '../src/lib/queries/partido';

// 1) Partido jugado (id 1 = Aurora vs Titanes 0-0)
const p1 = await partidoDetalle(1);
assert.ok(p1, 'partido 1 debe existir');
assert.equal(p1?.partido_id, 1);
assert.equal(p1?.estado, 'jugado');
assert.equal(p1?.resultado?.goles_local, 0);
assert.equal(p1?.resultado?.goles_visitante, 0);
assert.equal(p1?.arbitros.length, 3, '3 árbitros (P, A1, A2)');
const roles = p1?.arbitros.map((a) => a.rol).join(',');
assert.equal(roles, 'P,A1,A2', `roles=${roles}, esperaba P,A1,A2`);
console.log(`✔ Partido 1 (jugado): 0-0, 3 árbitros en orden ${roles}`);

// 2) Partido pendiente (jornada 9, primer partido suele ser pendiente):
//    El id concreto lo verificamos por conteo:
const { pool } = await import('../src/db');
const [allIds] = await pool.query(
  'SELECT p.partido_id FROM partido p LEFT JOIN resultado r ON r.partido_id = p.partido_id WHERE r.partido_id IS NULL ORDER BY p.partido_id LIMIT 1',
);
const firstPend = (allIds as { partido_id: number }[])[0]?.partido_id;
if (typeof firstPend === 'number') {
  const pp = await partidoDetalle(firstPend);
  assert.ok(pp);
  assert.equal(pp?.estado, 'pendiente');
  assert.equal(pp?.resultado, null);
  assert.equal(pp?.goles.length, 0);
  assert.equal(pp?.arbitros.length, 3);
  console.log(`✔ Partido ${firstPend} (pendiente): estado=pendiente, resultado=null, goles=[]`);
}

// 3) id inexistente → null
const pn = await partidoDetalle(9999);
assert.equal(pn, null);
console.log('✔ id 9999 → null (NO_ENCONTRADO)');
