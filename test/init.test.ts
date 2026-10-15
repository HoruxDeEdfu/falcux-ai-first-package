import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
  instalarSkillsSueltas,
  proyectoDocumentado,
  skillsDelPaquete,
  type Escaneo,
} from '../src/init.js';
import { entrevistar, entrevistarPara, SKILLS_FIJAS, type AlcanceEntrevista } from '../src/entrevista.js';
import { aiFirstMd, crearRepo, type Repo } from './ayuda.js';

/** Lo que init deja además de AI-FIRST.md y el ADR, en el orden en que lo escribe. */
const ESTRUCTURA = ['docs/SESSION_LOG.md', 'docs/changes/CHANGE_LOG.md', 'docs/changes/pending/.gitkeep'];
const SKILLS_DEFECTO_RUTAS = SKILLS_POR_DEFECTO.map((s) => `.agents/skills/${s}`);
const RUTA_ARRANQUE = '.agents/skills/protocolo-arranque';
/** El punto de control, en el orden en que init lo escribe: docs/specs/punto-de-control.md. */
const PUNTO_DE_CONTROL = ['.githooks/pre-push', 'core.hooksPath', '.github/workflows/ai-first.yml'];

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
    assert.deepEqual(escritos, ['AI-FIRST.md', 'docs/ADR.md', ...ESTRUCTURA, ...SKILLS_DEFECTO_RUTAS, '.claude/skills', ...PUNTO_DE_CONTROL, 'AGENTS.md']);
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
    assert.deepEqual(escritos, ['AI-FIRST.md', 'docs/ADR.md', ...ESTRUCTURA, ...SKILLS_DEFECTO_RUTAS, '.claude/skills', ...PUNTO_DE_CONTROL, 'AGENTS.md']);
    assert.deepEqual(saltados, []);
    // En un AI-FIRST.md propio no hay alcance.spec que sugerir: sale declarado.
    // Lo único sugerido es la skill que define un proyecto sin documentación (CHG-025).
    assert.deepEqual(sugeridos, [RUTA_ARRANQUE]);

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
    assert.deepEqual(sugeridos, ['AI-FIRST.md (alcance.spec)', 'AI-FIRST.md (perfil)'], 'lo que no puede escribir ahí, lo sugiere');
    assert.match(items.find((i) => i.estado === 'sugerido')?.razon ?? '', /spec: docs\/changes\/pending\//);
    // Sin perfil no hay con qué adaptar lo que acaba de instalar, y lo dice (CHG-026).
    assert.match(items.find((i) => i.ruta === 'AI-FIRST.md (perfil)')?.razon ?? '', /sin adaptar: protocolo-features/);
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
      ...PUNTO_DE_CONTROL,
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
      items.filter((i) => i.ruta.startsWith('.agents/skills/') && i.estado === 'escrito').map((i) => i.ruta),
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
    assert.ok(!sugeridos.includes('AI-FIRST.md (alcance.spec)'));
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

test('una skill que es copia de un workspace nunca se adapta: el sync la reescribiría (CHG-018)', () =>
  conRepo(async (repo) => {
    // Lo que deja el sync-context.sh de la plantilla de workspace: el frontmatter
    // arriba y la cabecera de copia justo después.
    const copia = [
      '---',
      'name: protocolo-features',
      'description: copia repartida',
      '---',
      '<!-- COPIA DE SOLO LECTURA — la genera sync-context.sh.',
      '     Original: mi-workspace · docs/repo-context/skills/protocolo-features/SKILL.md',
      '     Para corregir: edita el original allá y corre ./scripts/sync-context.sh -->',
      '',
      '# Protocolo de features',
      '',
      '## Adaptación a tu proyecto',
      '',
    ].join('\n');
    repo.escribir('.agents/skills/protocolo-features/SKILL.md', copia);
    repo.commit('inicio');

    const { items } = await iniciar({
      raiz: repo.raiz,
      entrevistar: respondiendo({ producto: 'api', secuencia: 'contenido' }),
    });

    const item = items.find((i) => i.ruta === '.agents/skills/protocolo-features/SKILL.md');
    assert.equal(item?.estado, 'sugerido');
    assert.match(item?.razon ?? '', /copia de solo lectura de un workspace/);
    assert.equal(readFileSync(join(repo.raiz, '.agents/skills/protocolo-features/SKILL.md'), 'utf8'), copia, 'la copia, intacta');

    // Las que init sí instaló en esta corrida se siguen adaptando.
    const cambios = readFileSync(join(repo.raiz, '.agents/skills/protocolo-cambios/SKILL.md'), 'utf8');
    assert.ok(cambios.includes(MARCA_INICIO), 'una skill sin la cabecera se adapta como siempre');
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

// ---------------------------------------------------------------------------
// Qué se instala lo elige la entrevista (CHG-020, ADR-025)
// ---------------------------------------------------------------------------

/** Como `respondiendo`, pero pasa el alcance que init calcula, igual que el CLI. */
function respondiendoConAlcance(valores: Record<string, string>) {
  return (escaneo: Escaneo, _documentado: string[], alcance: AlcanceEntrevista) =>
    entrevistar(escaneo, async (p) => valores[p.clave] ?? '', alcance);
}

const instaladas = (raiz: string) => skillsDelPaquete(join(raiz, '.agents/skills'));

test('lo elegido en la entrevista es lo que se instala: los protocolos siempre, el hook y el CI si se quieren', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({
      raiz: repo.raiz,
      hoy: '2026-09-30',
      entrevistar: respondiendoConAlcance({ producto: 'saas', skills: 'i18n', hook: 'no', ci: 'no' }),
    });

    assert.deepEqual(instaladas(repo.raiz), [...SKILLS_FIJAS, 'i18n'].sort(), 'ni lo que el perfil sugería ni las base');
    for (const ruta of PUNTO_DE_CONTROL.filter((r) => r !== 'core.hooksPath')) {
      assert.ok(!existsSync(join(repo.raiz, ruta)), `${ruta} no se escribe`);
    }

    // «ninguna» deja sólo los protocolos: la entrevista no puede quitarlos.
    const otro = crearRepo();
    try {
      otro.commit('inicio');
      await iniciar({ raiz: otro.raiz, hoy: '2026-09-30', entrevistar: respondiendoConAlcance({ skills: 'ninguna' }) });
      assert.deepEqual(instaladas(otro.raiz), [...SKILLS_FIJAS].sort());
      assert.ok(existsSync(join(otro.raiz, '.githooks/pre-push')), 'Enter en el hook lo instala, como sin entrevista');
    } finally {
      otro.limpiar();
    }
  }));

test('con Enter en las preguntas nuevas se instala lo mismo que el perfil instalaba antes', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    const valores = { producto: 'landing', secuencia: 'contenido' };
    await iniciar({ raiz: repo.raiz, hoy: '2026-09-30', entrevistar: respondiendoConAlcance(valores) });

    const antes = crearRepo();
    try {
      antes.commit('inicio');
      await iniciar({ raiz: antes.raiz, hoy: '2026-09-30', entrevistar: respondiendo(valores) });
      assert.deepEqual(instaladas(repo.raiz), instaladas(antes.raiz));
      assert.deepEqual(Object.keys(foto(repo.raiz)).sort(), Object.keys(foto(antes.raiz)).sort());
    } finally {
      antes.limpiar();
    }
  }));

