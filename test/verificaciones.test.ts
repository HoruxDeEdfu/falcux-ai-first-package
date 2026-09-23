// Las cinco verificaciones, de punta a punta, sobre repos git reales y
// desechables. Se prueban a través de `auditar`, que es lo que corre el CLI.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditar, type InformeAudit } from '../src/audit.js';
import type { Resultado } from '../src/verificaciones/tipos.js';
import { aiFirstMd, crearRepo, type Repo } from './ayuda.js';

function resultado(informe: InformeAudit, check: string): Resultado {
  const r = informe.resultados.find((x) => x.check === check);
  assert.ok(r, `falta el resultado de «${check}»`);
  return r;
}

function hallazgos(informe: InformeAudit, check: string) {
  const r = resultado(informe, check);
  assert.equal(r.estado, 'hallazgos', `«${check}» debía tener hallazgos y está ${r.estado}`);
  return r.estado === 'hallazgos' ? r.hallazgos : [];
}

function esperaEstado(informe: InformeAudit, check: string, estado: Resultado['estado']) {
  assert.equal(resultado(informe, check).estado, estado, `«${check}» debía estar ${estado}`);
}

async function conRepo(fn: (repo: Repo) => Promise<void>) {
  const repo = crearRepo();
  try {
    await fn(repo);
  } finally {
    repo.limpiar();
  }
}

// ---------------------------------------------------------------- check 1

test('zona prohibida: un archivo modificado dentro de la zona es P0', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('zonas_prohibidas:\n  - ruta: migrations/\n    razon: esquema vivo'));
    repo.escribir('migrations/001.sql', 'create table a;');
    repo.escribir('src/a.ts', 'export {}');
    repo.commit('inicio');

    repo.escribir('migrations/001.sql', 'create table b;');
    const informe = await auditar({ raiz: repo.raiz });

    const [h] = hallazgos(informe, 'zona-prohibida');
    assert.equal(h?.severidad, 'P0');
    assert.match(h?.mensaje ?? '', /migrations\/.*esquema vivo/);
    assert.deepEqual(h?.detalle, ['migrations/001.sql']);
    assert.equal(informe.entropia, 40);
    assert.equal(informe.codigoDeSalida, 1);
  }));

test('zona prohibida: un archivo nuevo sin seguimiento también cuenta, y la unidad es la zona', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('zonas_prohibidas:\n  - .env*'));
    repo.escribir('src/a.ts', 'export {}');
    repo.commit('inicio');

    repo.escribir('.env', 'A=1');
    repo.escribir('apps/web/.env.local', 'B=2');
    const informe = await auditar({ raiz: repo.raiz });

    const hs = hallazgos(informe, 'zona-prohibida');
    assert.equal(hs.length, 1);
    assert.deepEqual(hs[0]?.detalle, ['.env', 'apps/web/.env.local']);
    assert.equal(informe.conteo.p0, 1);
  }));

test('zona prohibida: en modo rango mira los commits, no el árbol', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('zonas_prohibidas:\n  - infra/'));
    repo.escribir('src/a.ts', 'export {}');
    repo.commit('inicio');
    repo.git('branch', 'base');

    repo.escribir('infra/main.tf', 'resource {}');
    repo.commit('toca infra');

    const enRango = await auditar({ raiz: repo.raiz, base: 'base' });
    assert.equal(enRango.modo, 'rango');
    assert.equal(enRango.conteo.p0, 1);

    const enArbol = await auditar({ raiz: repo.raiz });
    esperaEstado(enArbol, 'zona-prohibida', 'aprobado');
  }));

test('zona prohibida: sin zonas declaradas se omite, no se aprueba', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd());
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'zona-prohibida', 'omitido');
  }));

// ---------------------------------------------------------------- check 2

const CON_ADR = `superficies_de_decision:
  - src/lib/queue.ts
  - "**/*.config.*"
artefactos:
  adr: docs/ADR.md`;

const ADR_BASE = '# ADR\n\n## ADR-001 — Postgres sobre Mongo\n\n- **Fecha:** 2026-01-01\n';

