# Falcux AI-First — el paquete

Repo de `@falcux/ai-first`: los 8 templates, las 11 skills y el
código del detector de entropía documental. El sitio de la metodología vive en
otro repo, `falcux-ai-first-docs-web`; este repo, `falcux-ai-first-package`,
**entrega**; aquél **documenta**.

**El paquete está publicado.** `@falcux/ai-first@0.1.0` salió a npm el
2026-09-17, sin `private: true`. `pnpm-workspace.yaml` fija
`publishBranch: prod`: un `pnpm publish` desde otra rama se niega solo. El
comando sigue siendo `ai-first`, vía el `bin` del paquete con scope; el alias
sin scope se descartó (ADR-011).

## Estructura

```
src/cli.ts                 Entrada de `ai-first`. Dos comandos: init y audit.
src/init.ts                Configura el repo: escanea, escribe, instala skills y las adapta.
src/entrevista.ts          Las preguntas de init, como datos. El perfil decide qué se instala.
src/adaptacion.ts          Qué respuesta va a qué skill, dentro de sus marcas.
src/audit.ts               Orquesta las cinco verificaciones y el puntaje.
src/verificaciones/        Un archivo por check, en el orden de la spec.
src/ai-first-md.ts         El lector del contrato. Único sitio que interpreta el frontmatter.
src/puntaje.ts             40·P0 + 20·P1 + 8·P2. Calibrado contra la portada del sitio.
src/git.ts  src/glob.ts  src/markdown.ts   Lo único que se le pregunta a git, a los patrones y al Markdown.
test/                      node:test sobre repos git desechables. Sin mocks.
skills/                    Las 11 skills. Acá es su único hogar desde ADR-006. El sitio enlaza a las de `prod`.
templates/                 Los 8 templates. Acá es su único hogar. El sitio enlaza a los de `prod`.
plantillas/                Lo que `init` escribe tal cual: el hook de pre-push y el flujo de CI. No son los templates.
.githooks/                 El punto de control de ESTE repo, puesto por su propio `init` (ADR-022).
.agents/skills/            Las skills de ESTE repo (hoy, `criterio`). `.claude/skills` es un enlace a ella (ADR-008).
docs/SPEC-PAQUETE.md       El contrato: formato de AI-FIRST.md, los 5 checks, el puntaje.
docs/ADR.md                Por qué se decidió cada cosa. Se agrega, no se edita.
docs/HANDOFF.md            Estado, pendientes y los bloqueadores que comparte con el sitio.
docs/SESSION_LOG.md        La cronología: una entrada por sesión. La escribe `protocolo-cierre`.
CHANGELOG.md               Qué cambió en cada versión publicada, para quien instala.
```

## Tech stack

TypeScript compilado con `tsc` a `dist/`, ESM, **Node 22** (`.nvmrc`) y
**pnpm 10.28.2**, fijados. Una sola dependencia de ejecución: `yaml`. Todo lo
demás es `node:`. Añadir una dependencia es decisión: pasa por el ADR.

## Comandos

```bash
pnpm install
pnpm test               # compila y corre la suite. Es la compuerta de todo commit.
pnpm run build
pnpm run audit:self     # el detector sobre este repo. Debe dar 0 / 100.
node dist/src/cli.js init  --raiz <repo>
node dist/src/cli.js audit --raiz <repo> [--base <ref>] [--estricto] [--registrar] [--json]
```

## Cómo se trabaja acá: con nuestras propias skills

**Este repo es el primer adoptante de su propio paquete.** Todo lo que el
paquete sepa hacer se usa acá antes que en ningún otro sitio, y cada paso que
hoy se hace a mano por falta de comando —enlazar skills, crear `docs/changes/`,
declarar `alcance.spec`— se reemplaza por el comando el día que exista. Si el
`init` completo no sirve para configurar este repo, no está terminado. Lo que
se configuró a mano el 2026-09-18 es su lista de aceptación, en
`docs/SESSION_LOG.md`.

Las cinco skills sin interfaz están instaladas con `ai-first init --enlazar`:
enlaces simbólicos en `.agents/skills/` hacia `skills/`, la fuente única, así
que editar una skill en `skills/` es editar la que corres. Ese es el punto. Las
cinco de UX no aplican a un CLI. `criterio` es carpeta real porque es de este
repo y no se publica. El bloque que sigue lo escribe el comando en cada
corrida; lo de fuera de las marcas es de este repo y se escribe a mano.

<!-- ai-first:inicio -->
### Metodología AI-First

> Este bloque lo mantiene `ai-first init`; edita fuera de él. Cada corrida lo
> reescribe con lo que encuentra instalado.