test('lo que una bandera ya decidió no llega a la entrevista', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    const vistos: AlcanceEntrevista[] = [];
    await iniciar({
      raiz: repo.raiz,
      hoy: '2026-09-30',
      skills: ['test-fix'],
      hookLocal: true,
      entrevistar: (escaneo, documentado, alcance) => {
        vistos.push(alcance);
        return respondiendoConAlcance({ skills: 'i18n', ci: 'no' })(escaneo, documentado, alcance);
      },
    });

    assert.deepEqual(vistos, [{ hook: false, ci: true }], 'sin skills que ofrecer ni hook que preguntar');
    assert.deepEqual(instaladas(repo.raiz), ['test-fix'], '--skills gana a la respuesta');
    assert.ok(existsSync(join(repo.raiz, '.git/hooks/pre-push')), '--hook-local sigue valiendo');
    assert.ok(!existsSync(join(repo.raiz, '.github/workflows/ai-first.yml')), 'el «no» al CI sí cuenta');
  }));

// ---------------------------------------------------------------------------
// Un proyecto sin documentación que se queda sin protocolo-arranque (CHG-025)
// ---------------------------------------------------------------------------

const avisoDeArranque = (items: { ruta: string; estado: string; razon?: string }[]) =>
  items.find((i) => i.ruta === RUTA_ARRANQUE && i.estado === 'sugerido');

