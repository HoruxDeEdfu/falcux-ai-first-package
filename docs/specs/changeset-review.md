# `changeset-review` — revisar los changesets antes de publicar

> Spec de feature, con el formato de `templates/SPEC_MODULO_TEMPLATE.md`. Cubre
> una skill nueva, la duodécima, y lo que `init` necesita para instalarla y
> adaptarla sola. Sin modelo de datos, permisos, API ni interfaz. Estado:
> **validada e implementada el 2026-10-15** (ADR-028).
> Pre-implementación de `protocolo-features` (Pasos 1, 2, 5 y 7) en este
> documento; los pasos 3, 4 y 6 no aplican a un CLI sin interfaz.

## Contexto de negocio [OBLIGATORIO]

En un monorepo que versiona con Changesets, `version-bump` choca en todo:
- escribe la misma versión en todos los manifiestos, cuando cada paquete lleva
  la suya;
- sube la versión una vez por sesión, cuando la sube `changeset version` al
  mergear el PR de versiones;
- busca tags `v*`, cuando en un monorepo son `<paquete>@<versión>`;
- fecha un CHANGELOG que en ese repo escribe la herramienta.

Lo que ese repo necesita no es un número, sino una revisión: que el tipo de cada
changeset pendiente corresponda a lo que de verdad cambió. Un changeset más bajo
que el diff publica un cambio que rompe como si no rompiera.

La skill ya existe y funcionó en un repo real: el sistema de diseño Marimba
(atc-platform-marimba-designsystem, en .agents/skills/changeset-review). Son
seis pasos: pendientes, diff por paquete, tipo contra diff, major, si el lote
amerita publicarse y el reporte. Lo que tiene de Marimba se generaliza acá.

El 2026-10-15 se decidió que sea una **skill aparte** y no un modo de
`version-bump`. Las dos no comparten ninguno de sus pasos, sólo las reglas
SemVer, y la descripción de `version-bump` haría que se cargara en el repo
equivocado.

## Alcance [OBLIGATORIO]

**Incluye**

1. **La skill `skills/changeset-review/SKILL.md`**, generalizada de la de
   Marimba. Sólo reporta: no edita changesets, no crea tags, no mergea el PR
   de versiones, no corre `changeset version` ni `changeset publish`.
   - **Señales genéricas:** quedan las que valen para cualquier paquete npm:
     un `export` o una clave de `exports` que se borra, una major que sube en
     `peerDependencies`, un `name` que cambia, un export nuevo.
   - **Señales del dominio:** las de props, tokens y variables CSS eran de un
     sistema de diseño. Salen de la tabla y quedan como ejemplo en
     «Adaptación a tu proyecto», para que cada repo agregue las suyas.
   - **Rutas y política:** la guía de migración, las novedades y cuándo
     publicar no son deducibles. La sección de adaptación las pide, fuera de
     las marcas.
2. **`init` detecta Changesets** por `.changeset/config.json`, sin pregunta
   nueva. Es el archivo que crea `changeset init`; sin él la herramienta no
   corre. Con él:
   - `changeset-review` toma el lugar de `version-bump` en las skills por
     defecto, en las que sugiere el perfil y en las marcadas de la entrevista;
   - la entrevista no pregunta `manifiesto`, porque los manifiestos los
     escribe `changeset version`.
3. **La adaptación de `changeset-review`**, entre marcas y deducida del repo,
   sin entrevista:
   - **los paquetes que versiona**: los de `pnpm-workspace.yaml` o de
     `workspaces` en `package.json` que tienen `name`, menos los de `ignore`
     del config;
   - **la rama base**: `baseBranch` del config, o `main`;
   - **la forma del tag**: se lee del último tag del repo. Sin tags, la
     convención de Changesets: `<paquete>@<versión>` en un monorepo, aunque
     tenga un solo paquete, y `v<versión>` en un repo sin workspace;
   - **el PR de versiones**: la rama `changeset-release/<base>`, y el título
     del paso con `changesets/action` en `.github/workflows/`, o «Version
     Packages», que es el que esa acción pone por defecto.
4. **El Paso 6 de `protocolo-cierre`**, resuelto en su bloque de adaptación y
   sin tocar su cuerpo. Con Changesets, el bloque dice que el número no se sube
   en la sesión: se verifica que la sesión dejó su changeset
   (`changeset status`) y se corre `changeset-review` antes de mergear el PR de
   versiones. Es lo que le faltaba a la versión de Marimba.
5. **Lo que cuenta las skills**: README, `skills/README.md` y `AGENTS.md` pasan
   de once a doce. La etiqueta de la entrevista y la tabla de `skills/README.md`
   la incluyen.

**No incluye**

- La regla «NO desincronizar versiones» de `version-bump`, que también falla en
  un monorepo con versiones independientes que no usa Changesets. Es otro
  cambio, sobre una skill que asume «Gobierno del contexto».
- Tocar el cuerpo de `protocolo-cierre`. Cambiarlo, aunque sea una línea,
  obliga a avisar al sitio y a revisar su capítulo; el bloque de adaptación
  alcanza.
- Reemplazar la skill local de Marimba. Ese repo decide cuándo pasa a la del
  paquete.
- Que el detector lea changesets. `audit` no cambia.

## Dependencias [OBLIGATORIO]

- `src/init.ts`: `escanear` detecta Changesets y deduce lo del punto 3.
- `src/git.ts`: una pregunta nueva, el último tag. Es el único sitio que habla
  con git.
