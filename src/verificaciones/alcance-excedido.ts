// Check 3 — Alcance excedido (P1).
//
// Los archivos tocados contra los que declara la spec activa en `alcance.spec`.
// Por encima de `tolerancia` → P1. Requiere que la spec liste archivos; si no lo
// hace, el check se reporta omitido.
//
// CONVENCIÓN QUE LA SPEC DEJÓ ABIERTA. docs/SPEC-PAQUETE.md §6 pide que la spec
// «liste archivos» pero no dice cómo. Acá se adopta la lectura mínima: una
// sección cuyo encabezado empiece por «Archivos» o «Alcance», con las rutas
// entre acentos graves (se admiten globs, y nombres sin extensión como
// `.npmrc` o `LICENSE`: acá una ruta excusa, no acusa —ADR-023—). Si esa
// convención cambia, cambia sólo este archivo.
//
// No cuentan como fuera de alcance: `AI-FIRST.md`, la propia spec, y los
// artefactos declarados —actualizar el SESSION_LOG al cerrar es parte del
// protocolo, no un desvío—.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coincideAlguno } from '../glob.js';
import { NOMBRE_ARCHIVO } from '../ai-first-md.js';
import { normalizarRuta, referenciasARutas, seccion } from '../markdown.js';
import { conHallazgos, omitido, type Verificacion } from './tipos.js';

const TITULO_SECCION = /^(archivos|alcance)\b/i;

async function specsActivas(raiz: string, spec: string): Promise<string[]> {
  const absoluta = resolve(raiz, spec);
  try {
    const info = await stat(absoluta);
    if (info.isFile()) return [spec];
    if (!info.isDirectory()) return [];
    const entradas = await readdir(absoluta);
    return entradas
      .filter((n) => /\.mdx?$/i.test(n) && !n.startsWith('.'))
      .sort()
      .map((n) => join(spec, n));
  } catch {
    return [];
  }
}

async function archivosDeclarados(raiz: string, spec: string): Promise<string[]> {
  const texto = await readFile(resolve(raiz, spec), 'utf8');
  const cuerpo = seccion(texto, TITULO_SECCION);
  if (cuerpo === undefined) return [];
  return referenciasARutas(cuerpo, { permitirGlob: true, permitirSinExtension: true }).map((r) => normalizarRuta(r.texto).replace(/^\/+/, ''));
}

export const alcanceExcedido: Verificacion = {
  id: 'alcance-excedido',
  nombre: 'Alcance excedido',
  severidad: 'P1',

  async correr(ctx) {
    const { spec, tolerancia = 0 } = ctx.aiFirst.alcance;
    if (!spec) return omitido(this.id, 'no hay «alcance.spec» declarado');

    const specs = await specsActivas(ctx.raiz, spec);
    if (specs.length === 0) return omitido(this.id, `no hay ninguna spec activa en ${spec}`);

    const declarados = new Set<string>();
    for (const s of specs) for (const a of await archivosDeclarados(ctx.raiz, s)) declarados.add(a);
    if (declarados.size === 0) {
      return omitido(this.id, `las specs en ${spec} no listan archivos (sección «Archivos» o «Alcance» con rutas entre acentos graves)`);
    }

    const exentos = [
      NOMBRE_ARCHIVO,
      spec.endsWith('/') ? spec : `${spec}/`,
      ...specs,
      ...Object.values(ctx.aiFirst.artefactos).filter((v): v is string => typeof v === 'string'),
    ];
    const patrones = [...declarados];

    const fuera = ctx.cambiados.filter((r) => !coincideAlguno(exentos, r) && !coincideAlguno(patrones, r));
    if (fuera.length <= tolerancia) return conHallazgos(this.id, []);

    return conHallazgos(this.id, [
      {
        severidad: 'P1',
        ruta: spec,
        mensaje: `${fuera.length} archivo${fuera.length === 1 ? '' : 's'} fuera del alcance declarado (tolerancia: ${tolerancia})`,
        detalle: fuera,
      },
    ]);
  },
};