test('un repo sin documentación y sin entrevista avisa que falta protocolo-arranque, con el comando', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    const { items, sugeridos } = await iniciar({ raiz: repo.raiz });
    const aviso = avisoDeArranque(items);
    assert.ok(aviso, 'el repo recién creado recibe el aviso');
    assert.match(aviso.razon ?? '', /no tiene documentación/, 'nombra la causa');
    assert.match(aviso.razon ?? '', /npx @falcux\/ai-first@latest init --skills protocolo-arranque/, 'y el comando');
    assert.deepEqual(sugeridos, [RUTA_ARRANQUE]);
    assert.ok(!existsSync(join(repo.raiz, RUTA_ARRANQUE)), 'avisa, no instala');
  }));

test('una carpeta sin .git y un repo con código sin docs también avisan', async () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'ai-first-vacia-'));
  try {
    assert.ok(avisoDeArranque((await iniciar({ raiz: carpeta })).items));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }

  await conRepo(async (repo) => {
    repo.escribir('package.json', JSON.stringify({ name: 'api', scripts: { test: 'node --test' } }));
    repo.escribir('src/index.ts', 'export {};');
    repo.escribir('README.md', '# Api');
    repo.commit('inicio');
    assert.ok(avisoDeArranque((await iniciar({ raiz: repo.raiz })).items));
  });
});

test('con entrevista que deja protocolo-arranque marcada no hay aviso; si la quita, sí', async () => {
  await conRepo(async (repo) => {
    repo.commit('inicio');
    const { items } = await iniciar({ raiz: repo.raiz, hoy: '2026-10-15', entrevistar: respondiendo({ producto: 'api' }) });
    assert.ok(existsSync(join(repo.raiz, RUTA_ARRANQUE)));
    assert.equal(avisoDeArranque(items), undefined);
  });

  await conRepo(async (repo) => {
    repo.commit('inicio');
    const { items } = await iniciar({ raiz: repo.raiz, hoy: '2026-10-15', entrevistar: respondiendoConAlcance({ skills: 'ninguna' }) });
    assert.ok(avisoDeArranque(items), 'desmarcada en la entrevista');
  });

  await conRepo(async (repo) => {
    repo.commit('inicio');
    const { items } = await iniciar({ raiz: repo.raiz, skills: ['test-fix'] });
    assert.ok(avisoDeArranque(items), 'con --skills sin ella');
  });
});

test('un proyecto documentado o que ya tiene la skill no recibe el aviso', async () => {
  await conRepo(async (repo) => {
    repo.escribir('docs/PRD.md', '# Producto');
    repo.commit('inicio');
    assert.equal(avisoDeArranque((await iniciar({ raiz: repo.raiz })).items), undefined, 'un .md bajo docs/ basta');
  });

  await conRepo(async (repo) => {
    // Instalada por una corrida anterior y sin nada escrito todavía.
    repo.escribir(`${RUTA_ARRANQUE}/SKILL.md`, '# Arranque');
    repo.commit('inicio');
    const { items } = await iniciar({ raiz: repo.raiz });
    assert.equal(avisoDeArranque(items), undefined);
    assert.ok(!items.some((i) => i.ruta === RUTA_ARRANQUE), 'ni sugerida ni tocada');
  });
});

