# Arranque de proyecto — del requerimiento al repo gobernado

> Spec de feature, con el formato de `templates/SPEC_MODULO_TEMPLATE.md`. Cubre
> una skill nueva (`protocolo-arranque`) y los cambios que el comando `init`
> necesita para prepararle el terreno. Estado: **implementada el 2026-09-21**
> (ADR-019, ADR-020, ADR-021). Pre-implementación de `protocolo-features`
> (Pasos 1, 2, 5 y 7) en este documento.

## Contexto de negocio [OBLIGATORIO]

El paquete cubre hoy desde que el repo ya existe y ya está documentado. La
mitad de arriba del ciclo —definir de qué trata el proyecto, decidir el stack,
escribir el PRD, la arquitectura y las specs— vive fuera: en un proyecto de
Claude Desktop con instrucciones propias, que produce los artefactos en un
`.zip` y los pega a mano en el repo recién creado. Ese prompt existe, funciona y
está transcrito íntegro al final de este documento.

El costo de que viva fuera es triple. **Se desincroniza**: el prompt le pide al
modelo que visite el sitio de la metodología en cada corrida «porque suele haber
actualizaciones», cuando las skills y los templates que definen esa metodología
viajan dentro del paquete. **No se puede versionar**: las instrucciones de un
proyecto de Claude Desktop no tienen tag, ni ADR, ni prueba. Y **obliga a un
trasvase manual** —descomprimir, pegar en `docs/`, pegar las skills— que es
justo el paso que `init` eliminó para las skills y que ADR-014 demostró que se
hace mal cuando se hace a mano.

Hay un segundo costo, más silencioso: **los ocho templates del paquete no los
usa nadie**. `templates/PRD_TEMPLATE.md`, `ARQUITECTURA_TEMPLATE.md`,
`SPEC_MODULO_TEMPLATE.md` y `GUIA_DISENO_TEMPLATE.md` son exactamente los
artefactos que esa fase de definición produce, y la ayuda de `init` todavía
dice «los templates siguen siendo manuales». Esta spec les da su consumidor.

La regla del repo —**si el `init` completo no sirve para configurar este repo,
no está terminado**— se extiende acá: si el paquete no sirve para arrancar un
proyecto desde una idea, el ciclo que la metodología vende está cortado por la
mitad.

## Alcance [OBLIGATORIO]

### La frontera: qué hace el código y qué hace la skill

El paquete corre **sin modelo, sin llave de API y sin red**. Es la regla que
sostiene el argumento de venta del detector y no se toca. Un PRD, en cambio, lo
escribe un modelo. La frontera que resuelve los dos hechos a la vez:

> **El comando prepara el terreno y verifica. La skill define y escribe.** El
> modelo que ejecuta la skill es el que el adoptante ya tiene abierto —Claude
> Code, o cualquier herramienta que lea `.agents/skills/`—, así que el paquete
> nunca llama a un modelo: entrega el procedimiento, no la inferencia.

Es la misma frontera que el paquete ya usa para los tres protocolos. Ninguna
pieza nueva de arquitectura: una skill más, que además estrena los templates.

**Incluye**

1. **Skill nueva `protocolo-arranque`**, la undécima del paquete. Conduce el
   ciclo entero de definición, en dos fases, sobre el repo y no sobre un `.zip`:
   descubrimiento con benchmark y cuestionamiento exhaustivo, y generación de
   artefactos a partir de los templates del paquete.
2. **El perfil del proyecto**, dos ejes que deciden qué artefactos salen:
   - *Tipo de producto*: SaaS, landing, API o servicio, CLI o librería, app móvil.
   - *Forma del repositorio*: repo único, monorepo, o uno de varios repos
     (polyrepo / workspace).
   El perfil se pregunta una vez, se declara en `AI-FIRST.md` y lo leen tanto la
   skill como la entrevista de `init`.
3. **`init` con entrevista**. Detecta si el proyecto ya está documentado. Si no
   lo está, entrevista; si lo está, lo dice y propone saltarla. `--sin-entrevista`
   nunca pregunta, `--entrevista` fuerza, y sin terminal interactiva se comporta
   como `--sin-entrevista`.
