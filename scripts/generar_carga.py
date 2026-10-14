#!/usr/bin/env python3
"""
generar_carga.py
================
Lee `Proyecto-2026-Carga.txt` (codificado en cp1252 con saltos CRLF), limpia
los datos y genera `sql/02_carga.sql` con los INSERT listos para ejecutarse
en MySQL con `SET NAMES utf8mb4` y `FOREIGN_KEY_CHECKS=1`.

Cumple la decisión D4 del SDD:
- Codificación: lee cp1252, escribe UTF-8.
- Ignora comentarios `-- SECCIÓN` y líneas vacías.
- Aplica `trim` y quita comas finales heterogéneas.
- Inserta IDs explícitos (D2), sin AUTO_INCREMENT ni SP MAX+1.
- En `gol` usa (gol_id, partido_id, jugador_id, minuto) (D1).
- Orden de inserción por dependencias (Nivel 0 → 3, §2.2 del SDD).

Uso:
    python3 scripts/generar_carga.py \
        [--input Proyecto-2026-Carga.txt] \
        [--output sql/02_carga.sql]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

# --------------------------------------------------------------------------- #
# Configuración: orden, columnas por sección                                  #
# --------------------------------------------------------------------------- #

# Orden de inserción (Nivel 0 → 3) según §2.2 del SDD
INSERT_ORDER = [
    "EQUIPOS",
    "JORNADAS",
    "ESTADIOS",
    "ARBITROS",
    "JUGADOR",
    "PARTIDO",
    "RESULTADO",
    "PARTIDO_ARBITRO",
    "GOL",
]

# (tabla_sql, columnas_sql) por sección
SECTION_TO_TABLE = {
    "EQUIPOS":         ("equipo",         "equipo_id, nombre"),
    "JORNADAS":        ("jornada",        "numero, dia"),
    "ESTADIOS":        ("estadio",        "estadio_id, nombre, ubicacion, capacidad"),
    "ARBITROS":        ("arbitro",        "arbitro_id, nombre, codigo"),
    "JUGADOR":         ("jugador",        "jugador_id, equipo_id, nombre, fecha_nacimiento, dorsal, posicion"),
    "PARTIDO":         ("partido",        "partido_id, jornada_numero, local_id, visitante_id, estadio_id"),
    "RESULTADO":       ("resultado",      "partido_id, goles_local, goles_visitante"),
    "PARTIDO_ARBITRO": ("partido_arbitro","partido_id, arbitro_id, rol"),
    "GOL":             ("gol",            "gol_id, partido_id, jugador_id, minuto"),
}

# Columnas no-string para validación de formato básico
INT_COLUMNS = {
    ("equipo",         "equipo_id"),
    ("jornada",        "numero"),
    ("estadio",        "estadio_id"),
    ("estadio",        "capacidad"),
    ("arbitro",        "arbitro_id"),
    ("jugador",        "jugador_id"),
    ("jugador",        "equipo_id"),
    ("jugador",        "dorsal"),
    ("partido",        "partido_id"),
    ("partido",        "jornada_numero"),
    ("partido",        "local_id"),
    ("partido",        "visitante_id"),
    ("partido",        "estadio_id"),
    ("resultado",      "partido_id"),
    ("resultado",      "goles_local"),
    ("resultado",      "goles_visitante"),
    ("partido_arbitro","partido_id"),
    ("partido_arbitro","arbitro_id"),
    ("gol",            "gol_id"),
    ("gol",            "partido_id"),
    ("gol",            "jugador_id"),
    ("gol",            "minuto"),
}


# --------------------------------------------------------------------------- #
# Lectura del archivo                                                         #
# --------------------------------------------------------------------------- #

def parse_sections(text: str) -> dict[str, list[str]]:
    """Devuelve {SECCION: [fila_limpia, ...]} a partir del texto decodificado."""
    sections: dict[str, list[str]] = {}
    current: str = ""
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("--"):
            current = line.lstrip("-").strip().upper()
            sections.setdefault(current, [])
            continue
        if not current:
            # Línea suelta antes de la primera sección: se ignora silenciosamente.
            continue
        # Quitar coma final heterogénea (algunas secciones la traen)
        line = line.rstrip(",").strip()
        if line:
            sections[current].append(line)
    return sections


def split_csv(s: str) -> list[str]:
    """Split de tuplas tipo  1, 'Aurora FC' , 123  respetando comillas simples."""
    out: list[str] = []
    cur = ""
    in_quotes = False
    for ch in s:
        if ch == "'":
            in_quotes = not in_quotes
            cur += ch
        elif ch == "," and not in_quotes:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    tail = cur.strip()
    if tail:
        out.append(tail)
    return out


# --------------------------------------------------------------------------- #
# Validación ligera                                                          #
# --------------------------------------------------------------------------- #

def strip_quotes(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] == "'" and v[-1] == "'":
        return v[1:-1].replace("''", "'")
    return v


def as_sql_literal(v: str, table: str, column: str) -> str:
    """Devuelve el literal SQL para una columna, escapando comillas si es string."""
    val = v.strip()
    if (table, column) in INT_COLUMNS:
        # En 'minuto' permitimos NULL -> emitimos NULL literal
        if val.upper() == "NULL" or val == "":
            return "NULL"
        try:
            int(val)
        except ValueError as e:
            raise ValueError(f"{table}.{column} esperaba entero, recibí {val!r}") from e
        return val
    # String: entre comillas simples, escapando ' como ''
    s = strip_quotes(val)
    if s == "":
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def row_to_values(row: list[str], table: str, columns: list[str]) -> str:
    """Convierte ['1', "'Aurora FC'"] -> "1, 'Aurora FC'"""
    if len(row) != len(columns):
        raise ValueError(
            f"Sección {table}: esperaba {len(columns)} columnas, "
            f"recibí {len(row)}: {row}"
        )
    return ", ".join(as_sql_literal(row[i], table, columns[i]) for i in range(len(columns)))


