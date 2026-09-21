#!/usr/bin/env node
// Punto de entrada de `npx @falcux/ai-first`.
//
// Dos comandos hoy: `init` y `audit`. Los otros tres del mapa v1
// —sync, adr, handoff— están mapeados en docs/HANDOFF.md y no escritos: se anuncian
// como tales en vez de fingir que corren.
//
// Códigos de salida:
//   0  sin hallazgos, o sólo P1/P2 sin `--estricto`
//   1  algún P0, o P1/P2 con `--estricto`
//   2  error de uso: no hay AI-FIRST.md, formato desconocido, no es un repo git,
//      una flag inválida, una skill que el paquete no trae, un bloque roto en AGENTS.md

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorAiFirst } from './ai-first-md.js';
import { auditar } from './audit.js';
import { iniciar, type ItemInstalado } from './init.js';
import { reporteHumano, reporteJson } from './reporte.js';

const AYUDA = `ai-first — gobierno del contexto para proyectos AI-First

Uso:
  ai-first init  [--raiz <dir>] [--enlazar] [--skills <lista>|todas]
  ai-first audit [opciones]

init configura el repo para la metodología y nunca sobreescribe: lo que ya
existe se salta, se reporta como saltado y el comando sigue. Escribe:
  - AI-FIRST.md con lo que encuentra —Zonas Prohibidas sugeridas, superficies
    de decisión, documentos existentes— y docs/ADR.md vacío.
  - docs/SESSION_LOG.md, docs/changes/CHANGE_LOG.md y docs/changes/pending/.
  - Las skills del paquete en .agents/skills/, y el enlace .claude/skills.
  - Un bloque delimitado en AGENTS.md con dónde escribe cada skill. Fuera de
    las marcas <!-- ai-first:inicio --> y <!-- ai-first:fin --> no toca nada.
Lo que no puede escribir en un archivo que ya existía lo reporta como
sugerido. Los templates siguen siendo manuales: están en templates/.

Opciones de init:
  --enlazar        Instala las skills como enlaces simbólicos relativos a la
                   carpeta skills/ del paquete, en vez de copiarlas. Para el
                   repo del paquete y para quien lo vendoriza en un monorepo.
  --skills <lista> Cuáles instalar, separadas por comas, o «todas». Por defecto,
                   las cinco sin interfaz: protocolo-features, protocolo-cambios,
                   protocolo-cierre, version-bump, test-fix.
  --raiz <dir>     Raíz del repositorio. Por defecto, el directorio actual.

Opciones de audit:
  --base <ref>     Compara el rango <ref>...HEAD (CI). Sin ella, compara el árbol
                   de trabajo contra HEAD (hook local).
  --estricto       Sale con 1 también ante P1 o P2. Sin ella, sólo ante P0.
  --registrar      Escribe el resultado en «auditoria» del frontmatter de AI-FIRST.md.
  --json           Salida en JSON en vez del reporte legible.
  --raiz <dir>     Raíz del repositorio. Por defecto, el directorio actual.
  -h, --help       Esta ayuda.
  -v, --version    La versión instalada del paquete.

Puntaje: entropía = min(100, 40·P0 + 20·P1 + 8·P2). Más alto es peor.
`;

const NO_ESCRITOS = new Set(['sync', 'adr', 'handoff']);

/**
 * La versión del package.json del paquete instalado, leída en ejecución desde
 * el módulo (dist/src/cli.js → ../../package.json), igual que init resuelve
 * skills/. Así no hay constante que sincronizar en cada version-bump.
 */
export function versionDelPaquete(): string {
  const ruta = fileURLToPath(new URL('../../package.json', import.meta.url));
  const { version } = JSON.parse(readFileSync(ruta, 'utf8')) as { version: string };
  return version;
}

function lineaDeItem(item: ItemInstalado): string {
  const estado = item.estado.padEnd(8);
  if (item.estado === 'escrito') return `  ${estado} ${item.ruta}`;
  if (item.estado === 'saltado') return `  ${estado} ${item.ruta} (${item.razon ?? 'ya existe'})`;
  return `  ${estado} ${item.ruta} — ${item.razon ?? ''}`;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      base: { type: 'string' },
      estricto: { type: 'boolean', default: false },
      registrar: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      raiz: { type: 'string' },
      enlazar: { type: 'boolean', default: false },
      skills: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });

  if (values.version) {
    process.stdout.write(`${versionDelPaquete()}\n`);
    return 0;
  }

  const comando = positionals[0];

  if (values.help || comando === undefined) {
    process.stdout.write(AYUDA);
    return comando === undefined && !values.help ? 2 : 0;
  }

  if (NO_ESCRITOS.has(comando)) {
    process.stderr.write(`«${comando}» está mapeado pero todavía no existe. Ver docs/HANDOFF.md, Parte B.\n`);
    return 2;
  }

  const raiz = resolve(values.raiz ?? process.cwd());

  if (comando === 'init') {
    const opcionesInit: Parameters<typeof iniciar>[0] = { raiz, enlazar: values.enlazar };
    if (values.skills !== undefined) opcionesInit.skills = values.skills === 'todas' ? 'todas' : values.skills.split(',');
    const { escaneo, items } = await iniciar(opcionesInit);
    const salida = [
      `ai-first init — ${escaneo.proyecto}`,
      '',
      ...items.map(lineaDeItem),
      '',
      `  ${escaneo.zonas.length} Zona${escaneo.zonas.length === 1 ? '' : 's'} Prohibida${escaneo.zonas.length === 1 ? '' : 's'} sugerida${escaneo.zonas.length === 1 ? '' : 's'}: ${escaneo.zonas.map((z) => z.ruta).join(', ')}`,
      `  ${escaneo.superficies.length} superficie${escaneo.superficies.length === 1 ? '' : 's'} de decisión: ${escaneo.superficies.join(', ') || '—'}`,
      `  ${Object.keys(escaneo.artefactos).length} artefactos declarados`,
      '',
      'Revisa AI-FIRST.md —sobre todo las razones de cada zona— y AGENTS.md, y luego corre `ai-first audit`.',
      '',
    ];
    process.stdout.write(salida.join('\n'));
    return 0;
  }

  if (comando !== 'audit') {
    process.stderr.write(`Comando desconocido: «${comando}».\n\n${AYUDA}`);
    return 2;
  }
  const opciones: Parameters<typeof auditar>[0] = { raiz, estricto: values.estricto, registrar: values.registrar };
  if (values.base) opciones.base = values.base;

  const informe = await auditar(opciones);

  if (values.json) process.stdout.write(reporteJson(informe) + '\n');
  else process.stdout.write(reporteHumano(informe, { color: process.stdout.isTTY ?? false }) + '\n');

  return informe.codigoDeSalida;
}

main(process.argv.slice(2)).then(
  (codigo) => process.exit(codigo),
  (error: unknown) => {
    const mensaje = error instanceof ErrorAiFirst ? error.message : error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`ai-first: ${mensaje}\n`);
    process.exit(2);
  },
);
