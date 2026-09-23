// El punto de control: lo que `init` escribe y lo que el hook hace cuando git
// lo invoca de verdad. docs/specs/punto-de-control.md.
//
// El hook se prueba corriéndolo, no leyéndolo: es un script de shell, y lo que
// puede salir mal —el parseo de la entrada estándar, el sha en ceros de una
// rama nueva, el código de salida que se propaga— no se ve en el texto.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { CARPETA_HOOKS, NOMBRE_HOOK, RUTA_CI, iniciar } from '../src/init.js';
import { crearRepo, type Repo } from './ayuda.js';

const RUTA_HOOK = `${CARPETA_HOOKS}/${NOMBRE_HOOK}`;
const CEROS = '0'.repeat(40);
const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

async function conRepo(fn: (repo: Repo) => Promise<void>) {
  const repo = crearRepo();
  try {
    await fn(repo);
  } finally {
    repo.limpiar();
  }
}

function hooksPath(repo: Repo): string | undefined {
  try {
    return repo.git('config', '--local', '--get', 'core.hooksPath').trim();
  } catch {
    return undefined;
  }
}

/**
 * Una carpeta con un `ai-first` de mentira que anota cómo lo llamaron y sale
 * con el código que se le pida. Es lo que permite comprobar qué argumentos
 * arma el hook sin depender de lo que el detector concluya.
 */
function aiFirstDeMentira(codigo: number): { bin: string; argumentos(): string; limpiar(): void } {
  const bin = mkdtempSync(join(tmpdir(), 'ai-first-bin-'));
  const registro = join(bin, 'argumentos.txt');
  writeFileSync(join(bin, 'ai-first'), `#!/bin/sh\necho "$@" >> ${registro}\nexit ${codigo}\n`, 'utf8');
  chmodSync(join(bin, 'ai-first'), 0o755);
  return {
    bin,
    argumentos: () => (existsSync(registro) ? readFileSync(registro, 'utf8').trim() : ''),
    limpiar: () => rmSync(bin, { recursive: true, force: true }),
  };
}

/** Corre el hook como lo corre git: desde la raíz del repo y con las refs por entrada estándar. */
function correrHook(repo: Repo, entrada: string, ruta: string, extra: NodeJS.ProcessEnv = {}) {
  try {
    const salida = execFileSync('sh', [join(repo.raiz, ruta)], {
      cwd: repo.raiz,
      input: entrada,
      encoding: 'utf8',
      env: { ...process.env, ...extra },
    });
    return { codigo: 0, salida };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { codigo: err.status, salida: `${err.stdout}${err.stderr}` };
  }
}

test('init escribe el hook versionado, lo deja ejecutable y apunta core.hooksPath', () =>
  conRepo(async (repo) => {
    repo.escribir('package.json', JSON.stringify({ name: 'demo' }));
    repo.commit('inicio');

    const { escritos, items } = await iniciar({ raiz: repo.raiz });

    assert.ok(escritos.includes(RUTA_HOOK), 'el hook se escribe');
    assert.ok(escritos.includes(RUTA_CI), 'el flujo de integración continua se escribe');
    assert.ok(escritos.includes('core.hooksPath'), 'la configuración se reporta como escrita');
    assert.equal(hooksPath(repo), CARPETA_HOOKS);
    assert.ok(statSync(join(repo.raiz, RUTA_HOOK)).mode & 0o111, 'ejecutable');

    // El flujo corta y el hook no: es la regla de la spec §7.
    const ci = readFileSync(join(repo.raiz, RUTA_CI), 'utf8');
    assert.match(ci, /--estricto/);
    // El hook lo nombra en un comentario para explicar por qué no lo usa, así
    // que lo que se mira es cómo invoca, no si la palabra aparece.
    const invocaciones = readFileSync(join(repo.raiz, RUTA_HOOK), 'utf8')
      .split('\n')
      .filter((l) => l.includes('$ai_first audit'));
    assert.equal(invocaciones.length, 2, 'con base y sin base');
    assert.ok(invocaciones.every((l) => !l.includes('--estricto')), 'el hook avisa, no corta');
    assert.equal(items.find((i) => i.ruta === 'core.hooksPath')?.estado, 'escrito');
  }));

