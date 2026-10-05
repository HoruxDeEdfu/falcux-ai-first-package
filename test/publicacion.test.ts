// El flujo que publica a npm (ADR-024). No se puede ensayar sin publicar, así
// que se fija lo que no puede cambiar sin que alguien lo decida: cuándo corre,
// cómo se autentica y con qué publica.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const TEXTO = readFileSync(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8');

interface Paso { name?: string; run?: string; if?: string }
interface Flujo {
  on: Record<string, { branches?: string[] }>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: { publicar: { steps: Paso[] } };
}

const FLUJO = parse(TEXTO) as Flujo;
const PASOS = FLUJO.jobs.publicar.steps;
const COMANDOS = PASOS.map((p) => p.run ?? '').join('\n');

test('corre sólo con push a prod', () => {
  assert.deepEqual(Object.keys(FLUJO.on), ['push']);
  assert.deepEqual(FLUJO.on.push?.branches, ['prod']);
});

test('se autentica por OIDC y no lee ningún secreto', () => {
  assert.equal(FLUJO.permissions['id-token'], 'write');
  assert.equal(FLUJO.permissions.contents, 'read');
  assert.doesNotMatch(TEXTO, /secrets\./);
  assert.doesNotMatch(TEXTO, /NODE_AUTH_TOKEN|NPM_TOKEN/);
});

test('publica con npm 11, no con pnpm, que en la 10 no habla OIDC', () => {
  assert.match(COMANDOS, /npm install -g npm@\^11\.5\.1/);
  assert.match(COMANDOS, /^npm publish --access public$/m);
  assert.doesNotMatch(COMANDOS, /pnpm publish/);
});

test('dos pushes seguidos publican en fila', () => {
  assert.equal(FLUJO.concurrency.group, 'publish');
  assert.equal(FLUJO.concurrency['cancel-in-progress'], false);
});

test('la suite y el detector estricto van antes de publicar', () => {
  const indice = (patron: RegExp) => PASOS.findIndex((p) => patron.test(p.run ?? ''));
  const publicar = indice(/^npm publish/m);
  assert.ok(indice(/^pnpm test$/m) < publicar);
  assert.ok(indice(/audit --base "\$BASE" --estricto/) < publicar);
  assert.ok(indice(/grep -E "\^## \\\[/) < publicar, 'la compuerta del CHANGELOG');
});

test('publicar depende de que la versión sea nueva', () => {
  const publicar = PASOS.find((p) => /^npm publish/m.test(p.run ?? ''));
  assert.equal(publicar?.if, "steps.version.outputs.nueva == 'si'");
});

// El Release lo dispara el tag que pone Charlie (CHG-019). Lo que se fija: que
// no corra con otra cosa, que no pueda crear tags y que no publique a npm.
const TEXTO_RELEASE = readFileSync(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8');
const RELEASE = parse(TEXTO_RELEASE) as {
  on: Record<string, { tags?: string[] }>;
  permissions: Record<string, string>;
  jobs: { release: { steps: Paso[] } };
};
const COMANDOS_RELEASE = RELEASE.jobs.release.steps.map((p) => p.run ?? '').join('\n');

test('el Release corre sólo con el push de un tag de versión', () => {
  assert.deepEqual(Object.keys(RELEASE.on), ['push']);
  assert.deepEqual(RELEASE.on.push, { tags: ['v*.*.*'] });
});

test('el Release escribe en el repo, no en npm, y sin secretos', () => {
  assert.deepEqual(RELEASE.permissions, { contents: 'write' });
  assert.doesNotMatch(TEXTO_RELEASE, /secrets\./);
  assert.doesNotMatch(COMANDOS_RELEASE, /npm publish|pnpm publish/);
});

test('el Release nunca crea el tag', () => {
  assert.match(COMANDOS_RELEASE, /gh release create "\$TAG" --verify-tag /);
  assert.doesNotMatch(COMANDOS_RELEASE, /git tag|git push/);
});

test('el Release exige la versión en npm y en el CHANGELOG antes de crearse', () => {
  const pasos = RELEASE.jobs.release.steps;
  const indice = (patron: RegExp) => pasos.findIndex((p) => patron.test(p.run ?? ''));
  const crear = indice(/gh release create/);
  assert.ok(indice(/npm view "@falcux\/ai-first@\$version" version/) < crear);
  assert.ok(indice(/sin publicar/) < crear);
});

test('el Release espera a npm en vez de fallar si el tag llega antes que la versión (CHG-021)', () => {
  const paso = RELEASE.jobs.release.steps.find((p) => /npm view/.test(p.run ?? ''))?.run ?? '';
  assert.match(paso, /for intento in \$\(seq 1 20\)/, 'hasta 20 intentos');
  assert.match(paso, /sleep 30/, 'separados por 30 segundos: 10 minutos en total');
});

test('el cuerpo del Release une las líneas de cada párrafo, no las del código (CHG-022)', () => {
  const paso = RELEASE.jobs.release.steps.find((p) => /awk -v cabecera/.test(p.run ?? ''))?.run ?? '';
  const programa = /awk -v cabecera="[^"]+" '([\s\S]*?)' CHANGELOG\.md/.exec(paso)?.[1];
  assert.ok(programa, 'el programa awk del flujo');

  const changelog = [
    '## [1.0.0] — 2026-10-05',
    '',
    '### Añadido',
    '',
    '- **Una viñeta** cortada',
    '  a 80 columnas.',
    '- Otra viñeta.',
    '',
    'Un párrafo',
    'en dos líneas.',
    '',
    '```bash',
    'ai-first init',
    '  --raiz x',
    '```',
    '',
    '1. Un paso',
    '   numerado.',
    '',
    '## [0.9.0] — 2026-10-01',
    '',
    '- No entra.',
    '',
  ].join('\n');
  const salida = spawnSync('awk', ['-v', 'cabecera=## [1.0.0] — ', programa!], { input: changelog, encoding: 'utf8' });
  assert.equal(salida.status, 0, salida.stderr);
  assert.equal(
    salida.stdout,
    [
      '',
      '### Añadido',
      '',
      '- **Una viñeta** cortada a 80 columnas.',
      '- Otra viñeta.',
      '',
      'Un párrafo en dos líneas.',
      '',
      '```bash',
      'ai-first init',
      '  --raiz x',
      '```',
      '',
      '1. Un paso numerado.',
      '',
    ].join('\n') + '\n',
  );
});
