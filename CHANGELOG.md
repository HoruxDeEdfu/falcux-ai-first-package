# Registro de versiones — `@falcux/ai-first`

Qué cambió en cada versión publicada, para quien instala el paquete. El porqué
de cada decisión está en `docs/ADR.md`, y la cronología de cómo se trabajó, en
`docs/SESSION_LOG.md`.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado es [SemVer](https://semver.org/lang/es/). Cada versión lleva la
fecha en que **salió a npm**, no la del commit.

## [0.4.0] — sin publicar

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
