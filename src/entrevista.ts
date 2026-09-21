// La entrevista de `init`: qué se pregunta, en qué orden y qué se deduce del
// repo para no preguntarlo dos veces.
//
// Las preguntas son **datos**, no llamadas a la terminal. `entrevistar` recibe
// cómo leer una respuesta, así que la suite la corre entera sin TTY y el CLI
// inyecta la lectura real. Es la misma razón por la que `escanear` no imprime:
// lo que decide y lo que dibuja son cosas distintas.
//
// Nada de acá llama a un modelo. La entrevista recoge lo verificable —nombre,
// fase, perfil, comandos, zonas—; definir el producto es trabajo de la skill
// `protocolo-arranque`, que ejecuta el agente del adoptante.

import { PRODUCTOS, REPOSITORIOS, type Perfil, type Producto, type Repositorio } from './ai-first-md.js';
import type { Escaneo } from './init.js';

export type TipoPregunta = 'texto' | 'opcion' | 'confirmacion';

export interface Opcion {
  valor: string;
  etiqueta: string;
}

export interface Pregunta {
  clave: string;
  enunciado: string;
  tipo: TipoPregunta;
  /** Obligatorias en las de tipo «opcion»; el resto no las usa. */
  opciones?: Opcion[];
  /** Lo que queda si el adoptante contesta con Enter. Siempre hay uno. */
  porDefecto: string;
  /** Una línea de contexto, para que la respuesta no se adivine. */
  ayuda?: string;
}

export type Respuestas = Record<string, string>;

// ---------------------------------------------------------------------------
// Las secuencias de implementación
// ---------------------------------------------------------------------------

/**
 * La secuencia que `protocolo-features` recorre. La skill viene con la
 * hexagonal, que es la del proyecto donde nació la metodología; el warning de
 * su sección de adaptación existe justamente porque no le sirve a todo el
 * mundo. Acá se elige una y se escribe en la skill instalada.
 */
export interface Secuencia {
  valor: string;
  etiqueta: string;
  pasos: string[];
  /** Perfiles de producto a los que se ofrece. */
  productos: Producto[];
}

export const SECUENCIAS: Secuencia[] = [
  {
    valor: 'hexagonal',
    etiqueta: 'Hexagonal: dominio, aplicación, infraestructura',
    pasos: ['schema o migración', 'dominio', 'aplicación', 'infraestructura backend', 'compartido', 'interfaz', 'pruebas'],
    productos: ['saas', 'api', 'movil'],
  },
  {
    valor: 'capas-web',
    etiqueta: 'Web con backend gestionado: schema, servidor, interfaz',
    pasos: ['schema', 'consultas y acciones de servidor', 'componentes', 'ruta o página', 'pruebas'],
    productos: ['saas', 'landing', 'movil'],
  },
  {
    valor: 'vertical',
    etiqueta: 'Vertical por feature: cada feature completa de punta a punta',
    pasos: ['contrato de la feature', 'datos', 'lógica', 'interfaz', 'pruebas'],
    productos: ['saas', 'api', 'movil', 'landing'],
  },
  {
    valor: 'contenido',
    etiqueta: 'Contenido primero: copia, componentes, página',
    pasos: ['contenido y copia', 'componentes', 'página', 'pruebas'],
    productos: ['landing'],
  },
  {
    valor: 'contrato-cli',
    etiqueta: 'Contrato primero: el contrato, el dominio, la interfaz de línea',
    pasos: ['contrato', 'dominio', 'aplicación', 'interfaz de línea de comandos', 'pruebas'],
    productos: ['cli', 'api'],
  },
];

export function secuenciasDe(producto: Producto): Secuencia[] {
  return SECUENCIAS.filter((s) => s.productos.includes(producto));
}

export function secuenciaPorValor(valor: string): Secuencia | undefined {
  return SECUENCIAS.find((s) => s.valor === valor);
}

// ---------------------------------------------------------------------------
// El perfil decide qué se instala y qué artefactos tienen sentido
// ---------------------------------------------------------------------------

