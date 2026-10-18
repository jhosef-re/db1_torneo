/**
 * scripts/verificar.ts
 *
 * Verificación de paridad de los módulos de `src/lib/queries/` contra el SDD
 * del proyecto BD (Anexo A y §2.5 del SDD-App-Web-Campeonato.md).
 *
 * Comprobaciones (A4):
 *   - TA4.7: Conteos de §1.3.
 *   - TA4.8: Paridad de V1 con Q12 y V3 con Q14.
 *
 * Uso: `npm run verificar`  (con .env cargado, igual que la app).
 */
import { db, pool } from '../src/db';
import { count } from 'drizzle-orm';
import {
  arbitro,
  equipo,
  estadio,
  gol,
  jugador,
  partido,
  partidoArbitro,
  resultado,
} from '../src/db/schema';
import { posiciones } from '../src/lib/queries/posiciones';
import { goleadores, totalGoles } from '../src/lib/queries/goleadores';
import { calendario, conteosCalendario } from '../src/lib/queries/calendario';

type Check = { id: string; descripcion: string; pasa: boolean; extra?: string };

const checks: Check[] = [];

function check(id: string, desc: string, pasa: boolean, extra?: string) {
  checks.push({ id, descripcion: desc, pasa, extra });
  console.log(`${pasa ? '✔' : '✗'} ${id} — ${desc}${extra ? ' (' + extra + ')' : ''}`);
}

