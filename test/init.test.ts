import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { test } from 'node:test';
import { interpretar } from '../src/ai-first-md.js';
import { auditar } from '../src/audit.js';
import { listarArchivos } from '../src/git.js';
import {
  MARCA_FIN,
  MARCA_INICIO,
  SKILLS_POR_DEFECTO,
  carpetaSkillsDelPaquete,
  iniciar,
  proyectoDocumentado,
  skillsDelPaquete,
  type Escaneo,
} from '../src/init.js';
import { entrevistar } from '../src/entrevista.js';
import { crearRepo, type Repo } from './ayuda.js';

/** Lo que init deja además de AI-FIRST.md y el ADR, en el orden en que lo escribe. */
const ESTRUCTURA = ['docs/SESSION_LOG.md', 'docs/changes/CHANGE_LOG.md', 'docs/changes/pending/.gitkeep'];
const SKILLS_DEFECTO_RUTAS = SKILLS_POR_DEFECTO.map((s) => `.agents/skills/${s}`);

function esEnlace(ruta: string): boolean {
  return lstatSync(ruta).isSymbolicLink();
}

/** Una foto del repo: cada archivo con su contenido, cada enlace con su destino. */
function foto(raiz: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const ruta of listarArchivos(raiz)) {
    const absoluta = join(raiz, ruta);
    salida[ruta] = esEnlace(absoluta) ? `→ ${readlinkSync(absoluta)}` : readFileSync(absoluta, 'utf8');
  }
  return salida;
}

async function conRepo(fn: (repo: Repo) => Promise<void>) {
  const repo = crearRepo();
  try {
    await fn(repo);
  } finally {
    repo.limpiar();
  }
}

function proyectoTipico(repo: Repo) {
  repo.escribir('package.json', JSON.stringify({ name: '@acme/crm', scripts: { build: 'tsc', test: 'node --test' } }));
  repo.escribir('pnpm-lock.yaml', '');
  repo.escribir('prisma/migrations/001/migration.sql', 'create table a;');
  repo.escribir('prisma/schema.prisma', 'model A {}');
  repo.escribir('infra/main.tf', 'resource {}');
  repo.escribir('vite.config.ts', 'export default {}');
  repo.escribir('.github/workflows/ci.yml', 'on: push');
  repo.escribir('AGENTS.md', '# Reglas');
  repo.escribir('docs/ARQUITECTURA.md', '# Arq');
  repo.escribir('docs/TECH_NOTES.md', '# Notas');
  repo.escribir('src/components/Boton.tsx', '');
  repo.escribir('LICENSE', 'Apache');
  repo.commit('inicio');
}

