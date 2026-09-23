// Lo poco de Markdown que el detector necesita entender: dónde hay referencias
// a rutas. Todo con expresiones regulares y con una regla de oro: lo que está
// dentro de un bloque de código es un ejemplo, no una referencia.

export interface Referencia {
  /** El texto tal como aparece, sin acentos graves ni paréntesis. */
  texto: string;
  /** Línea 1-indexada dentro del documento. */
  linea: number;
}

const BLOQUE_DE_CODIGO = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const ENLACE = /\]\(([^)\s]+)\)/g;
const ACENTOS_GRAVES = /`([^`\n]+)`/g;

const EXTENSIONES = /\.(mdx?|tsx?|jsx?|[cm]js|jsonc?|ya?ml|toml|py|astro|css|sh|txt|glb|svg|png|jpe?g|webp)$/i;
const CARACTERES_NO_RUTA = /[\s<>|=()$"'&;!,]/;
const CARACTERES_GLOB = /[*?{}[\]]/;
const REF_DE_GIT = /^(origin|upstream|refs|HEAD)\//;
// Un nombre de archivo a secas: `.npmrc`, `LICENSE`, `Makefile`. Con punto
// inicial opcional, y nunca `..`.
const NOMBRE_SUELTO = /^\.?[a-z0-9_][a-z0-9._-]*$/i;

/**
 * Reemplaza cada bloque de código por saltos de línea equivalentes, para que
 * las líneas del resto no se muevan.
 */
export function sinBloquesDeCodigo(texto: string): string {
  return texto.replace(BLOQUE_DE_CODIGO, (bloque) => '\n'.repeat(bloque.split('\n').length - 1));
}

export function lineaDe(texto: string, indice: number): number {
  let linea = 1;
  for (let i = 0; i < indice && i < texto.length; i++) if (texto.charCodeAt(i) === 10) linea++;
  return linea;
}

/**
 * ¿Este token parece una ruta del repositorio y no una palabra, un comando, una
 * URL o una ruta de otro sitio? Las reglas salieron de correr el detector
 * contra un repo real; cada una tiene su falso positivo detrás.
 */
export function pareceRuta(
  token: string,
  opciones: { permitirGlob?: boolean; permitirSinExtension?: boolean } = {},
): boolean {
  if (token.length < 2 || token.length > 200) return false;
  if (CARACTERES_NO_RUTA.test(token)) return false;
  if (token.includes('://') || token.startsWith('mailto:') || token.startsWith('#')) return false;
  if (token.startsWith('@') || token.startsWith('-') || token.startsWith('~')) return false;
  // Con «/» inicial es una URL del sitio (`/docs`), un comando (`/ai-first`) o
  // una ruta absoluta: en prosa, casi nunca una ruta del repo.
  if (token.startsWith('/')) return false;
  if (REF_DE_GIT.test(token)) return false; // origin/main
  if (/XXX|\{[a-z_]+\}|…|\.\.\./i.test(token)) return false; // marcadores: CHG-XXX, {modulo}, docs/…
  if (!opciones.permitirGlob && CARACTERES_GLOB.test(token)) return false;
  if (/^\d+(\.\d+)*$/.test(token)) return false; // versiones: 1.2.3
  if (/^\.[a-z0-9]+$/i.test(token) && EXTENSIONES.test(token)) return false; // una extensión suelta: `.glb`
  if (token.includes('/') || EXTENSIONES.test(token)) return true;

  // Sin barra ni extensión conocida —`.npmrc`, `LICENSE`, `Makefile`— sólo
  // cuenta donde las rutas EXCUSAN, nunca donde acusan (ADR-023). El check 3 lo
  // activa porque un token de más ahí no imputa nada: tiene que coincidir exacto
  // con un archivo que git reporta como tocado para excusarlo. El check 4 no,
  // porque ahí la ruta que no existe es un P2, y este repo ya tiene el caso en
  // `docs/ADR.md`: cita el `.zshrc` de una máquina en una analogía, y ese
  // documento se agrega, no se edita.
  return opciones.permitirSinExtension === true && NOMBRE_SUELTO.test(token);
}

/** Quita lo que no forma parte de la ruta: `#ancla`, `:42`, «/» final, puntuación de cierre. */
export function normalizarRuta(token: string): string {
  return token
    .replace(/#.*$/, '')
    .replace(/:\d+(:\d+)?$/, '')
    .replace(/[.,;:]+$/, '')
    .replace(/\/+$/, '');
}

/** Referencias a rutas en enlaces `[texto](ruta)` y entre acentos graves, fuera de bloques de código. */
export function referenciasARutas(
  texto: string,
  opciones: { permitirGlob?: boolean; permitirSinExtension?: boolean } = {},
): Referencia[] {
  const limpio = sinBloquesDeCodigo(texto);
  const salida: Referencia[] = [];
  for (const patron of [ENLACE, ACENTOS_GRAVES]) {
    for (const m of limpio.matchAll(patron)) {
      const token = (m[1] as string).trim();
      if (!pareceRuta(token, opciones)) continue;
      salida.push({ texto: token, linea: lineaDe(limpio, m.index ?? 0) });
    }
  }
  return salida.sort((a, b) => a.linea - b.linea);
}

/**
 * El texto de una sección: desde un encabezado cuyo título coincide con el
 * patrón hasta el siguiente encabezado de igual o mayor nivel.
 */
export function seccion(texto: string, titulo: RegExp): string | undefined {
  const limpio = sinBloquesDeCodigo(texto);
  const encabezados = [...limpio.matchAll(/^(#{1,6})[ \t]+(.+?)[ \t]*$/gm)];
  for (let i = 0; i < encabezados.length; i++) {
    const actual = encabezados[i] as RegExpMatchArray;
    if (!titulo.test(actual[2] as string)) continue;
    const nivel = (actual[1] as string).length;
    const inicio = (actual.index ?? 0) + actual[0].length;
    let fin = limpio.length;
    for (let j = i + 1; j < encabezados.length; j++) {
      const sig = encabezados[j] as RegExpMatchArray;
      if ((sig[1] as string).length <= nivel) {
        fin = sig.index ?? limpio.length;
        break;
      }
    }
    return limpio.slice(inicio, fin);
  }
  return undefined;
}

export interface Encabezado extends Referencia {
  nivel: number;
}

/** Encabezados de un documento, fuera de bloques de código. */
export function encabezados(texto: string): Encabezado[] {
  const limpio = sinBloquesDeCodigo(texto);
  return [...limpio.matchAll(/^(#{1,6})[ \t]+(.+?)[ \t]*$/gm)].map((m) => ({
    nivel: (m[1] as string).length,
    texto: (m[2] as string).trim(),
    linea: lineaDe(limpio, m.index ?? 0),
  }));
}