test('el aviso sale una sola vez: la segunda corrida ya encuentra el AGENTS.md de la primera', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    assert.ok(avisoDeArranque((await iniciar({ raiz: repo.raiz })).items));
    const segunda = await iniciar({ raiz: repo.raiz });
    assert.equal(avisoDeArranque(segunda.items), undefined);
    assert.ok(!segunda.sugeridos.includes(RUTA_ARRANQUE));
  }));

// ---------------------------------------------------------------------------
// Agregar una skill después, y skills sueltas (CHG-026, ADR-026, ADR-027)
// ---------------------------------------------------------------------------

const skillMd = (raiz: string, nombre: string) => readFileSync(join(raiz, '.agents/skills', nombre, 'SKILL.md'), 'utf8');

test('al entrevistar, AI-FIRST.md guarda lo que no se deduce, entre comillas, y audit lo lee', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({
      raiz: repo.raiz,
      hoy: '2026-10-15',
      entrevistar: respondiendo({ producto: 'cli', secuencia: 'contrato-cli', typecheck: 'tsc --noEmit', manifiesto: 'package.json' }),
    });

    const texto = readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8');
    assert.match(texto, /^adaptacion:\n {2}secuencia: "contrato-cli"\n {2}agentes: "no"\n {2}typecheck: "tsc --noEmit"\n {2}lint: ""\n {2}manifiesto: "package.json"$/m);
    assert.deepEqual(interpretar(texto).adaptacion, { secuencia: 'contrato-cli', agentes: 'no', typecheck: 'tsc --noEmit', lint: '', manifiesto: 'package.json' });
    const informe = await auditar({ raiz: repo.raiz });
    assert.equal(informe.entropia, 0, JSON.stringify(informe.resultados, null, 2));
  }));

test('una skill agregada después se adapta con lo guardado, sin preguntar, y las que estaban no se tocan', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({
      raiz: repo.raiz,
      hoy: '2026-10-15',
      skills: ['protocolo-features'],
      entrevistar: respondiendo({ producto: 'api', secuencia: 'vertical', verificacion: 'make test', typecheck: 'mypy .', agentes: 'si' }),
    });
    repo.commit('init');
    // Lo que el humano escribió dentro de las marcas de una skill ya instalada.
    const rutaFeatures = join(repo.raiz, '.agents/skills/protocolo-features/SKILL.md');
    const features = skillMd(repo.raiz, 'protocolo-features').replace('make test', 'make test-rapido');
    repo.escribir('.agents/skills/protocolo-features/SKILL.md', features);

    const { items } = await iniciar({ raiz: repo.raiz, hoy: '2026-10-15', skills: ['protocolo-features', 'test-fix'] });

    assert.equal(items.find((i) => i.ruta === '.agents/skills/test-fix/SKILL.md')?.estado, 'escrito');
    const testFix = skillMd(repo.raiz, 'test-fix');
    assert.ok(testFix.includes(MARCA_INICIO));
    assert.match(testFix, /`make test`/);
    assert.match(testFix, /`mypy \.`/);
    assert.match(testFix, /no declara un comando de lint/, 'el lint vacío es respuesta guardada');
    assert.match(testFix, /hay agentes en paralelo/);
    assert.equal(readFileSync(rutaFeatures, 'utf8'), features, 'la que ya estaba, ni un byte distinto');
    assert.ok(!items.some((i) => i.ruta === '.agents/skills/protocolo-features/SKILL.md'));
  }));

test('un AI-FIRST.md de la 0.6.x, con perfil y sin «adaptacion», adapta con lo que hay y calla lo que falta', () =>
  conRepo(async (repo) => {
    repo.escribir('AI-FIRST.md', aiFirstMd('verificacion: "cargo test"\nperfil:\n  producto: api\n  repositorio: unico'));
    repo.commit('inicio');

    await iniciar({ raiz: repo.raiz, skills: ['test-fix', 'protocolo-cierre'] });

    const testFix = skillMd(repo.raiz, 'test-fix');
    assert.match(testFix, /`cargo test`/);
    assert.ok(!testFix.includes('no declara'), 'lo que nunca se preguntó no se escribe como «no hay»');
    assert.ok(!testFix.includes('Delegación'));
    assert.ok(!skillMd(repo.raiz, 'protocolo-cierre').includes('Este proyecto no versiona'));
  }));

