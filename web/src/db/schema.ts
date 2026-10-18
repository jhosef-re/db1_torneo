// src/db/schema.ts
//
// Esquema generado por `drizzle-kit pull` desde `campeonato_futbol`.
// Cumple A2 del SDD-App-Web-Campeonato: el DDL es la fuente de verdad; este
// archivo es de SOLO LECTURA para la app (no se usa drizzle-kit push ni
// generate ni migrate contra la base real).
//
// Notas:
//  - Las columnas DATE están en `mode: 'string'` (A8, R4) para que viajen como
//    "AAAA-MM-DD" sin desfase de zona horaria.
//  - `gol.minuto` es opcional (D1 del SDD base).
//  - FKs reflejan `ON DELETE RESTRICT ON UPDATE RESTRICT` (C5 del SDD base).
//  - En `partido` se usan `relationName` ("partido_localId_..." y
//    "partido_visitante_...") para poder unir la misma tabla `equipo` dos
//    veces en una sola consulta (R6).
import {
  mysqlTable,
  primaryKey,
  unique,
  int,
  varchar,
  check,
  index,
  date,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// arbitro
// -----------------------------------------------------------------------------
export const arbitro = mysqlTable(
  'arbitro',
  {
    arbitroId: int('arbitro_id').notNull(),
    nombre: varchar({ length: 80 }).notNull(),
    codigo: varchar({ length: 8 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.arbitroId], name: 'arbitro_arbitro_id' }),
    unique('uq_arbitro_codigo').on(table.codigo),
  ],
);

// -----------------------------------------------------------------------------
// equipo
// -----------------------------------------------------------------------------
export const equipo = mysqlTable(
  'equipo',
  {
    equipoId: int('equipo_id').notNull(),
    nombre: varchar({ length: 60 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.equipoId], name: 'equipo_equipo_id' }),
    unique('uq_equipo_nombre').on(table.nombre),
  ],
);

// -----------------------------------------------------------------------------
// estadio
// -----------------------------------------------------------------------------
export const estadio = mysqlTable(
  'estadio',
  {
    estadioId: int('estadio_id').notNull(),
    nombre: varchar({ length: 60 }).notNull(),
    ubicacion: varchar({ length: 80 }).notNull(),
    capacidad: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.estadioId], name: 'estadio_estadio_id' }),
    unique('uq_estadio_nombre').on(table.nombre),
    check('ck_estadio_capacidad', sql`(\`capacidad\` > 0)`),
  ],
);