4. **Lo que la entrevista escribe**: el frontmatter de `AI-FIRST.md` —proyecto,
   fase, perfil, comando de verificación, zonas prohibidas confirmadas— y un
   **bloque delimitado por marcas** dentro de la sección «Adaptación a tu
   proyecto» de cada skill instalada. Las marcas son el manifiesto, como en
   `AGENTS.md` (ADR-018): dentro escribe la herramienta, fuera no toca nada.
5. **`init` en una carpeta sin `.git`** corre `git init` y sigue, en vez de
   salir con 2. Es el caso «proyecto que todavía no existe».
6. **La instalación por defecto depende del perfil**: un producto con interfaz
   recibe también `protocolo-ux`, `ux-writer` y `ux-audit`; uno sin interfaz
   sigue recibiendo las cinco de hoy. `--skills` sigue mandando sobre todo.
7. **`CHANGELOG.md` del paquete**, con las seis versiones ya publicadas y la
   que cierre este tramo. Pendiente arrastrado desde la sesión 5.

**No incluye**

- **Instalar el stack.** La skill lo decide, lo registra como fila del ADR y
  deja escritos los comandos. Ejecutarlos es del humano o del agente, no del
  paquete: `npx create-next-app` dentro de `ai-first init` sería un instalador
  de frameworks, que no es lo que este paquete es.
- **Generar skills nuevas por proyecto.** El prompt de Desktop lo pedía; el
  paquete ya trae diez y lo que falta es adaptarlas, que es el punto 4.
- **El `.zip`.** Los artefactos nacen en el repo, en su sitio definitivo.
- **Visitar el sitio de la metodología.** Viaja dentro del paquete.
- **`.ai-first/manifest.json`.** Las marcas lo resuelven para cada archivo que
  la herramienta mantiene. Sigue haciendo falta el día que exista `update`.
- **Escribir dentro de una skill enlazada** (ver regla 4).
- El workflow de publish (pendiente 4 del handoff) y los hooks (hueco 5).
- `sync`, `adr` y `handoff`, que siguen mapeados y sin escribir.

## Dependencias [OBLIGATORIO]

- **Reusa** de `src/init.ts`: `escanear`, `generarAiFirst`, `generarAdr`,
  `iniciar`, `elegirSkills`, `skillsDelPaquete` y, generalizado, el mecanismo de
  marcas de `ponerBloqueAgents`. De `src/git.ts`: `esRepoGit` y `listarArchivos`.
  De `src/ai-first-md.ts`: `interpretar`, para validar lo que se escribe. De
  `test/ayuda.ts`: `crearRepo`.
- **Nuevo en `src/`**: un módulo de entrevista (las preguntas, el orden y la
  lectura de la terminal) y uno de adaptación (qué respuesta va a qué skill).
- **Ninguna dependencia nueva.** La entrevista se lee con `node:readline/promises`,
  que es parte de la plataforma. Añadir una librería de prompts sería decisión
  de ADR y no hace falta.
- **No toca**: `src/audit.ts`, `src/verificaciones/`, `src/puntaje.ts`,
  `src/markdown.ts`, `src/glob.ts`. El detector no cambia.
- **Superficies de decisión tocadas**: `src/cli.ts` y `src/ai-first-md.ts` —el
  frontmatter gana `perfil`—. Las dos llevan fila en `docs/ADR.md`.
- **Zonas Prohibidas**: este repo no declara ninguna. Nada que aprobar.
- **Aviso al sitio**: se agrega una skill, no se mueve ninguna. Los enlaces
  publicados no se rompen. El sitio igual debe enterarse, porque su catálogo
  dice diez y pasan a ser once, y porque el capítulo «Gobierno del contexto»
  gana un protocolo anterior a los tres que ya describe.

## Reglas de negocio [OBLIGATORIO]

1. **Nunca sobreescribe.** Sigue valiendo entera, para cada ítem por separado
   (ADR-003, ADR-014, ADR-017).
2. **Nunca llama a un modelo, una API ni la red.** Ni el comando ni el detector.
3. **Idempotente.** Dos corridas seguidas dejan el repo igual.
4. **La entrevista no escribe en una skill enlazada.** Con `--enlazar`, la skill
   instalada es un enlace a la carpeta `skills/` del paquete: escribir ahí
   modificaría la fuente de verdad publicada, y en este repo además la que el
   sitio sirve por raw link. Se salta y se reporta como sugerido. Es la regla
   que impide que el paquete se adapte a sí mismo por accidente.
