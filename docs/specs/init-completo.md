# `init` completo — configurar un repo para la metodología en un comando

> Spec de feature, con el formato de `templates/SPEC_MODULO_TEMPLATE.md`. Sin
> modelo de datos, permisos, API ni interfaz: es un comando de CLI que escribe
> archivos. Estado: **validada por Charlie el 2026-09-18**. Pre-implementación
> completa (`protocolo-features`, Pasos 1, 2, 5 y 7 en este documento).

## Contexto de negocio [OBLIGATORIO]

Hoy `ai-first init` es el mínimo de ADR-003: escanea, escribe `AI-FIRST.md` y
un `docs/ADR.md` vacío. Hasta CHG-001 se detenía si `AI-FIRST.md` ya existía;
desde el 2026-09-18 salta lo que existe y sigue (ADR-017). Todo lo demás
que un proyecto necesita para correr la metodología —las skills en su sitio,
la carpeta de cambios, el registro de sesión, el alcance declarado— se hace a
mano siguiendo `skills/README.md`. El 2026-09-18 este repo se configuró así, a
mano, en seis pasos; la regla de `AGENTS.md` dice que **si el `init` completo
no configura este repo, no está terminado**. Esos seis pasos son la lista de
aceptación de esta spec.

Lo que la spec **no** resuelve, y por qué queda fuera: la entrevista y la
reescritura de las secciones «Adaptación a tu proyecto» de cada skill (hueco 2
del mapa). Reescribir una skill instalada obliga a saber qué escribió la
herramienta y qué editó el humano, y eso pide el manifiesto que ADR-003 dejó
pendiente. Esta versión **nunca reescribe nada**, así que no necesita
manifiesto: sólo crea lo que falta y reporta lo que ya estaba. La única
excepción controlada es `AGENTS.md`, donde mantiene **un bloque delimitado con
marcas** que es suyo —fuera de las marcas no toca una letra— con la tabla de
equivalencias que este repo ya usa. Las marcas son el manifiesto de ese
archivo: dicen qué escribió la herramienta y qué escribió el humano.

## Alcance [OBLIGATORIO]

**Incluye**

1. `init` deja de detenerse cuando `AI-FIRST.md` existe: **salta lo que ya
   está y sigue con lo que falta**. Es un cambio de comportamiento del `init`
   mínimo y va por `protocolo-cambios` antes que el resto (ver Dependencias).
2. Instala skills en `.agents/skills/`, una carpeta por skill, saltando entera
   la que ya exista y diciendo cuál saltó (política de ADR-014). Crea el enlace
   `.claude/skills → ../.agents/skills` sólo si no hay nada en su sitio
   (ADR-008).
3. La fuente de las skills es la carpeta `skills/` del propio paquete, resuelta
   desde el módulo instalado: funciona desde `node_modules` y desde este repo.
4. Dos modos de instalación: **copia** (por defecto; el adoptante recibe
   archivos suyos) y **enlace** (`--enlazar`: para el repo del paquete y para
   quien vendoriza las skills en un monorepo). El enlace es relativo.
5. Selección de skills: por defecto las cinco sin interfaz —`protocolo-features`,
   `protocolo-cambios`, `protocolo-cierre`, `version-bump`, `test-fix`—;
   `--skills todas` instala las diez; `--skills a,b,c` elige.
6. Crea, si no existen: `docs/SESSION_LOG.md` con la cabecera del manual,
   `docs/changes/CHANGE_LOG.md` con su cabecera, y `docs/changes/pending/`
   (con `.gitkeep`).
7. En un `AI-FIRST.md` que **este mismo `init` escribe**, `alcance.spec` sale
   declarado y no comentado, porque la carpeta que apunta acaba de crearse. En
   un `AI-FIRST.md` que ya existía, no se toca: se **sugiere** la línea.
8. En `AGENTS.md` mantiene un **bloque delimitado**, entre
   `<!-- ai-first:inicio -->` y `<!-- ai-first:fin -->`, con la tabla de
   equivalencias (dónde están las skills, dónde va cada documento). Si el
   archivo no existe, lo crea con el bloque y una línea que apunta a
   `templates/AGENTS_MD_TEMPLATE.md`. Si existe sin marcas, añade el bloque al
   final. Si existe con marcas, reemplaza sólo lo que hay entre ellas. Fuera de
   las marcas no se toca nada, nunca. El bloque es de referencia, no de
   reglas: corto, y sin duplicar lo que vive en otro documento.
