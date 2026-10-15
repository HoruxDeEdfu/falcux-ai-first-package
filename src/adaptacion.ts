// Qué respuesta de la entrevista va a qué skill, y el texto que se escribe
// dentro de sus marcas.
//
// Cada skill instalada trae una sección «Adaptación a tu proyecto» con la lista
// de lo que hay que cambiar. Hasta hoy eso se hacía a mano, y una skill copiada
// sin adaptar es peor que no tenerla: ocupa presupuesto de carga y da
// instrucciones que no aplican. Acá se escribe sola, y **sólo entre las
// marcas**, para que lo que el humano agregue sobreviva a la siguiente corrida.
//
// Lo que no sabe la entrevista no se inventa: si una respuesta falta, la línea
// correspondiente no se escribe. Un hueco visible es mejor que un dato falso.
// Y faltar no es lo mismo que estar vacía: «¿comando de lint?» contestado con
// Enter dice que no hay; una clave que nunca se preguntó —un AI-FIRST.md de la
// 0.6.x, que no guardaba las respuestas— no dice nada, y se calla (ADR-026).

import type { Escaneo } from './init.js';
import { artefactosDelPerfil, perfilDe, secuenciaPorValor, tieneInterfaz, type Respuestas } from './entrevista.js';
import type { Perfil } from './ai-first-md.js';

/** El encabezado bajo el que vive el bloque en cada SKILL.md. */
export const ENCABEZADO_ADAPTACION = '## Adaptación a tu proyecto';

export interface Contexto {
  respuestas: Respuestas;
  escaneo: Escaneo;
  perfil: Perfil;
}

function comandos(c: Contexto): string[] {
  const l: string[] = [];
  const { verificacion, typecheck, lint } = c.respuestas;
  if (verificacion) l.push(`- **Suite y verificación:** \`${verificacion}\``);
  if (typecheck !== undefined) l.push(typecheck ? `- **Tipos:** \`${typecheck}\`` : '- **Tipos:** este proyecto no declara un comando de tipos.');
  if (lint !== undefined) l.push(lint ? `- **Lint:** \`${lint}\`` : '- **Lint:** este proyecto no declara un comando de lint.');
  return l;
}

/** La verificación declarada, o el texto de reemplazo si no la hay. */
function verificacionO(c: Contexto, reemplazo: string): string {
  return c.respuestas['verificacion'] || reemplazo;
}

/**
 * Una adaptación por skill: qué respuestas lee y cómo escribe su bloque. La
 * lista de claves no es documentación: la entrevista reducida de
 * `ai-first skill` pregunta exactamente eso y nada más, y las de perfil
 * —`producto`, `repositorio`— deciden si se puede adaptar sin perfil.
 */
interface Adaptacion {
  lee: string[];
  /**
   * Los repos donde el bloque se escribe aunque no haya respuestas: lo que
   * importa ahí sale del repo, y lo que falta se dice sin inventarlo. Sin
   * esto, sólo las que no leen nada (CHG-027).
   */
  sinRespuestas?: (e: Escaneo) => boolean;
  /** Las líneas del bloque, o `undefined` si la entrevista no aporta nada: entonces no se toca. */
  escribir: (c: Contexto) => string[] | undefined;
}

/** Las claves que salen del perfil. Sin ellas `perfilDe` inventaría `saas`/`unico`. */
const CLAVES_DE_PERFIL = ['producto', 'repositorio'];