test('con entrevista sobre un AI-FIRST.md sin perfil, se sugiere el perfil y las respuestas para pegar', () =>
  conRepo(async (repo) => {
    const original = aiFirstMd();
    repo.escribir('AI-FIRST.md', original);
    repo.commit('inicio');

    const { items } = await iniciar({ raiz: repo.raiz, skills: ['test-fix'], entrevistar: respondiendo({ producto: 'cli', lint: 'biome check' }) });

    const item = items.find((i) => i.ruta === 'AI-FIRST.md (adaptacion)');
    assert.equal(item?.estado, 'sugerido');
    assert.match(item?.razon ?? '', /perfil: \{ producto: cli, repositorio: unico \}/);
    assert.match(item?.razon ?? '', /lint: "biome check"/);
    assert.equal(readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8'), original, 'sugerir no es escribir');
  }));

/** Una carpeta que no es repositorio git. */
function carpetaSinGit(): { raiz: string; limpiar(): void } {
  const raiz = mkdtempSync(join(tmpdir(), 'ai-first-suelta-'));
  return { raiz, limpiar: () => rmSync(raiz, { recursive: true, force: true }) };
}

test('ai-first skill en una carpeta sin git: sólo la skill y el enlace, y los valores por defecto salen de la raíz', async () => {
  const c = carpetaSinGit();
  try {
    writeFileSync(join(c.raiz, 'package.json'), JSON.stringify({ name: 'suelta', scripts: { test: 'jest' } }));
    writeFileSync(join(c.raiz, 'yarn.lock'), '');
    let preguntadas: string[] = [];

    const { escritos } = await instalarSkillsSueltas({
      raiz: c.raiz,
      nombres: ['test-fix'],
      entrevistar: (escaneo, claves) =>
        entrevistarPara(escaneo, async (p) => {
          preguntadas.push(p.clave);
          return '';
        }, claves),
    });

    assert.deepEqual(escritos, ['.agents/skills/test-fix', '.agents/skills/test-fix/SKILL.md', '.claude/skills']);
    assert.deepEqual(readdirSync(c.raiz).sort(), ['.agents', '.claude', 'package.json', 'yarn.lock'], 'ni .git, ni AI-FIRST.md, ni docs/');
    assert.deepEqual(preguntadas, ['verificacion', 'typecheck', 'lint', 'agentes'], 'sólo lo que test-fix lee');
    assert.match(skillMd(c.raiz, 'test-fix'), /`yarn run test`/, 'el gestor, deducido sin git');
  } finally {
    c.limpiar();
  }
});

test('ai-first skill sin respuestas deja la skill sin adaptar y lo dice; los protocolos avisan que asumen docs/', async () => {
  const c = carpetaSinGit();
  try {
    const { items } = await instalarSkillsSueltas({ raiz: c.raiz, nombres: ['test-fix', 'protocolo-cierre', 'i18n'] });

    const testFix = items.find((i) => i.ruta === '.agents/skills/test-fix/SKILL.md');
    assert.equal(testFix?.estado, 'sugerido');
    assert.match(testFix?.razon ?? '', /sin respuestas con qué adaptarla/);
    assert.ok(!skillMd(c.raiz, 'test-fix').includes(MARCA_INICIO));
    assert.match(items.find((i) => i.ruta === '.agents/skills/protocolo-cierre' && i.estado === 'sugerido')?.razon ?? '', /asume docs\//);
    assert.ok(!items.some((i) => i.ruta.startsWith('.agents/skills/i18n/')), 'i18n no tiene adaptación: nada que sugerir');
    await assert.rejects(instalarSkillsSueltas({ raiz: c.raiz, nombres: [] }), /qué skills instalar/);
  } finally {
    c.limpiar();
  }
});

test('ai-first skill en un repo configurado adapta con lo guardado y no escribe nada más', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz, skills: ['protocolo-cambios'], entrevistar: respondiendo({ producto: 'cli', manifiesto: 'Cargo.toml' }) });
    repo.commit('init');
    const antes = foto(repo.raiz);

    let entrevisto = false;
    await instalarSkillsSueltas({ raiz: repo.raiz, nombres: ['version-bump'], entrevistar: async () => ((entrevisto = true), undefined) });

    assert.ok(!entrevisto, 'con respuestas guardadas no se pregunta');
    assert.match(skillMd(repo.raiz, 'version-bump'), /`Cargo.toml`/);
    const despues = foto(repo.raiz);
    for (const ruta of Object.keys(antes)) assert.equal(despues[ruta], antes[ruta], ruta);
  }));

