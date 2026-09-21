import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bloqueDeSkill, ENCABEZADO_ADAPTACION } from '../src/adaptacion.js';
import {
  artefactosDelPerfil,
  cuantasPreguntas,
  entrevistar,
  esAfirmativo,
  formatearPregunta,
  interpretarOpcion,
  perfilDe,
  preguntaDeSecuencia,
  preguntasBase,
  secuenciasDe,
  skillsDelPerfil,
  SKILLS_BASE,
  type Pregunta,
  type Respuestas,
} from '../src/entrevista.js';
import { MARCA_FIN, MARCA_INICIO, ponerBloqueMarcado, type Escaneo } from '../src/init.js';

/** Un escaneo mínimo, como el que devuelve `escanear` sobre un repo pelado. */
function escaneo(extra: Partial<Escaneo> = {}): Escaneo {
  return {
    proyecto: 'mi-app',
    zonas: [{ ruta: '.env*', razon: 'credenciales' }],
    superficies: [],
    artefactos: {},
    rutaAdr: 'docs/ADR.md',
    adrExiste: false,
    ...extra,
  };
}

/** Un lector que responde de la lista, en orden. Enter es cadena vacía. */
function lectorDeLista(respuestas: string[]) {
  let i = 0;
  return async () => respuestas[i++] ?? '';
}

test('una opción se acepta por valor, por número o por prefijo sin ambigüedad', () => {
  const pregunta: Pregunta = {
    clave: 'producto',
    enunciado: '¿Qué clase de producto es?',
    tipo: 'opcion',
    opciones: [
      { valor: 'saas', etiqueta: 'SaaS' },
      { valor: 'landing', etiqueta: 'Landing' },
      { valor: 'api', etiqueta: 'API' },
    ],
    porDefecto: 'saas',
  };

  assert.equal(interpretarOpcion(pregunta, 'landing'), 'landing');
  assert.equal(interpretarOpcion(pregunta, '2'), 'landing');
  assert.equal(interpretarOpcion(pregunta, 'lan'), 'landing');
  assert.equal(interpretarOpcion(pregunta, 'LANDING'), 'landing');

  // Enter, fuera de rango y lo que no casa caen al valor por defecto: una
  // entrevista no es un examen, y repreguntar por un dedazo cansa más que ayuda.
  assert.equal(interpretarOpcion(pregunta, ''), 'saas');
  assert.equal(interpretarOpcion(pregunta, '9'), 'saas');
  assert.equal(interpretarOpcion(pregunta, 'qué'), 'saas');
});

test('la confirmación acepta las formas usuales de decir que sí', () => {
  for (const si of ['si', 'sí', 'S', 'yes', 'y', '1', 'true']) assert.ok(esAfirmativo(si), si);
  for (const no of ['no', 'n', '', 'nope', '0']) assert.ok(!esAfirmativo(no), no);
});

test('la entrevista recorre todas las preguntas y deja las respuestas interpretadas', async () => {
  const e = escaneo();
  const total = cuantasPreguntas(e);
  assert.equal(total, preguntasBase(e).length + 1 + 1, 'las base, la secuencia y una zona');

  const respuestas = await entrevistar(
    e,
    lectorDeLista([
      'tienda', // proyecto
      '2', // fase: mvp
      'landing', // producto
      '1', // repositorio: unico
      'npm test', // verificacion
      '', // typecheck: ninguno
      'npm run lint', // lint
      'no', // agentes
      'package.json', // manifiesto
      'contenido', // secuencia
      'no', // .env* no es zona
    ]),
  );

  assert.equal(respuestas['proyecto'], 'tienda');
  assert.equal(respuestas['fase'], 'mvp');
  assert.equal(respuestas['typecheck'], '', 'una respuesta vacía es información: no hay comando de tipos');
  assert.equal(respuestas['lint'], 'npm run lint');
  assert.equal(respuestas['secuencia'], 'contenido');
  assert.equal(respuestas['zona:.env*'], 'no');
  assert.deepEqual(perfilDe(respuestas), { producto: 'landing', repositorio: 'unico' });
});

test('Enter en todo deja los valores por defecto, que salen del escaneo', async () => {
  const e = escaneo({ verificacion: 'pnpm test', manifiesto: 'package.json' });
  const respuestas = await entrevistar(e, async () => '');

  assert.equal(respuestas['proyecto'], 'mi-app');
  assert.equal(respuestas['fase'], 'exploracion');
  assert.equal(respuestas['verificacion'], 'pnpm test', 'lo deducido es el valor por defecto');
  assert.equal(respuestas['zona:.env*'], 'si', 'una zona sugerida se confirma con Enter');
});

test('las secuencias que se ofrecen dependen del producto', () => {
  assert.ok(secuenciasDe('landing').some((s) => s.valor === 'contenido'));
  assert.ok(!secuenciasDe('landing').some((s) => s.valor === 'contrato-cli'));
  assert.ok(secuenciasDe('cli').every((s) => s.productos.includes('cli')));

  // La pregunta siempre tiene opciones y un valor por defecto entre ellas.
  for (const producto of ['saas', 'landing', 'api', 'cli', 'movil'] as const) {
    const p = preguntaDeSecuencia(producto);
    assert.ok((p.opciones ?? []).length > 0, producto);
    assert.ok((p.opciones ?? []).some((o) => o.valor === p.porDefecto), producto);
  }
});