- `src/adaptacion.ts`: la entrada de `changeset-review`, y la de
  `protocolo-cierre` con la rama de Changesets.
- `src/entrevista.ts`: qué se sugiere y qué se pregunta con Changesets.
- `yaml`, que ya es dependencia, para leer `pnpm-workspace.yaml` y los flujos.
  No entra ninguna dependencia.
- No toca: `audit`, las verificaciones, el puntaje, el cuerpo de
  `protocolo-cierre` ni el de `version-bump`.

## Reglas de negocio [OBLIGATORIO]

1. La detección es un archivo: `.changeset/config.json`. No se pregunta. Un
   `@changesets/cli` en `devDependencies` sin config no cuenta: la herramienta
   no corre sin él.
2. Lo que no se deduce no se inventa. Sin paquetes reconocibles, la línea no se
   escribe. Sin tags, el bloque dice que la forma es la convención, no la del
   repo.
3. `--skills` manda sobre la detección, como siempre: quien escribe
   `--skills version-bump` en un repo con Changesets se lleva `version-bump`.
4. La adaptación de `changeset-review` no lee ninguna respuesta de la
   entrevista, así que `ai-first skill changeset-review` la adapta sin
   preguntar nada.

## Archivos del módulo [OBLIGATORIO]

- `skills/changeset-review/SKILL.md` — la skill.
- `src/init.ts` — la detección en `escanear` y las skills por defecto.
- `src/git.ts` — el último tag.
- `src/adaptacion.ts` — los bloques de `changeset-review` y de `protocolo-cierre`.
- `src/entrevista.ts` — la sugerencia y la pregunta de `manifiesto`.
- `test/init.test.ts`, `test/entrevista.test.ts` — los criterios de abajo.
- `skills/README.md`, `README.md`, `AGENTS.md` — de once a doce.
- `docs/ADR.md` — la fila de la decisión.
- `CHANGELOG.md` — la entrada de la versión.

## Criterios de aceptación [OBLIGATORIO]

1. Un monorepo con `.changeset/config.json`, dos paquetes y sin entrevista:
   `init` instala `changeset-review` y no `version-bump`.
2. Con entrevista sobre ese repo: no se pregunta `manifiesto`, y la selección
   trae `changeset-review` marcada y `version-bump` no.
3. El bloque de `changeset-review` nombra los dos paquetes, la rama base del
   config y la forma del tag. Con tags `@acme/ui@1.2.0` en el repo es la de
   esos tags; sin tags, la convención.
4. El bloque de `protocolo-cierre` dice que el Paso 6 se hace con
   `changeset status` y `changeset-review`, no con `version-bump`.
5. Un repo sin `.changeset/` da lo mismo que hoy, byte a byte.
6. `ai-first skill changeset-review` en ese monorepo, sin terminal, la deja
   adaptada.
7. `pnpm test` en verde por su exit code, `audit:self` en 0 / 100.

## Estado de implementación [CRECE]

### Implementado
- Los siete criterios (2026-10-15, sesión 22), con siete pruebas nuevas sobre un
  monorepo desechable. Suite en 154.

### Pendiente
- Nada de esta spec.

## Notas de implementación [CRECE]

- **Lo que sale del repo se adapta sin entrevista.** La regla de CHG-026 era
  «sin respuestas, nada se adapta». Una skill cuya adaptación no lee ninguna
  respuesta (`lee: []` en `src/adaptacion.ts`) se adapta igual, como el bloque
  de `AGENTS.md`, siempre que el repo traiga con qué. Sin Changesets,
  `changeset-review` no recibe bloque ni aviso.
- **El encabezado del bloque** dice ahora «con lo que respondió la entrevista y
  lo que encontró en el repo». Cambia el texto entre las marcas de todas las
  skills adaptadas en la siguiente corrida con entrevista. Es texto de la
  herramienta, dentro de sus marcas.
- **La convención de los tags** depende de si hay workspace, no de cuántos
  paquetes hay: un monorepo de un paquete etiqueta `<paquete>@<versión>`. Lo
  mostró la prueba a mano.
- **`protocolo-cierre` sin entrevista** (CHG-027, 0.8.1). En la 0.8.0, sin
  respuestas quedaba sin bloque y su Paso 6 mandaba a `version-bump`. Lo
  encontró la sesión del sitio. Ahora una adaptación puede declarar en qué
  repos se escribe sin respuestas (`sinRespuestas`), y la de cierre lo declara
  con Changesets.
- **Sin git**, `ai-first skill` lee sólo la raíz y no ve `.changeset/config.json`:
  `changeset-review` queda sin bloque. Changesets necesita git para funcionar,
  así que no hay caso real.

## Preguntas abiertas [OPCIONAL]

1. ¿El título del PR de versiones se lee del flujo de CI o se pide a mano? —
   **Respuesta (2026-10-15):** se lee del paso que usa `changesets/action`; si
   no está, el de por defecto.
2. ¿Va ADR? — **Respuesta (2026-10-15):** sí, ADR-028.

## Changelog de esta spec

- 2026-10-15 — Borrador inicial, Paso 1 de `protocolo-features`, a partir del
  HANDOFF y de la skill de Marimba.
- 2026-10-15 — Validada por Charlie con las dos recomendaciones: el título del
  PR se lee del flujo, y va ADR (ADR-028). Implementada el mismo día.
