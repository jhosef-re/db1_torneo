// scripts/a4_q14.ts — prueba rápida del módulo goleadores.
import assert from 'node:assert/strict';
import { goleadores, totalGoles } from '../src/lib/queries/goleadores';

const datos = await goleadores();
const total = await totalGoles();

assert.equal(datos.length, 180, `Esperaba 180 filas, recibí ${datos.length}`);
assert.equal(total, 137, `Esperaba 137 goles, recibí ${total}`);
const suma = datos.reduce((s, d) => s + d.goles, 0);
assert.equal(suma, 137, `Suma=${suma}`);

console.log(`✔ 180 filas, Σ goles = ${suma}. Top 3:`);
for (const g of datos.slice(0, 3))
  console.log(`  ${g.jugador_id}  ${g.nombre.padEnd(30)}  ${g.equipo}  ${g.goles}`);

process.exit(0);