5. **Sólo entre las marcas.** En `AGENTS.md` y ahora en cada `SKILL.md`. Una
   marca sin pareja no escribe nada y se reporta como error, igual que hoy.
6. **Sin terminal interactiva no hay entrevista.** En CI, en un `npx`
   encadenado o con la entrada redirigida, `init` se comporta como
   `--sin-entrevista` y lo dice en el reporte. Una entrevista que se cuelga
   esperando una respuesta que nadie va a escribir es peor que no tenerla.
7. **Lo que se escribe, se puede leer.** Todo `AI-FIRST.md` que el comando
   produzca pasa por `interpretar` antes de tocar el disco.
8. **La skill propone y registra; no ejecuta.** No corre instaladores, no crea
   ramas, no publica. Lo que decide, lo deja escrito en el ADR.

## Modelo de datos [OBLIGATORIO]

El frontmatter de `AI-FIRST.md` gana una clave, opcional y con formato 1:

```yaml
perfil:
  producto: saas        # saas | landing | api | cli | movil
  repositorio: unico    # unico | monorepo | multiple
```

Ausente, todo se comporta como hoy. `interpretar` la lee y la valida; un valor
desconocido es error de formato, como cualquier otro campo del contrato.

## Archivos del módulo [OBLIGATORIO]

- `skills/protocolo-arranque/SKILL.md` — la skill nueva.
- `skills/protocolo-arranque/references/` — el mapa de artefactos por perfil.
- `src/entrevista.ts` — las preguntas, el orden, la lectura de la terminal.
- `src/adaptacion.ts` — qué respuesta va a qué skill, y el bloque que escribe.
- `src/init.ts` — `git init`, la detección de proyecto documentado, el enganche
  de la entrevista y la instalación por perfil.
- `src/ai-first-md.ts` — la clave `perfil`.
- `src/cli.ts` — las flags `--entrevista` y `--sin-entrevista`, y la ayuda.
- `test/entrevista.test.ts`, `test/adaptacion.test.ts`, `test/init.test.ts`.
- `CHANGELOG.md` — nuevo, en la raíz.
- `docs/ADR.md`, `README.md`, `skills/README.md`, `AGENTS.md`.

## Criterios de aceptación [OBLIGATORIO]

1. **Carpeta vacía, sin git.** `ai-first init` la inicializa como repo,
   entrevista, y deja `AI-FIRST.md` con perfil y zonas confirmadas, la
   estructura de `docs/`, las skills del perfil instaladas y adaptadas, y
   `AGENTS.md` con su bloque. `audit` sobre ese repo da 0 / 100.
2. **Repo con documentación** —`AGENTS.md` o algún `.md` bajo `docs/`—: `init`
   lo detecta, lo nombra, y la entrevista **no arranca sola**; propone y el
   valor por defecto es saltarla. Al saltarla, instala y adapta nada, como hoy.
3. **Sin terminal interactiva**, `init` no pregunta, no se cuelga y el reporte
   dice por qué.
4. **`--sin-entrevista`** nunca pregunta, ni en un repo vacío. **`--entrevista`**
   fuerza aunque haya documentación, y sale con 2 si no hay terminal.
5. **Skills enlazadas**: `init --enlazar --entrevista` sobre este repo no
   modifica ni un byte de `skills/`. Cada skill se reporta como sugerida, con
   la razón.
6. **Idempotencia**: la segunda corrida con las mismas respuestas no cambia
   nada; con respuestas distintas cambia sólo lo que hay entre las marcas.
7. **La skill**: sobre un repo recién inicializado, `protocolo-arranque` produce
   PRD, arquitectura y specs derivados de los templates del paquete, y la
   primera fila del ADR con la decisión de stack. Se verifica a mano, contra un
   proyecto de prueba, porque es una skill y no código.
8. `pnpm test` en verde por exit code y `audit:self` en 0 / 100 al cerrar.

## Secuencia de implementación [Paso 7]

Variante solo-backend, sin schema ni interfaz. Cada paso verifica antes de
avanzar:

1. **Contrato**: `perfil` en `src/ai-first-md.ts` y sus pruebas. Verifica: `pnpm test`.
2. **Dominio**: tipos de la entrevista y del perfil; el mapa perfil → skills y
   perfil → artefactos. Verifica: compila.
3. **Aplicación**: `src/entrevista.ts` y `src/adaptacion.ts`, puros y probables
   sin terminal —las preguntas son datos, la lectura se inyecta—. Verifica: `pnpm test`.