9. Reporte final con tres estados por ítem: **escrito**, **saltado (ya existe)**
   y **sugerido (no se escribe en un archivo que ya existía)**. Salida 0 si no
   hubo error; 2 si no es repo git.

**No incluye**

- La entrevista y la reescritura de skills (hueco 2). Queda para cuando exista
  el manifiesto.
- `.ai-first/manifest.json`. No hace falta: esta versión no actualiza nada.
- Tocar `AI-FIRST.md` existente, ninguna skill ya instalada, ni nada de
  `AGENTS.md` fuera de las marcas del bloque propio.
- Tags de versión. Los pone el humano (`version-bump`).
- Hooks (hueco 5), `sync`, `adr`, `handoff`.
- Interfaz interactiva. Todo por flags; lo que no se puede deducir, se sugiere.

## Dependencias [OBLIGATORIO]

- **Cambio previo, por `protocolo-cambios` (flujo corto):** `src/init.ts` deja
  de lanzar error cuando `AI-FIRST.md` existe. Toca `src/init.ts` y
  `test/init.test.ts`. Supera en parte a ADR-003 («si `AI-FIRST.md` existe, se
  detiene»), así que lleva fila nueva en `docs/ADR.md`. `src/cli.ts` es
  superficie de decisión: la fila cubre también el cambio de la ayuda.
- **Reusa** `escanear`, `generarAiFirst`, `generarAdr` e `iniciar` de
  `src/init.ts`; `listarArchivos` y `esRepoGit` de `src/git.ts`; `interpretar`
  de `src/ai-first-md.ts` para validar lo que escribe; `crearRepo` de
  `test/ayuda.ts` para las pruebas.
- **No toca:** `src/audit.ts`, `src/verificaciones/`, `src/puntaje.ts`,
  `src/markdown.ts`, `skills/`, `templates/`. Ninguna dependencia nueva: todo
  es `node:fs` y `node:path`.
- **Zonas Prohibidas:** este repo no declara ninguna. Nada que aprobar.

## Reglas de negocio [OBLIGATORIO]

1. **Nunca sobreescribe.** Ni archivos ni carpetas ni enlaces. La regla de oro
   de ADR-003 y ADR-014 vale para cada ítem por separado.
2. **Idempotente.** Correrlo dos veces seguidas deja el repo igual y reporta
   todo como saltado.
3. **Lo que escribe lo puede leer `audit`.** Un `AI-FIRST.md` generado pasa
   por `interpretar` antes de tocar el disco, como hoy.
4. **Enlaces relativos**, nunca absolutos: viajan en git.
5. **Salta entero, no fusiona.** Una skill que ya existe no recibe archivos
   nuevos dentro (la lección del `cp -r` de ADR-014).
6. **En `AGENTS.md`, sólo entre las marcas.** Es el patrón de `nvm`, `husky` o
   `direnv` con el `.zshrc`: la herramienta es dueña de su bloque y de nada
   más. Si encuentra una marca de inicio sin la de fin, o al revés, no
   escribe y lo reporta como error: un bloque roto se arregla a mano.

## Archivos del módulo [OBLIGATORIO]

- `src/init.ts` — el escaneo y la generación existentes, más la instalación de
  skills, la estructura de `docs/` y el reporte.
- `src/cli.ts` — las flags `--enlazar` y `--skills`, y la ayuda actualizada.
- `test/init.test.ts` — las pruebas nuevas, sobre repos desechables.
- `AGENTS.md` — el bloque delimitado, la primera vez que `init` corra acá
  (ver criterio 1).
- `docs/ADR.md` — la fila que supera a ADR-003 en el «se detiene».
- `README.md` — la ayuda del comando, que hoy dice «las skills se copian a
  mano por ahora».
- `skills/README.md` — el bucle de bash pasa a ser la alternativa manual; el
  camino principal es el comando.

## Criterios de aceptación [OBLIGATORIO]

