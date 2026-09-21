// Lectura de `AI-FIRST.md`. El frontmatter es el contrato con el detector; el
// cuerpo es para humanos y acá no se interpreta.
//
// Formato definido en docs/SPEC-PAQUETE.md §5. Un `formato` desconocido detiene al
// detector con un mensaje: no se interpreta a medias.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export const NOMBRE_ARCHIVO = 'AI-FIRST.md';
export const FORMATO_SOPORTADO = 1;

export interface ZonaProhibida {
  ruta: string;
  razon?: string;
  desde?: string;
}

export interface Alcance {
  spec?: string;
  tolerancia?: number;
}

/** Qué clase de producto es y en qué forma de repositorio vive. */
export const PRODUCTOS = ['saas', 'landing', 'api', 'cli', 'movil'] as const;
export const REPOSITORIOS = ['unico', 'monorepo', 'multiple'] as const;

export type Producto = (typeof PRODUCTOS)[number];
export type Repositorio = (typeof REPOSITORIOS)[number];

/**
 * El perfil decide qué artefactos tiene sentido escribir y qué skills instalar.
 * Lo declara la entrevista de `init` y lo lee `protocolo-arranque`. Opcional:
 * un AI-FIRST.md sin perfil se comporta como siempre.
 */
export interface Perfil {
  producto: Producto;
  repositorio: Repositorio;
}

/**
 * Cada valor es una ruta relativa a la raíz. Las claves conocidas están
 * nombradas; cualquier otra clave es un documento más que el check de
 * artefactos huérfanos también recorre.
 */
export interface Artefactos {
  adr?: string;
  arquitectura?: string;
  guia_diseno?: string;
  inventario_componentes?: string;
  componentes_dir?: string;
  session_log?: string;
  change_log?: string;
  tech_notes?: string;
  [otro: string]: string | undefined;
}

export interface Auditoria {
  fecha: string;
  entropia: number;
  hallazgos: { p0: number; p1: number; p2: number };
}

export interface AiFirst {
  formato: number;
  proyecto?: string;
  fase?: string;
  actualizado?: string;
  verificacion?: string;
  perfil?: Perfil;
  zonas_prohibidas: ZonaProhibida[];
  superficies_de_decision: string[];
  alcance: Alcance;
  artefactos: Artefactos;
  auditoria?: Auditoria;
}

export class ErrorAiFirst extends Error {}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function separarFrontmatter(texto: string): { yaml: string; cuerpo: string } {
  const m = FRONTMATTER.exec(texto);
  if (!m) throw new ErrorAiFirst(`${NOMBRE_ARCHIVO} no tiene frontmatter YAML entre dos líneas «---».`);
  return { yaml: m[1] as string, cuerpo: texto.slice(m[0].length) };
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function listaDeCadenas(v: unknown, campo: string): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    throw new ErrorAiFirst(`«${campo}» debe ser una lista de cadenas.`);
  }
  return v as string[];
}

function zonas(v: unknown): ZonaProhibida[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new ErrorAiFirst('«zonas_prohibidas» debe ser una lista.');
  return v.map((z, i) => {
    if (typeof z === 'string') return { ruta: z };
    if (esObjeto(z) && typeof z['ruta'] === 'string') {
      const zona: ZonaProhibida = { ruta: z['ruta'] };
      if (typeof z['razon'] === 'string') zona.razon = z['razon'];
      if (z['desde'] !== undefined && z['desde'] !== null) zona.desde = String(z['desde']);
      return zona;
    }
    throw new ErrorAiFirst(`«zonas_prohibidas[${i}]» necesita al menos «ruta».`);
  });
}

function artefactos(v: unknown): Artefactos {
  if (v === undefined || v === null) return {};
  if (!esObjeto(v)) throw new ErrorAiFirst('«artefactos» debe ser un mapa de nombre → ruta.');
  const salida: Artefactos = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === null || val === undefined) continue;
    if (typeof val !== 'string') throw new ErrorAiFirst(`«artefactos.${k}» debe ser una ruta.`);
    salida[k] = val;
  }
  return salida;
}

function alcance(v: unknown): Alcance {
  if (v === undefined || v === null) return {};
  if (!esObjeto(v)) throw new ErrorAiFirst('«alcance» debe ser un mapa.');
  const salida: Alcance = {};
  if (typeof v['spec'] === 'string') salida.spec = v['spec'];
  if (typeof v['tolerancia'] === 'number') salida.tolerancia = v['tolerancia'];
  return salida;
}

/**
 * El perfil, o `undefined` si no está declarado. Un valor fuera de la lista es
 * error de formato y no un valor por defecto: el perfil decide qué se escribe,
 * y adivinarlo mal es peor que no tenerlo.
 */