// -----------------------------------------------------------------------------
// gol
// -----------------------------------------------------------------------------
export const gol = mysqlTable(
  'gol',
  {
    golId: int('gol_id').notNull(),
    partidoId: int('partido_id')
      .notNull()
      .references(() => resultado.partidoId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    jugadorId: int('jugador_id')
      .notNull()
      .references(() => jugador.jugadorId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    minuto: int(),
  },
  (table) => [
    index('idx_gol_jugador').on(table.jugadorId),
    index('idx_gol_partido').on(table.partidoId),
    primaryKey({ columns: [table.golId], name: 'gol_gol_id' }),
    check(
      'ck_gol_minuto',
      sql`((\`minuto\` is null) or (\`minuto\` between 1 and 120))`,
    ),
  ],
);

// -----------------------------------------------------------------------------
// jornada
// -----------------------------------------------------------------------------
export const jornada = mysqlTable(
  'jornada',
  {
    numero: int().notNull(),
    dia: date({ mode: 'string' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.numero], name: 'jornada_numero' }),
    unique('uq_jornada_dia').on(table.dia),
    check('ck_jornada_numero', sql`(\`numero\` between 1 and 22)`),
  ],
);

// -----------------------------------------------------------------------------
// jugador
// -----------------------------------------------------------------------------
export const jugador = mysqlTable(
  'jugador',
  {
    jugadorId: int('jugador_id').notNull(),
    equipoId: int('equipo_id')
      .notNull()
      .references(() => equipo.equipoId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    nombre: varchar({ length: 80 }).notNull(),
    fechaNacimiento: date('fecha_nacimiento', { mode: 'string' }).notNull(),
    dorsal: int().notNull(),
    posicion: varchar({ length: 3 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.jugadorId], name: 'jugador_jugador_id' }),
    unique('uq_jugador_equipo_dorsal').on(table.equipoId, table.dorsal),
    check('ck_jugador_dorsal', sql`(\`dorsal\` between 1 and 99)`),
    check(
      'ck_jugador_posicion',
      sql`(\`posicion\` in (_utf8mb4'POR',_utf8mb4'DEF',_utf8mb4'MED',_utf8mb4'DEL'))`,
    ),
    check(
      'ck_jugador_nacimiento',
      sql`(\`fecha_nacimiento\` < _utf8mb4'2026-08-01')`,
    ),
  ],
);

// -----------------------------------------------------------------------------
// partido
// -----------------------------------------------------------------------------
export const partido = mysqlTable(
  'partido',
  {
    partidoId: int('partido_id').notNull(),
    jornadaNumero: int('jornada_numero')
      .notNull()
      .references(() => jornada.numero),
    localId: int('local_id')
      .notNull()
      .references(() => equipo.equipoId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    visitanteId: int('visitante_id')
      .notNull()
      .references(() => equipo.equipoId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    estadioId: int('estadio_id')
      .notNull()
      .references(() => estadio.estadioId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
  },
  (table) => [
    index('idx_partido_estadio').on(table.estadioId),
    index('idx_partido_visitante').on(table.visitanteId),
    primaryKey({ columns: [table.partidoId], name: 'partido_partido_id' }),
    unique('uq_partido_jornada_estadio').on(
      table.jornadaNumero,
      table.estadioId,
    ),
    unique('uq_partido_jornada_local').on(table.jornadaNumero, table.localId),
    unique('uq_partido_jornada_visitante').on(
      table.jornadaNumero,
      table.visitanteId,
    ),
    unique('uq_partido_pareja').on(table.localId, table.visitanteId),
    check(
      'ck_partido_local_vs_visitante',
      sql`(\`local_id\` <> \`visitante_id\`)`,
    ),
  ],
);

// -----------------------------------------------------------------------------
// partido_arbitro
// -----------------------------------------------------------------------------
export const partidoArbitro = mysqlTable(
  'partido_arbitro',
  {
    partidoId: int('partido_id')
      .notNull()
      .references(() => partido.partidoId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    rol: varchar({ length: 2 }).notNull(),
    arbitroId: int('arbitro_id')
      .notNull()
      .references(() => arbitro.arbitroId, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
  },
  (table) => [
    index('idx_partido_arbitro_arbitro').on(table.arbitroId),
    primaryKey({
      columns: [table.partidoId, table.rol],
      name: 'partido_arbitro_partido_id_rol',
    }),
    unique('uq_pa_partido_arbitro').on(table.partidoId, table.arbitroId),
    check(
      'ck_pa_rol',
      sql`(\`rol\` in (_utf8mb4'P',_utf8mb4'A1',_utf8mb4'A2'))`,
    ),
  ],
);

// -----------------------------------------------------------------------------
// resultado
// -----------------------------------------------------------------------------
export const resultado = mysqlTable(
  'resultado',
  {
    partidoId: int('partido_id')
      .notNull()
      .references(() => partido.partidoId, { onDelete: 'cascade' }),
    golesLocal: int('goles_local').notNull(),
    golesVisitante: int('goles_visitante').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.partidoId],
      name: 'resultado_partido_id',
    }),
    check('ck_resultado_gol_local', sql`(\`goles_local\` >= 0)`),
    check('ck_resultado_gol_visit', sql`(\`goles_visitante\` >= 0)`),
  ],
);
