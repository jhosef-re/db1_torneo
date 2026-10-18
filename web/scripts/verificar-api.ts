/**
 * scripts/verificar-api.ts
 *
 * Pruebas contra los endpoints HTTP del proyecto (A5, Anexo A del SDD).
 * Requiere que el servidor esté en marcha (npm run dev en otra terminal).
 * Uso: `npm run verificar:api`.
 */
const BASE = process.env.API_BASE_URL ?? 'http://localhost:4321/api';

interface Check {
  id: string;
  descripcion: string;
  pasa: boolean;
  extra?: string;
}

const checks: Check[] = [];
function check(id: string, desc: string, pasa: boolean, extra?: string) {
  checks.push({ id, descripcion: desc, pasa, extra });
  console.log(`${pasa ? '✔' : '✗'} ${id} — ${desc}${extra ? ' (' + extra + ')' : ''}`);
}

interface RespJson<T> {
  status: number;
  body: T;
  headers: Headers;
}

async function get<T>(path: string): Promise<RespJson<T>> {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  return { status: r.status, body: JSON.parse(text) as T, headers: r.headers };
}

async function post<T>(path: string): Promise<RespJson<T>> {
  const r = await fetch(`${BASE}${path}`, { method: 'POST' });
  const text = await r.text();
  return { status: r.status, body: JSON.parse(text) as T, headers: r.headers };
}

type ErrorBody = { error: { codigo: string; mensaje: string } };

type Partido = {
  partido_id: number;
  jornada: number;
  fecha: string;
  hora: string;
  local: { equipo_id: number; nombre: string };
  visitante: { equipo_id: number; nombre: string };
  estado: 'jugado' | 'pendiente';
  resultado: { goles_local: number; goles_visitante: number } | null;
  arbitros: { rol: string }[];
  goles: unknown[];
};

type Posicion = {
  posicion: number;
  equipo_id: number;
  equipo: string;
  pj: number;
  puntos: number;
};