// ---------------------------------------------------------------------------
// Changesets: changeset-review en lugar de version-bump (ADR-028)
// ---------------------------------------------------------------------------

function monorepoConChangesets(repo: Repo, { tag, titulo }: { tag?: string; titulo?: string } = {}) {
  repo.escribir('package.json', JSON.stringify({ name: 'acme', private: true, scripts: { test: 'vitest' } }));
  repo.escribir('pnpm-lock.yaml', '');
  repo.escribir('pnpm-workspace.yaml', 'packages:\n  - packages/*\n  - "!packages/borrador"\n');
  repo.escribir('packages/ui/package.json', JSON.stringify({ name: '@acme/ui', version: '1.2.0' }));
  repo.escribir('packages/tokens/package.json', JSON.stringify({ name: '@acme/tokens', version: '0.3.0' }));
  repo.escribir('packages/interno/package.json', JSON.stringify({ name: '@acme/interno', version: '0.0.1' }));
  repo.escribir('packages/borrador/package.json', JSON.stringify({ name: '@acme/borrador' }));
  repo.escribir('.changeset/config.json', JSON.stringify({ baseBranch: 'dev', ignore: ['@acme/interno'] }));
  if (titulo) {
    repo.escribir(
      '.github/workflows/release.yml',
      `on: push\njobs:\n  release:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: changesets/action@v1\n        with:\n          title: "${titulo}"\n`,
    );
  }
  repo.commit('inicio');
  if (tag) repo.git('tag', tag);
}