test('decisión sin ADR: tocar una superficie sin fila nueva es P1', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('src/lib/queue.ts', 'export const cola = 1;');
    repo.commit('inicio');

    repo.escribir('src/lib/queue.ts', 'export const cola = 2;');
    const informe = await auditar({ raiz: repo.raiz });

    const [h] = hallazgos(informe, 'decision-sin-adr');
    assert.equal(h?.severidad, 'P1');
    assert.ok(h?.detalle?.some((d) => d.includes('src/lib/queue.ts')));
    assert.equal(informe.entropia, 20);
    assert.equal(informe.codigoDeSalida, 0, 'P1 no corta sin --estricto');
    assert.equal((await auditar({ raiz: repo.raiz, estricto: true })).codigoDeSalida, 1);
  }));

test('decisión sin ADR: agregar la fila silencia el aviso', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('src/lib/queue.ts', 'export const cola = 1;');
    repo.commit('inicio');

    repo.escribir('src/lib/queue.ts', 'export const cola = 2;');
    repo.escribir('docs/ADR.md', ADR_BASE + '\n## ADR-002 — La cola pasa a SQS\n\n- **Fecha:** 2026-09-17\n');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'decision-sin-adr', 'aprobado');
  }));

test('decisión sin ADR: editar una fila vieja no cuenta como fila nueva', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('src/lib/queue.ts', 'export const cola = 1;');
    repo.commit('inicio');

    repo.escribir('src/lib/queue.ts', 'export const cola = 2;');
    repo.escribir('docs/ADR.md', ADR_BASE + '\nNota al pie.\n');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'decision-sin-adr', 'hallazgos');
  }));

test('decisión sin ADR: una dependencia de producción nueva es señal; una de desarrollo no', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('package.json', JSON.stringify({ dependencies: { a: '1' }, devDependencies: { b: '1' } }));
    repo.commit('inicio');

    repo.escribir('package.json', JSON.stringify({ dependencies: { a: '1' }, devDependencies: { b: '1', c: '1' } }));
    esperaEstado(await auditar({ raiz: repo.raiz }), 'decision-sin-adr', 'aprobado');

    repo.escribir('package.json', JSON.stringify({ dependencies: { a: '1', sqs: '1' }, devDependencies: { b: '1' } }));
    const [h] = hallazgos(await auditar({ raiz: repo.raiz }), 'decision-sin-adr');
    assert.ok(h?.detalle?.includes('package.json: +sqs'));
  }));

test('decisión sin ADR: quitar una dependencia también es señal', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('package.json', JSON.stringify({ dependencies: { a: '1', b: '1' } }));
    repo.commit('inicio');

    repo.escribir('package.json', JSON.stringify({ dependencies: { a: '1' } }));
    const [h] = hallazgos(await auditar({ raiz: repo.raiz }), 'decision-sin-adr');
    assert.ok(h?.detalle?.includes('package.json: -b'));
  }));

test('decisión sin ADR: la anotación en el cuerpo del commit silencia en modo rango', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('vite.config.ts', 'export default { timeout: 1000 }');
    repo.commit('inicio');
    repo.git('branch', 'base');

    repo.escribir('vite.config.ts', 'export default { timeout: 5000 }');
    repo.commit('fix: subir el timeout\n\nNo es una decision.\n\n<!-- ai-first: sin-decision -->');

    esperaEstado(await auditar({ raiz: repo.raiz, base: 'base' }), 'decision-sin-adr', 'aprobado');
  }));

test('decisión sin ADR: sin anotación, en modo rango sigue siendo P1', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('vite.config.ts', 'export default { timeout: 1000 }');
    repo.commit('inicio');
    repo.git('branch', 'base');

    repo.escribir('vite.config.ts', 'export default { timeout: 5000 }');
    repo.commit('fix: subir el timeout');

    esperaEstado(await auditar({ raiz: repo.raiz, base: 'base' }), 'decision-sin-adr', 'hallazgos');
  }));

test('decisión sin ADR: un ADR recién creado, sin seguimiento, cuenta como fila nueva', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ADR));
    repo.escribir('src/lib/queue.ts', 'export const cola = 1;');
    repo.commit('inicio');

    repo.escribir('src/lib/queue.ts', 'export const cola = 2;');
    repo.escribir('docs/ADR.md', ADR_BASE);
    esperaEstado(await auditar({ raiz: repo.raiz }), 'decision-sin-adr', 'aprobado');
  }));

test('decisión sin ADR: sin «artefactos.adr» se omite', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('superficies_de_decision:\n  - src/lib/queue.ts'));
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'decision-sin-adr', 'omitido');
  }));

// ---------------------------------------------------------------- check 3