/** Las cinco de siempre, que no dependen de tener interfaz. */
export const SKILLS_BASE = ['protocolo-features', 'protocolo-cambios', 'protocolo-cierre', 'version-bump', 'test-fix'];

/** La skill que conduce la definición. Se instala sólo cuando se entrevista. */
export const SKILL_ARRANQUE = 'protocolo-arranque';

const SKILLS_UX = ['protocolo-ux', 'ux-writer', 'ux-audit'];

/** Qué skills tiene sentido instalar para este perfil, antes de aplicar `--skills`. */
export function skillsDelPerfil(perfil: Perfil): string[] {
  const salida = [...SKILLS_BASE];
  if (perfil.producto === 'saas' || perfil.producto === 'movil') {
    salida.push(...SKILLS_UX, 'information-architecture');
  } else if (perfil.producto === 'landing') {
    salida.push(...SKILLS_UX);
  }
  return salida;
}

export interface Artefacto {
  /** El template del paquete del que sale. */
  template: string;
  /** Dónde se escribe en el proyecto. */
  destino: string;
  /** Por qué este perfil lo necesita. */
  razon: string;
}

/**
 * Qué artefactos produce la fase de definición para este perfil. Lo consulta la
 * skill `protocolo-arranque`; el comando no escribe ninguno de estos, porque
 * todos necesitan un modelo que los redacte.
 */
export function artefactosDelPerfil(perfil: Perfil): Artefacto[] {
  const salida: Artefacto[] = [
    { template: 'PRD_TEMPLATE.md', destino: 'docs/PRD.md', razon: 'qué se construye y para quién' },
    { template: 'ARQUITECTURA_TEMPLATE.md', destino: 'docs/ARQUITECTURA.md', razon: 'componentes, límites y el diagrama' },
  ];

  if (perfil.producto === 'landing') {
    salida.push({ template: 'SPEC_MODULO_TEMPLATE.md', destino: 'docs/specs/sitio.md', razon: 'una sola spec: una landing no tiene módulos' });
  } else {
    salida.push({ template: 'SPEC_MODULO_TEMPLATE.md', destino: 'docs/specs/<modulo>.md', razon: 'una spec por módulo, antes de implementarlo' });
  }

  if (tieneInterfaz(perfil.producto)) {
    salida.push(
      { template: 'GUIA_DISENO_TEMPLATE.md', destino: 'docs/GUIA_DISENO.md', razon: 'tokens, tipografía y estados' },
      { template: 'COMPONENT_LIBRARY_TEMPLATE.md', destino: 'docs/COMPONENTES.md', razon: 'el inventario que el check 5 vigila' },
    );
  }

  salida.push({ template: 'TECH_NOTES_TEMPLATE.md', destino: 'docs/TECH_NOTES.md', razon: 'las cicatrices: lo que costó y no se repite' });
  return salida;
}

export function tieneInterfaz(producto: Producto): boolean {
  return producto === 'saas' || producto === 'landing' || producto === 'movil';
}

// ---------------------------------------------------------------------------
// El catálogo de preguntas
// ---------------------------------------------------------------------------

const ETIQUETA_PRODUCTO: Record<Producto, string> = {
  saas: 'Producto SaaS o aplicación web con sesión',
  landing: 'Landing o sitio de contenido',
  api: 'API o servicio sin interfaz',
  cli: 'Herramienta de línea de comandos o librería',
  movil: 'Aplicación móvil',
};

const ETIQUETA_REPOSITORIO: Record<Repositorio, string> = {
  unico: 'Un repo con una sola aplicación',
  monorepo: 'Un repo con varios paquetes',
  multiple: 'Uno de varios repos (front, back, APIs)',
};

const FASES: Opcion[] = [
  { valor: 'exploracion', etiqueta: 'Exploración: todavía se está averiguando qué construir' },
  { valor: 'mvp', etiqueta: 'MVP: hay alcance y se está construyendo' },
  { valor: 'produccion', etiqueta: 'Producción: hay usuarios y romper cuesta' },
];