4. **Integración**: `git init`, detección de documentación y enganche en
   `iniciar`. Verifica: `pnpm test`.
5. **CLI**: flags y ayuda. Verifica: `node dist/src/cli.js init --help`.
6. **La skill**: `skills/protocolo-arranque/`, y el `README.md` de skills.
7. **Pruebas** de los criterios 1 a 6, una por `test(...)`.
8. `test-fix`; `audit:self`; `protocolo-cierre`; `version-bump` (MINOR).

## Preguntas abiertas [OPCIONAL]

1. **¿`protocolo-arranque` entra en las instaladas por defecto?** Propuesta: sí,
   pero sólo cuando la entrevista corre, porque es la skill que se usa una vez
   y al principio. En un repo ya documentado no hace falta.
2. **¿El perfil `multiple` (varios repos) necesita algo distinto del `unico`?**
   Propuesta: en esta versión, no. Cambia lo que la skill escribe en la
   arquitectura, no lo que el comando hace.

## Anexo — El prompt de origen, transcrito

Lo que hoy vive en las instrucciones de un proyecto de Claude Desktop, tal como
está, para que se vea qué se migró y qué se descartó.

> **Se transcribe literal, con el nombre viejo incluido.** Donde dice «AI-First
> Blueprint», hoy es **Falcux AI-First**: el renombre está en la sección
> «Naming» de `docs/HANDOFF.md` y se aplicó al paquete en CHG-003. La cita no se
> corrige, porque corregir una fuente histórica es falsearla.

> **ROL.** Actúa como un Senior AI Solutions Architect y experto certificado en
> la metodología AI-First Blueprint. Tu misión es liderar el descubrimiento y
> definición total de requerimientos para proyectos digitales, garantizando que
> el alcance sea sólido e innovador, y traducir requerimientos de negocio en
> arquitecturas técnicas preparadas para el desarrollo con agentes de código.
>
> **Contexto y objetivo.** El usuario desea aterrizar un alcance o requerimiento
> base, junto con notas de reuniones, en artefactos técnicos detallados
> (arquitectura, PRD, specs, guía de diseño, protocolos y skills).
>
> **Fase 1: recopilación, clarificación y benchmark (iterativo).** Solicitar el
> contexto base. Identificar herramientas o flujos similares en el mercado y
> proponer mejoras. Cuestionamiento exhaustivo, sin límite, hasta cerrar
> cualquier vacío: definición del problema y del éxito, lógica de negocio y
> casos de uso, integraciones, orígenes de datos y flujos de trabajo. Postura
> propositiva: si una idea del usuario es ineficiente, proponer una alternativa.
>
> **Fase 2: generación de artefactos.** Arquitectura del sistema con diagrama
> Mermaid; PRD; specs por funcionalidad; guía de diseño de interacción;
> protocolos y skills. Empaquetar todo en un `.zip` bien estructurado.
>
> **Validación final.** ¿Cada artefacto es directamente interpretable por un
> desarrollador usando Claude Code? ¿Se alinean todos los protocolos con el
> AI-First Blueprint?

**Qué se migra tal cual**: el rol, el benchmark, el cuestionamiento exhaustivo
sin límite, la postura propositiva, la validación final y los cinco artefactos.

**Qué cambia al migrarlo**:

| Del prompt | En el paquete | Por qué |
|---|---|---|
| «Revisa la metodología en el sitio» | Los templates y las diez skills del paquete | La metodología viaja instalada; una corrida no depende de la red ni de que el sitio esté al día |
| «Empaqueta todo en un `.zip`» | Escribe en el repo, en su ruta definitiva | El trasvase manual es el paso que `init` eliminó, y ADR-014 mostró cómo sale mal |
| «Genera protocolos y skills» | Adapta las que el paquete instala | Ya existen diez; lo que faltaba era adaptarlas al proyecto |
| Artefactos siempre los mismos | Artefactos según el perfil | Una landing no necesita specs por módulo; un CLI no necesita guía de diseño |

## Estado de implementación [CRECE]

### Implementado

Todo el alcance, el 2026-09-21, en la misma sesión que la spec. Tres ADR:

- **ADR-019**, la frontera y la skill nueva. `skills/protocolo-arranque/` con su
  `SKILL.md` y la tabla de artefactos por perfil en `references/`. El perfil en
  el contrato (`src/ai-first-md.ts`), la entrevista (`src/entrevista.ts`), la
  adaptación (`src/adaptacion.ts`) y las flags del CLI.