const CON_ALCANCE = `alcance:
  spec: docs/changes/pending/
  tolerancia: 1
artefactos:
  session_log: docs/SESSION_LOG.md`;

const CHG = `# CHG-001 — Reordenar la cola

## Archivos

- \`src/lib/queue.ts\`
- \`src/lib/queue.test.ts\`
- \`src/workers/*.ts\`

## Rollback

Revertir el commit.
`;

test('alcance excedido: más archivos fuera del alcance que la tolerancia es P1', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ALCANCE));
    repo.escribir('docs/changes/pending/CHG-001.md', CHG);
    repo.escribir('docs/SESSION_LOG.md', '# Log\n');
    for (const f of ['src/lib/queue.ts', 'src/lib/queue.test.ts', 'src/workers/a.ts', 'src/ui/Boton.tsx', 'src/ui/Modal.tsx', 'README.md']) {
      repo.escribir(f, '// v1');
    }
    repo.commit('inicio');

    for (const f of ['src/lib/queue.ts', 'src/workers/a.ts', 'src/ui/Boton.tsx', 'src/ui/Modal.tsx', 'docs/SESSION_LOG.md']) {
      repo.escribir(f, '// v2');
    }
    const informe = await auditar({ raiz: repo.raiz });

    const [h] = hallazgos(informe, 'alcance-excedido');
    assert.equal(h?.severidad, 'P1');
    assert.deepEqual(h?.detalle, ['src/ui/Boton.tsx', 'src/ui/Modal.tsx']);
    assert.match(h?.mensaje ?? '', /2 archivos fuera del alcance/);
  }));

test('alcance excedido: dentro de la tolerancia se aprueba', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ALCANCE));
    repo.escribir('docs/changes/pending/CHG-001.md', CHG);
    repo.escribir('src/lib/queue.ts', '// v1');
    repo.escribir('src/ui/Boton.tsx', '// v1');
    repo.commit('inicio');

    repo.escribir('src/lib/queue.ts', '// v2');
    repo.escribir('src/ui/Boton.tsx', '// v2');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'alcance-excedido', 'aprobado');
  }));

test('alcance excedido: si la spec no lista archivos, se omite con la razón', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ALCANCE));
    repo.escribir('docs/changes/pending/CHG-001.md', '# CHG-001\n\nSin sección de archivos.\n');
    repo.commit('inicio');

    const r = resultado(await auditar({ raiz: repo.raiz }), 'alcance-excedido');
    assert.equal(r.estado, 'omitido');
    assert.match(r.estado === 'omitido' ? r.razon : '', /no listan archivos/);
  }));

test('alcance excedido: sin spec activa o sin «alcance.spec», se omite', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_ALCANCE));
    repo.escribir('docs/changes/pending/.gitkeep', '');
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'alcance-excedido', 'omitido');

    repo.escribir('AI-FIRST.md', aiFirstMd());
    esperaEstado(await auditar({ raiz: repo.raiz }), 'alcance-excedido', 'omitido');
  }));

test('alcance excedido: un archivo sin extensi\u00f3n se puede declarar, como el .npmrc de CHG-007', () =>
  conRepo(async (repo) => {
    // El caso real: CHG-007 borr\u00f3 el .npmrc y lo declar\u00f3 entre acentos graves, y
    // el check lo cobr\u00f3 igual porque `pareceRuta` exig\u00eda barra o extensi\u00f3n.
    repo.escribir('AI-FIRST.md', aiFirstMd(`alcance:
  spec: docs/changes/pending/
artefactos:
  session_log: docs/SESSION_LOG.md`));
    repo.escribir(
      'docs/changes/pending/CHG-007.md',
      '# CHG-007\n\n## Archivos afectados\n\n- `.npmrc`\n- `LICENSE`\n- `pnpm-workspace.yaml`\n',
    );
    repo.escribir('.npmrc', 'publish-branch=prod');
    repo.escribir('LICENSE', 'Apache');
    repo.commit('inicio');

    repo.borrar('.npmrc');
    repo.escribir('LICENSE', 'MIT');
    repo.escribir('pnpm-workspace.yaml', 'publishBranch: prod');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'alcance-excedido', 'aprobado');
  }));

