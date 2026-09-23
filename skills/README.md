# Paquete de inicio — Skills

Las skills de Falcux AI-First, listas para instalar en un proyecto con
`npx @falcux/ai-first init`.

Un **protocolo** es un documento que explica un procedimiento; una **skill** es ese mismo procedimiento en un formato que la AI carga sola cuando corresponde. Este paquete contiene ambas cosas: los cuatro protocolos de la Parte III convertidos a skills, más seis skills que nacieron en proyectos reales y resultaron ser transferibles.

## Instalación

Las skills se instalan **una sola vez, en una sola carpeta**, y todas las
herramientas las leen desde ahí. El camino principal es el comando del paquete:

```bash
# Desde la raíz de tu proyecto
npx @falcux/ai-first init
```

`init` copia a `.agents/skills/` las cinco skills sin interfaz —`protocolo-features`,
`protocolo-cambios`, `protocolo-cierre`, `version-bump`, `test-fix`—, crea el
enlace `.claude/skills` para Claude Code y deja además lo que los protocolos
asumen: `AI-FIRST.md`, el registro de decisiones, el de sesión y la carpeta de
cambios, más un bloque en `AGENTS.md` que dice dónde escribe cada skill. Con
`--skills todas` instala las once; con `--skills i18n,ux-writer` eliges. Con
`--enlazar` deja enlaces simbólicos relativos en vez de copias, para quien
vendoriza las skills en un monorepo.

**Nada de esto sobreescribe.** Una skill cuya carpeta ya existe se salta
**entera** y el reporte lo dice; no se fusiona nada dentro: un `cp -r skills/*
.agents/skills/` habría pisado tu `SKILL.md` y dejado nuestras `references/`
dentro de tu skill, sin avisar y sin vuelta atrás. El enlace tampoco se crea si
`.claude/skills` ya es algo —si ya es un directorio real, `ln -s` te habría
dejado un `.claude/skills/skills` que no lee nadie—. Si te saltó alguna, sigue
abajo.

<details>
<summary>La alternativa manual, sin el comando</summary>

Es lo mismo que hace `init`, en bash, para quien clona el repo o no quiere
correr el paquete:

```bash
# Desde la raíz de tu proyecto
mkdir -p .agents/skills

# Copia sólo las que tu proyecto no tenga ya
for origen in skills/*/; do
  nombre=$(basename "$origen")
  if [ -e ".agents/skills/$nombre" ]; then
    echo "saltada: $nombre — ya existe en tu proyecto"
  else
    cp -r "$origen" ".agents/skills/$nombre"
  fi
done

# Un solo enlace para Claude Code, si no hay nada en su sitio
mkdir -p .claude
[ -e .claude/skills ] || ln -s ../.agents/skills .claude/skills
```

</details>

Con eso el árbol queda así:

```
raíz/
├── AGENTS.md            → el contexto, para cualquier herramienta
├── CLAUDE.md            → una línea: @AGENTS.md
├── .agents/
│   └── skills/          → la fuente única de las skills
│       ├── protocolo-features/SKILL.md
│       ├── ux-writer/
│       │   ├── SKILL.md
│       │   └── references/
│       └── …
└── .claude/
    └── skills → ../.agents/skills     (enlace simbólico)
```

**Por qué esa carpeta y no la de Claude.** `.agents/skills/` es el directorio del estándar abierto *Agent Skills*, y lo leen nativamente Codex, Cursor, OpenCode y Kimi Code. Claude Code lee `.claude/skills/`; un enlace simbólico relativo lo lleva a la misma carpeta. La alternativa —fuente en la carpeta de Claude y un enlace por skill hacia la de agents— también funciona, y así se probó primero; pero obliga a crear un enlace nuevo por cada skill que se agrega, y el enlace único no. Cada archivo existe una sola vez: no hay copias que sincronizar ni versiones que diverjan.

El enlace viaja bien en git (se versiona como enlace, no como copia). Si tu equipo trabaja en Windows sin enlaces simbólicos habilitados, la carpeta de Claude puede ser una copia; en ese caso, declara en `AGENTS.md` cuál es la fuente y cuál la copia.

**Lo que sigue siendo por herramienta:** `AGENTS.md` lo leen todas, y `CLAUDE.md` es sólo `@AGENTS.md` (ver `templates/CLAUDE_MD_TEMPLATE.md`). Claude Code invoca una skill con `/nombre`; Codex con `$nombre`; las demás la cargan cuando su descripción coincide con la tarea.