1. **Sobre este repo**, `node dist/src/cli.js init --enlazar` reporta cada
   ítem como saltado, sale con 0, y lo único que cambia en `git status` es
   `AGENTS.md`: gana las marcas alrededor de la sección «Cómo se trabaja acá»,
   que hoy existe sin ellas. La segunda corrida no cambia nada.
2. **Sobre un repo vacío** (git init + un commit), `init` deja: `AI-FIRST.md`
   con `alcance.spec` declarado, el ADR en `docs/ADR.md` —no hay `docs/` antes
   de correrlo, pero `init` la crea en la misma corrida; pregunta abierta 1,
   decidida—, `docs/SESSION_LOG.md`,
   `docs/changes/CHANGE_LOG.md`, `docs/changes/pending/.gitkeep`,
   `.agents/skills/` con las cinco por defecto copiadas, `.claude/skills`
   enlazado, y un `AGENTS.md` con el bloque y el puntero al template. `audit`
   sobre ese repo da 0 / 100.
3. **Sobre una copia de este repo sin `.agents/skills/`**, `init --enlazar`
   recrea los cinco enlaces relativos y `criterio` no aparece (no es del
   paquete). Con `.agents/skills/protocolo-cierre/` presente como carpeta
   real, la salta y lo dice.
4. Con `.claude/skills` como directorio real, no crea el enlace y lo reporta.
5. `--skills todas` instala diez; `--skills i18n,ux-writer` instala dos;
   `--skills inventada` sale con 2 y nombra la que no existe.
6. Con un `AGENTS.md` de tres líneas propias y sin marcas, `init` deja las
   tres líneas intactas y el bloque al final. Con marcas y texto viejo dentro,
   reemplaza sólo ese texto. Con una sola marca, no escribe y sale con 2.
7. `pnpm test` en verde por exit code y `audit:self` en 0 / 100 al cerrar.

## Estado de implementación [CRECE]

### Implementado
- El cambio previo, CHG-001 (2026-09-18): `init` salta lo que existe en vez de
  detenerse, con `saltados` en el resultado y una línea por archivo en el CLI.
  Resumen en `docs/changes/CHANGE_LOG.md`; la decisión, en ADR-017.

- El feature entero (2026-09-18, ADR-018): `iniciar` instala skills —copia
  por defecto, `--enlazar` para enlaces relativos; cinco por defecto,
  `--skills todas` o una lista—, crea `docs/SESSION_LOG.md`,
  `docs/changes/CHANGE_LOG.md` y `docs/changes/pending/.gitkeep`, declara
  `alcance.spec` en el `AI-FIRST.md` que escribe y lo sugiere en el que ya
  existía, y mantiene el bloque delimitado en `AGENTS.md`. Reporta cada ítem
  como escrito, saltado o sugerido. Los errores de uso —skill inexistente,
  marca sin pareja— se detectan antes de escribir nada.
- Los siete criterios, verificados: los seis primeros con una prueba cada
  uno sobre repos desechables (61 → 67 pruebas), y el primero además a mano
  sobre este repo: dos corridas de `init --enlazar`, la primera con sólo
  `AGENTS.md` en `git status`, la segunda sin cambios.
- Lo que la implementación añadió a la spec: el `AI-FIRST.md` generado declara
  `agents: AGENTS.md`, porque `init` acaba de crearlo; el bloque de `AGENTS.md`
  lleva, por skill instalada, una línea de cuándo se invoca, porque era la
  información de la sección a mano de este repo que el bloque no podía perder.

- La segunda corrida y la skill suelta (2026-10-15, CHG-026, ADR-026 y
  ADR-027). Al entrevistar, `AI-FIRST.md` guarda en `adaptacion` las respuestas
  que no se deducen del repo. Sin entrevista, `init` adapta con ellas **sólo**
  las skills que escribe en esa corrida; sin `perfil`, lo reporta como sugerido
  en una línea. Con entrevista sobre un `AI-FIRST.md` que ya existía, sugiere el
  YAML para pegar. `ai-first skill <nombres>` escribe sólo las skills y
  `.claude/skills`, sin git; en una carpeta sin git `escanear` lee la raíz, que
  es donde están `package.json`, los lockfiles y los manifiestos.