test('alcance excedido: un nombre suelto no excusa a un archivo que no se declar\u00f3', () =>
  conRepo(async (repo) => {
    // La contraparte: que el filtro sea m\u00e1s laxo no puede volverlo in\u00fatil.
    repo.escribir('AI-FIRST.md', aiFirstMd(`alcance:
  spec: docs/changes/pending/
artefactos:
  session_log: docs/SESSION_LOG.md`));
    repo.escribir('docs/changes/pending/CHG-001.md', '# CHG-001\n\n## Archivos\n\n- `LICENSE`\n');
    repo.escribir('LICENSE', 'Apache');
    repo.escribir('src/otro.ts', '// v1');
    repo.commit('inicio');

    repo.escribir('LICENSE', 'MIT');
    repo.escribir('src/otro.ts', '// v2');
    const [h] = hallazgos(await auditar({ raiz: repo.raiz }), 'alcance-excedido');
    assert.deepEqual(h?.detalle, ['src/otro.ts'], 'el declarado se excusa, el otro no');
  }));

test('artefacto hu\u00e9rfano: un nombre sin extensi\u00f3n no acusa, aunque no exista (ADR-023)', () =>
  conRepo(async (repo) => {
    // El caso que descart\u00f3 la lista blanca global: docs/ADR.md de este repo cita
    // el `.zshrc` de una m\u00e1quina en una analog\u00eda, y ese documento no se edita.
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  adr: docs/ADR.md'));
    repo.escribir('docs/ADR.md', '# ADR\n\nComo el `.zshrc` de tu m\u00e1quina, o un `Makefile`.\n');
    repo.commit('inicio');

    esperaEstado(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano', 'aprobado');
  }));

// ---------------------------------------------------------------- check 4

test('artefacto huérfano: una ruta mencionada que no existe es P2, con línea', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  arquitectura: docs/ARQUITECTURA.md'));
    repo.escribir(
      'docs/ARQUITECTURA.md',
      ['# Arquitectura', '', 'La cola vive en `src/lib/queue.ts` y la spec en [la spec](specs/cola.md).', '', 'Ver `docs/nada.md`.'].join('\n'),
    );
    repo.escribir('src/lib/queue.ts', 'export {}');
    repo.escribir('docs/specs/cola.md', '# Cola');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano');
    assert.equal(hs.length, 1);
    assert.equal(hs[0]?.ruta, 'docs/ARQUITECTURA.md:5');
    assert.match(hs[0]?.mensaje ?? '', /docs\/nada\.md/);
  }));

test('artefacto huérfano: las rutas dentro de bloques de código son ejemplos', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  arquitectura: docs/ARQUITECTURA.md'));
    repo.escribir('docs/ARQUITECTURA.md', '# A\n\n```bash\ncat docs/inexistente.md\n```\n\n```\n`otro/inexistente.ts`\n```\n');
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano', 'aprobado');
  }));

test('artefacto huérfano: comandos, URLs, versiones y marcadores no son rutas', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  arquitectura: docs/ARQUITECTURA.md'));
    repo.escribir(
      'docs/ARQUITECTURA.md',
      [
        '# A',
        'Corre `pnpm run build` y `git log --oneline dev..prod`.',
        'Versión `1.2.3`, paquete `@astrojs/starlight`, flag `--estricto`.',
        'Cambios en `docs/changes/pending/CHG-XXX.md` y specs en `docs/specs/{modulo}.md`.',
        'Sitio en [la web](https://example.com/docs/x.md) y correo a `mailto:a@b.c`.',
        'Patrón `**/*.config.*` y `src/lib/queue.ts:42`.',
      ].join('\n'),
    );
    repo.escribir('src/lib/queue.ts', 'export {}');
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano', 'aprobado');
  }));

test('artefacto huérfano: un artefacto declarado que no existe es P2', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  adr: docs/ADR.md\n  tech_notes: docs/TECH_NOTES.md'));
    repo.escribir('docs/ADR.md', '# ADR\n');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano');
    assert.equal(hs.length, 1);
    assert.match(hs[0]?.mensaje ?? '', /artefactos\.tech_notes.*docs\/TECH_NOTES\.md/);
  }));