function perfil(v: unknown): Perfil | undefined {
  if (v === undefined || v === null) return undefined;
  if (!esObjeto(v)) throw new ErrorAiFirst('«perfil» debe ser un mapa con «producto» y «repositorio».');
  const producto = v['producto'];
  const repositorio = v['repositorio'];
  if (typeof producto !== 'string' || !(PRODUCTOS as readonly string[]).includes(producto)) {
    throw new ErrorAiFirst(`«perfil.producto» debe ser uno de: ${PRODUCTOS.join(', ')}.`);
  }
  if (typeof repositorio !== 'string' || !(REPOSITORIOS as readonly string[]).includes(repositorio)) {
    throw new ErrorAiFirst(`«perfil.repositorio» debe ser uno de: ${REPOSITORIOS.join(', ')}.`);
  }
  return { producto: producto as Producto, repositorio: repositorio as Repositorio };
}

function auditoria(v: unknown): Auditoria | undefined {
  if (!esObjeto(v)) return undefined;
  const h = esObjeto(v['hallazgos']) ? v['hallazgos'] : {};
  return {
    fecha: String(v['fecha'] ?? ''),
    entropia: Number(v['entropia'] ?? 0),
    hallazgos: { p0: Number(h['p0'] ?? 0), p1: Number(h['p1'] ?? 0), p2: Number(h['p2'] ?? 0) },
  };
}

export function interpretar(texto: string): AiFirst {
  const { yaml } = separarFrontmatter(texto);
  const datos: unknown = parseYaml(yaml);
  if (!esObjeto(datos)) throw new ErrorAiFirst('El frontmatter no es un mapa YAML.');

  if (datos['formato'] !== FORMATO_SOPORTADO) {
    throw new ErrorAiFirst(
      `«formato: ${String(datos['formato'])}» no está soportado. Este detector entiende el formato ${FORMATO_SOPORTADO}.`,
    );
  }

  const salida: AiFirst = {
    formato: FORMATO_SOPORTADO,
    zonas_prohibidas: zonas(datos['zonas_prohibidas']),
    superficies_de_decision: listaDeCadenas(datos['superficies_de_decision'], 'superficies_de_decision'),
    alcance: alcance(datos['alcance']),
    artefactos: artefactos(datos['artefactos']),
  };
  if (typeof datos['proyecto'] === 'string') salida.proyecto = datos['proyecto'];
  if (typeof datos['fase'] === 'string') salida.fase = datos['fase'];
  if (datos['actualizado'] !== undefined && datos['actualizado'] !== null) {
    salida.actualizado = String(datos['actualizado']);
  }
  if (typeof datos['verificacion'] === 'string') salida.verificacion = datos['verificacion'];
  const perf = perfil(datos['perfil']);
  if (perf) salida.perfil = perf;
  const aud = auditoria(datos['auditoria']);
  if (aud) salida.auditoria = aud;
  return salida;
}

export async function leer(raiz: string): Promise<AiFirst> {
  const ruta = join(raiz, NOMBRE_ARCHIVO);
  let texto: string;
  try {
    texto = await readFile(ruta, 'utf8');
  } catch {
    throw new ErrorAiFirst(`No hay ${NOMBRE_ARCHIVO} en ${raiz}.`);
  }
  return interpretar(texto);
}

/**
 * Reemplaza sólo el bloque `auditoria:` del frontmatter, a nivel de texto, para
 * no reformatear el YAML ni perder sus comentarios. Si no existe, lo agrega al
 * final del frontmatter.
 */
export async function registrarAuditoria(raiz: string, auditoria: Auditoria): Promise<void> {
  const ruta = join(raiz, NOMBRE_ARCHIVO);
  const texto = await readFile(ruta, 'utf8');
  const m = FRONTMATTER.exec(texto);
  if (!m) throw new ErrorAiFirst(`${NOMBRE_ARCHIVO} no tiene frontmatter YAML.`);

  const bloque = stringifyYaml({ auditoria }, { lineWidth: 0 }).trimEnd();
  const yamlViejo = m[1] as string;
  // Desde `^auditoria:` hasta la siguiente clave de primer nivel o el final.
  const patron = /^auditoria:[\s\S]*?(?=^\S|(?![\s\S]))/m;
  const yamlNuevo = patron.test(yamlViejo)
    ? yamlViejo.replace(patron, bloque + '\n')
    : yamlViejo.trimEnd() + '\n\n' + bloque + '\n';

  const resto = texto.slice(m[0].length);
  await writeFile(ruta, `---\n${yamlNuevo.trimEnd()}\n---\n${resto}`, 'utf8');
}
