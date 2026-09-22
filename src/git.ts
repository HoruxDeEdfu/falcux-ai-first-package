// Lo único que el detector le pregunta a git. Todo pasa por `execFileSync`
// con argumentos separados: no se interpola nada en una shell.
//
// Dos modos de comparación, y la distinción es la que la spec dejó abierta:
//
//   - Sin `base` (hook local): árbol de trabajo + índice contra HEAD, más los
//     archivos nuevos sin seguimiento. Es lo que hay «sobre la mesa» ahora.
//   - Con `base` (CI): el rango `base...HEAD`. Es lo que la rama trae.
//
// En el primer modo no existen cuerpos de commit, así que la anotación
// `ai-first: sin-decision` sólo tiene efecto en el segundo.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SEPARADOR_COMMITS = ''; // «record separator», no aparece en un mensaje.

function git(raiz: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: raiz,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitOpcional(raiz: string, args: string[]): string | undefined {
  try {
    return git(raiz, args);
  } catch {
    return undefined;
  }
}

function lineas(texto: string | undefined): string[] {
  if (!texto) return [];
  return texto.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '');
}

export function esRepoGit(raiz: string): boolean {
  return gitOpcional(raiz, ['rev-parse', '--is-inside-work-tree'])?.trim() === 'true';
}

/**
 * Convierte una carpeta en repositorio git. Es lo único que el paquete le pide
 * a git que cambie, y sólo cuando no hay `.git`: un proyecto que todavía no
 * existe se arranca acá, no en otro comando que el adoptante tiene que
 * recordar. No crea commits, y de la configuración sólo toca la del repo
 * —`core.hooksPath`, y sólo si estaba vacía—, nunca la global del usuario.
 */
export function inicializarRepo(raiz: string): void {
  git(raiz, ['init', '-q']);
}

/**
 * Qué `core.hooksPath` tiene configurado el repo, si tiene alguno. `init` lo
 * consulta antes de fijar el suyo: una configuración ajena —husky, lefthook—
 * no se pisa, se reporta. Es ADR-003 aplicado a algo que no es un archivo.
 *
 * `--local`, nunca global: el paquete no toca la configuración del usuario.
 */
export function hooksPathConfigurado(raiz: string): string | undefined {
  const valor = gitOpcional(raiz, ['config', '--local', '--get', 'core.hooksPath'])?.trim();
  return valor ? valor : undefined;
}

/**
 * Apunta el repo a su carpeta de hooks versionada. Lo llama `init` sólo cuando
 * `hooksPathConfigurado` devuelve `undefined`.
 */
export function fijarHooksPath(raiz: string, carpeta: string): void {
  git(raiz, ['config', '--local', 'core.hooksPath', carpeta]);
}

export function tieneHead(raiz: string): boolean {
  return gitOpcional(raiz, ['rev-parse', '--verify', '--quiet', 'HEAD']) !== undefined;
}

export function existeRef(raiz: string, ref: string): boolean {
  return gitOpcional(raiz, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== undefined;
}

function sinSeguimiento(raiz: string, ruta?: string): string[] {
  const args = ['ls-files', '--others', '--exclude-standard'];
  if (ruta) args.push('--', ruta);
  return lineas(gitOpcional(raiz, args));
}

/** Archivos tocados, relativos a la raíz, sin duplicados y ordenados. */
export function archivosCambiados(raiz: string, base?: string): string[] {
  const conjunto = new Set<string>();

  if (base) {
    for (const r of lineas(gitOpcional(raiz, ['diff', '--name-only', `${base}...HEAD`]))) conjunto.add(r);
  } else if (tieneHead(raiz)) {
    for (const r of lineas(gitOpcional(raiz, ['diff', '--name-only', 'HEAD']))) conjunto.add(r);
    for (const r of sinSeguimiento(raiz)) conjunto.add(r);
  } else {
    // Repo sin commits: todo lo que hay es nuevo.
    for (const r of lineas(gitOpcional(raiz, ['ls-files', '--cached', '--others', '--exclude-standard']))) conjunto.add(r);
  }

  return [...conjunto].sort();
}

/** Líneas agregadas a un archivo en el modo elegido, sin el «+» inicial. */
export function lineasAgregadas(raiz: string, ruta: string, base?: string): string[] {
  if (!base) {
    // Un archivo nuevo sin seguimiento no aparece en `git diff`: se lee entero.
    if (sinSeguimiento(raiz, ruta).length > 0 || !tieneHead(raiz)) {
      try {
        return lineas(readFileSync(join(raiz, ruta), 'utf8'));
      } catch {
        return [];
      }
    }
  }
  const rango = base ? `${base}...HEAD` : 'HEAD';
  const salida = gitOpcional(raiz, ['diff', '-U0', '--no-color', rango, '--', ruta]);
  return lineas(salida)
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1));
}

/**
 * Todos los archivos del repo que están en disco: los seguidos y los nuevos no
 * ignorados. Un archivo borrado que sigue en el índice no cuenta: el detector
 * mide lo que hay, no lo que git recuerda.
 */
export function listarArchivos(raiz: string): string[] {
  return lineas(gitOpcional(raiz, ['ls-files', '--cached', '--others', '--exclude-standard'])).filter((r) =>
    existsSync(join(raiz, r)),
  );
}

/**
 * ¿Esta ruta está cubierta por .gitignore? Una referencia a algo ignorado
 * —`dist/`, `node_modules/`, `.env`— no es un huérfano: está ausente a propósito.
 */
export function estaIgnorado(raiz: string, ruta: string): boolean {
  // Un patrón `dist/` sólo casa con directorios, y si `dist` no existe en disco
  // git no puede saber que lo es: se pregunta también con la barra final.
  const formas = ruta.endsWith('/') ? [ruta] : [ruta, `${ruta}/`];
  return formas.some((f) => gitOpcional(raiz, ['check-ignore', '-q', '--', f]) !== undefined);
}

/** Contenido de un archivo en una revisión. `undefined` si no existía. */
export function contenidoEn(raiz: string, ref: string, ruta: string): string | undefined {
  return gitOpcional(raiz, ['show', `${ref}:${ruta}`]);
}

/** Cuerpos completos de los commits del rango `base..HEAD`. */
export function cuerposDeCommits(raiz: string, base: string): string[] {
  const salida = gitOpcional(raiz, ['log', `--format=%B${SEPARADOR_COMMITS}`, `${base}..HEAD`]);
  if (!salida) return [];
  return salida.split(SEPARADOR_COMMITS).map((c) => c.trim()).filter(Boolean);
}
