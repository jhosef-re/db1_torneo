// scripts/a6_vistas.ts — verificación end-to-end del contenido HTML.
// Toleramos los atributos data-astro-source-* que Astro añade en dev.

const BASE = 'http://localhost:4321';

interface VCheck { id: string; desc: string; pasa: boolean; extra?: string }
const vchecks: VCheck[] = [];
function vcheck(id: string, d: string, pasa: boolean, extra?: string) {
  vchecks.push({ id, desc: d, pasa, extra });
  console.log(`${pasa ? '✔' : '✗'} ${id} — ${d}${extra ? ' (' + extra + ')' : ''}`);
}

async function vget(path: string): Promise<{ status: number; body: string }> {
  const r: Response = await fetch(`${BASE}${path}`);
  return { status: r.status, body: await r.text() };
}

const rowCalRe = /<tr class="border-t border-slate-100"(?:\s+data-astro-source-[^>]*)?>/g;
const rowGoRe  = /<tr class="border-t border-slate-100 even:bg-slate-50"(?:\s+data-astro-source-[^>]*)?>/g;
const tdMonoValor = (v: string) =>
  new RegExp(`<td class="[^"]*font-mono"(?:\\s+data-astro-source-[^>]*)?>${v}</td>`, 'g');

async function main() {
  // V1: /
  {
    const { status, body } = await vget('/');
    vcheck('V1 200', 'posiciones 200', status === 200);
    const nombresEsperados = [
      'Cóndores FC', 'Titanes FC', 'Deportivo El Naranjo', 'Real Campus',
      'Halcones FC', 'Universitarios FC', 'Estudiantes Unidos', 'Ingenieros FC',
      'Leones del Norte', 'Atlético Central', 'Deportivo del Valle', 'Aurora FC',
    ];
    vcheck('V1 12 equipos', 'nombres presentes', nombresEsperados.every((n) => body.includes(n)));
    const trs = [...body.matchAll(
      /<tr class="border-t border-slate-100 even:bg-slate-50"(?:\s+data-astro-source-[^>]*)?>([\s\S]*?)<\/tr>/g,
    )].map((m) => m[1] as string);
    const pjs = trs
      .map((tr) => /font-mono[^>]*>\s*(\d+)\s*<\/td>/.exec(tr)?.[1])
      .filter((v): v is string => v === '8').length;
    vcheck('V1 pj=8 todas (12)', `pj=8 en ${pjs} filas`, pjs === 12);
  }

  // V2: /calendario
  {
    const { status, body } = await vget('/calendario');
    vcheck('V2 200', 'calendario 200', status === 200);
    const bloques = (body.match(/Jornada \d+/g) ?? []).length;
    vcheck('V2 22 jornadas', `22 cabeceras, recibí ${bloques}`, bloques === 22);
    const filas = (body.match(rowCalRe) ?? []).length;
    vcheck('V2 132 partidos', `filas = ${filas}`, filas === 132);
    vcheck('V2 tiene "Pendiente"', 'algún pendiente', body.includes('Pendiente'));
    vcheck('V2 tiene marcadores', 'números como marcador', /\d+\s*–\s*\d+/.test(body));
  }
  {
    const { body } = await vget('/calendario?estado=pendiente');
    const filas = (body.match(rowCalRe) ?? []).length;
    vcheck('V2 pend 84', `84 filas, recibí ${filas}`, filas === 84);
    const guiones = (body.match(/<span class="text-slate-400"[^>]*>\u2014<\/span>/g) ?? []).length;
    vcheck('V2 pend sin resultado', `84 guiones, recibí ${guiones}`, guiones === 84);
  }
  {
    const { body } = await vget('/calendario?jornada=3');
    const filas = (body.match(rowCalRe) ?? []).length;
    vcheck('V2 jornada=3 total=6', `6 filas, recibí ${filas}`, filas === 6);
  }
  {
    const { status } = await vget('/calendario?jornada=99');
    vcheck('V2 jornada=99 ignorada (DA5)', '200 con todos los partidos', status === 200);
  }

  // V3: /goleadores
  {
    const { body } = await vget('/goleadores');
    const filas = (body.match(rowGoRe) ?? []).length;
    vcheck('V3 180 filas', `filas = ${filas}`, filas === 180);
    vcheck('V3 Σ=137', 'Σ goles = 137', body.includes('Σ goles = 137'));
    vcheck('V3 top 1 Pablo', 'Pablo Martínez Vásquez', body.includes('Pablo Martínez Vásquez'));
  }

  // V4: partido 1 (jugado)
  {
    const { status, body } = await vget('/partidos/1');
    vcheck('V4/1 200', 'partido jugado', status === 200);
    vcheck(
      'V4/1 Aurora vs Titanes',
      'titular correcto',
      body.includes('Aurora FC') && body.includes('Titanes FC'),
    );
    vcheck('V4/1 marcador 0 – 0', '0 – 0', /0\s*–\s*0/.test(body));
    const pCell  = (body.match(tdMonoValor('P'))  ?? []).length;
    const a1Cell = (body.match(tdMonoValor('A1')) ?? []).length;
    const a2Cell = (body.match(tdMonoValor('A2')) ?? []).length;
    vcheck('V4/1 3 árbitros', `P=${pCell},A1=${a1Cell},A2=${a2Cell}`,
      pCell === 1 && a1Cell === 1 && a2Cell === 1);
    const iP = body.indexOf('>P</td>');
    const iA1 = body.indexOf('>A1</td>');
    const iA2 = body.indexOf('>A2</td>');
    vcheck('V4/1 orden P,A1,A2', `iP=${iP} iA1=${iA1} iA2=${iA2}`,
      iP >= 0 && iA1 > iP && iA2 > iA1);
    vcheck('V4/1 sección Goles', 'sub-sección de goles presente', body.includes('>Goles<'));
  }

  // V4: partido 49 (pendiente)
  {
    const { status, body } = await vget('/partidos/49');
    vcheck('V4/49 200', 'partido pendiente', status === 200);
    vcheck('V4/49 Pendiente', 'etiqueta pendiente visible', body.includes('Pendiente'));
    vcheck('V4/49 sin sección Goles', 'sin tabla de goles', !/Goles<\//.test(body));
  }

  // V4: 404s
  {
    const { status, body } = await vget('/partidos/9999');
    vcheck('V4 /partidos/9999 → 404', `status=${status}`, status === 404);
    vcheck('V4 /partidos/9999 msg', 'Partido no encontrado', body.includes('Partido no encontrado'));
  }
  {
    const { status, body } = await vget('/partidos/abc');
    vcheck('V4 /partidos/abc → 404', `status=${status}`, status === 404);
    vcheck('V4 /partidos/abc msg', 'Partido no encontrado', body.includes('Partido no encontrado'));
  }

  // V5
  {
    const { status, body } = await vget('/equipos/1');
    vcheck('V5/1 200', 'equipo 1 (Aurora)', status === 200);
    const trsRe = /<tr class="border-t border-slate-100 even:bg-slate-50"\s+data-astro-source-file="[^"]+"\s+data-astro-source-loc="[^"]+">/g;
    const trCount = (body.match(trsRe) ?? []).length;
    vcheck('V5/1 15 filas', `recibí ${trCount} =15`, trCount === 15);
    const celdasRe = /<td class="[^"]*font-mono"\s+data-astro-source-[^>]*>(\d+)<\/td>/g;
    const dorsales = (body.match(celdasRe) ?? [])
      .map((s: string) => Number(s.match(/>(\d+)</)![1]));
    vcheck('V5/1 dorsales 1..15', `lista=${dorsales.slice(0, 15).join(',')}`,
      dorsales.slice(0, 15).toString() === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15');
  }
  {
    const { status, body } = await vget('/equipos/12');
    vcheck('V5/12 200', 'equipo 12 (Titanes)', status === 200);
    const trsRe = /<tr class="border-t border-slate-100 even:bg-slate-50"\s+data-astro-source-file="[^"]+"\s+data-astro-source-loc="[^"]+">/g;
    const trCount = (body.match(trsRe) ?? []).length;
    vcheck('V5/12 15 filas', `recibí ${trCount} =15`, trCount === 15);
  }
  {
    const { status, body } = await vget('/equipos/9999');
    vcheck('V5/9999 → 404', `status=${status}`, status === 404);
    vcheck('V5/9999 msg', 'Equipo no encontrado', body.includes('Equipo no encontrado'));
  }

  // RNF-01 < 1s
  for (const v of ['/', '/calendario', '/goleadores', '/partidos/1', '/equipos/1']) {
    const t0 = performance.now();
    await vget(v);
    const dt = performance.now() - t0;
    vcheck(`RNF-01 ${v}`, `${dt.toFixed(0)} ms`, dt < 1000);
  }

  const total = vchecks.length;
  const pasaron = vchecks.filter((c) => c.pasa).length;
  console.log('\n──────────────────────────────────────────────');
  console.log(`Resumen · pasaron ${pasaron} / ${total}`);
  if (pasaron !== total) {
    for (const c of vchecks.filter((c) => !c.pasa)) {
      console.log(`  FALLÓ  ${c.id}: ${c.desc} ${c.extra ?? ''}`);
    }
    process.exit(1);
  }
  console.log('Gate A6 · Vistas: OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