- **ADR-020**, las marcas como manifiesto en cualquier archivo:
  `ponerBloqueAgents` se generalizó a `ponerBloqueMarcado`, con un encabezado
  bajo el cual insertar la primera vez. Una skill enlazada no se adapta nunca.
- **ADR-021**, `git init` en una carpeta que todavía no es repositorio.

Los siete criterios, verificados: los seis primeros con pruebas sobre repos
desechables (70 → 91 pruebas), y el primero además a mano sobre este repo, donde
`init --enlazar` sigue reportando todo saltado y no cambia un byte.

### Lo que la implementación añadió a la spec

- **El escaneo deduce más**: el comando de tipos, el de lint y el archivo que
  lleva la versión. Eran preguntas de la entrevista sin valor por defecto, y una
  pregunta sin valor por defecto es una pregunta que se contesta mal.
- **Las validaciones de uso corren antes de entrevistar**, no antes de escribir:
  descubrir un nombre de skill inexistente después de doce preguntas tira el
  trabajo del adoptante.
- **Una respuesta vacía borra lo deducido.** Si el escaneo dedujo un comando de
  lint y el adoptante contesta con vacío, no hay comando de lint: el silencio
  también es información.
- **`--entrevista` sin terminal es error de uso**, no una espera eterna; sin la
  flag, la ausencia de terminal simplemente no entrevista y el reporte lo dice.

### Pendiente

- Nada de esta spec. El criterio 7 —lo que la skill produce— se verifica contra
  un proyecto real la primera vez que se use, porque es una skill y no código.

## Preguntas abiertas resueltas

1. **¿`protocolo-arranque` entra por defecto?** Sí, pero sólo cuando la
   entrevista corre. En un repo ya documentado no se instala.
2. **¿El perfil `multiple` necesita algo distinto?** No en el comando. Cambia lo
   que la skill escribe, y eso está en su tabla de artefactos por perfil.

## Changelog de esta spec

- 2026-09-21 — Borrador inicial, Paso 1 de `protocolo-features`.
- 2026-09-21 — Implementada entera. Estado de implementación al día y las dos
  preguntas abiertas, resueltas.

## Notas de implementación [CRECE]

**Inventario de reuso (Paso 2 del protocolo).**

| Pieza | Decisión | Justificación |
|---|---|---|
| Escaneo, generación de `AI-FIRST.md` y del ADR | Reusa `escanear` / `generarAiFirst` / `generarAdr` | Probados y en su sitio; la entrevista sólo aporta respuestas donde hoy hay valores deducidos |
| Bloque delimitado por marcas | **Extiende** `ponerBloqueAgents` a `ponerBloqueMarcado` | El mecanismo es idéntico en `AGENTS.md` y en un `SKILL.md`; lo único que cambia es dónde se inserta cuando no hay marcas. Duplicarlo sería tener dos parsers de lo mismo |
| Política «salta lo que existe, dilo» | Reusa la de ADR-014 y ADR-017 | Vale igual para una skill adaptada que para una instalada |
| Lectura de la terminal | Nueva local, sobre `node:readline/promises` | Una librería de prompts sería dependencia nueva y decisión de ADR; las preguntas son datos y la lectura se inyecta, así que se prueba sin terminal |
| Preguntas de la entrevista | Nueva compartida (`src/entrevista.ts`) | Las lee el comando hoy y las va a leer `sync` el día que exista; no se entierran dentro de `init` |
| Mapa perfil → skills y perfil → artefactos | Nueva compartida (`src/entrevista.ts`) | Lo consultan el comando y la skill nueva; es el contrato del perfil |
| Detección de «proyecto documentado» | Nueva local | Tres condiciones sobre el listado de git; no hay nada que reusar |
| Los cinco artefactos de la fase 2 | Reusa los 8 `templates/` | Existen, están escritos y hoy no los consume nadie. Esta spec les da su consumidor |
| Diagrama de arquitectura | Reusa `ARQUITECTURA_TEMPLATE.md` | Ya contempla el diagrama; el prompt de origen pedía Mermaid y el template lo admite |

Ninguna fila «nueva local» es difícil de revertir. Las dos compartidas y la
clave `perfil` del contrato sí lo son, y van al ADR.