test('con Changesets, init instala changeset-review en lugar de version-bump y la adapta sin preguntar: criterios 1 y 3', () =>
  conRepo(async (repo) => {
    monorepoConChangesets(repo, { tag: '@acme/ui@1.2.0', titulo: 'chore: versionar paquetes' });

    const { items } = await iniciar({ raiz: repo.raiz, hoy: '2026-10-15' });

    assert.ok(existsSync(join(repo.raiz, '.agents/skills/changeset-review')));
    assert.ok(!existsSync(join(repo.raiz, '.agents/skills/version-bump')));
    assert.equal(items.find((i) => i.ruta === '.agents/skills/changeset-review/SKILL.md')?.estado, 'escrito', 'sale del repo: no necesita entrevista');
    const skill = skillMd(repo.raiz, 'changeset-review');
    assert.match(skill, /`@acme\/tokens`, `@acme\/ui`\./, 'los del workspace, sin el ignorado ni el excluido');
    assert.match(skill, /rama base:\*\* `dev`/);
    assert.match(skill, /`@acme\/ui@1\.2\.0`/, 'la forma del tag, leída del repo');
    assert.match(skill, /changeset-release\/dev`, con el título «chore: versionar paquetes»\./);
    assert.ok(!items.some((i) => i.ruta.startsWith('.agents/skills/protocolo-features/SKILL.md')), 'lo que necesita respuestas sigue sin tocarse');
  }));

test('sin tags ni flujo, la adaptación dice la convención y el título por defecto', () =>
  conRepo(async (repo) => {
    monorepoConChangesets(repo);
    await iniciar({ raiz: repo.raiz, skills: ['changeset-review'] });
    const skill = skillMd(repo.raiz, 'changeset-review');
    assert.match(skill, /todavía no hay ninguno\. La convención de Changesets en un monorepo es `<paquete>@<versión>`/);
    assert.match(skill, /«Version Packages», el que pone `changesets\/action` por defecto/);
  }));

test('con Changesets, la entrevista no pregunta el manifiesto y marca changeset-review; cierre lo nombra: criterios 2 y 4', () =>
  conRepo(async (repo) => {
    monorepoConChangesets(repo);
    const preguntadas: string[] = [];
    let marcadas = '';
    await iniciar({
      raiz: repo.raiz,
      hoy: '2026-10-15',
      entrevistar: (escaneo, _documentado, alcance) =>
        entrevistar(escaneo, async (p) => {
          preguntadas.push(p.clave);
          if (p.clave === 'skills') marcadas = p.porDefecto;
          return p.clave === 'producto' ? 'api' : '';
        }, alcance),
    });

    assert.ok(!preguntadas.includes('manifiesto'));
    assert.ok(marcadas.split(',').includes('changeset-review') && !marcadas.split(',').includes('version-bump'), marcadas);
    assert.ok(existsSync(join(repo.raiz, '.agents/skills/changeset-review')));
    const cierre = skillMd(repo.raiz, 'protocolo-cierre');
    assert.match(cierre, /versiona con Changesets/);
    assert.match(cierre, /`changeset status`/);
    assert.ok(!cierre.includes('Este proyecto no versiona'));
  }));

test('--skills manda sobre la detección, y sin .changeset/ nada cambia: criterio 5', () =>
  conRepo(async (repo) => {
    monorepoConChangesets(repo);
    await iniciar({ raiz: repo.raiz, skills: ['version-bump'] });
    assert.ok(existsSync(join(repo.raiz, '.agents/skills/version-bump')));
    assert.ok(!existsSync(join(repo.raiz, '.agents/skills/changeset-review')));

    const otro = crearRepo();
    try {
      otro.commit('inicio');
      await iniciar({ raiz: otro.raiz });
      assert.deepEqual(instaladas(otro.raiz), [...SKILLS_POR_DEFECTO].sort());
    } finally {
      otro.limpiar();
    }
  }));

test('ai-first skill changeset-review la deja adaptada sin terminal: criterio 6', () =>
  conRepo(async (repo) => {
    monorepoConChangesets(repo, { tag: '@acme/tokens@0.3.0' });
    const { items } = await instalarSkillsSueltas({ raiz: repo.raiz, nombres: ['changeset-review'] });
    assert.equal(items.find((i) => i.ruta === '.agents/skills/changeset-review/SKILL.md')?.estado, 'escrito');
    assert.match(skillMd(repo.raiz, 'changeset-review'), /`@acme\/tokens@0\.3\.0`/);
  }));

test('con Changesets y sin entrevista, protocolo-cierre recibe su bloque igual: CHG-027', () =>
  conRepo(async (repo) => {
    // Lo que encontró el sitio con la 0.8.0: un agente corre init sin terminal.
    monorepoConChangesets(repo);
    const { items } = await iniciar({ raiz: repo.raiz, hoy: '2026-10-15' });

    assert.equal(items.find((i) => i.ruta === '.agents/skills/protocolo-cierre/SKILL.md')?.estado, 'escrito');
    const cierre = skillMd(repo.raiz, 'protocolo-cierre');
    assert.match(cierre, /versiona con Changesets/);
    assert.match(cierre, /`la suite del proyecto`/, 'lo que no sabe, lo dice sin inventarlo');
    assert.ok(!items.some((i) => i.ruta === '.agents/skills/protocolo-features/SKILL.md'), 'lo que necesita respuestas sigue sin tocarse');

    // Sin Changesets, como antes: sin respuestas no hay bloque.
    const otro = crearRepo();
    try {
      otro.commit('inicio');
      await iniciar({ raiz: otro.raiz });
      assert.ok(!skillMd(otro.raiz, 'protocolo-cierre').includes(MARCA_INICIO));
    } finally {
      otro.limpiar();
    }
  }));