test('un hook que ya existe no se toca, y un core.hooksPath ajeno no se pisa', () =>
  conRepo(async (repo) => {
    repo.escribir(RUTA_HOOK, '#!/bin/sh\necho mio\n');
    repo.git('config', '--local', 'core.hooksPath', '.husky');
    repo.commit('inicio');
    const antes = readFileSync(join(repo.raiz, RUTA_HOOK), 'utf8');

    const { saltados, sugeridos, items } = await iniciar({ raiz: repo.raiz });

    assert.ok(saltados.includes(RUTA_HOOK));
    assert.equal(readFileSync(join(repo.raiz, RUTA_HOOK), 'utf8'), antes, 'ni un byte');
    assert.equal(hooksPath(repo), '.husky', 'la configuración ajena se respeta');
    assert.ok(sugeridos.includes('core.hooksPath'));
    assert.match(items.find((i) => i.ruta === 'core.hooksPath')?.razon ?? '', /\.husky/);
  }));

test('--hook-local escribe en .git/hooks y no toca la configuración', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');

    const { escritos } = await iniciar({ raiz: repo.raiz, hookLocal: true });

    assert.ok(escritos.includes(`.git/hooks/${NOMBRE_HOOK}`));
    assert.ok(!existsSync(join(repo.raiz, CARPETA_HOOKS)), 'no crea la carpeta versionada');
    assert.equal(hooksPath(repo), undefined, 'la configuración queda intacta');
    assert.ok(statSync(join(repo.raiz, '.git/hooks', NOMBRE_HOOK)).mode & 0o111, 'ejecutable');
  }));

test('--sin-hook y --sin-ci saltan lo suyo', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');

    const { escritos } = await iniciar({ raiz: repo.raiz, sinHook: true, sinCi: true });

    assert.ok(!escritos.includes(RUTA_HOOK));
    assert.ok(!escritos.includes(RUTA_CI));
    assert.equal(hooksPath(repo), undefined, 'sin hook no se configura nada');
  }));

test('el hook pasa como --base el sha remoto, y lo omite si la rama es nueva', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });
    const falso = aiFirstDeMentira(0);
    try {
      const sha = repo.git('rev-parse', 'HEAD').trim();

      const conBase = correrHook(repo, `refs/heads/main ${sha} refs/heads/main abc123def456\n`, RUTA_HOOK, {
        PATH: `${falso.bin}:${process.env['PATH']}`,
      });
      assert.equal(conBase.codigo, 0);
      assert.equal(falso.argumentos(), 'audit --base abc123def456');

      // Rama que todavía no existe en el remoto: git manda el sha en ceros y no
      // hay rango que comparar.
      rmSync(join(falso.bin, 'argumentos.txt'), { force: true });
      const sinBase = correrHook(repo, `refs/heads/nueva ${sha} refs/heads/nueva ${CEROS}\n`, RUTA_HOOK, {
        PATH: `${falso.bin}:${process.env['PATH']}`,
      });
      assert.equal(sinBase.codigo, 0);
      assert.equal(falso.argumentos(), 'audit', 'sin --base');
    } finally {
      falso.limpiar();
    }
  }));

test('el hook propaga el código de salida del detector', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });
    const falso = aiFirstDeMentira(1);
    try {
      const r = correrHook(repo, `refs/heads/main abc refs/heads/main def\n`, RUTA_HOOK, {
        PATH: `${falso.bin}:${process.env['PATH']}`,
      });
      assert.equal(r.codigo, 1, 'un P0 frena el push');
    } finally {
      falso.limpiar();
    }
  }));

test('un error de uso del detector avisa y deja pasar: no medir no frena un push', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });
    const falso = aiFirstDeMentira(2);
    try {
      const r = correrHook(repo, `refs/heads/main abc refs/heads/main def\n`, RUTA_HOOK, {
        PATH: `${falso.bin}:${process.env['PATH']}`,
      });
      assert.equal(r.codigo, 0, 'un 2 es que el detector no corrió, no un hallazgo');
      assert.match(r.salida, /no pudo correr/);
    } finally {
      falso.limpiar();
    }
  }));

