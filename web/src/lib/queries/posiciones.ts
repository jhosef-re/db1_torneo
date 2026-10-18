// src/lib/queries/posiciones.ts
//
// Q12: Tabla de posiciones.
//
// Estrategia: UNION ALL de la perspectiva local y visitante sobre partidos
// con resultado; cada fila agrega PG/PE/PP y GF/GC; los puntos son
// pg*3 + pe. Solo partidos con resultado (los pendientes no suman puntos
// ni PJ) -> Anexo A del SDD.
//
// Orden: puntos DESC, dg DESC, gf DESC, nombre ASC (RP-04).
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import type { Posicion } from './types';

interface RowPos {
  equipo_id: number;
  equipo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
}

export async function posiciones(): Promise<Posicion[]> {
  // Drizzle/mysql2: componemos el CTE con sql raw dentro de un SELECT principal.
  // Mantenemos snake_case en columnas para que el mapeo final sea directo.
  // `db.execute` de mysql2 devuelve [rows, fields]; nos quedamos con rows.
  const executed = await db.execute<RowPos[]>(
    sql`
      WITH per_team AS (
        SELECT  p.local_id AS equipo_id,
                CASE WHEN r.goles_local > r.goles_visitante THEN 1 ELSE 0 END AS pg,
                CASE WHEN r.goles_local = r.goles_visitante THEN 1 ELSE 0 END AS pe,
                CASE WHEN r.goles_local < r.goles_visitante THEN 1 ELSE 0 END AS pp,
                r.goles_local     AS gf,
                r.goles_visitante AS gc
        FROM   partido p
        JOIN   resultado r ON r.partido_id = p.partido_id
        UNION ALL
        SELECT  p.visitante_id,
                CASE WHEN r.goles_visitante > r.goles_local THEN 1 ELSE 0 END,
                CASE WHEN r.goles_visitante = r.goles_local THEN 1 ELSE 0 END,
                CASE WHEN r.goles_visitante < r.goles_local THEN 1 ELSE 0 END,
                r.goles_visitante,
                r.goles_local
        FROM   partido p
        JOIN   resultado r ON r.partido_id = p.partido_id
      ),
      agg AS (
        SELECT  equipo_id,
                COUNT(*)            AS pj,
                SUM(pg)             AS pg,
                SUM(pe)             AS pe,
                SUM(pp)             AS pp,
                SUM(gf)             AS gf,
                SUM(gc)             AS gc,
                SUM(gf) - SUM(gc)   AS dg,
                SUM(pg)*3 + SUM(pe) AS puntos
        FROM   per_team
        GROUP  BY equipo_id
      )
      SELECT e.equipo_id          AS equipo_id,
             e.nombre             AS equipo,
             COALESCE(a.pj,     0) AS pj,
             COALESCE(a.pg,     0) AS pg,
             COALESCE(a.pe,     0) AS pe,
             COALESCE(a.pp,     0) AS pp,
             COALESCE(a.gf,     0) AS gf,
             COALESCE(a.gc,     0) AS gc,
             COALESCE(a.dg,     0) AS dg,
             COALESCE(a.puntos, 0) AS puntos
      FROM   equipo e
      LEFT JOIN agg a ON a.equipo_id = e.equipo_id
      ORDER  BY puntos DESC, dg DESC, gf DESC, e.nombre ASC
    `,
  );
  const rows = Array.isArray(executed) ? executed[0] : executed;

  const data: Posicion[] = (rows as unknown as RowPos[]).map((r) => ({
    equipo_id: Number(r.equipo_id ?? 0),
    equipo: String(r.equipo ?? ''),
    pj: Number(r.pj ?? 0),
    pg: Number(r.pg ?? 0),
    pe: Number(r.pe ?? 0),
    pp: Number(r.pp ?? 0),
    gf: Number(r.gf ?? 0),
    gc: Number(r.gc ?? 0),
    dg: Number(r.dg ?? 0),
    puntos: Number(r.puntos ?? 0),
  }));

  // Sanity: cada equipo con pj=8 (48 jugados / 12 equipos * 2 filas por partido
  // LOCAL+VISITANTE → 8 apariciones por equipo). Los pendientes no se cuentan.
  for (const p of data) {
    if (p.pj !== 8) {
      throw new Error(
        `Posiciones inconsistentes: equipo ${p.equipo_id} tiene pj=${p.pj}, esperaba 8`,
      );
    }
    if (p.pg + p.pe + p.pp !== p.pj) {
      throw new Error(`Posiciones inconsistentes: ${p.equipo} pg+pe+pp ≠ pj`);
    }
    if (p.dg !== p.gf - p.gc) {
      throw new Error(`Posiciones inconsistentes: ${p.equipo} dg ≠ gf-gc`);
    }
    if (p.puntos !== p.pg * 3 + p.pe) {
      throw new Error(`Posiciones inconsistentes: ${p.equipo} puntos ≠ pg*3+pe`);
    }
  }

  return data;
}

/** Compara contra el snapshot puro MySQL guardado en /tmp por el script de
 * verificación cruzada. Si todo cuadra, devuelve ""; si no, la primera fila
 * diferente. */
export async function compararContraSql(referencePath: string): Promise<string> {
  const esperados = (
    await import('node:fs').then((fs) => fs.readFileSync(referencePath, 'utf8'))
  )
    .trim()
    .split('\n')
    .slice(1) // quita la cabecera
    .map((l) => l.split('\t'));

  const reales = await posiciones();

  if (esperados.length !== reales.length) {
    return `Filas difieren: esperado=${esperados.length}, real=${reales.length}`;
  }
  for (let i = 0; i < esperados.length; i++) {
    const [eid, enom, epj, epg, epe, epp, egf, egc, edg, eptos] = esperados[i]!;
    const r = reales[i]!;
    const esperado = [
      Number(eid),
      String(enom),
      Number(epj),
      Number(epg),
      Number(epe),
      Number(epp),
      Number(egf),
      Number(egc),
      Number(edg),
      Number(eptos),
    ];
    const real = [
      r.equipo_id,
      r.equipo,
      r.pj,
      r.pg,
      r.pe,
      r.pp,
      r.gf,
      r.gc,
      r.dg,
      r.puntos,
    ];
    for (let j = 0; j < real.length; j++) {
      if (real[j] !== esperado[j]) {
        return `Fila ${i} col ${j} difiere: esperado=${esperado[j]} real=${real[j]}`;
      }
    }
  }
  return '';
}
