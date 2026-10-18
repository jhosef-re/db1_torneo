/**
 * scripts/gen_badges.ts
 *
 * Genera SVGs "badge" locales con los resultados REALES de los 3 scripts de
 * verificación (A4, A5, A6), los de Astro, y el conteo de líneas del proyecto.
 *
 * Salida: web/.docs/badges/*.svg  (autoalojados, sin CDN externo).
 *
 * Uso:
 *   - `npm run badges`  (necesita un dev server en marcha; los 2 primeros
 *     scripts se pueden generar sin servidor).
 *
 * Los badges se pueden incluir en el README con:
 *   ![A4 - Paridad](docs/badges/a4.svg)
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT_DIR = '.docs/badges';

// SVG "shield" estilo shields.io, pero mínimos y sin red.
function badge(label: string, value: string, color: string): string {
  // Aproximación de ancho: 7 px por carácter en este font.
  const labelW = Math.max(7 * label.length + 6, 60);
  const valueW = Math.max(7 * value.length + 8, 50);
  const totalW = labelW + valueW;
  const h = 20;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
    <stop offset=".9" stop-color="#000" stop-opacity=".3"/>
    <stop offset="1" stop-color="#000" stop-opacity=".5"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="${h}" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="${h}" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="${h}" fill="${color}"/>
    <rect width="${totalW}" height="${h}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelW / 2}" y="14">${escape(label)}</text>
    <text x="${labelW + valueW / 2}" y="14" fill="#fff">${escape(value)}</text>
  </g>
</svg>
`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function writeBadge(name: string, label: string, value: string, color: string): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = `${OUT_DIR}/${name}.svg`;
  writeFileSync(path, badge(label, value, color), 'utf8');
  console.log(`✔ ${path}  ${label}=${value}`);
}

interface RunResult { ok: boolean; stdout: string; code: number | null }

function run(cmd: string, args: string[]): RunResult {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: '.', shell: false });
  return {
    ok: r.status === 0,
    stdout: (r.stdout ?? '') + (r.stderr ?? ''),
    code: r.status,
  };
}

/** Extrae el último `pasaron X / Y` de un output y devuelve { p, t }. */
function parseFraction(text: string): { p: number; t: number } | null {
  const m = /pasaron\s+(\d+)\s*\/\s*(\d+)/.exec(text);
  return m ? { p: Number(m[1]), t: Number(m[2]) } : null;
}

/** Ejecuta `npm run <script>` y devuelve { ok, p, t } si encuentra fracción. */
function checkScript(name: string, script: string): { ok: boolean; p: number; t: number } {
  console.log(`· ejecutando ${script} (puede tardar unos segundos)…`);
  const r = run('npm', ['run', script, '--silent']);
  // Si el server no está en marcha, los scripts A5/A6 fallan con ECONNREFUSED.
  // No abortamos; emitimos "n/a" para esos badges.
  const looksLikeNoServer = /ECONNREFUSED|connect ECONNREFUSED/i.test(r.stdout);
  if (looksLikeNoServer) {
    console.warn(`· ${name}: sin dev server en :4321, badge omitido.`);
    return { ok: false, p: 0, t: 0 };
  }
  const f = parseFraction(r.stdout);
  if (!f) {
    console.error(`✗ ${name}: no se encontró "pasaron X / Y" en la salida.`);
    return { ok: false, p: 0, t: 0 };
  }
  return { ok: r.ok, p: f.p, t: f.t };
}

/** Convierte {p, t} a color verde / rojo. */
function colorOf(p: number, t: number): string {
  if (t === 0) return '#9e9e9e';
  return p === t ? '#4c1' : '#e05d44'; // shields-style green/red
}

async function main(): Promise<void> {
  // 1) Astro check (cuenta errores/warnings/hints)
  {
    const r = run('npx', ['--no-install', 'astro', 'check', '--silent']);
    const txt = r.stdout;
    const m = /Result \(\d+ files?\):\s*\n-\s*(\d+)\s+errors?\s*\n-\s*(\d+)\s+warnings?\s*\n-\s*(\d+)\s+hints?/m.exec(txt);
    if (m) {
      const [, e, w, h] = m;
      writeBadge('astro-check', 'astro check', `${e}E / ${w}W / ${h}H`,
        Number(e) === 0 && Number(w) === 0 ? '#4c1' : '#e05d44');
    } else {
      console.warn(`· no se pudo parsear astro check`);
    }
  }

  // 2) A4 verificar.ts (necesita BD; la asumimos ya levantada).
  const a4 = checkScript('A4', 'verificar');
  writeBadge('a4', 'A4 · paridad', `${a4.p}/${a4.t}`,
    colorOf(a4.p, a4.t));

  // 3) A5 verificar-api.ts (necesita dev server en marcha).
  const a5 = checkScript('A5', 'verificar:api');
  writeBadge('a5', 'A5 · API', `${a5.p}/${a5.t}`,
    colorOf(a5.p, a5.t));

  // 4) A6 a6_vistas.ts (necesita dev server en marcha).
  let a6: { p: number; t: number } = { p: 0, t: 0 };
  {
    const a6r = run('npx', ['--no-install', 'tsx', './scripts/a6_vistas.ts']);
    const a6noServer = /ECONNREFUSED|connect ECONNREFUSED/i.test(a6r.stdout);
    if (a6noServer) {
      console.warn('· a6_vistas.ts: sin dev server, badge omitido.');
    } else {
      a6 = parseFraction(a6r.stdout) ?? { p: 0, t: 0 };
      if (a6.p > 0 || a6.t > 0) {
        writeBadge('a6', 'A6 · vistas', `${a6.p}/${a6.t}`, colorOf(a6.p, a6.t));
      }
    }
  }

  // 5) Aislamiento (A1): siempre verde si la app está en marcha.
  {
    const r = run('npx', ['--no-install', 'tsx', './scripts/a1_aislamiento.ts']);
    writeBadge('a1', 'A1 · aislamiento',
      r.ok ? 'OK' : 'FAIL',
      r.ok ? '#4c1' : '#e05d44');
  }

  // 6) Build OK?
  {
    const r = run('npm', ['run', 'build', '--silent']);
    writeBadge('build', 'build',
      r.ok ? 'OK' : 'FAIL',
      r.ok ? '#4c1' : '#e05d44');
  }

  // 7) Resumen global (suma simple, no real DoD oficial).
  {
    const total = (a4.t || 0) + (a5.t || 0) + (a6.t || 0);
    const ok = (a4.p || 0) + (a5.p || 0) + (a6.p || 0);
    writeBadge('checks', 'checks', `${ok}/${total}`, colorOf(ok, total));
  }

  console.log('\n✔ Badges generados en', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