# --------------------------------------------------------------------------- #
# Emisión de INSERTs                                                     #
# --------------------------------------------------------------------------- #

def build_inserts(sections: dict[str, list[str]]) -> Iterable[str]:
    """Genera líneas de INSERT para cada sección en orden de dependencias."""
    for sec in INSERT_ORDER:
        if sec not in sections:
            raise RuntimeError(f"Falta la sección {sec} en el archivo de carga")
        table, cols = SECTION_TO_TABLE[sec]
        col_list = [c.strip() for c in cols.split(",")]
        yield f"INSERT INTO {table} ({cols}) VALUES"
        rows = sections[sec]
        if not rows:
            yield ";\n"
            continue
        for i, raw_row in enumerate(rows):
            parts = split_csv(raw_row)
            values = row_to_values(parts, table, col_list)
            sep = "," if i < len(rows) - 1 else ";"
            yield f"  ({values}){sep}"


# --------------------------------------------------------------------------- #
# Cabecera del SQL                                                           #
# --------------------------------------------------------------------------- #

HEADER = """\
-- =============================================================================
-- 02_carga.sql
-- Proyecto 2026 · Campeonato de Fútbol · Liga Universitaria del Valle
-- Generado por scripts/generar_carga.py desde Proyecto-2026-Carga.txt
-- =============================================================================
-- Convenciones (SDD):
--   * Codificación de salida: UTF-8 (cabecera con SET NAMES utf8mb4).
--   * FK activas: FOREIGN_KEY_CHECKS = 1.
--   * Orden de inserción: dependencias §2.2 (Nivel 0 -> 3).
--   * IDs explícitos (D2): sin AUTO_INCREMENT ni SP MAX(id)+1.
--   * gol.minuto es opcional (D1): NULL por defecto, rango 1..120.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

USE campeonato_futbol;

"""

FOOTER = """
-- =============================================================================
-- Fin de 02_carga.sql
-- =============================================================================
"""


# --------------------------------------------------------------------------- #
# Main                                                                       #
# --------------------------------------------------------------------------- #

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default="Proyecto-2026-Carga.txt",
        help="Ruta al archivo de carga (por defecto: Proyecto-2026-Carga.txt).",
    )
    parser.add_argument(
        "--output",
        default="sql/02_carga.sql",
        help="Ruta del archivo SQL generado (por defecto: sql/02_carga.sql).",
    )
    args = parser.parse_args(argv)

    input_path = Path(args.input)
    output_path = Path(args.output)

    # 1) Leer en cp1252 (decodificación correcta de tildes y 'ñ')
    raw = input_path.read_bytes().decode("cp1252")
    # Resumen por sección
    sections = parse_sections(raw)

    # 2) Componer el archivo de salida en UTF-8
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="\n") as f:
        f.write(HEADER)
        for line in build_inserts(sections):
            f.write(line + "\n")
        f.write(FOOTER)

    # 3) Resumen en stderr
    counts = {sec: len(rows) for sec, rows in sections.items()}
    sys.stderr.write(
        f"Generado {output_path} a partir de {input_path} (cp1252 -> UTF-8).\n"
        f"Conteos por sección: " +
        ", ".join(f"{sec}={counts[sec]}" for sec in INSERT_ORDER) + "\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())