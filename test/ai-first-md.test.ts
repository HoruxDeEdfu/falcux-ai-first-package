import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ErrorAiFirst, interpretar, leer, registrarAuditoria } from '../src/ai-first-md.js';
import { aiFirstMd, crearRepo } from './ayuda.js';

const EJEMPLO_SPEC = `---
# Versión del FORMATO de este archivo, no del proyecto.
formato: 1
proyecto: crm-compliance
fase: produccion
actualizado: 2026-09-16
verificacion: pnpm build && pnpm test

zonas_prohibidas:
  - ruta: migrations/
    razon: esquema vivo en produccion
    desde: 2026-03-12
  - ruta: .env*
    razon: credenciales
    desde: 2026-03-12

superficies_de_decision:
  - packages/*/src/index.ts
  - "**/*.config.*"

alcance:
  spec: docs/changes/pending/
  tolerancia: 3

artefactos:
  adr: docs/ADR.md
  inventario_componentes: docs/COMPONENT_LIBRARY.md
  componentes_dir: packages/ui/src/components/

auditoria:
  fecha: 2026-09-16
  entropia: 68
  hallazgos: { p0: 1, p1: 1, p2: 1 }
---

# AI-FIRST.md — CRM Compliance
`;

test('interpreta el ejemplo de docs/SPEC-PAQUETE.md §5', () => {
  const a = interpretar(EJEMPLO_SPEC);
  assert.equal(a.proyecto, 'crm-compliance');
  assert.equal(a.actualizado, '2026-09-16');
  assert.equal(a.zonas_prohibidas.length, 2);
  assert.deepEqual(a.zonas_prohibidas[0], { ruta: 'migrations/', razon: 'esquema vivo en produccion', desde: '2026-03-12' });
  assert.deepEqual(a.superficies_de_decision, ['packages/*/src/index.ts', '**/*.config.*']);
  assert.deepEqual(a.alcance, { spec: 'docs/changes/pending/', tolerancia: 3 });
  assert.equal(a.artefactos.adr, 'docs/ADR.md');
  assert.deepEqual(a.auditoria, { fecha: '2026-09-16', entropia: 68, hallazgos: { p0: 1, p1: 1, p2: 1 } });
});

test('las zonas pueden ser cadenas sueltas', () => {
  const a = interpretar(aiFirstMd('zonas_prohibidas:\n  - infra/\n  - .env*'));
  assert.deepEqual(a.zonas_prohibidas, [{ ruta: 'infra/' }, { ruta: '.env*' }]);
});

test('los bloques ausentes se vuelven vacíos, no errores', () => {
  const a = interpretar(aiFirstMd());
  assert.deepEqual(a.zonas_prohibidas, []);
  assert.deepEqual(a.superficies_de_decision, []);
  assert.deepEqual(a.alcance, {});
  assert.deepEqual(a.artefactos, {});
  assert.equal(a.auditoria, undefined);
});

test('un formato desconocido detiene al detector con mensaje', () => {
  assert.throws(() => interpretar('---\nformato: 2\n---\n'), (e: unknown) => e instanceof ErrorAiFirst && /formato: 2/.test(e.message));
  assert.throws(() => interpretar('---\nproyecto: x\n---\n'), ErrorAiFirst);
});

test('sin frontmatter, error claro', () => {
  assert.throws(() => interpretar('# Sólo cuerpo\n'), ErrorAiFirst);
});

test('leer falla con mensaje si no hay AI-FIRST.md', async () => {
  const repo = crearRepo();
  try {
    await assert.rejects(leer(repo.raiz), (e: unknown) => e instanceof ErrorAiFirst && /No hay AI-FIRST.md/.test(e.message));
  } finally {
    repo.limpiar();
  }
});

test('registrarAuditoria reemplaza sólo ese bloque y conserva los comentarios', async () => {
  const repo = crearRepo();
  try {
    repo.escribir('AI-FIRST.md', EJEMPLO_SPEC);
    await registrarAuditoria(repo.raiz, { fecha: '2026-09-17', entropia: 12, hallazgos: { p0: 0, p1: 0, p2: 1 } });
    const texto = readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8');

    assert.match(texto, /# Versión del FORMATO de este archivo/);
    assert.match(texto, /razon: esquema vivo en produccion/);
    assert.match(texto, /# AI-FIRST.md — CRM Compliance/);
    assert.doesNotMatch(texto, /entropia: 68/);

    const a = interpretar(texto);
    assert.deepEqual(a.auditoria, { fecha: '2026-09-17', entropia: 12, hallazgos: { p0: 0, p1: 0, p2: 1 } });
    assert.equal(a.alcance.tolerancia, 3);
  } finally {
    repo.limpiar();
  }
});

test('registrarAuditoria agrega el bloque si no existía', async () => {
  const repo = crearRepo();
  try {
    repo.escribir('AI-FIRST.md', aiFirstMd('zonas_prohibidas:\n  - infra/'));
    await registrarAuditoria(repo.raiz, { fecha: '2026-09-17', entropia: 0, hallazgos: { p0: 0, p1: 0, p2: 0 } });
    const a = interpretar(readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8'));
    assert.equal(a.auditoria?.entropia, 0);
    assert.deepEqual(a.zonas_prohibidas, [{ ruta: 'infra/' }]);
  } finally {
    repo.limpiar();
  }
});

test('el perfil se interpreta cuando está declarado, y es opcional', () => {
  const con = interpretar(aiFirstMd('perfil:\n  producto: saas\n  repositorio: monorepo'));
  assert.deepEqual(con.perfil, { producto: 'saas', repositorio: 'monorepo' });

  // Sin perfil no hay valor por defecto: el contrato sigue siendo válido.
  assert.equal(interpretar(aiFirstMd()).perfil, undefined);
});

test('un perfil incompleto o con un valor desconocido es error de formato', () => {
  // Adivinar el perfil es peor que no tenerlo: decide qué artefactos se escriben.
  assert.throws(() => interpretar(aiFirstMd('perfil:\n  producto: videojuego\n  repositorio: unico')), ErrorAiFirst);
  assert.throws(() => interpretar(aiFirstMd('perfil:\n  producto: saas')), ErrorAiFirst);
  assert.throws(() => interpretar(aiFirstMd('perfil: saas')), ErrorAiFirst);
});