Luego **adapta cada skill a tu proyecto**. Todas traen una sección «Adaptación a tu proyecto» al final que indica exactamente qué cambiar. Una skill copiada sin adaptar es peor que no tenerla: ocupa presupuesto de carga y da instrucciones que no aplican.

**Eso lo hace la entrevista de `init`**, y sólo hay que hacerlo a mano en lo que la entrevista no cubre. Pregunta la fase, qué clase de producto es, con qué comando se verifica, en qué orden se implementa una feature y qué archivo lleva la versión, y escribe las respuestas dentro de cada skill instalada, entre `<!-- ai-first:inicio -->` y `<!-- ai-first:fin -->`. Fuera de esas marcas no toca una letra, así que lo que agregues sobrevive a la siguiente corrida. Un proyecto que ya llega documentado recibe la oferta y por defecto la salta; sin terminal interactiva no se entrevista nunca.

**Una skill instalada con `--enlazar` no se adapta**, y el reporte lo dice: escribir ahí cambiaría la carpeta `skills/` del paquete en vez de tu copia.

## Si un nombre ya está ocupado

Seis de las once llevan nombres de oficio —`i18n`, `test-fix`, `version-bump`,
`ux-writer`, `ux-audit`, `information-architecture`— y tu proyecto puede tener ya
una skill con alguno. El estándar *Agent Skills* no tiene namespacing: el
directorio es plano y el nombre es la clave. Cada herramienta resuelve el empate
a su manera —una gana por precedencia y avisa del duplicado, otra las muestra
las dos en el selector—, así que dos skills homónimas conviven mal en todas.

La instalación ya hizo lo único irreversible: no tocar la tuya. Lo demás lo
decides tú, y son tres salidas.

| Salida | Cuándo | Qué hacer |
|---|---|---|
| **Quedarte con la tuya** | Está adaptada a tu proyecto y la nuestra no agrega nada | Nada: el bucle ya la saltó |
| **Quedarte con la nuestra** | La tuya era un borrador que ésta reemplaza | Borra la tuya y vuelve a correr el bucle |
| **Tener las dos** | Cubren cosas distintas y las quieres separadas | Copia la nuestra con el prefijo `ai-first-` |

Para la tercera, sobre `i18n`:

```bash
cp -r skills/i18n .agents/skills/ai-first-i18n
```

Y edita el `name:` de su frontmatter para que diga `ai-first-i18n`: el nombre
tiene que coincidir con la carpeta o la herramienta carga una cosa y la nombra
de otra.

El prefijo es la salida al conflicto, no el nombre por defecto. Las otras nueve
skills te siguen nombrando `i18n` en su prosa —es la que más se menciona—, así
que deja escrita la equivalencia en tu `AGENTS.md` mientras las dos convivan.

## Contenido

### Protocolos (versión ejecutable de la Parte III)

| Skill | Qué automatiza | Se activa |
|-------|----------------|-----------|
| `protocolo-arranque` | Descubrimiento con benchmark y cuestionamiento exhaustivo, decisión de stack al ADR, y los artefactos de inicio desde los templates del paquete | Al principio del proyecto, cuando hay una idea y todavía no hay PRD |
| `protocolo-features` | Pre-implementación en 7 pasos, secuencia por capas, checklists | Antes de un feature nuevo |
| `protocolo-cambios` | Clasificación, documento de cambio, análisis de impacto | Al modificar algo que ya funciona |
| `protocolo-cierre` | Fase A: log de sesión, docs, enrutamiento de aprendizajes | Al terminar una sesión |
| `protocolo-ux` | Comportamiento de la interfaz antes de codear | Al diseñar un feature con UI |

### Skills de oficio

