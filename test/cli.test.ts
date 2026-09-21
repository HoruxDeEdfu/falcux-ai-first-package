// El binario compilado, de punta a punta: lo que se prueba acá es parseArgs y
// la salida, así que se ejecuta el proceso entero en vez de importar funciones.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

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