test('init escribe AI-FIRST.md con lo que encuentra, y audit lo lee', () =>
  conRepo(async (repo) => {
    proyectoTipico(repo);

    const { escaneo, escritos, saltados } = await iniciar({ raiz: repo.raiz, hoy: '2026-09-17' });
    assert.deepEqual(escritos, ['AI-FIRST.md', 'docs/ADR.md', ...ESTRUCTURA, ...SKILLS_DEFECTO_RUTAS, '.claude/skills', 'AGENTS.md']);
    assert.deepEqual(saltados, []);

    const texto = readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8');
    const a = interpretar(texto);

    assert.equal(a.proyecto, 'crm', 'sin el scope');
    assert.equal(a.verificacion, 'pnpm run build && pnpm run test');
    assert.equal(a.actualizado, '2026-09-17');

    const rutas = a.zonas_prohibidas.map((z) => z.ruta);
    assert.deepEqual(rutas, ['prisma/migrations/', 'infra/', 'LICENSE', '.env*']);
    assert.ok(a.zonas_prohibidas.every((z) => z.razon && z.desde === '2026-09-17'));

    assert.deepEqual(a.superficies_de_decision, ['**/*.config.*', '**/schema.prisma', '.github/workflows/*.yml']);

    assert.equal(a.artefactos.agents, 'AGENTS.md');
    assert.equal(a.artefactos.arquitectura, 'docs/ARQUITECTURA.md');
    assert.equal(a.artefactos.tech_notes, 'docs/TECH_NOTES.md');
    assert.equal(a.artefactos.adr, 'docs/ADR.md');
    assert.equal(a.artefactos.componentes_dir, undefined, 'sólo sugerido en comentario');
    assert.match(texto, /# componentes_dir: "src\/components\/"/);
    assert.equal(escaneo.componentesDir, 'src/components/');

    assert.match(texto, /# Versión del FORMATO/, 'conserva los comentarios que explican cada bloque');
    assert.match(texto, /Por qué `prisma\/migrations\/` es Zona Prohibida/);

    const informe = await auditar({ raiz: repo.raiz });
    assert.equal(informe.entropia, 0, `lo que init escribe debe auditar limpio:\n${JSON.stringify(informe.resultados, null, 2)}`);
    assert.equal(informe.resultados.find((r) => r.check === 'decision-sin-adr')?.estado, 'aprobado');
  }));

test('init en un repo vacío deja el repo configurado entero: criterio 2 de la spec', () =>
  conRepo(async (repo) => {
    repo.escribir('README.md', '# Hola');
    repo.commit('inicio');

    const { escritos, saltados, sugeridos } = await iniciar({ raiz: repo.raiz, hoy: '2026-09-17' });
    assert.deepEqual(escritos, ['AI-FIRST.md', 'docs/ADR.md', ...ESTRUCTURA, ...SKILLS_DEFECTO_RUTAS, '.claude/skills', 'AGENTS.md']);
    assert.deepEqual(saltados, []);
    assert.deepEqual(sugeridos, [], 'en un AI-FIRST.md propio no hay nada que sugerir: alcance.spec sale declarado');

    const texto = readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8');
    const a = interpretar(texto);
    assert.deepEqual(a.zonas_prohibidas.map((z) => z.ruta), ['.env*']);
    assert.deepEqual(a.superficies_de_decision, []);
    assert.match(texto, /# superficies_de_decision:/, 'las sugiere comentadas');
    assert.equal(a.verificacion, undefined);
    assert.match(texto, /# verificacion: /);
    assert.equal(a.alcance.spec, 'docs/changes/pending/', 'declarado, no comentado: la carpeta acaba de crearse');
    assert.equal(a.artefactos.adr, 'docs/ADR.md', 'no había docs/, pero init la crea en la misma corrida');
    assert.equal(a.artefactos.agents, 'AGENTS.md', 'init lo acaba de crear');
    assert.equal(a.artefactos.session_log, undefined, 'la cronología no entra en artefactos (ADR-015)');

    const adr = readFileSync(join(repo.raiz, 'docs/ADR.md'), 'utf8');
    assert.match(adr, /^# Registro de decisiones/);
    assert.match(adr, /ADR-001/, 'trae el formato de ejemplo, comentado');
    assert.match(readFileSync(join(repo.raiz, 'docs/SESSION_LOG.md'), 'utf8'), /^# Session Log\n\n> Registro cronológico/);
    assert.match(readFileSync(join(repo.raiz, 'docs/changes/CHANGE_LOG.md'), 'utf8'), /^# Registro de cambios\n\n> Resumen permanente/);
    assert.ok(existsSync(join(repo.raiz, 'docs/changes/pending/.gitkeep')));

    for (const skill of SKILLS_POR_DEFECTO) {
      const destino = join(repo.raiz, '.agents/skills', skill);
      assert.ok(!esEnlace(destino), `${skill} es copia, no enlace`);
      assert.equal(readFileSync(join(destino, 'SKILL.md'), 'utf8'), readFileSync(join(carpetaSkillsDelPaquete(), skill, 'SKILL.md'), 'utf8'));
    }
    assert.ok(existsSync(join(repo.raiz, '.agents/skills/protocolo-cambios/references')), 'copia la carpeta entera, con sus referencias');
    assert.ok(!existsSync(join(repo.raiz, '.agents/skills/protocolo-ux')), 'las de UX no van por defecto');

    const enlaceClaude = join(repo.raiz, '.claude/skills');
    assert.ok(esEnlace(enlaceClaude));
    assert.equal(readlinkSync(enlaceClaude), '../.agents/skills');

    const agents = readFileSync(join(repo.raiz, 'AGENTS.md'), 'utf8');
    assert.match(agents, /AGENTS_MD_TEMPLATE\.md/, 'apunta al template');
    assert.ok(agents.includes(MARCA_INICIO) && agents.includes(MARCA_FIN));
    assert.match(agents, /copiadas del paquete/);
    assert.match(agents, /\| `protocolo-cierre` \|/);
    assert.match(agents, /\| Registro de decisiones \| `docs\/ADR\.md` \|/);

    const informe = await auditar({ raiz: repo.raiz });
    assert.equal(informe.entropia, 0, JSON.stringify(informe.resultados, null, 2));
  }));

test('init nunca sobreescribe AI-FIRST.md: lo salta, lo reporta y sigue', () =>
  conRepo(async (repo) => {
    const original = '---\nformato: 1\nproyecto: mio\n---\n';
    repo.escribir('AI-FIRST.md', original);
    repo.commit('inicio');

    const { escritos, saltados, sugeridos, items } = await iniciar({ raiz: repo.raiz });
    assert.deepEqual(saltados, ['AI-FIRST.md']);
    assert.ok(escritos.includes('docs/ADR.md'), 'saltar no detiene: el ADR que falta sí se escribe');
    assert.equal(readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8'), original, 'ni un byte distinto');
    assert.ok(existsSync(join(repo.raiz, 'docs/ADR.md')));
    assert.deepEqual(sugeridos, ['AI-FIRST.md (alcance.spec)'], 'lo que no puede escribir ahí, lo sugiere');
    assert.match(items.find((i) => i.estado === 'sugerido')?.razon ?? '', /spec: docs\/changes\/pending\//);
  }));

test('init con AI-FIRST.md y ADR ya presentes no escribe nada y no es error', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', '---\nformato: 1\nproyecto: mio\n---\n');
    repo.escribir('docs/ADR.md', '# Mis decisiones\n');
    repo.commit('inicio');

    const { escritos, saltados } = await iniciar({ raiz: repo.raiz });
    assert.ok(!escritos.includes('AI-FIRST.md') && !escritos.includes('docs/ADR.md'));
    assert.deepEqual(saltados.slice(0, 2), ['AI-FIRST.md', 'docs/ADR.md']);
    assert.equal(readFileSync(join(repo.raiz, 'docs/ADR.md'), 'utf8'), '# Mis decisiones\n');
  }));

test('init respeta un ADR.md que ya existe y lo declara', () =>
  conRepo(async (repo) => {
    repo.escribir('docs/ADR.md', '# Mis decisiones\n\n## ADR-001 — Algo\n');
    repo.commit('inicio');

    const { escritos, saltados } = await iniciar({ raiz: repo.raiz });
    assert.equal(escritos[0], 'AI-FIRST.md');
    assert.deepEqual(saltados, ['docs/ADR.md'], 'el ADR existente se reporta como saltado');
    assert.match(readFileSync(join(repo.raiz, 'docs/ADR.md'), 'utf8'), /^# Mis decisiones/);
    const a = interpretar(readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8'));
    assert.equal(a.artefactos.adr, 'docs/ADR.md');
  }));

test('init sin package.json usa el nombre de la carpeta y detecta npm por defecto', () =>
  conRepo(async (repo) => {
    repo.escribir('main.py', 'print(1)');
    repo.commit('inicio');

    const { escaneo } = await iniciar({ raiz: repo.raiz });
    assert.equal(escaneo.proyecto, repo.raiz.split('/').pop());
    assert.equal(escaneo.verificacion, undefined);
  }));

test('init con yarn deduce la verificación con yarn', () =>
  conRepo(async (repo) => {
    repo.escribir('package.json', JSON.stringify({ name: 'x', scripts: { test: 'jest' } }));
    repo.escribir('yarn.lock', '');
    repo.commit('inicio');

    const { escaneo } = await iniciar({ raiz: repo.raiz });
    assert.equal(escaneo.verificacion, 'yarn run test');
  }));

test('init sobre una carpeta que todavía no es repo la inicializa y sigue', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'ai-first-vacia-'));
  try {
    assert.ok(!existsSync(join(carpeta, '.git')));
    const { items } = await iniciar({ raiz: carpeta });
    assert.equal(items.find((i) => i.ruta === '.git/')?.estado, 'escrito');
    assert.ok(existsSync(join(carpeta, '.git')), 'un proyecto que no existe se arranca acá, no en otro comando');
    assert.ok(existsSync(join(carpeta, 'AI-FIRST.md')), 'y el resto del init corre igual');

    // La segunda corrida ya encuentra el repo y no reporta haberlo creado.
    const segunda = await iniciar({ raiz: carpeta });
    assert.equal(segunda.items.find((i) => i.ruta === '.git/'), undefined);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('init sobre una carpeta que no existe sigue siendo error de uso', async () => {
  await assert.rejects(iniciar({ raiz: join(tmpdir(), 'ai-first-no-existe-jamas') }), /no existe/);
});

test('init sobre un repo ya configurado salta todo, y la segunda corrida no cambia nada: criterio 1', () =>
  conRepo(async (repo) => {
    repo.escribir('README.md', '# Hola');
    repo.escribir('AGENTS.md', `# Reglas\n\nPrimera regla.\n\n${MARCA_INICIO}\nviejo\n${MARCA_FIN}\n\nÚltima regla.\n`);
    repo.commit('inicio');

    const primera = await iniciar({ raiz: repo.raiz, hoy: '2026-09-18', enlazar: true });
    assert.ok(primera.escritos.includes('AGENTS.md'));
    const despuesDeUna = foto(repo.raiz);
    assert.ok(despuesDeUna['AGENTS.md']?.startsWith('# Reglas\n\nPrimera regla.\n\n'));
    assert.ok(despuesDeUna['AGENTS.md']?.endsWith('\n\nÚltima regla.\n'));
    assert.ok(!despuesDeUna['AGENTS.md']?.includes('viejo'));

    const segunda = await iniciar({ raiz: repo.raiz, hoy: '2026-09-18', enlazar: true });
    assert.deepEqual(segunda.escritos, []);
    assert.deepEqual(segunda.sugeridos, []);
    assert.deepEqual(segunda.saltados, [
      'AI-FIRST.md',
      'AI-FIRST.md (alcance.spec)',
      'docs/ADR.md',
      ...ESTRUCTURA,
      ...SKILLS_DEFECTO_RUTAS,
      '.claude/skills',
      'AGENTS.md',
    ]);
    assert.deepEqual(foto(repo.raiz), despuesDeUna, 'idempotente: ni un byte distinto');
  }));

test('init --enlazar recrea los enlaces relativos, no toca las skills propias y salta la carpeta real: criterio 3', () =>
  conRepo(async (repo) => {
    repo.escribir('.agents/skills/criterio/SKILL.md', '---\nname: criterio\n---\nmía');
    repo.escribir('.agents/skills/protocolo-cierre/SKILL.md', 'mi versión');
    repo.commit('inicio');

    const { items } = await iniciar({ raiz: repo.raiz, enlazar: true });
    const cierre = items.find((i) => i.ruta === '.agents/skills/protocolo-cierre');
    assert.equal(cierre?.estado, 'saltado', 'la carpeta real se salta entera y se dice');
    assert.equal(readFileSync(join(repo.raiz, '.agents/skills/protocolo-cierre/SKILL.md'), 'utf8'), 'mi versión', 'no se fusiona nada dentro');

    for (const skill of SKILLS_POR_DEFECTO.filter((s) => s !== 'protocolo-cierre')) {
      const destino = join(repo.raiz, '.agents/skills', skill);
      assert.ok(esEnlace(destino), `${skill} es enlace`);
      const objetivo = readlinkSync(destino);
      assert.ok(!isAbsolute(objetivo), `el enlace es relativo: ${objetivo}`);
      assert.equal(realpathSync(resolve(dirname(destino), objetivo)), realpathSync(join(carpetaSkillsDelPaquete(), skill)));
      assert.ok(existsSync(join(destino, 'SKILL.md')), `el enlace de ${skill} resuelve en disco, no sólo en el papel`);
    }
    assert.ok(!esEnlace(join(repo.raiz, '.agents/skills/criterio')), 'criterio no es del paquete y no se toca');
    assert.equal(items.filter((i) => i.ruta.includes('criterio')).length, 0, 'ni se reporta');

    const agents = readFileSync(join(repo.raiz, 'AGENTS.md'), 'utf8');
    assert.match(agents, /unas copiadas del paquete y otras enlazadas/, 'protocolo-cierre es carpeta real; el resto, enlaces');
    assert.doesNotMatch(agents, /criterio/, 'el bloque lista sólo las skills del paquete');
  }));

test('init con .claude/skills como directorio real no crea el enlace y lo dice: criterio 4', () =>
  conRepo(async (repo) => {
    repo.escribir('.claude/skills/mia/SKILL.md', 'mía');
    repo.commit('inicio');

    const { items } = await iniciar({ raiz: repo.raiz });
    const enlace = items.find((i) => i.ruta === '.claude/skills');
    assert.equal(enlace?.estado, 'saltado');
    assert.match(enlace?.razon ?? '', /directorio real/);
    assert.ok(!esEnlace(join(repo.raiz, '.claude/skills')));
    assert.ok(!existsSync(join(repo.raiz, '.claude/skills/skills')), 'el error del ln -s que la spec cuenta');
    assert.ok(existsSync(join(repo.raiz, '.claude/skills/mia/SKILL.md')));
  }));

test('init --skills elige: todas, una lista, y una inventada es error de uso antes de escribir nada: criterio 5', async () => {
  await conRepo(async (repo) => {
    repo.commit('inicio');
    const { items } = await iniciar({ raiz: repo.raiz, skills: 'todas' });
    const skills = items.filter((i) => i.ruta.startsWith('.agents/skills/'));
    assert.equal(skills.length, skillsDelPaquete().length);
    assert.deepEqual(skills.map((i) => i.ruta.split('/').pop()).sort(), skillsDelPaquete());
    assert.ok(skills.every((i) => i.estado === 'escrito'));
  });

  await conRepo(async (repo) => {
    repo.commit('inicio');
    const { items } = await iniciar({ raiz: repo.raiz, skills: ['i18n', 'ux-writer'] });
    assert.deepEqual(
      items.filter((i) => i.ruta.startsWith('.agents/skills/')).map((i) => i.ruta),
      ['.agents/skills/i18n', '.agents/skills/ux-writer'],
    );
    assert.ok(existsSync(join(repo.raiz, '.agents/skills/ux-writer/references')));
    assert.ok(!existsSync(join(repo.raiz, '.agents/skills/protocolo-features')));
  });

  await conRepo(async (repo) => {
    repo.commit('inicio');
    await assert.rejects(iniciar({ raiz: repo.raiz, skills: ['test-fix', 'inventada'] }), /«inventada»/);
    assert.ok(!existsSync(join(repo.raiz, 'AI-FIRST.md')), 'el error llega antes de escribir nada');
    assert.ok(!existsSync(join(repo.raiz, '.agents')));
  });
});

test('init en AGENTS.md sólo toca su bloque: lo añade, lo reemplaza, y con una sola marca no escribe: criterio 6', async () => {
  const propias = 'Línea uno.\nLínea dos.\nLínea tres.\n';

  await conRepo(async (repo) => {
    repo.escribir('AGENTS.md', propias);
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });
    const agents = readFileSync(join(repo.raiz, 'AGENTS.md'), 'utf8');
    assert.ok(agents.startsWith(`${propias}\n${MARCA_INICIO}\n`), 'las tres líneas intactas y el bloque al final');
    assert.ok(agents.endsWith(`${MARCA_FIN}\n`));
    assert.equal(agents.split(MARCA_INICIO).length, 2, 'un solo bloque');
  });

  await conRepo(async (repo) => {
    repo.escribir('AGENTS.md', `Antes.\n${MARCA_INICIO}\ntexto viejo\n${MARCA_FIN}\nDespués.\n`);
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });
    const agents = readFileSync(join(repo.raiz, 'AGENTS.md'), 'utf8');
    assert.ok(agents.startsWith(`Antes.\n${MARCA_INICIO}\n### Metodología AI-First`));
    assert.ok(agents.endsWith(`${MARCA_FIN}\nDespués.\n`));
    assert.ok(!agents.includes('texto viejo'));
  });

  await conRepo(async (repo) => {
    const roto = `Antes.\n${MARCA_INICIO}\nsin cierre\n`;
    repo.escribir('AGENTS.md', roto);
    repo.commit('inicio');
    await assert.rejects(iniciar({ raiz: repo.raiz }), /sin su pareja/);
    assert.equal(readFileSync(join(repo.raiz, 'AGENTS.md'), 'utf8'), roto, 'un bloque roto se arregla a mano');
    assert.ok(!existsSync(join(repo.raiz, 'AI-FIRST.md')), 'y no se escribe nada más');
  });
});

test('init no sugiere alcance.spec cuando el AI-FIRST.md existente ya lo declara', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', '---\nformato: 1\nproyecto: mio\nalcance:\n  spec: docs/changes/pending/\n---\n');
    repo.commit('inicio');
    const { sugeridos, items } = await iniciar({ raiz: repo.raiz });
    assert.deepEqual(sugeridos, []);
    assert.equal(items.find((i) => i.ruta === 'AI-FIRST.md (alcance.spec)')?.razon, 'ya declarado');
  }));

// ---------------------------------------------------------------------------
// La entrevista
// ---------------------------------------------------------------------------

/** Un entrevistador que contesta por clave; lo que no esté, con Enter. */
function respondiendo(valores: Record<string, string>) {
  return (escaneo: Escaneo) => entrevistar(escaneo, async (p) => valores[p.clave] ?? '');
}

test('con entrevista, init escribe el perfil, instala lo que el perfil pide y adapta cada skill: criterio 1', () =>
  conRepo(async (repo) => {
    repo.escribir('package.json', JSON.stringify({ name: 'tienda', scripts: { test: 'vitest', lint: 'eslint .' } }));
    repo.commit('inicio');

    const { items } = await iniciar({
      raiz: repo.raiz,
      hoy: '2026-09-21',
      entrevistar: respondiendo({ fase: 'mvp', producto: 'landing', repositorio: 'unico', secuencia: 'contenido' }),
    });

    const a = interpretar(readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8'));
    assert.deepEqual(a.perfil, { producto: 'landing', repositorio: 'unico' });
    assert.equal(a.fase, 'mvp');
    assert.equal(a.verificacion, 'npm test', 'lo deducido, confirmado con Enter');

    // Una landing tiene interfaz: entran las de UX, y la de arranque por haber entrevistado.
    assert.ok(existsSync(join(repo.raiz, '.agents/skills/ux-writer')));
    assert.ok(existsSync(join(repo.raiz, '.agents/skills/protocolo-arranque')));
    assert.ok(!existsSync(join(repo.raiz, '.agents/skills/information-architecture')), 'una landing no navega por módulos');

    const features = readFileSync(join(repo.raiz, '.agents/skills/protocolo-features/SKILL.md'), 'utf8');
    assert.ok(features.includes(MARCA_INICIO) && features.includes(MARCA_FIN));
    assert.match(features, /## Adaptación a tu proyecto\n\n<!-- ai-first:inicio -->/, 'el bloque entra bajo su encabezado');
    assert.match(features, /contenido y copia/, 'la secuencia elegida');
    assert.match(features, /npm run lint/);
    assert.match(features, /Ajusta la secuencia de implementación/, 'lo que la skill ya decía sigue fuera de las marcas');

    // La que no aplica a este perfil se salta y lo dice.
    assert.equal(items.find((i) => i.ruta === '.agents/skills/version-bump/SKILL.md')?.estado, 'escrito');

    const informe = await auditar({ raiz: repo.raiz });
    assert.equal(informe.entropia, 0, JSON.stringify(informe.resultados, null, 2));
  }));

test('un proyecto ya documentado se detecta, y sin entrevista nada se adapta: criterio 2', () =>
  conRepo(async (repo) => {
    repo.escribir('AGENTS.md', '# Reglas propias\n');
    repo.escribir('docs/PRD.md', '# Producto');
    repo.escribir('docs/specs/checkout.md', '# Checkout');
    repo.commit('inicio');

    const señales = proyectoDocumentado(repo.raiz);
    assert.ok(señales.includes('AGENTS.md'));
    assert.ok(señales.includes('docs/PRD.md'));

    // Sin entrevistador, init se comporta como siempre: instala y no adapta.
    const { items } = await iniciar({ raiz: repo.raiz });
    assert.ok(!items.some((i) => i.ruta.endsWith('/SKILL.md')), 'ninguna skill se toca');
    const features = readFileSync(join(repo.raiz, '.agents/skills/protocolo-features/SKILL.md'), 'utf8');
    assert.ok(!features.includes(MARCA_INICIO));
    assert.ok(!existsSync(join(repo.raiz, '.agents/skills/protocolo-arranque')), 'sin entrevista no entra');
  }));

test('lo que init escribe no cuenta como documentación previa en la segunda corrida', () =>
  conRepo(async (repo) => {
    repo.escribir('README.md', '# Hola');
    repo.commit('inicio');
    assert.deepEqual(proyectoDocumentado(repo.raiz), [], 'un repo pelado no está documentado');

    await iniciar({ raiz: repo.raiz });
    repo.commit('init');
    assert.deepEqual(proyectoDocumentado(repo.raiz), ['AI-FIRST.md', 'AGENTS.md'], 'sólo el contrato y el de agentes, que init acaba de crear');
  }));

test('una skill enlazada nunca se adapta: se cambiaría la fuente del paquete, no la copia: criterio 5', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    const antes = readFileSync(join(carpetaSkillsDelPaquete(), 'protocolo-features/SKILL.md'), 'utf8');

    const { items } = await iniciar({
      raiz: repo.raiz,
      enlazar: true,
      entrevistar: respondiendo({ producto: 'api' }),
    });

    const item = items.find((i) => i.ruta === '.agents/skills/protocolo-features/SKILL.md');
    assert.equal(item?.estado, 'sugerido');
    assert.match(item?.razon ?? '', /enlace a la carpeta del paquete/);
    assert.equal(readFileSync(join(carpetaSkillsDelPaquete(), 'protocolo-features/SKILL.md'), 'utf8'), antes, 'la fuente del paquete, intacta');
  }));

test('la entrevista es idempotente: mismas respuestas, ningún cambio: criterio 6', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    const respuestas = respondiendo({ producto: 'api', secuencia: 'contrato-cli', verificacion: 'make test' });

    await iniciar({ raiz: repo.raiz, hoy: '2026-09-21', entrevistar: respuestas });
    repo.commit('init');
    const antes = foto(repo.raiz);

    const { items } = await iniciar({ raiz: repo.raiz, hoy: '2026-09-21', entrevistar: respuestas });
    assert.deepEqual(foto(repo.raiz), antes, 'la segunda corrida no cambia nada');
    assert.ok(items.every((i) => i.estado !== 'escrito'), 'y lo reporta todo como saltado o sugerido');

    // Con otra respuesta cambia sólo lo de dentro de las marcas.
    await iniciar({ raiz: repo.raiz, hoy: '2026-09-21', entrevistar: respondiendo({ producto: 'api', secuencia: 'hexagonal', verificacion: 'make test' }) });
    const features = readFileSync(join(repo.raiz, '.agents/skills/protocolo-features/SKILL.md'), 'utf8');
    assert.match(features, /infraestructura backend/, 'la secuencia nueva');
    assert.ok(!features.includes('interfaz de línea de comandos'), 'y la vieja se fue');
    assert.match(features, /Capítulo de referencia/, 'lo de fuera de las marcas sigue intacto');
  }));