test('artefacto huérfano: un nombre sin carpeta resuelve por nombre en todo el repo', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  agents: AGENTS.md'));
    repo.escribir(
      'AGENTS.md',
      '# A\n\nLa pieza la monta `expediente.ts`; el flujo vive en `sync-skills.yml` y los capítulos en `parte-1/`. Léete `INEXISTENTE.md` y `borrada/`.\n',
    );
    repo.escribir('src/lib/expediente.ts', 'export {}');
    repo.escribir('.github/workflows/sync-skills.yml', 'on: push');
    repo.escribir('src/content/parte-1/intro.md', '# Intro');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano');
    assert.deepEqual(
      hs.map((h) => h.mensaje.replace(/^AGENTS\.md menciona /, '').replace(/, que no existe$/, '')),
      ['INEXISTENTE.md', 'borrada/'],
    );
  }));

test('artefacto huérfano: un archivo borrado del disco pero aún en el índice de git no cuenta como existente', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  handoff: HANDOFF.md'));
    repo.escribir('HANDOFF.md', '# H\n\nVer `SPEC.md` para el detalle.\n');
    repo.escribir('SPEC.md', '# Spec');
    repo.commit('inicio');

    esperaEstado(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano', 'aprobado');

    repo.borrar('SPEC.md'); // rm, no git rm: sigue en el índice
    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano');
    assert.equal(hs.length, 1);
    assert.match(hs[0]?.mensaje ?? '', /SPEC\.md/);
  }));

test('artefacto huérfano: lo que .gitignore cubre está ausente a propósito y no se reporta', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  agents: AGENTS.md'));
    repo.escribir('.gitignore', 'dist/\n.env\n');
    repo.escribir('AGENTS.md', '# A\n\nNo edites `dist/`: se regenera. Las credenciales van en `.env`. Pero `build/` sí falta.\n');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano');
    assert.deepEqual(hs.map((h) => h.mensaje), ['AGENTS.md menciona build/, que no existe']);
  }));

test('artefacto huérfano: una ruta cuya primera carpeta no existe habla de otro árbol y no se reporta', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  spec: SPEC.md'));
    repo.escribir(
      'SPEC.md',
      ['# Spec', 'Un proyecto típico tiene `docs/ADR.md` y `.ai-first/manifest.json`.', 'Este repo sí tiene `public/logo/`, que falta.'].join('\n'),
    );
    repo.escribir('public/favicon.svg', '<svg/>');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano');
    assert.equal(hs.length, 1);
    assert.match(hs[0]?.mensaje ?? '', /public\/logo\//);
  }));

test('artefacto huérfano: URLs del sitio, refs de git, extensiones sueltas y elipsis no son rutas', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  handoff: HANDOFF.md'));
    repo.escribir(
      'HANDOFF.md',
      [
        '# H',
        'El manual vive en `/docs` y la portada en [inicio](/docs/parte-1/…).',
        'Compara `origin/dev` con `origin/prod`; el comando es `/ai-first`.',
        'La pieza es un `.glb` y los capítulos son `.mdx`; ver `src/content/…` y `docs/...`.',
        'Credenciales en `.env` y `.env.local`.',
      ].join('\n'),
    );
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano', 'aprobado');
  }));

test('artefacto huérfano: las rutas relativas al documento también resuelven', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  adr: docs/ADR.md'));
    repo.escribir('docs/ADR.md', '# ADR\n\nVer [notas](TECH_NOTES.md) y `../src/a.ts`.\n');
    repo.escribir('docs/TECH_NOTES.md', '# N');
    repo.escribir('src/a.ts', 'export {}');
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'artefacto-huerfano', 'aprobado');
  }));

// ---------------------------------------------------------------- check 5

const CON_INVENTARIO = `artefactos:
  inventario_componentes: docs/COMPONENTES.md
  componentes_dir: src/components/`;

test('inventario: un componente en disco que el inventario no menciona es P2', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_INVENTARIO));
    repo.escribir('src/components/Boton.tsx', 'export const Boton = 1;');
    repo.escribir('src/components/Tarjeta.tsx', 'export const Tarjeta = 1;');
    repo.escribir('src/components/Boton.test.tsx', '');
    repo.escribir('src/components/index.ts', 'export * from "./Boton";');
    repo.escribir('src/components/Modal/index.tsx', 'export const Modal = 1;');
    repo.escribir('docs/COMPONENTES.md', '# Componentes\n\n## Boton\n\nEl `Boton` principal.\n\n## Modal\n');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'inventario-componentes');
    assert.equal(hs.length, 1);
    assert.match(hs[0]?.mensaje ?? '', /^Tarjeta existe en/);
    assert.equal(hs[0]?.ruta, 'src/components/Tarjeta.tsx');
  }));

