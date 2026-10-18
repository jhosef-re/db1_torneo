// src/lib/queries/calendario.ts
//
// Q03 / Q04 / Q05: Calendario completo + filtros por jornada y estado.
//   - 132 partidos en total; 48 jugados; 84 pendientes.
//   - Pendiente = sin fila en `resultado` (A4 + C6 del SDD base). NUNCA 0–0.
//   - Filtros: `jornada` ∈ [1..22] (ignorar si fuera de rango en páginas) y
//     `estado` ∈ {"jugado","pendiente"}.
import { and, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '../../db';
import { equipo, estadio, jornada, partido, resultado } from '../../db/schema';
import type { EstadoPartido, PartidoCalendario } from './types';

const local = alias(equipo, 'local');
const visitante = alias(equipo, 'visitante');

export interface CalendarioFiltros {
  jornada?: number;       // 1..22 (opcional)
  estado?: EstadoPartido; // "jugado" | "pendiente" (opcional)
}

export async function calendario(
  filtros: CalendarioFiltros = {},
): Promise<PartidoCalendario[]> {
  // Predicados dinámicos para filtros (AND).
  const condiciones = [] as Array<ReturnType<typeof eq>>;
  if (typeof filtros.jornada === 'number') {
    condiciones.push(eq(partido.jornadaNumero, filtros.jornada));
  }
  if (filtros.estado === 'pendiente') {
    condiciones.push(isNull(resultado.partidoId));
  } else if (filtros.estado === 'jugado') {
    // is not null
    condiciones.push(sql`${resultado.partidoId} IS NOT NULL` as never);
  }

  const rows = await db
    .select({
      partidoId: partido.partidoId,
      jornada: partido.jornadaNumero,
      fecha: jornada.dia,
      localId: partido.localId,
      localNombre: local.nombre,
      visitanteId: partido.visitanteId,
      visitanteNombre: visitante.nombre,
      estadioId: partido.estadioId,
      estadioNombre: estadio.nombre,
      golesLocal: resultado.golesLocal,
      golesVisitante: resultado.golesVisitante,
    })
    .from(partido)
    .innerJoin(jornada, eq(jornada.numero, partido.jornadaNumero))
    .innerJoin(local, eq(local.equipoId, partido.localId))
    .innerJoin(visitante, eq(visitante.equipoId, partido.visitanteId))
    .innerJoin(estadio, eq(estadio.estadioId, partido.estadioId))
    .leftJoin(resultado, eq(resultado.partidoId, partido.partidoId))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(partido.jornadaNumero, partido.partidoId);

  return rows.map((r) => {
    const tieneResultado = r.golesLocal !== null && r.golesVisitante !== null;
    return {
      partido_id: r.partidoId,
      jornada: r.jornada,
      fecha: r.fecha,
      hora: '15:00', // RN-04: constante (RP-02)
      local: { equipo_id: r.localId, nombre: r.localNombre },
      visitante: { equipo_id: r.visitanteId, nombre: r.visitanteNombre },
      estadio: { estadio_id: r.estadioId, nombre: r.estadioNombre },
      estado: (tieneResultado ? 'jugado' : 'pendiente') as EstadoPartido,
      resultado: tieneResultado
        ? { goles_local: Number(r.golesLocal), goles_visitante: Number(r.golesVisitante) }
        : null,
    } satisfies PartidoCalendario;
  });
}

/** Conteos para `verificar.ts`: { total, jugados, pendientes }. */
export async function conteosCalendario(): Promise<{
  total: number;
  jugados: number;
  pendientes: number;
}> {
  const [all] = await db.execute(
    sql`SELECT COUNT(*) AS n FROM partido`,
  );
  const [j] = await db.execute(
    sql`SELECT COUNT(*) AS n FROM partido p JOIN resultado r ON r.partido_id = p.partido_id`,
  );
  const [p] = await db.execute(
    sql`SELECT COUNT(*) AS n FROM partido p LEFT JOIN resultado r ON r.partido_id = p.partido_id WHERE r.partido_id IS NULL`,
  );
  return {
    total: Number(((all as unknown) as { n?: number }[])[0]?.n ?? 0),
    jugados: Number(((j as unknown) as { n?: number }[])[0]?.n ?? 0),
    pendientes: Number(((p as unknown) as { n?: number }[])[0]?.n ?? 0),
  };
}