test('el perfil decide qué skills se instalan y qué artefactos pide el arranque', () => {
  const saas = skillsDelPerfil({ producto: 'saas', repositorio: 'unico' });
  const api = skillsDelPerfil({ producto: 'api', repositorio: 'unico' });

  for (const base of SKILLS_BASE) {
    assert.ok(saas.includes(base), base);
    assert.ok(api.includes(base), base);
  }
  assert.ok(saas.includes('ux-writer'), 'un SaaS tiene interfaz');
  assert.ok(!api.includes('ux-writer'), 'una API no, y una skill que no aplica es presupuesto de carga gastado');

  const destinos = (p: Parameters<typeof artefactosDelPerfil>[0]) => artefactosDelPerfil(p).map((a) => a.destino);
  assert.ok(destinos({ producto: 'saas', repositorio: 'unico' }).includes('docs/GUIA_DISENO.md'));
  assert.ok(!destinos({ producto: 'cli', repositorio: 'unico' }).includes('docs/GUIA_DISENO.md'));
  assert.ok(destinos({ producto: 'landing', repositorio: 'unico' }).includes('docs/specs/sitio.md'), 'una landing no tiene módulos');
});

test('el bloque de una skill sólo dice lo que la entrevista respondió', () => {
  const respuestas: Respuestas = {
    producto: 'api',
    repositorio: 'unico',
    verificacion: 'pnpm test',
    typecheck: '',
    lint: '',
    secuencia: 'contrato-cli',
    agentes: 'no',
    manifiesto: 'Cargo.toml',
  };

  const features = bloqueDeSkill('protocolo-features', respuestas, escaneo());
  assert.ok(features?.includes('pnpm test'));
  assert.ok(features?.includes('no declara un comando de tipos'), 'el hueco se dice, no se inventa');
  assert.ok(features?.includes('secuencial'));
  assert.ok(features?.includes('Sin interfaz'), 'una API no recorre los pasos de UX');

  assert.ok(bloqueDeSkill('version-bump', respuestas, escaneo())?.includes('Cargo.toml'));

  // Una skill de interfaz en un proyecto sin interfaz no recibe adaptación.
  assert.equal(bloqueDeSkill('ux-writer', respuestas, escaneo()), undefined);
  // Y una skill que la entrevista no cubre, tampoco.
  assert.equal(bloqueDeSkill('i18n', respuestas, escaneo()), undefined);
});

test('el bloque entra bajo su encabezado y luego se reemplaza sin tocar el resto', () => {
  const skill = `---\nname: test-fix\n---\n\n## Cuándo activar\n\nTexto.\n\n${ENCABEZADO_ADAPTACION}\n\n1. Los comandos.\n\nSkills relacionadas: otra.\n`;

  const primera = ponerBloqueMarcado(skill, 'BLOQUE UNO', { archivo: 'SKILL.md', trasEncabezado: ENCABEZADO_ADAPTACION });
  assert.ok(primera.includes(`${ENCABEZADO_ADAPTACION}\n\n${MARCA_INICIO}\nBLOQUE UNO\n${MARCA_FIN}`), 'entra bajo su encabezado');
  assert.ok(primera.includes('1. Los comandos.'), 'lo que ya decía la sección sigue ahí');
  assert.ok(primera.includes('Skills relacionadas: otra.'));

  const segunda = ponerBloqueMarcado(primera, 'BLOQUE DOS', { archivo: 'SKILL.md', trasEncabezado: ENCABEZADO_ADAPTACION });
  assert.ok(segunda.includes('BLOQUE DOS'));
  assert.ok(!segunda.includes('BLOQUE UNO'));
  assert.equal(segunda.split(MARCA_INICIO).length, 2, 'un solo bloque, no uno por corrida');
  assert.ok(segunda.includes('1. Los comandos.'), 'fuera de las marcas no cambia una letra');

  // Sin el encabezado, al final; con una marca huérfana, no se escribe nada.
  assert.ok(ponerBloqueMarcado('Sólo texto.\n', 'X', { archivo: 'SKILL.md', trasEncabezado: '## No está' }).endsWith(`${MARCA_FIN}\n`));
  assert.throws(() => ponerBloqueMarcado(`a\n${MARCA_INICIO}\nb\n`, 'X', { archivo: 'SKILL.md' }), /sin su pareja/);
});

test('cada pregunta se dibuja con su valor por defecto a la vista', () => {
  const [proyecto, fase] = preguntasBase(escaneo());
  assert.ok(formatearPregunta(proyecto!).includes('[mi-app]'));

  const dibujada = formatearPregunta(fase!);
  assert.ok(dibujada.includes('1) '), 'las opciones van numeradas, que es como se contestan');
  assert.ok(dibujada.includes('por defecto'));
});