const ADAPTACIONES: Record<string, Adaptacion> = {
  'protocolo-arranque': { lee: ['producto', 'repositorio', 'verificacion'], escribir: (c) => {
    const l = [
      `**Este proyecto es** ${nombreProducto(c.perfil)}, en ${nombreRepositorio(c.perfil)}.`,
      '',
      '**Los artefactos que le corresponden**, cada uno desde su template del paquete:',
      '',
      '| Artefacto | Template | Para qué |',
      '|---|---|---|',
    ];
    for (const a of artefactosDelPerfil(c.perfil)) {
      l.push(`| \`${a.destino}\` | \`${a.template}\` | ${a.razon} |`);
    }
    l.push('', `**El comando que decide que está sano:** \`${verificacionO(c, 'todavía sin definir')}\`.`);
    return l;
  } },

  'protocolo-features': { lee: ['producto', 'secuencia', 'verificacion', 'typecheck', 'lint', 'agentes'], escribir: (c) => {
    const secuencia = secuenciaPorValor(c.respuestas['secuencia'] ?? '');
    const l: string[] = [];
    if (secuencia) {
      l.push(`**La secuencia de este proyecto** (${secuencia.etiqueta.toLowerCase()}):`, '');
      secuencia.pasos.forEach((paso, i) => l.push(`${i + 1}. ${paso}`));
      l.push('', 'No se avanza al paso siguiente si el actual falla.', '');
    }
    const cmds = comandos(c);
    if (cmds.length > 0) l.push('**Los comandos de verificación:**', '', ...cmds, '');
    const agentes = c.respuestas['agentes'];
    if (agentes !== undefined) {
      l.push(
        agentes === 'si'
          ? '**Agentes en paralelo:** sí. La división por scope de la sección «División por agentes» aplica tal cual.'
          : '**Agentes en paralelo:** no se usan. Ignora esa sección; el protocolo funciona igual en secuencial.',
      );
    }
    if (!tieneInterfaz(c.perfil.producto)) {
      l.push('', '**Sin interfaz:** los pasos 3, 4 y 6 y los checklists de UX no aplican a este proyecto.');
    }
    return l;
  } },

  'test-fix': { lee: ['verificacion', 'typecheck', 'lint', 'agentes'], escribir: (c) => {
    const l: string[] = [];
    const cmds = comandos(c);
    if (cmds.length > 0) l.push('**Los comandos de este proyecto:**', '', ...cmds, '');
    const agentes = c.respuestas['agentes'];
    if (agentes !== undefined) {
      l.push(
        agentes === 'si'
          ? '**Delegación:** hay agentes en paralelo, así que la corrida por subagente del paso 2 aplica.'
          : '**Delegación:** sin subagentes. Corre el comando con el reporter más escueto y filtra la salida antes de leerla; al contexto principal llegan las fallas y nada más.',
      );
    }
    return l;
  } },

  'version-bump': { lee: ['manifiesto'], escribir: (c) => {
    const manifiesto = c.respuestas['manifiesto'];
    if (!manifiesto) return undefined;
    return [
      `**El manifiesto de este proyecto:** \`${manifiesto}\`. Es el único archivo donde se escribe el número.`,
      '',
      '**La versión no se repite en prosa.** En el README va como badge, no como número a mano; el detalle de cada versión va al registro de cambios.',
    ];
  } },

  'protocolo-cambios': { lee: ['repositorio', 'verificacion'], escribir: (c) => {
    const l = [
      '**Dónde vive el cambio en curso:** `docs/changes/pending/`, un archivo `CHG-XXX` por cambio abierto.',
      'Al cerrarlo, su resumen pasa a `docs/changes/CHANGE_LOG.md` y el documento se retira.',
      '',
      `**La verificación tras aplicar el cambio:** \`${verificacionO(c, 'la suite del proyecto')}\`.`,
    ];
    if (c.perfil.repositorio !== 'unico') {
      l.push(
        '',
        c.perfil.repositorio === 'monorepo'
          ? '**Monorepo:** el umbral de «flujo corto» cuenta archivos, no paquetes. Un cambio que toca dos paquetes es flujo completo aunque sean dos archivos.'
          : '**Varios repos:** un cambio que cruza repos lleva su CHG en cada uno, con el mismo número y un enlace cruzado.',
      );
    }
    return l;
  } },

  // Con Changesets, el Paso 6 manda a una skill que no se instaló si el bloque
  // no llega: se escribe aunque no haya entrevista (CHG-027).
  'protocolo-cierre': { lee: ['verificacion', 'manifiesto'], sinRespuestas: (e) => e.changesets !== undefined, escribir: (c) => {
    const l = ['**Los documentos de este proyecto:**', '', '| El manual dice | Acá es |', '|---|---|'];
    l.push('| Registro de sesión | `docs/SESSION_LOG.md` |');
    l.push(`| Registro de decisiones | \`${c.escaneo.rutaAdr}\` |`);
    l.push('| Cambio en curso | `docs/changes/pending/` |');
    l.push('| Registro de cambios | `docs/changes/CHANGE_LOG.md` |');
    const arquitectura = c.escaneo.artefactos['arquitectura'];
    if (arquitectura) l.push(`| Arquitectura | \`${arquitectura}\` |`);
    const notas = c.escaneo.artefactos['tech_notes'];
    if (notas) l.push(`| Notas técnicas | \`${notas}\` |`);
    const guia = c.escaneo.artefactos['guia_diseno'];
    if (guia) l.push(`| Guía de diseño | \`${guia}\` |`);
    l.push('', `**La verificación previa al cierre:** \`${verificacionO(c, 'la suite del proyecto')}\`.`);
    if (c.escaneo.changesets) {
      // El cuerpo de la skill no se toca: asume «Gobierno del contexto» (ADR-028).
      l.push(
        '',
        '**Este proyecto versiona con Changesets.** En el Paso 6 no se sube ningún número: lo sube `changeset version` al mergear el PR de versiones. ' +
          'Comprueba con `changeset status` que la sesión dejó su changeset, o uno vacío si no cambió nada publicado, y antes de mergear el PR de versiones corre `changeset-review`.',
      );
    } else if (c.respuestas['manifiesto'] === '') {
      l.push('', '**Este proyecto no versiona:** el Paso 6 no aplica.');
    }
    return l;
  } },

  'changeset-review': { lee: [], escribir: (c) => {
    const cs = c.escaneo.changesets;
    if (!cs) return undefined;
    const l: string[] = [];
    if (cs.paquetes.length > 0) l.push(`**Los paquetes que versiona:** ${cs.paquetes.map((p) => `\`${p}\``).join(', ')}.`, '');
    l.push(`**La rama base:** \`${cs.base}\`.`, '');
    l.push(
      cs.ultimoTag
        ? `**La forma de los tags**, leída del último: \`${cs.ultimoTag}\`. El último tag de cada paquete sale de \`git tag --list\` con esa forma.`
        : cs.monorepo
          ? '**La forma de los tags:** todavía no hay ninguno. La convención de Changesets en un monorepo es `<paquete>@<versión>`.'
          : '**La forma de los tags:** todavía no hay ninguno. La convención de Changesets en un repo de un solo paquete es `v<versión>`.',
      '',
    );
    l.push(
      `**El PR de versiones:** la rama \`changeset-release/${cs.base}\`, con el título «${cs.tituloPr ?? 'Version Packages'}»` +
        (cs.tituloPr ? '.' : ', el que pone `changesets/action` por defecto: no se encontró otro en `.github/workflows/`.'),
    );
    return l;
  } },

  'protocolo-ux': { lee: ['producto'], escribir: (c) => {
    if (!tieneInterfaz(c.perfil.producto)) return undefined;
    const guia = c.escaneo.artefactos['guia_diseno'];
    const inventario = c.escaneo.artefactos['inventario_componentes'];
    return [
      `**Este proyecto es** ${nombreProducto(c.perfil)}.`,
      '',
      guia ? `**Guía de diseño:** \`${guia}\`.` : '**Guía de diseño:** todavía no existe. La escribe `protocolo-arranque` a partir de `GUIA_DISENO_TEMPLATE.md`.',
      inventario
        ? `**Inventario de componentes:** \`${inventario}\`.`
        : '**Inventario de componentes:** todavía no existe. Sin él, el check 5 del detector se omite.',
    ];
  } },

  'ux-writer': { lee: ['producto'], escribir: (c) => {
    if (!tieneInterfaz(c.perfil.producto)) return undefined;
    return [`**Este proyecto es** ${nombreProducto(c.perfil)}. Todo texto visible pasa por acá antes de escribirse, incluidos los de error y los estados vacíos.`];
  } },

  'ux-audit': { lee: ['producto', 'verificacion'], escribir: (c) => {
    if (!tieneInterfaz(c.perfil.producto)) return undefined;
    return [`**La verificación antes de mergear:** \`${verificacionO(c, 'la suite del proyecto')}\`, y esta auditoría encima.`];
  } },

  'information-architecture': { lee: ['producto', 'repositorio'], escribir: (c) => {
    if (!tieneInterfaz(c.perfil.producto)) return undefined;
    return [`**Este proyecto es** ${nombreProducto(c.perfil)}, en ${nombreRepositorio(c.perfil)}.`];
  } },
};