| Skill | Qué automatiza | Trae además | Se activa |
|-------|----------------|-------------|-----------|
| `ux-writer` | Glosario, registros por audiencia, microcopy, temperatura | 5 referencias: glosario, voz, superficies, inglés, deuda | Al escribir cualquier string visible |
| `ux-audit` | Auditoría de 4 capas con reporte y severidades | 2 scripts de la Capa 1: análisis estático y fidelidad de skeletons | Antes de mergear frontend |
| `i18n` | Las 3 capas de internacionalización | 3 referencias, una por capa | Al agregar textos, plantillas o catálogos |
| `version-bump` | SemVer desde el historial de commits | — | Al cerrar una sesión de implementación |
| `information-architecture` | Qué es una cosa, cómo se llama en cada capa y dónde vive: naming, navegación vs. configuración, modelo de contenido, relaciones | — | Al crear, mover o renombrar un módulo, ruta, pestaña o ítem de navegación; antes de `protocolo-ux` |
| `test-fix` | Correr los tests del alcance tocado, clasificar cada falla en mecánica o de negocio, corregir lo mínimo en máximo dos rondas | — | Después de implementar o cambiar algo; E2E sólo bajo decisión explícita |

Los archivos de apoyo viven dentro de la carpeta de cada skill (`references/`, `checks/`) y se cargan sólo cuando la skill los pide: el `SKILL.md` es lo que la herramienta lee siempre; lo demás, bajo demanda.

## Lo que estas skills asumen del proyecto

Cinco de las once dan por hecho que el proyecto tiene los instrumentos del
capítulo «Gobierno del contexto» (Parte II del manual). Ninguna falla sin ellos,
pero rinden menos:

| Instrumento | Quién lo usa | Si no existe |
|---|---|---|
| **Zonas Prohibidas** en el AGENTS.md | `protocolo-features`, `protocolo-cambios` | El agente descubre el límite al chocarse, con trabajo ya hecho |
| **`docs/ADR.md`** | `protocolo-arranque`, que lo abre con la decisión de stack; `protocolo-cierre` e `information-architecture`; y `protocolo-features` y `protocolo-cambios` al detectar una decisión | El porqué de cada decisión se entierra en el log de sesiones |

Crear un `docs/ADR.md` vacío cuesta un minuto y es el que más se paga después: un
registro de decisiones que arranca en el mes seis nace con seis meses de huecos.

## Orden de adopción sugerido

No instales las once el primer día. La progresión que funciona:

0. **Declara tus Zonas Prohibidas y abre un `docs/ADR.md` vacío.** No es una skill, son
   diez minutos, y es lo que hace que los cuatro protocolos tengan dónde escribir.
   Si el proyecto todavía no existe, esto lo hace `init` y el resto lo conduce
   **`protocolo-arranque`**, que corre una sola vez y deja el PRD, la
   arquitectura y las primeras specs.
1. **`protocolo-ux`** — es la que más errores evita y no depende de nada más. **`information-architecture`** va con ella en cuanto el producto tenga más de un módulo: decide la estructura sobre la que `protocolo-ux` define el comportamiento.
2. **`protocolo-features`** y **`protocolo-cambios`** — cuando el proyecto tenga features que mantener. **`test-fix`** entra con ellas: es el paso de verificación que las dos invocan.
3. **`protocolo-cierre`** — cuando las sesiones empiecen a perder contexto entre una y otra.
4. **`ux-writer`** e **`i18n`** — antes de que el copy acumule deriva. Retrofitearlas es caro.
5. **`ux-audit`** y **`version-bump`** — cuando ya haya volumen que auditar y releases que versionar.

## Dependencias entre skills

```
protocolo-arranque ──> information-architecture ──> protocolo-ux ──> ux-audit
        │                                            ▲
        └──────────> protocolo-features ──┬──────────┘
                                          ├──> ux-writer ────> i18n
                                          └──> test-fix
                     protocolo-cambios ───┘
                     protocolo-cierre ────────> version-bump
```

Las flechas indican «invoca» o «asume cargada», no un orden de instalación obligatorio: cada skill funciona por separado. La única que se corre **una sola vez** es `protocolo-arranque`: produce la spec que `protocolo-features` da por hecha en su Paso 1.

## Nota sobre portabilidad

El formato `SKILL.md` con frontmatter (`name`, `description`) es el del estándar *Agent Skills*; el contenido es agnóstico. Toda herramienta que lea `.agents/skills/` las carga sin cambios.

Para herramientas sin carga progresiva de contexto, guarda estos archivos como documentos en `docs/` e instruye a la AI desde tu AGENTS.md a consultarlos según el tipo de tarea:

```markdown
## Documentación especializada
- Antes de implementar un feature, leer `docs/protocolos/features.md`
- Antes de escribir textos visibles, leer `docs/protocolos/ux-writer.md`
```

Menos elegante que la carga automática, mismo resultado.
