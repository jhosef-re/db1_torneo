// scripts/a4_calendario.ts — prueba rápida del módulo calendario.
import assert from 'node:assert/strict';
import { calendario, conteosCalendario } from '../src/lib/queries/calendario';

const c = await conteosCalendario();
assert.equal(c.total, 132, `total=${c.total}, esperaba 132`);
assert.equal(c.jugados, 48, `jugados=${c.jugados}, esperaba 48`);
assert.equal(c.pendientes, 84, `pendientes=${c.pendientes}, esperaba 84`);
console.log(`✔ Calendario (sin filtros): ${c.total} = ${c.jugados} jugados + ${c.pendientes} pendientes`);

const all = await calendario();
assert.equal(all.length, 132, `recibí ${all.length}, esperaba 132`);

// Partidos pendientes deben traer resultado === null (A4)
const pend = await calendario({ estado: 'pendiente' });
assert.equal(pend.length, 84);
for (const p of pend) {
  assert.equal(p.estado, 'pendiente');
  assert.equal(p.resultado, null, `pendiente ${p.partido_id} no debe traer resultado`);
}
console.log(`✔ Filtro estado=pendiente: ${pend.length} filas, todas con resultado=null`);

const jugados = await calendario({ estado: 'jugado' });
assert.equal(jugados.length, 48);
for (const p of jugados) {
  assert.equal(p.estado, 'jugado');
  assert.ok(p.resultado, `jugado ${p.partido_id} debe traer resultado`);
}
console.log(`✔ Filtro estado=jugado: ${jugados.length} filas, todas con resultado!=null`);

const j3 = await calendario({ jornada: 3 });
assert.equal(j3.length, 6, `jornada 3=${j3.length}, esperaba 6`);
const jornadasSet = new Set(j3.map(p => p.jornada));
assert.equal(jornadasSet.size, 1, 'todas las filas deben ser de la jornada 3');
console.log(`✔ Filtro jornada=3: ${j3.length} filas`);

// Muestra un partido
const first = all[0];
console.log('Primero:', {
  id: first.partido_id,
  jornada: first.jornada,
  fecha: first.fecha,
  local: first.local.nombre,
  visitante: first.visitante.nombre,
  estado: first.estado,
  resultado: first.resultado,
});