async function main() {
  // 1. Conteos de §1.3 (cada uno como query independiente para error claro).
  const esperado = {
    equipo: 12,
    jornada: 22,
    estadio: 6,
    arbitro: 18,
    jugador: 180,
    partido: 132,
    resultado: 48,
    partido_arbitro: 396,
    gol: 137,
  } as const;

  const n = {
    equipo: Number((await db.select({ n: count() }).from(equipo))[0]?.n ?? 0),
    jornada: 0, // jornada tiene PK en `numero`, COUNT(*) aplicaría:
    // lo hacemos aparte.
    estadio: Number((await db.select({ n: count() }).from(estadio))[0]?.n ?? 0),
    arbitro: Number((await db.select({ n: count() }).from(arbitro))[0]?.n ?? 0),
    jugador: Number((await db.select({ n: count() }).from(jugador))[0]?.n ?? 0),
    partido: Number((await db.select({ n: count() }).from(partido))[0]?.n ?? 0),
    resultado: Number((await db.select({ n: count() }).from(resultado))[0]?.n ?? 0),
    partido_arbitro: Number((await db.select({ n: count() }).from(partidoArbitro))[0]?.n ?? 0),
    gol: Number((await db.select({ n: count() }).from(gol))[0]?.n ?? 0),
  };

  // jornada: SELECT COUNT(*) FROM jornada
  const [jr] = await pool.query('SELECT COUNT(*) AS n FROM jornada');
  n.jornada = Number(((jr as unknown as { n: number }[])[0]?.n ?? 0));

  for (const k of Object.keys(esperado) as (keyof typeof esperado)[]) {
    check(
      `CONTEO ${k}`,
      `${k} = ${n[k]}`,
      n[k] === esperado[k],
      `esperado ${esperado[k]}`,
    );
  }

  // 2. Conciliación Σ goles = filas en `gol` = 137.
  const sumR = await pool.query(
    'SELECT SUM(goles_local) AS a, SUM(goles_visitante) AS b, SUM(goles_local)+SUM(goles_visitante) AS t FROM resultado',
  );
  const sum = (sumR[0] as unknown as { a: number; b: number; t: number }[])[0]!;
  check(
    'GOL Σ',
    `Σ goles = ${sum.t}, filas gol = ${n.gol}`,
    sum.t === n.gol && n.gol === esperado.gol,
  );

  // 3. Calendario (Q03/Q04/Q05) — conteos.
  const cal = await conteosCalendario();
  check(
    'CAL total',
    `132 = ${cal.total}`,
    cal.total === 132,
  );
  check(
    'CAL jugados',
    `48 = ${cal.jugados}`,
    cal.jugados === 48,
  );
  check(
    'CAL pendientes',
    `84 = ${cal.pendientes}`,
    cal.pendientes === 84,
  );

  // 4. Pendientes NUNCA traen resultado (A4 + RP-01).
  const pend = await calendario({ estado: 'pendiente' });
  const ningunoConResultado = pend.every((p) => p.resultado === null);
  check(
    'CAL pend resultado=null',
    `84 pendientes · ${pend.length} cumplen`,
    pend.length === 84 && ningunoConResultado,
  );

  // 5. Posiciones (Q12): 12 equipos, pj=8, mismos primeros 3.
  const pos = await posiciones();
  check(
    'POS 12',
    '12 equipos',
    pos.length === 12,
  );
  for (const p of pos) {
    if (p.pj !== 8) {
      check(
        `POS pj=8 ${p.equipo}`,
        `${p.equipo} pj=${p.pj}`,
        false,
        'esperado 8',
      );
    }
  }
  check(
    'POS pj=8 todos',
    'pj=8 en los 12',
    pos.every((p) => p.pj === 8),
  );

  // Comparar primeros 3 con snapshot TSV.
  const fs = await import('node:fs');
  const snapshot = fs.readFileSync('/tmp/q12_posiciones.tsv', 'utf8').trim().split('\n').slice(1);
  const top3Snap = snapshot.slice(0, 3).map((l) => l.split('\t'));
  const top3App = pos.slice(0, 3);
  let diff = '';
  for (let i = 0; i < 3; i++) {
    const cols = top3Snap[i]!;
    const [eid, enom, , , , , , , , eptos] = cols; // col 0=equipo_id, 1=nombre, 9=puntos
    const r = top3App[i]!;
    if (
      Number(eid) !== r.equipo_id ||
      String(enom) !== r.equipo ||
      Number(eptos) !== r.puntos
    ) {
      diff = `fila ${i} difiere: snap=${eid}|${enom}|${eptos} app=${r.equipo_id}|${r.equipo}|${r.puntos}`;
      break;
    }
  }
  check('POS top-3 ↔ Q12', 'Top 3 coincide con snapshot SQL', diff === '', diff);

  // 6. Goleadores (Q14): 180, Σ 137.
  const go = await goleadores();
  check('GOLEADORES 180', `180 = ${go.length}`, go.length === 180);
  const sumGo = go.reduce((s, d) => s + d.goles, 0);
  check('GOLEADORES Σ 137', `Σ = ${sumGo}`, sumGo === 137);
  // Mismas primeras 3 filas que el snapshot.
  const snapQ14 = fs.readFileSync('/tmp/q14_goleadores.tsv', 'utf8').trim().split('\n').slice(1);
  const top3Q14 = snapQ14.slice(0, 3).map((l) => l.split('\t'));
  const top3Go = go.slice(0, 3);
  diff = '';
  for (let i = 0; i < 3; i++) {
    const cols = top3Q14[i]!;
    const [jid, jnom, , jgoles] = cols; // 0=jugador_id, 1=nombre, 3=goles
    const r = top3Go[i]!;
    if (Number(jid) !== r.jugador_id || String(jnom) !== r.nombre || Number(jgoles) !== r.goles) {
      diff = `fila ${i} difiere: snap=${jid}|${jnom}|${jgoles} app=${r.jugador_id}|${r.nombre}|${r.goles}`;
      break;
    }
  }
  check('GOLEADORES top-3 ↔ Q14', 'Top 3 coincide con snapshot SQL', diff === '', diff);

  // 7. totalGoles() = 137 (segunda fuente de Σ).
  const tg = await totalGoles();
  check('GOLEADORES totalGoles 137', `${tg}`, tg === 137);

  // Resumen.
  const pasaron = checks.filter((c) => c.pasa).length;
  const fallaron = checks.length - pasaron;
  console.log('\n──────────────────────────────────────────────');
  console.log(`Resumen · pasaron ${pasaron} / ${checks.length}`);
  if (fallaron > 0) {
    console.log(`FALLARON ${fallaron}:`);
    for (const c of checks.filter((c) => !c.pasa)) {
      console.log(`  - ${c.id}: ${c.descripcion} ${c.extra ?? ''}`);
    }
    await pool.end();
    process.exit(1);
  }
  console.log('Gate A4 · Consultas y paridad: OK');
  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('verificar.ts: error:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
