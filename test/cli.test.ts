// El binario compilado, de punta a punta: lo que se prueba acá es parseArgs y
// la salida, así que se ejecuta el proceso entero en vez de importar funciones.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { crearRepo } from './ayuda.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const VERSION = (JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version;

function correr(...args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

test('--version imprime la versión del package.json y sale con 0', () => {
  const r = correr('--version');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, `${VERSION}\n`);
  assert.equal(r.stderr, '');
});

test('-v es lo mismo que --version, y gana aunque haya comando', () => {
  const r = correr('audit', '-v');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, `${VERSION}\n`);
});

test('--help lista --version', () => {
  const r = correr('--help');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /-v, --version/);
});

test('--entrevista y --sin-entrevista se contradicen, y el comando lo dice', () => {
  const r = correr('init', '--entrevista', '--sin-entrevista');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /se contradicen/);
});

test('--entrevista sin terminal interactiva es error de uso, no una espera eterna: criterio 4', () => {
  // spawnSync da tuberías, no un TTY: es exactamente el caso de CI.
  const r = correr('init', '--entrevista');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /necesita una terminal interactiva/);
});

test('sin terminal, init corre sin entrevistar y lo dice en el reporte: criterio 3', () => {
  const repo = crearRepo();
  try {
    repo.commit('inicio');
    const r = correr('init', '--raiz', repo.raiz);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Sin entrevista: no hay terminal interactiva/);
    // Y no se colgó esperando una respuesta que nadie iba a escribir.
    assert.match(r.stdout, /AI-FIRST\.md/);
  } finally {
    repo.limpiar();
  }
});

test('--sin-entrevista no menciona la entrevista: se pidió no tenerla', () => {
  const repo = crearRepo();
  try {
    repo.commit('inicio');
    const r = correr('init', '--raiz', repo.raiz, '--sin-entrevista');
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!r.stdout.includes('Sin entrevista:'));
  } finally {
    repo.limpiar();
  }
});