Las skills están en `.agents/skills/`, como enlaces simbólicos a `skills/`.
Claude Code las lee por `.claude/skills`. Se invocan **antes** de tocar nada, no después:

| Skill | Cuándo |
|---|---|
| `protocolo-features` | Comando, módulo o feature nuevo, antes de escribir código |
| `protocolo-cambios` | Algo que ya funciona tiene que cambiar, incluidos los documentos de gobierno; con su CHG aunque sea flujo corto |
| `test-fix` | Después de implementar, o cuando la suite falla |
| `protocolo-cierre` | Al cerrar cualquier tramo con commits, y otra vez si después hubo más trabajo |
| `version-bump` | Después de `protocolo-cierre`, para decidir el número de versión |

Dónde escribe cada una, en el vocabulario del manual:

| El manual dice | Acá es |
|---|---|
| Registro de sesión | `docs/SESSION_LOG.md` |
| Registro de decisiones | `docs/ADR.md` |
| Cambio en curso / registro de cambios | `docs/changes/pending/` → `docs/changes/CHANGE_LOG.md` |
<!-- ai-first:fin -->

Dos equivalencias que el bloque no trae porque son de este repo: las specs por
módulo van en `docs/specs/`; notas técnicas y guía de diseño no existen, y si
una skill pide escribir ahí se crea el archivo en `docs/`, no se inventa otro
sitio. No hay base de datos, así que el paso de schema y migraciones se salta.

Editar a mano lo que una skill sabe hacer es no usar la herramienta que este
repo vende. Pasó el 2026-09-18 con las skills recién instaladas: tres commits
después del cierre, ninguno por el protocolo; ver `docs/SESSION_LOG.md`.

Las versiones publicadas llevan tag `vX.Y.Z` sobre el commit que las publicó;
`version-bump` arranca desde el último. El tag lo pone Charlie, nunca la skill.

## Reglas críticas

### Las skills

- `skills/` es la **fuente de verdad** de las 11 skills desde el 2026-09-17
  (ADR-006). Hasta entonces era una copia que el sitio sobreescribía con
  `rsync --delete`; ese workflow ya no existe y nada regenera la carpeta. Se
  edita acá, y sólo acá.
- Tres skills asumen el capítulo «Gobierno del contexto» del manual:
  `protocolo-features`, `protocolo-cambios` y `protocolo-cierre` dan por hecho
  las Zonas Prohibidas y el `docs/ADR.md` que ese capítulo define. Tocar cualquiera
  de las tres obliga a **avisar al repo del sitio** para revisar el capítulo; si
  el capítulo cambia, el sitio avisa acá.
- El sitio enlaza a `prod/skills/<nombre>/SKILL.md` y a `prod/templates/<archivo>`.
  Mover o renombrar cualquiera de esas rutas rompe enlaces publicados: se
  coordina con el sitio antes del merge a `prod`. Agregar archivos de apoyo
  dentro de la carpeta de una skill («references/», «checks/») no mueve nada.
- La instalación que enseña `skills/README.md` es en «.agents/skills/» (estándar
  Agent Skills) con un enlace `.claude/skills` para Claude Code (ADR-008). Este
  repo hace lo mismo con su propia skill `criterio`: se edita en `.agents/skills/`.

### Ramas

- Se trabaja en **`dev`**. **`prod` es la rama publicada y se avanza sólo
  cuando Charlie lo decide**, con `--ff-only`. Mergear a `prod` **despliega**:
  el sitio sirve skills y templates desde sus raw links al instante, y el
  workflow de publish (pendiente, ADR-007) sube a npm si la versión cambió.
  Es la misma convención que los repos del sitio y de la landing: `prod`
  despliega, en los tres. No hay `main`; se llamó así hasta el 2026-09-17.
- Mover o renombrar algo en `skills/` o `templates/` obliga a coordinar con el
  sitio antes del merge a `prod`.
- `pnpm-workspace.yaml` fija `publishBranch: prod`: `pnpm publish` se niega
  desde otra rama, con `ERR_PNPM_GIT_NOT_CORRECT_BRANCH`. Vivió en el .npmrc
  hasta el 2026-09-23 (CHG-007); desde pnpm 11 ese archivo queda sólo para
  autenticación y registro, y la clave habría dejado de leerse en silencio. El
  archivo lleva ajustes, no paquetes: esto no es un monorepo.

### El detector

- Corre en **código puro**: git, sistema de archivos y regex. Sin modelo, sin
  API key, sin red. Es el argumento de venta; no se negocia.