test('inventario: un encabezado PascalCase sin componente detrás es P2', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_INVENTARIO));
    repo.escribir('src/components/Boton.tsx', '');
    repo.escribir('docs/COMPONENTES.md', '# Componentes\n\n## Boton\n\n## `Acordeon`\n\n## Notas generales\n');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'inventario-componentes');
    assert.equal(hs.length, 1);
    assert.match(hs[0]?.mensaje ?? '', /documenta Acordeon, que ya no existe/);
    assert.equal(hs[0]?.ruta, 'docs/COMPONENTES.md:5');
  }));

test('inventario: un renombre sin actualizar el inventario se caza por el nombre nuevo', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_INVENTARIO));
    repo.escribir('src/components/BotonPrimario.tsx', '');
    repo.escribir('docs/COMPONENTES.md', '# Componentes\n\n## Boton\n');
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'inventario-componentes');
    assert.equal(hs.length, 1);
    assert.match(hs[0]?.mensaje ?? '', /^BotonPrimario existe en/);
  }));

test('inventario: los títulos de sección en español no se confunden con componentes', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd(CON_INVENTARIO));
    repo.escribir('src/components/Boton.tsx', '');
    repo.escribir(
      'docs/COMPONENTES.md',
      '# Componentes\n\n## Formularios\n\n### Boton\n\n## Navegacion\n\n### <Boton />\n\n## BarraLateral\n',
    );
    repo.commit('inicio');

    const hs = hallazgos(await auditar({ raiz: repo.raiz }), 'inventario-componentes');
    assert.equal(hs.length, 1, 'sólo BarraLateral, que tiene joroba interna y no existe');
    assert.match(hs[0]?.mensaje ?? '', /documenta BarraLateral/);
  }));

test('inventario: sin las dos claves se omite', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('artefactos:\n  componentes_dir: src/components/'));
    repo.commit('inicio');
    esperaEstado(await auditar({ raiz: repo.raiz }), 'inventario-componentes', 'omitido');
  }));

// ---------------------------------------------------------------- integración

test('el ejemplo de la landing: 1 P0 + 1 P1 + 1 P2 = 68 y sale con 1', () =>
  conRepo(async (repo) => {
    repo.escribir(
      'AI-FIRST.md',
      aiFirstMd(`zonas_prohibidas:
  - migrations/
superficies_de_decision:
  - src/lib/queue.ts
artefactos:
  adr: docs/ADR.md
  arquitectura: docs/ARQUITECTURA.md`),
    );
    repo.escribir('docs/ADR.md', ADR_BASE);
    repo.escribir('docs/ARQUITECTURA.md', '# A\n\nVer `docs/borrado.md`.\n');
    repo.escribir('migrations/001.sql', 'a');
    repo.escribir('src/lib/queue.ts', 'a');
    repo.commit('inicio');

    repo.escribir('migrations/001.sql', 'b');
    repo.escribir('src/lib/queue.ts', 'b');
    const informe = await auditar({ raiz: repo.raiz });

    assert.deepEqual(informe.conteo, { p0: 1, p1: 1, p2: 1 });
    assert.equal(informe.entropia, 68);
    assert.equal(informe.codigoDeSalida, 1);
  }));

test('--registrar escribe la auditoría en el frontmatter; sin ella no toca el archivo', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('zonas_prohibidas:\n  - migrations/'));
    repo.escribir('migrations/001.sql', 'a');
    repo.commit('inicio');
    repo.escribir('migrations/001.sql', 'b');

    await auditar({ raiz: repo.raiz });
    assert.equal(repo.git('status', '--porcelain', 'AI-FIRST.md').trim(), '');

    const informe = await auditar({ raiz: repo.raiz, registrar: true, hoy: '2026-09-17' });
    assert.equal(informe.aiFirst.auditoria, undefined, 'el informe refleja lo leído antes de registrar');
    const releido = await auditar({ raiz: repo.raiz });
    assert.deepEqual(releido.aiFirst.auditoria, { fecha: '2026-09-17', entropia: 40, hallazgos: { p0: 1, p1: 0, p2: 0 } });
  }));

test('una base inexistente es error de uso, no un resultado', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd());
    repo.commit('inicio');
    await assert.rejects(auditar({ raiz: repo.raiz, base: 'no-existe' }), /no existe en este repositorio/);
  }));