function nombreProducto(p: Perfil): string {
  const nombres: Record<Perfil['producto'], string> = {
    saas: 'un producto SaaS con sesión',
    landing: 'una landing o sitio de contenido',
    api: 'una API o servicio sin interfaz',
    cli: 'una herramienta de línea de comandos',
    movil: 'una aplicación móvil',
  };
  return nombres[p.producto];
}

function nombreRepositorio(p: Perfil): string {
  const nombres: Record<Perfil['repositorio'], string> = {
    unico: 'un repo con una sola aplicación',
    monorepo: 'un monorepo de varios paquetes',
    multiple: 'uno de varios repos',
  };
  return nombres[p.repositorio];
}

/**
 * El bloque de adaptación de una skill, o `undefined` si la entrevista no
 * aporta nada para ella. Lleva su propio aviso: quien lo lea tiene que saber
 * que se reescribe y dónde escribir para que sobreviva.
 */
export function bloqueDeSkill(nombre: string, respuestas: Respuestas, escaneo: Escaneo): string | undefined {
  const adaptar = ADAPTACIONES[nombre];
  if (!adaptar) return undefined;
  // Sin perfil respondido no se adapta lo que depende de él: `perfilDe`
  // devolvería `saas`/`unico`, y eso sería escribir un perfil inventado.
  if (adaptar.lee.some((k) => CLAVES_DE_PERFIL.includes(k)) && !respuestas['producto']) return undefined;
  const lineas = adaptar.escribir({ respuestas, escaneo, perfil: perfilDe(respuestas) });
  if (!lineas || lineas.length === 0) return undefined;
  return [
    '> Esto lo escribió `ai-first init` con lo que respondió la entrevista y lo que',
    '> encontró en el repo. Cada corrida reescribe lo que hay entre las marcas;',
    '> edita fuera de ellas.',
    '',
    ...lineas,
    '',
    // La lista genérica de la skill queda debajo, fuera de las marcas, y ya no
    // se puede borrar sin romper la regla. Decir qué relación tiene con este
    // bloque cuesta una línea y evita que el agente la lea como pendiente.
    '_Lo que sigue, fuera de las marcas, es la lista genérica de la skill. Este bloque ya responde lo que la entrevista cubre; revisa el resto._',
  ].join('\n');
}