- Los pesos **40 / 20 / 8** están calibrados contra el único ejemplo publicado
  en la **portada del sitio** —no en la landing comercial, que es otro repo—:
  1 P0 + 1 P1 + 1 P2 = 68. El ejemplo está rotulado como hallazgos inventados
  y con el formato de la 0.1.1, así que lo calibrado es el 68, no el caso.
  Cambiar los pesos cambia ese número publicado: es ADR y aviso al repo del
  sitio.
- Un check que no puede correr se reporta **omitido, nunca aprobado**.
- Cada regla del check 4 tiene su falso positivo detrás, comentado en el
  código. Una regla nueva entra con su caso real y su prueba.
- `init` **nunca sobreescribe**. No hay `--forzar` y no lo va a haber (ADR-003).

### Decisiones

- `docs/ADR.md` se **agrega**, no se edita. Una decisión superada gana una fila nueva
  que la supera; la vieja queda.
- Las superficies de decisión están en `AI-FIRST.md`. Tocarlas sin fila en el
  ADR da P1 en `audit:self`, y el P1 tiene razón hasta que se demuestre lo
  contrario en el cuerpo del commit con `<!-- ai-first: sin-decision -->`.

### Verificación antes de confirmar

- `pnpm test` en verde **por su exit code**, no por leer la salida. Un `grep`
  encadenado ya dejó pasar un rojo una vez.
- `audit:self` en **0 / 100**. Si no, o hay algo que arreglar o hay una fila de
  ADR que escribir.
- **El `pre-push` de `.githooks/` lo corre solo** desde el 2026-09-22 (ADR-022),
  sobre el rango que se publica y sin `--estricto`: avisa, y sólo un P0 frena.
  El de acá usa `dist/`, así que compila antes de empujar. `--no-verify` lo
  salta y no se combate.

### Idioma

Todo en español: código, comentarios, pruebas, mensajes. Los commits **sin
tildes**; el resto, con ellas.

## Documentación

| Archivo | Qué contiene |
|---|---|
| `docs/HANDOFF.md` | Estado, pendientes y los bloqueadores que comparte con el sitio. Léelo al empezar. |
| `docs/SESSION_LOG.md` | La cronología: una entrada por sesión, la más reciente arriba. La escribe `protocolo-cierre`. |
| `docs/SPEC-PAQUETE.md` | El contrato del detector. Se probó contra código el 2026-09-17; lo que dejó abierto está en `docs/HANDOFF.md`. |
| `docs/ADR.md` | Las decisiones tomadas y lo que se descartó. |
| `AI-FIRST.md` | Lo que gobierna a este repo. Lo lee `audit:self`. |
| `README.md` | Lo que ve quien llega. Dice qué está publicado en npm y qué no. |

## What NOT to do

- **No muevas ni renombres** `skills/<nombre>/SKILL.md` ni `templates/<archivo>`
  sin coordinar con el sitio: son enlaces publicados.
- **No toques `protocolo-features`, `protocolo-cambios` ni `protocolo-cierre`**
  sin avisar al sitio: asumen su capítulo «Gobierno del contexto».
- **No avances `prod` sin que Charlie lo pida.** Mergear ahí despliega.
- **No publiques a npm sin que Charlie lo pida.** Ni con `--dry-run` sin
  avisar. El primer publish ya salió (`0.1.0`); los siguientes tienen su lista
  en `docs/HANDOFF.md`. El scope `@falcux` es de la cuenta de usuario `falcux`
  (ADR-004); no hay organización que crear.
- **No cambies los pesos del puntaje** sin ADR y sin avisar al sitio.
- **No pongas entre acentos graves una ruta que acá no existe** en
  `docs/HANDOFF.md` ni en `docs/ADR.md`: el check 4 la busca acá y la cobra
  como P2 en cuanto exista la primera carpeta del camino. Vale para las rutas de
  otro repo, para los archivos de configuración de otras herramientas y para lo
  que este repo todavía no ha escrito —crear `.github/workflows/` despertó de
  golpe una mención al publish.yml que llevaba cinco días dormida—. Todas van
  en prosa pelada.
- **No hagas que la entrevista adapte una skill enlazada.** Con `--enlazar`, lo
  que hay en `.agents/skills/` apunta a `skills/`: escribir ahí cambia la fuente
  publicada y el cambio viaja al siguiente que instale el paquete. Se reporta
  como sugerida y se deja (ADR-020).
- **No añadas un modelo, una API ni una llamada de red** al detector, ni al
  `init`. Lo generativo lo conduce una skill, que ejecuta el agente del
  adoptante; el paquete entrega el procedimiento, no la inferencia (ADR-019).
- **No metas contenido del sitio acá.** El sitio documenta; este repo entrega.