### Pendiente
- Nada de esta spec. La entrevista y la reescritura de skills (hueco 2) es
  otra spec, cuando exista el manifiesto.

## Notas de implementación [CRECE]

**Inventario de reuso (Paso 2 del protocolo).**

| Pieza | Decisión | Justificación |
|---|---|---|
| Escaneo del repo, generación de `AI-FIRST.md` y del ADR | Reusa `escanear` / `generarAiFirst` / `generarAdr` | Ya existen y están probados; el `init` completo se monta encima, como dijo ADR-003 |
| Política «salta lo que existe, dilo» | Extiende la de ADR-014 | Está escrita en prosa en `skills/README.md`; acá se vuelve código y la misma regla vale para skills, docs y enlaces |
| Resolver la carpeta `skills/` del paquete | Nueva local | No hay nada que la resuelva hoy; es una línea con `import.meta.url` |
| Cabeceras de `SESSION_LOG.md` y `CHANGE_LOG.md` | Nueva local | Son los textos del manual; viven en `init.ts` como vive hoy el del ADR |
| Reporte escrito / saltado / sugerido | Nueva local | El reporte de `audit` es de hallazgos, no de instalación; no conviene forzarlo |
| Bloque delimitado en `AGENTS.md` | Nueva local | Patrón conocido (`nvm`, `husky`, `direnv`); no hay nada en el paquete que escriba dentro de un archivo ajeno. Cuando exista la entrevista, escribe dentro de las mismas marcas |

**Secuencia (Paso 7).** Variante solo-backend, sin schema ni interfaz:

1. `protocolo-cambios`, flujo corto: `init` salta en vez de detenerse.
   Verifica: `pnpm test`.
2. Dominio: tipos `ItemInstalado { ruta, estado: escrito|saltado|sugerido, razon? }`
   y la lista de skills por defecto. Verifica: compila.
3. Aplicación: `instalarSkills`, `crearEstructuraDocs`, `sugerirAlcance` y
   `mantenerBloqueAgents`, dentro de `iniciar`. Verifica: `pnpm test` con las
   pruebas nuevas.
4. CLI: flags y ayuda. Verifica: `node dist/src/cli.js init --help`.
5. Pruebas: los seis criterios, uno por `test(...)`.
6. `test-fix` si algo rompe; `audit:self`; `protocolo-cierre`; `version-bump`
   (MINOR: es funcionalidad nueva, la `0.2.0` que `HANDOFF.md` ya nombra).

## Preguntas abiertas [OPCIONAL]

1. **¿`init` crea `docs/` en un repo que no la tiene?** Si crea
   `docs/SESSION_LOG.md`, la carpeta existe y el ADR debería ir a `docs/ADR.md`
   por la regla que `escanear` ya tenía. Propuesta: sí, y el ADR va a `docs/`;
   el criterio 2 se ajusta. **Decidido por Charlie el 2026-09-18: sí.** El ADR
   nuevo va siempre a `docs/ADR.md`; la prueba del repo vacío cambió con él.
2. **El check 3 sólo lee `docs/changes/pending/`.** Una spec de feature activa,
   como esta, en `docs/specs/`, no la ve. Es el quinto hallazgo del detector;
   va al handoff, no a esta spec.

## Changelog de esta spec

- 2026-09-18 — Borrador inicial, Paso 1 de `protocolo-features`. Pendiente de
  validación.
- 2026-09-18 — `AGENTS.md` deja de ser intocable: `init` mantiene un bloque
  delimitado con marcas, a propuesta de Charlie, por analogía con el `/init` de
  Claude Code —que tampoco reemplaza, mejora— hecha determinista. Las marcas
  resuelven el manifiesto para ese archivo.
- 2026-09-18 — Validada por Charlie con las cinco decisiones tal como están.
- 2026-09-18 — Implementada (ADR-018). Pregunta abierta 1 decidida: el ADR va a
  `docs/`, que `init` crea; el criterio 2 se ajusta. Estado de implementación
  al día. Sesión delegada, con la spec como contrato.
- 2026-10-15 — CHG-026: la segunda corrida adapta con lo guardado, y la skill
  suelta sale como subcomando, `ai-first skill` (ADR-027).
