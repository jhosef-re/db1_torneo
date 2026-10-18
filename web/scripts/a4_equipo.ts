// scripts/a4_equipo.ts
import assert from 'node:assert/strict';
import { equipoDetalle } from '../src/lib/queries/equipo';
const det = await equipoDetalle(1);
assert.ok(det, 'Aurora FC (id=1) debe existir');
assert.equal(det?.nombre, 'Aurora FC');
assert.equal(det?.jugadores.length, 15, '15 jugadores por equipo');
console.log(`✔ Aurora FC: 15 jugadores, dorsales ${det?.jugadores[0]?.dorsal}-${det?.jugadores[14]?.dorsal}`);
const no = await equipoDetalle(9999);
assert.equal(no, null);
console.log('✔ id 9999 → null');