/** Las skills para las que la entrevista tiene algo que decir. */
export function skillsAdaptables(): string[] {
  return Object.keys(ADAPTACIONES);
}

/**
 * Las respuestas que leen estas skills, sin repetir. Es lo que pregunta la
 * entrevista reducida de `ai-first skill`. Una skill sin adaptación no lee nada.
 */
export function clavesQueLeen(nombres: string[]): string[] {
  return [...new Set(nombres.flatMap((n) => ADAPTACIONES[n]?.lee ?? []))];
}

/**
 * ¿La adaptación de esta skill se escribe sin respuestas en este repo? Sí si
 * no lee ninguna, como `changeset-review`, o si declara que en un repo así lo
 * que importa sale del repo, como `protocolo-cierre` con Changesets. Es lo
 * mismo que el bloque de AGENTS.md: no hay nada que inventar (ADR-028, CHG-027).
 */
export function seDeduceDelRepo(nombre: string, escaneo: Escaneo): boolean {
  const adaptacion = ADAPTACIONES[nombre];
  if (!adaptacion) return false;
  return adaptacion.lee.length === 0 || adaptacion.sinRespuestas?.(escaneo) === true;
}

/**
 * Las respuestas que se guardan en `adaptacion` de AI-FIRST.md, en este orden:
 * las que leen las skills y no viven ya en otra clave del frontmatter
 * —`perfil`, `verificacion`, `fase`— (ADR-026).
 */
export const CLAVES_GUARDADAS = ['secuencia', 'agentes', 'typecheck', 'lint', 'manifiesto'];