async function main() {
  // 1) /api/salud
  {
    const r = await get<{ datos: { ok: boolean } }>('/salud');
    check('salud 200', `status=${r.status}`, r.status === 200 && r.body.datos.ok === true);
  }

  // 2) /api/posiciones — total 12, pj=8, posicion 1..12.
  {
    const r = await get<{ total: number; datos: Posicion[] }>('/posiciones');
    check(
      'posiciones total=12',
      `total=${r.body.total}`,
      r.status === 200 && r.body.total === 12 && r.body.datos.length === 12,
    );
    check(
      'posiciones pj=8 todas',
      `pj en todas = 8`,
      r.body.datos.every((d) => d.pj === 8),
    );
    check(
      'posiciones 1..12',
      `posicion secuencial`,
      r.body.datos.every((d, i) => d.posicion === i + 1),
    );
  }

  // 3) /api/calendario
  {
    const r = await get<{ total: number; datos: unknown[] }>('/calendario');
    check(
      'calendario total=132',
      `total=${r.body.total}`,
      r.status === 200 && r.body.total === 132,
    );
  }
  {
    const r = await get<{ total: number; datos: Partido[] }>('/calendario?estado=jugado');
    check(
      'calendario jugados=48',
      `total=${r.body.total}`,
      r.status === 200 && r.body.total === 48 && r.body.datos.every((d) => d.resultado !== null),
    );
  }
  {
    const r = await get<{ total: number; datos: Partido[] }>('/calendario?estado=pendiente');
    check(
      'calendario pendientes=84',
      `total=${r.body.total}, todos resultado=null`,
      r.status === 200 &&
        r.body.total === 84 &&
        r.body.datos.every((d) => d.resultado === null && d.estado === 'pendiente'),
    );
  }
  {
    const r = await get<{ total: number; datos: { jornada: number }[] }>(
      '/calendario?jornada=3',
    );
    check(
      'calendario jornada=3 total=6',
      `total=${r.body.total}`,
      r.status === 200 && r.body.total === 6 && r.body.datos.every((d) => d.jornada === 3),
    );
  }
  {
    const r = await get<ErrorBody>('/calendario?jornada=23');
    check(
      'calendario jornada=23 → 400',
      `status=${r.status}`,
      r.status === 400 && r.body.error.codigo === 'PARAMETRO_INVALIDO',
    );
  }
  {
    const r = await get<ErrorBody>('/calendario?estado=otro');
    check(
      'calendario estado=otro → 400',
      `status=${r.status}`,
      r.status === 400 && r.body.error.codigo === 'PARAMETRO_INVALIDO',
    );
  }

  // 4) /api/goleadores — total 180, Σ 137.
  {
    const r = await get<{ total: number; datos: { goles: number }[] }>('/goleadores');
    const sum = r.body.datos.reduce((s, d) => s + d.goles, 0);
    check(
      'goleadores total=180 Σ=137',
      `total=${r.body.total}, Σ=${sum}`,
      r.status === 200 && r.body.total === 180 && sum === 137,
    );
  }

  // 5) /api/partidos/:id
  {
    const r = await get<{ datos: Partido }>('/partidos/1');
    check(
      'partido 1 (jugado) 200',
      `status=${r.status}`,
      r.status === 200 && r.body.datos.estado === 'jugado',
    );
    check(
      'partido 1 árbitros P,A1,A2',
      `roles=${r.body.datos.arbitros.map((a) => a.rol).join(',')}`,
      r.body.datos.arbitros.map((a) => a.rol).join(',') === 'P,A1,A2',
    );
  }
  {
    // Pendiente (id=49 según lo observado en A4)
    const r = await get<{ datos: Partido }>('/partidos/49');
    check(
      'partido 49 (pendiente) resultado=null',
      `estado=${r.body?.datos?.estado} resultado=${r.body?.datos?.resultado}`,
      r.status === 200 &&
        r.body?.datos?.estado === 'pendiente' &&
        r.body?.datos?.resultado === null &&
        Array.isArray(r.body?.datos?.goles) &&
        r.body.datos.goles.length === 0,
    );
  }
  {
    const r = await get<ErrorBody>('/partidos/abc');
    check(
      'partido abc → 400',
      `status=${r.status}`,
      r.status === 400 && r.body.error.codigo === 'PARAMETRO_INVALIDO',
    );
  }
  {
    const r = await get<ErrorBody>('/partidos/9999');
    check(
      'partido 9999 → 404',
      `status=${r.status}`,
      r.status === 404 && r.body.error.codigo === 'NO_ENCONTRADO',
    );
  }

  // 6) /api/equipos
  {
    const r = await get<{ total: number; datos: { jugadores: number }[] }>('/equipos');
    check(
      'equipos total=12 15-jugadores',
      `total=${r.body.total}`,
      r.status === 200 && r.body.total === 12 && r.body.datos.every((e) => e.jugadores === 15),
    );
  }
  {
    const r = await get<{ datos: { jugadores: unknown[] } }>('/equipos/1');
    check(
      'equipos/1 Aurora 15 jugadores',
      `status=${r.status}`,
      r.status === 200 && r.body.datos.jugadores.length === 15,
    );
  }
  {
    const r = await get<ErrorBody>('/equipos/9999');
    check(
      'equipos/9999 → 404',
      `status=${r.status}`,
      r.status === 404 && r.body.error.codigo === 'NO_ENCONTRADO',
    );
  }

  // 7) 405 a todo lo que no sea GET
  for (const path of ['/salud', '/posiciones', '/calendario', '/goleadores',
                      '/partidos/1', '/equipos', '/equipos/1']) {
    const r = await post<ErrorBody>(path);
    check(
      `POST ${path} → 405 + Allow`,
      `status=${r.status} allow=${r.headers.get('Allow')}`,
      r.status === 405 &&
        r.headers.get('Allow') === 'GET' &&
        r.body.error.codigo === 'METODO_NO_PERMITIDO',
    );
  }

  // Resumen
  const total = checks.length;
  const pasaron = checks.filter((c) => c.pasa).length;
  const fallaron = total - pasaron;
  console.log('\n──────────────────────────────────────────────');
  console.log(`Resumen · pasaron ${pasaron} / ${total}`);
  if (fallaron > 0) {
    for (const c of checks.filter((c) => !c.pasa)) {
      console.log(`  FALLÓ  ${c.id}: ${c.descripcion} ${c.extra ?? ''}`);
    }
    process.exit(1);
  }
  console.log('Gate A5 · API REST: OK');
}

main().catch((e) => {
  console.error('verificar-api.ts: error:', e);
  process.exit(1);
});