/**
 * Las preguntas que no dependen de otra respuesta. Las que sí —la secuencia,
 * que depende del producto— las arma `preguntasDependientes`.
 */
export function preguntasBase(e: Escaneo): Pregunta[] {
  return [
    {
      clave: 'proyecto',
      enunciado: '¿Cómo se llama el proyecto?',
      tipo: 'texto',
      porDefecto: e.proyecto,
    },
    {
      clave: 'fase',
      enunciado: '¿En qué fase está?',
      tipo: 'opcion',
      opciones: FASES,
      porDefecto: 'exploracion',
      ayuda: 'La fase no cambia ninguna verificación; la lee quien abre el archivo.',
    },
    {
      clave: 'producto',
      enunciado: '¿Qué clase de producto es?',
      tipo: 'opcion',
      opciones: PRODUCTOS.map((p) => ({ valor: p, etiqueta: ETIQUETA_PRODUCTO[p] })),
      porDefecto: 'saas',
      ayuda: 'Decide qué skills se instalan y qué artefactos pide la fase de definición.',
    },
    {
      clave: 'repositorio',
      enunciado: '¿Qué forma tiene el repositorio?',
      tipo: 'opcion',
      opciones: REPOSITORIOS.map((r) => ({ valor: r, etiqueta: ETIQUETA_REPOSITORIO[r] })),
      porDefecto: 'unico',
    },
    {
      clave: 'verificacion',
      enunciado: '¿Qué comando decide que el proyecto está sano?',
      tipo: 'texto',
      porDefecto: e.verificacion ?? 'pnpm test',
      ayuda: 'Lo corre el humano antes de cerrar, no el detector.',
    },
    {
      clave: 'typecheck',
      enunciado: '¿Y el de tipos? Enter si no hay.',
      tipo: 'texto',
      porDefecto: e.typecheck ?? '',
    },
    {
      clave: 'lint',
      enunciado: '¿Y el de lint? Enter si no hay.',
      tipo: 'texto',
      porDefecto: e.lint ?? '',
    },
    {
      clave: 'agentes',
      enunciado: '¿Trabajas con varios agentes en paralelo?',
      tipo: 'confirmacion',
      porDefecto: 'no',
      ayuda: 'Si no, la sección de división por agentes se retira de la skill de features.',
    },
    {
      clave: 'manifiesto',
      enunciado: '¿Qué archivo lleva el número de versión?',
      tipo: 'texto',
      porDefecto: e.manifiesto ?? 'package.json',
      ayuda: 'Lo lee version-bump. En otros ecosistemas es pyproject.toml, Cargo.toml o el .csproj.',
    },
  ];
}

/** La secuencia depende del producto ya respondido. */
export function preguntaDeSecuencia(producto: Producto): Pregunta {
  const opciones = secuenciasDe(producto).map((s) => ({ valor: s.valor, etiqueta: s.etiqueta }));
  return {
    clave: 'secuencia',
    enunciado: '¿En qué orden se implementa una feature?',
    tipo: 'opcion',
    opciones,
    porDefecto: opciones[0]?.valor ?? 'vertical',
    ayuda: 'Lo que importa es que sea estricta y de adentro hacia afuera, no las capas concretas.',
  };
}

/** Una confirmación por cada zona que el escaneo sugirió. */
export function preguntasDeZonas(e: Escaneo): Pregunta[] {
  return e.zonas.map((z) => ({
    clave: `zona:${z.ruta}`,
    enunciado: `¿«${z.ruta}» es Zona Prohibida?`,
    tipo: 'confirmacion' as const,
    porDefecto: 'si',
    ayuda: `Sugerida porque parece ${z.razon}. El criterio es el costo de revertir un error ahí.`,
  }));
}

// ---------------------------------------------------------------------------
// Interpretar lo que se respondió
// ---------------------------------------------------------------------------

/** `si`, `s`, `yes`, `y`, `1` y `true` son sí; lo demás es no. */
export function esAfirmativo(respuesta: string): boolean {
  return ['si', 'sí', 's', 'yes', 'y', '1', 'true'].includes(respuesta.trim().toLowerCase());
}

