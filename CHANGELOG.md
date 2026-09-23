# Registro de versiones — `@falcux/ai-first`

Qué cambió en cada versión publicada, para quien instala el paquete. El porqué
de cada decisión está en `docs/ADR.md`, y la cronología de cómo se trabajó, en
`docs/SESSION_LOG.md`.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado es [SemVer](https://semver.org/lang/es/).

**Cada entrada se fecha en el mismo commit que sube el número del manifiesto**,
que es el último momento en que el texto alcanza a viajar en el tarball. Si el
publish se retrasa a otro día, la fecha se corrige al publicar. Una versión
etiquetada que nunca llegó al registro se marca «sin publicar».

## [0.5.2] — 2026-09-23

### Corregido

- **Un archivo sin extensión ya se puede declarar en el alcance de un cambio.**
  El check 3 exigía que toda ruta declarada llevara «/» o una extensión conocida,
  así que el `.npmrc`, el `.gitignore`, un `LICENSE` o un `Makefile` **no se
  podían declarar**: git sí los ve como tocados, y el P1 resultante no había
  forma de apagarlo haciendo lo correcto. Ahora se aceptan.
- **El molde del documento de cambio lo dice.** Su sección «Cómo lo lee el
  detector» era el único sitio que enumera qué cuenta como ruta, y enumeraba de
  menos.

### Notas

- **El check 4 no cambió.** Sigue exigiendo barra o extensión para señalar un
  artefacto que no existe, y hay una prueba que lo fija. Los dos checks leen las
  mismas referencias con reglas distintas a propósito: en el 3 una ruta declarada
  **excusa** un archivo tocado —y tiene que coincidir exacto con él—, y en el 4
  una ruta que no existe **acusa** con un P2. Un filtro puede ser laxo donde
  excusa y tiene que ser estricto donde acusa.

## [0.5.1] — 2026-09-22

### Corregido

- **El hook de `pre-push` ya no frena un push cuando no encuentra `node`.** Un
  push lanzado desde un cliente gráfico, un IDE o un servicio del sistema no
  hereda el PATH del shell, donde viven nvm, Homebrew y fnm; el hook moría con
  `node: command not found` y git abortaba el push. Ahora recupera `node` de las
  rutas habituales y de `nvm.sh`, y si aun así no aparece **avisa en una línea y
  deja pasar**, que es lo que la spec pedía desde el principio. La guarda
  anterior comprobaba que el archivo del detector existiera, no que hubiera con
  qué ejecutarlo.

## [0.5.0] — 2026-09-22 — sin publicar

> Etiquetada y nunca subida al registro: el defecto del hook apareció en el
> primer push real, antes de publicarla. La `0.5.1` la incluye entera.

### Agregado

- **El punto de control: el detector ya no depende de que alguien se acuerde.**
  `ai-first init` escribe dos cosas nuevas:
  - `.githooks/pre-push`, que corre `audit --base` sobre el rango que se va a
    publicar y **sin `--estricto`**: imprime los hallazgos y sólo un P0
    interrumpe el push. Se salta con `git push --no-verify`.
  - `.github/workflows/ai-first.yml`, que lo corre **con `--estricto`** en cada
    pull request, que es donde el corte por P1 y P2 sí se quiere.
  `init` apunta `core.hooksPath` a `.githooks/` sólo si estaba sin configurar:
  un `core.hooksPath` de husky o lefthook no se pisa, se reporta. Con esto el
  paquete entrega las tres capas de la metodología y el mapa de cinco huecos
  queda cerrado.
- **Tres banderas para `init`:** `--hook-local` escribe el hook en `.git/hooks/`
  y no toca la configuración del repo; `--sin-hook` y `--sin-ci` saltan lo suyo.
- **La carpeta `plantillas/`** viaja en el paquete, con el hook y el flujo como
  archivos legibles y no como cadenas incrustadas en el código.

### Notas

- **El hook no habla con la red ni exige instalación global.** Busca el
  `ai-first` del proyecto, luego el del PATH, y sólo usa `npx --no-install`, que
  no descarga. Si no encuentra ninguno, avisa en una línea y **deja pasar el
  push**: un hook que bloquea por no encontrarse a sí mismo se desinstala.
- **Por qué `pre-push` y no un hook del agente.** Los hooks quedaron fuera del
  estándar Agent Skills y cada herramienta trae su formato, así que entregarlos
  serían cuatro adaptadores propietarios. Y un evento por cada escritura corre
  sin commit, donde la anotación `ai-first: sin-decision` todavía no se puede
  leer: cobraría P1 sin dejar forma de silenciarlo. El hook de agente llegará
  como adaptador opcional sobre el evento de cierre.

## [0.4.0] — 2026-09-21

### Agregado

- **La entrevista de `init`.** Pregunta lo que no se puede deducir —fase, perfil
  del producto, comandos de verificación, secuencia de implementación, agentes
  en paralelo, manifiesto de versión— y escribe las respuestas en `AI-FIRST.md`
  y dentro de la sección «Adaptación a tu proyecto» de cada skill instalada,
  entre las marcas `<!-- ai-first:inicio -->` y `<!-- ai-first:fin -->`. Fuera
  de las marcas no toca una letra. Cierra el hueco 2 del mapa.
- **`protocolo-arranque`**, la undécima skill: conduce la definición de un
  proyecto desde una idea o un requerimiento en bruto hasta el PRD, la
  arquitectura y las specs, usando los templates del paquete. Es lo que hasta
  ahora se hacía fuera, en un proyecto de chat aparte.
- **El perfil del proyecto** en el frontmatter de `AI-FIRST.md`, con dos ejes:
  `producto` —saas, landing, api, cli, movil— y `repositorio` —unico, monorepo,
  multiple—. Decide qué skills se instalan y qué artefactos pide el arranque.
  Es opcional: un archivo sin perfil se comporta como siempre.
- `--entrevista` fuerza la entrevista aunque el proyecto ya esté documentado, y
  `--sin-entrevista` no pregunta nunca.
- Este archivo.

### Cambiado

- **`init` sobre una carpeta que no es repositorio la inicializa** y sigue, en
  vez de salir con 2. Una carpeta que no existe sigue siendo error de uso.
- **La instalación por defecto depende del perfil** cuando se entrevista: un
  producto con interfaz recibe también las skills de UX; uno sin interfaz sigue
  recibiendo las cinco de siempre. `--skills` sigue mandando sobre todo.
- Un proyecto que ya trae documentación no se entrevista salvo que se pida: se
  dice qué se encontró y por defecto se salta.

### Corregido

- **El nombre de la metodología es «Falcux AI-First»** en todo el paquete. Cinco
  skills, el README de skills y el del paquete seguían diciendo «Blueprint
  AI-First», que es el nombre que el proyecto abandonó antes de su primer
  publish. Ninguna ruta se movió.

### Notas

- **Sin terminal interactiva no hay entrevista.** En CI, con la entrada
  redirigida o dentro de otro comando, `init` se comporta como
  `--sin-entrevista` y lo dice en el reporte.
- **Una skill instalada con `--enlazar` nunca se adapta.** Escribir ahí
  cambiaría la carpeta del paquete en vez de tu copia; se reporta como sugerida.
- El paquete sigue corriendo sin modelo, sin llave de API y sin red. La
  definición del producto la conduce la skill, que ejecuta tu propio agente.

## [0.3.0] — 2026-09-21

### Agregado

- `ai-first --version` y `-v` imprimen la versión instalada del paquete. Ganan a
  cualquier comando y salen con 0. Antes, `--version` moría con
  `ERR_PARSE_ARGS_UNKNOWN_OPTION`.

## [0.2.1] — 2026-09-21

### Corregido

- El README publicado mostraba un número de versión escrito a mano, que quedaba
  viejo en cuanto salía la siguiente. Ahora lleva un badge de npm y la tabla de
  qué hay va por estado, no por versión.

## [0.2.0] — 2026-09-18

### Agregado

- **`init` completo.** Además de `AI-FIRST.md` y el registro de decisiones,
  instala las skills en `.agents/skills/`, crea el enlace `.claude/skills`, crea
  `docs/SESSION_LOG.md`, `docs/changes/CHANGE_LOG.md` y `docs/changes/pending/`,
  y mantiene un bloque delimitado en `AGENTS.md` con dónde escribe cada skill.
- `--enlazar` instala las skills como enlaces simbólicos relativos en vez de
  copiarlas, para quien las vendoriza en un monorepo.
- `--skills <lista>|todas` elige cuáles instalar. Por defecto, las cinco sin
  interfaz.
- El `AI-FIRST.md` que escribe declara `alcance.spec` apuntando a la carpeta de
  cambios que acaba de crear.

## [0.1.4] — sin publicar

Versión etiquetada que no llegó a npm: la `0.2.0` salió el mismo día y la
incluye entera.

### Cambiado

- `init` salta lo que ya existe y sigue, en vez de detenerse cuando
  `AI-FIRST.md` estaba presente. Cada ítem se reporta como escrito o saltado.

## [0.1.3] — 2026-09-18

### Cambiado

- El molde del documento de cambio pasó de `templates/` a la carpeta de la skill
  que lo usa. El paquete pasa de nueve a ocho templates.

## [0.1.2] — 2026-09-18

### Corregido

- La instalación que enseñaba el README pisaba en silencio el `SKILL.md` de un
  proyecto que ya tuviera una skill con el mismo nombre, dejaba las referencias
  del paquete mezcladas con las suyas y anidaba de más el enlace de la carpeta
  de Claude Code. Ahora se copia carpeta por carpeta, se salta entera la que ya
  existe y se dice cuál se saltó.

## [0.1.1] — 2026-09-18

### Quitado

- Los cuatro templates de protocolo, que repetían lo que las skills ya dicen.

## [0.1.0] — 2026-09-18

Primera versión pública.

### Agregado

- `ai-first audit`: las cinco verificaciones de la spec, el puntaje de entropía
  y los códigos de salida. Dos modos: árbol de trabajo para el hook local, y
  `--base <ref>` para CI. Corre en código puro: git, sistema de archivos y
  expresiones regulares, sin modelo y sin red.
- `ai-first init` mínimo: escanea el repo y escribe `AI-FIRST.md` y el registro
  de decisiones. Nunca sobreescribe.
- Las diez skills y los templates de la metodología.