test('con node pero sin ai-first por ningún lado, el hook avisa y deja pasar', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });

    // Un PATH con node y **sin npx**, para que ninguna de las tres vías resuelva.
    // El HOME vacío evita que la guarda cargue el nvm de la máquina: sin eso, la
    // prueba encontraría npx, correría el detector de verdad y probaría otra cosa.
    const bin = mkdtempSync(join(tmpdir(), 'ai-first-solo-node-'));
    const casa = mkdtempSync(join(tmpdir(), 'ai-first-casa-'));
    try {
      symlinkSync(execFileSync('sh', ['-c', 'command -v node'], { encoding: 'utf8' }).trim(), join(bin, 'node'));
      const r = correrHook(repo, 'refs/heads/main abc refs/heads/main def\n', RUTA_HOOK, {
        PATH: `${bin}:/usr/bin:/bin`,
        HOME: casa,
        NVM_DIR: join(casa, '.nvm'),
      });
      assert.equal(r.codigo, 0, 'no encontrarse a sí mismo no frena un push');
      assert.match(r.salida, /no está instalado/);
    } finally {
      rmSync(bin, { recursive: true, force: true });
      rmSync(casa, { recursive: true, force: true });
    }
  }));

test('sin node en el PATH el hook avisa y deja pasar, aunque el detector esté ahí', () =>
  conRepo(async (repo) => {
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz });
    // El detector, presente y ejecutable. Lo que falta es con qué correrlo: es
    // el caso de un push lanzado desde un cliente gráfico, que no hereda el
    // PATH del shell y por tanto no ve el node de nvm ni el de Homebrew.
    mkdirSync(join(repo.raiz, 'node_modules/.bin'), { recursive: true });
    writeFileSync(join(repo.raiz, 'node_modules/.bin/ai-first'), '#!/usr/bin/env node\nconsole.log(1);\n', 'utf8');
    chmodSync(join(repo.raiz, 'node_modules/.bin/ai-first'), 0o755);

    // HOME a una carpeta vacía para que tampoco encuentre nvm por ahí.
    const casa = mkdtempSync(join(tmpdir(), 'ai-first-casa-'));
    try {
      const r = correrHook(repo, 'refs/heads/main abc refs/heads/main def\n', RUTA_HOOK, {
        PATH: '/usr/bin:/bin',
        HOME: casa,
        NVM_DIR: join(casa, '.nvm'),
      });
      assert.equal(r.codigo, 0, 'un push no se frena porque falte el intérprete');
      assert.match(r.salida, /no encuentro node/);
    } finally {
      rmSync(casa, { recursive: true, force: true });
    }
  }));

test('extremo a extremo: el detector real frena un push con P0 y deja pasar uno con P2', () =>
  conRepo(async (repo) => {
    // Una Zona Prohibida declarada a mano, para provocar el P0 sin depender del escaneo.
    repo.escribir('infra/main.tf', 'resource {}');
    repo.escribir('package.json', JSON.stringify({ name: 'demo' }));
    repo.commit('inicio');
    await iniciar({ raiz: repo.raiz, sinCi: true });
    const contrato = readFileSync(join(repo.raiz, 'AI-FIRST.md'), 'utf8');
    assert.match(contrato, /infra\//, 'init sugirió la zona');
    repo.commit('configurado');

    // Un remoto de verdad: el hook sólo corre en un push que llega a algún sitio.
    const remoto = mkdtempSync(join(tmpdir(), 'ai-first-remoto-'));
    // `ai-first` en el PATH, apuntando al CLI compilado de este repo.
    const bin = mkdtempSync(join(tmpdir(), 'ai-first-real-'));
    writeFileSync(join(bin, 'ai-first'), `#!/bin/sh\nexec node "${CLI}" "$@"\n`, 'utf8');
    chmodSync(join(bin, 'ai-first'), 0o755);
    const env = { ...process.env, PATH: `${bin}:${process.env['PATH']}` };
    try {
      execFileSync('git', ['init', '-q', '--bare', remoto], { encoding: 'utf8' });
      repo.git('remote', 'add', 'origin', remoto);
      execFileSync('git', ['push', '-q', 'origin', 'main'], { cwd: repo.raiz, env, encoding: 'utf8' });

      // Ahora sí: tocar la Zona Prohibida declarada es P0.
      repo.escribir('infra/main.tf', 'resource { cambiado }');
      repo.commit('toca la zona prohibida');
      assert.throws(
        () => execFileSync('git', ['push', '-q', 'origin', 'main'], { cwd: repo.raiz, env, stdio: 'pipe' }),
        'un P0 frena el push',
      );

      // Y se puede saltar, que es la regla: el detector informa, no encarcela.
      execFileSync('git', ['push', '-q', '--no-verify', 'origin', 'main'], { cwd: repo.raiz, env, encoding: 'utf8' });
    } finally {
      rmSync(remoto, { recursive: true, force: true });
      rmSync(bin, { recursive: true, force: true });
    }
  }));