/**
 * La respuesta a una pregunta de opción: se acepta el valor, su número en la
 * lista o el prefijo sin ambigüedad. Vacío devuelve el valor por defecto; lo
 * que no casa, también, porque una entrevista no es un examen.
 */
export function interpretarOpcion(pregunta: Pregunta, respuesta: string): string {
  const texto = respuesta.trim().toLowerCase();
  const opciones = pregunta.opciones ?? [];
  if (texto === '') return pregunta.porDefecto;

  const porNumero = Number(texto);
  if (Number.isInteger(porNumero) && porNumero >= 1 && porNumero <= opciones.length) {
    return opciones[porNumero - 1]!.valor;
  }
  const exacta = opciones.find((o) => o.valor.toLowerCase() === texto);
  if (exacta) return exacta.valor;

  const prefijos = opciones.filter((o) => o.valor.toLowerCase().startsWith(texto));
  if (prefijos.length === 1) return prefijos[0]!.valor;

  return pregunta.porDefecto;
}

export function perfilDe(respuestas: Respuestas): Perfil {
  return {
    producto: (respuestas['producto'] ?? 'saas') as Producto,
    repositorio: (respuestas['repositorio'] ?? 'unico') as Repositorio,
  };
}

// ---------------------------------------------------------------------------
// El recorrido
// ---------------------------------------------------------------------------

/** Cómo se lee una respuesta. El CLI pasa la terminal; la suite, una lista. */
export type Lector = (pregunta: Pregunta) => Promise<string>;

/**
 * Recorre la entrevista entera y devuelve las respuestas ya interpretadas. El
 * orden importa: la secuencia se pregunta después del producto, porque sus
 * opciones dependen de él.
 */
export async function entrevistar(escaneo: Escaneo, leer: Lector): Promise<Respuestas> {
  const respuestas: Respuestas = {};

  const responder = async (p: Pregunta) => {
    const cruda = await leer(p);
    if (p.tipo === 'opcion') respuestas[p.clave] = interpretarOpcion(p, cruda);
    else if (p.tipo === 'confirmacion') respuestas[p.clave] = cruda.trim() === '' ? p.porDefecto : esAfirmativo(cruda) ? 'si' : 'no';
    else respuestas[p.clave] = cruda.trim() === '' ? p.porDefecto : cruda.trim();
  };

  for (const p of preguntasBase(escaneo)) await responder(p);
  await responder(preguntaDeSecuencia(perfilDe(respuestas).producto));
  for (const p of preguntasDeZonas(escaneo)) await responder(p);

  return respuestas;
}

// ---------------------------------------------------------------------------
// Cómo se dibuja una pregunta
// ---------------------------------------------------------------------------

/**
 * El texto de una pregunta en la terminal, sin el prompt final. Vive acá y no
 * en el CLI porque el enunciado, las opciones y el valor por defecto son la
 * pregunta: separarlos obligaría a mantener dos listas sincronizadas.
 */
export function formatearPregunta(p: Pregunta): string {
  const l: string[] = [];
  if (p.tipo === 'confirmacion') {
    l.push(`${p.enunciado} ${p.porDefecto === 'si' ? '[S/n]' : '[s/N]'}`);
  } else if (p.tipo === 'texto') {
    l.push(p.porDefecto === '' ? `${p.enunciado} [ninguno]` : `${p.enunciado} [${p.porDefecto}]`);
  } else {
    l.push(p.enunciado);
  }
  if (p.ayuda) l.push(`  ${p.ayuda}`);
  if (p.tipo === 'opcion') {
    (p.opciones ?? []).forEach((o, i) => {
      l.push(`  ${i + 1}) ${o.etiqueta}${o.valor === p.porDefecto ? '  ·  por defecto' : ''}`);
    });
  }
  return l.join('\n');
}

/** Cuántas preguntas tiene la entrevista completa, para anunciarlo antes de empezar. */
export function cuantasPreguntas(escaneo: Escaneo): number {
  return preguntasBase(escaneo).length + 1 + preguntasDeZonas(escaneo).length;
}
