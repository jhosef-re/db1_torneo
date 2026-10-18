// src/db/relations.ts
//
// Definiciones de relaciones para Drizzle (helpers "with").
// Para los alias doble local/visitante en `partido` se usa `alias(equipo, 'local')`
// de `drizzle-orm/mysql-core` directamente en cada consulta, NO relationName
// (porque la app corre con `mode: 'default'`).
import { relations } from 'drizzle-orm/relations';
import {
  arbitro,
  equipo,
  estadio,
  gol,
  jornada,
  jugador,
  partido,
  partidoArbitro,
  resultado,
} from './schema';

export const golRelations = relations(gol, ({ one }) => ({
  jugador: one(jugador, {
    fields: [gol.jugadorId],
    references: [jugador.jugadorId],
  }),
  resultado: one(resultado, {
    fields: [gol.partidoId],
    references: [resultado.partidoId],
  }),
}));

export const jugadorRelations = relations(jugador, ({ one, many }) => ({
  equipo: one(equipo, {
    fields: [jugador.equipoId],
    references: [equipo.equipoId],
  }),
  gols: many(gol),
}));

export const resultadoRelations = relations(resultado, ({ one, many }) => ({
  partido: one(partido, {
    fields: [resultado.partidoId],
    references: [partido.partidoId],
  }),
  gols: many(gol),
}));

export const equipoRelations = relations(equipo, ({ many }) => ({
  jugadors: many(jugador),
}));

export const partidoRelations = relations(partido, ({ one, many }) => ({
  estadio: one(estadio, {
    fields: [partido.estadioId],
    references: [estadio.estadioId],
  }),
  jornada: one(jornada, {
    fields: [partido.jornadaNumero],
    references: [jornada.numero],
  }),
  partidoArbitros: many(partidoArbitro),
  resultados: many(resultado),
}));

export const estadioRelations = relations(estadio, ({ many }) => ({
  partidos: many(partido),
}));

export const jornadaRelations = relations(jornada, ({ many }) => ({
  partidos: many(partido),
}));

export const partidoArbitroRelations = relations(partidoArbitro, ({ one }) => ({
  partido: one(partido, {
    fields: [partidoArbitro.partidoId],
    references: [partido.partidoId],
  }),
  arbitro: one(arbitro, {
    fields: [partidoArbitro.arbitroId],
    references: [arbitro.arbitroId],
  }),
}));

export const arbitroRelations = relations(arbitro, ({ many }) => ({
  partidoArbitros: many(partidoArbitro),
}));
