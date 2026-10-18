// src/lib/formato.ts
//
// Helpers de presentación. Concentran los detalles de RP-01..RP-07:
//   - marcador "local 2 – 1 visitante" o "Pendiente"
//   - fechas DD/MM/AAAA (RP-03)
//   - hora constante "15:00" (RN-04 / RP-02)
import type { EstadoPartido, Resultado } from './queries/types';

const HORA = '15:00';
export const horaConstante = (): string => HORA;

/** Devuelve la fecha en formato corto "DD/MM/AAAA" (RP-03). */
export function fechaCorta(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  if (!yyyy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yyyy}`;
}

/** Etiqueta humanamente legible del estado (RP-01 + A4). */
export function etiquetaEstado(resultado: Resultado | null): EstadoPartido {
  return resultado === null ? 'pendiente' : 'jugado';
}

/**
 * Etiqueta para un partido.
 *   - "Pendiente" si no hay resultado (NUNCA "0–0", A4).
 *   - "2 – 1" si hay resultado.
 */
export function etiquetaMarcador(resultado: Resultado | null): string {
  if (resultado === null) return 'Pendiente';
  return `${resultado.goles_local} – ${resultado.goles_visitante}`;
}
