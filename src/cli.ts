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
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorAiFirst } from './ai-first-md.js';
import { auditar } from './audit.js';
import { iniciar, type Escaneo, type ItemInstalado } from './init.js';
import { cuantasPreguntas, entrevistar, esAfirmativo, formatearPregunta, type Respuestas } from './entrevista.js';
import { reporteHumano, reporteJson } from './reporte.js';

const AYUDA = `ai-first — gobierno del contexto para proyectos AI-First

Uso:
  ai-first init  [--raiz <dir>] [--enlazar] [--skills <lista>|todas]
                 [--entrevista | --sin-entrevista]
                 [--sin-hook] [--hook-local] [--sin-ci]
  ai-first audit [opciones]

init configura el repo para la metodología y nunca sobreescribe: lo que ya
existe se salta, se reporta como saltado y el comando sigue. En una carpeta que
todavía no es repositorio, corre git init y sigue. Escribe:
  - AI-FIRST.md con lo que encuentra —Zonas Prohibidas sugeridas, superficies
    de decisión, documentos existentes— y docs/ADR.md vacío.
  - docs/SESSION_LOG.md, docs/changes/CHANGE_LOG.md y docs/changes/pending/.
  - Las skills del paquete en .agents/skills/, y el enlace .claude/skills.
  - Un bloque delimitado en AGENTS.md con dónde escribe cada skill. Fuera de
    las marcas <!-- ai-first:inicio --> y <!-- ai-first:fin --> no toca nada.
  - El punto de control: .githooks/pre-push, que corre el detector sobre lo que
    se va a publicar y sólo interrumpe ante un P0, y
    .github/workflows/ai-first.yml, que lo corre con --estricto en cada pull
    request. Un core.hooksPath ya configurado no se pisa: se reporta.
Lo que no puede escribir en un archivo que ya existía lo reporta como
sugerido.

La entrevista pregunta lo que no se puede deducir —fase, perfil del producto,
comandos, secuencia de implementación— y escribe las respuestas en AI-FIRST.md
y en la sección «Adaptación a tu proyecto» de cada skill instalada, también
entre marcas. Un proyecto sin documentación se entrevista; uno que ya la tiene
recibe la oferta y por defecto se salta. Sin terminal interactiva no se
entrevista nunca. Para definir el producto —PRD, arquitectura, specs— el
paquete instala la skill protocolo-arranque, que corre tu agente.

Opciones de init:
  --enlazar        Instala las skills como enlaces simbólicos relativos a la
                   carpeta skills/ del paquete, en vez de copiarlas. Para el
                   repo del paquete y para quien lo vendoriza en un monorepo.
                   Una skill enlazada nunca se adapta: se cambiaría la fuente.
  --skills <lista> Cuáles instalar, separadas por comas, o «todas». Por defecto,
                   las cinco sin interfaz: protocolo-features, protocolo-cambios,
                   protocolo-cierre, version-bump, test-fix; con entrevista, las
                   que el perfil del producto pida.
  --entrevista     Entrevista aunque el proyecto ya esté documentado.
  --sin-entrevista No entrevista nunca, ni en un repo vacío.
  --sin-hook       No escribe el hook de git ni toca core.hooksPath.
  --hook-local     El hook va a .git/hooks/, que no viaja en el clon, y la
                   configuración del repo no se toca. Por defecto va a
                   .githooks/, que sí viaja y se revisa en un PR.
  --sin-ci         No escribe el flujo de integración continua.
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

/**
 * ¿Se puede entrevistar? Hace falta terminal en las dos direcciones: sin
 * entrada, la pregunta se queda esperando una respuesta que nadie va a
 * escribir, y en CI eso es un trabajo colgado hasta el timeout.
 */
function hayTerminal(): boolean {
  return Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
}

/**
 * Conduce la entrevista sobre la terminal, decidiendo antes si toca.
 *
 *   - Un proyecto **sin documentación** se entrevista sin preguntar: es el caso
 *     del repo que todavía no existe, y preguntar «¿entrevisto?» a quien acaba
 *     de crear una carpeta vacía es un paso sin información.
 *   - Un proyecto **ya documentado** —el que llega con su PRD y sus specs
 *     escritas— no se entrevista salvo que lo pidan: se dice qué se encontró y
 *     se ofrece, con saltar como valor por defecto.
 */
async function entrevistaEnTerminal(escaneo: Escaneo, documentado: string[]): Promise<Respuestas | undefined> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // Ctrl+C, Ctrl+D o una entrada que se acaba a media entrevista: readline
  // lanza un AbortError, y sin esto el adoptante vería un stack trace de Node
  // en vez de saber qué pasó y qué quedó escrito.
  const preguntar = async (texto: string): Promise<string> => {
    try {
      return await rl.question(texto);
    } catch {
      throw new ErrorAiFirst('entrevista cancelada. No se escribió nada más; el repositorio quedó inicializado si no lo estaba. Vuelve a correr `ai-first init` cuando quieras, o usa --sin-entrevista.');
    }
  };
  try {
    if (documentado.length > 0) {
      process.stdout.write(
        `\nEste proyecto ya trae documentación: ${documentado.join(', ')}.\n` +
          'Las skills se instalan igual; la entrevista sólo sirve para adaptarlas.\n',
      );
      const respuesta = await preguntar('¿Entrevistar de todos modos? [s/N] ');
      if (!esAfirmativo(respuesta)) {
        process.stdout.write('Sin entrevista. Se instala y se configura lo que falte.\n\n');
        return undefined;
      }
    }

    process.stdout.write(
      `\n${cuantasPreguntas(escaneo)} preguntas, todas con un valor por defecto entre corchetes: Enter lo acepta.\n` +
        'Se escriben en AI-FIRST.md y en la sección «Adaptación a tu proyecto» de cada skill.\n\n',
    );
    return await entrevistar(escaneo, async (p) => {
      process.stdout.write(`${formatearPregunta(p)}\n`);
      const respuesta = await preguntar('> ');
      process.stdout.write('\n');
      return respuesta;
    });
  } finally {
    rl.close();
  }
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
      entrevista: { type: 'boolean', default: false },
      'sin-entrevista': { type: 'boolean', default: false },
      'sin-hook': { type: 'boolean', default: false },
      'hook-local': { type: 'boolean', default: false },
      'sin-ci': { type: 'boolean', default: false },
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
    if (values.entrevista && values['sin-entrevista']) {
      process.stderr.write('--entrevista y --sin-entrevista se contradicen: elige una.\n');
      return 2;
    }
    if (values.entrevista && !hayTerminal()) {
      process.stderr.write('--entrevista necesita una terminal interactiva, y acá no la hay.\n');
      return 2;
    }

    if (values['sin-hook'] && values['hook-local']) {
      process.stderr.write('--sin-hook y --hook-local se contradicen: elige una.\n');
      return 2;
    }
    const opcionesInit: Parameters<typeof iniciar>[0] = {
      raiz,
      enlazar: values.enlazar,
      sinHook: values['sin-hook'],
      hookLocal: values['hook-local'],
      sinCi: values['sin-ci'],
    };
    if (values.skills !== undefined) opcionesInit.skills = values.skills === 'todas' ? 'todas' : values.skills.split(',');

    // Sin terminal se procede como con --sin-entrevista, en vez de colgarse
    // esperando una respuesta que nadie va a escribir.
    const puedeEntrevistar = !values['sin-entrevista'] && hayTerminal();
    if (puedeEntrevistar) {
      opcionesInit.entrevistar = values.entrevista
        ? (escaneo) => entrevistaEnTerminal(escaneo, [])
        : entrevistaEnTerminal;
    }

    const { escaneo, items } = await iniciar(opcionesInit);
    const salida = [
      `ai-first init — ${escaneo.proyecto}`,
      '',
      ...items.map(lineaDeItem),
      '',
      ...(values['sin-entrevista'] || hayTerminal() ? [] : ['  Sin entrevista: no hay terminal interactiva.', '']),
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
