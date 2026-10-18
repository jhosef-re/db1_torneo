// scripts/a4_posiciones.ts — prueba del módulo posiciones + paridad vs SQL.
import assert from 'node:assert/strict';
import { compararContraSql, posiciones } from '../src/lib/queries/posiciones';

const posicionesApp = await posiciones();
assert.equal(posicionesApp.length, 12, `recibí ${posicionesApp.length}, esperaba 12`);
for (const p of posicionesApp) {
  assert.equal(p.pj, 8, `equipo ${p.equipo} pj=${p.pj}`);
}
console.log(`✔ 12 equipos, pj=8 cada uno`);
console.log('Top 3:');
for (const p of posicionesApp.slice(0, 3)) {
  console.log(`  ${p.equipo.padEnd(28)} ${p.pj}-${p.pg}-${p.pe}-${p.pp}  GF=${p.gf} GC=${p.gc} DG=${p.dg} pts=${p.puntos}`);
}

const diff = await compararContraSql('/tmp/q12_posiciones.tsv');
assert.equal(diff, '', diff || 'paridad Q12 OK');
console.log('✔ Paridad con la consulta Q12 (SQL puro): OK');
