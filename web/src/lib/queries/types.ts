// src/lib/queries/types.ts
//
// Tipos compartidos por los módulos de consulta y consumidos por páginas y
// API JSON (A9: una sola fuente de verdad). Mantenerlos en `snake_case` para
// que la API no necesite transformar nombres.
export interface Posicion {
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

export interface EquipoRef {
  equipo_id: number;
  nombre: string;
}

export interface EstadioResumen {
  estadio_id: number;
  nombre: string;
}

export interface EstadioDetalle {
  estadio_id: number;
  nombre: string;
  ubicacion: string;
  capacidad: number;
}

export interface Resultado {
  goles_local: number;
  goles_visitante: number;
}

export type EstadoPartido = 'jugado' | 'pendiente';

export interface PartidoCalendario {
  partido_id: number;
  jornada: number;
  fecha: string; // "AAAA-MM-DD"
  hora: string; // constante "15:00" (RN-04)
  local: EquipoRef;
  visitante: EquipoRef;
  estadio: EstadioResumen;
  estado: EstadoPartido;
  resultado: Resultado | null; // null ⇔ pendiente (A4)
}

export interface Goleador {
  jugador_id: number;
  nombre: string;
  equipo_id: number;
  equipo: string;
  goles: number;
}

export interface ArbitroPartido {
  rol: 'P' | 'A1' | 'A2';
  arbitro_id: number;
  nombre: string;
  codigo: string;
}

export interface GolPartido {
  gol_id: number;
  minuto: number | null; // D1 del SDD base
  equipo_id: number;
  jugador: { jugador_id: number; nombre: string };
}

export interface PartidoDetalle {
  partido_id: number;
  jornada: number;
  fecha: string;
  hora: string;
  local: EquipoRef;
  visitante: EquipoRef;
  estadio: EstadioDetalle;
  estado: EstadoPartido;
  resultado: Resultado | null;
  arbitros: ArbitroPartido[]; // orden P, A1, A2 (RP-05)
  goles: GolPartido[]; // orden por gol_id
}

export interface JugadorEquipo {
  jugador_id: number;
  nombre: string;
  fecha_nacimiento: string;
  dorsal: number;
  posicion: string;
}

export interface EquipoDetalle {
  equipo_id: number;
  nombre: string;
  jugadores: JugadorEquipo[]; // 15 jugadores, orden por dorsal
}
