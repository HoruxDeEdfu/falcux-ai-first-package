# Handoff — `@falcux/ai-first`

El paquete: los 8 templates, las 10 skills y el detector de
entropía documental. El sitio de la metodología tiene su propio handoff en el
repo `falcux-ai-first-docs-web`; acá sólo lo que es del paquete y lo que los
dos comparten. Este repo se llama `falcux-ai-first-package` desde el
2026-09-17 (ADR-005); antes fue `blueprint-ai-first-templates`, y antes
`docs-ai-first-blueprint`. GitHub redirige los dos nombres viejos mientras
nadie los reutilice.

> Este archivo nació el 2026-09-17 al mudar la Parte B del handoff del sitio,
> que fue donde el paquete se planeó mientras no tenía repo. El plan original
> sigue abajo tal como se escribió, para que se vea qué se cumplió y qué no.

---

## Estado al 2026-09-17

**Lo que existe y corre**, en `dev`, con 65 pruebas en verde y `audit:self` en 0:

| Comando | Estado |
|---|---|
| `ai-first audit` | Los cinco checks de la spec, el puntaje y los exit codes. Dos modos: árbol de trabajo (hook local) y `--base <ref>` (CI). |
| `ai-first init` | Completo desde el 2026-09-18 (ADR-018): escribe `AI-FIRST.md` y `docs/ADR.md`, instala las skills en `.agents/skills/` con el enlace `.claude/skills`, crea `docs/SESSION_LOG.md` y `docs/changes/`, y mantiene su bloque con marcas en `AGENTS.md`. Nunca sobreescribe (ADR-003); lo que ya existe lo salta, lo reporta y sigue (ADR-017). Sin escribir: la entrevista que adapta cada skill (hueco 2). |
| `sync`, `adr`, `handoff` | Mapeados abajo, sin escribir. El CLI lo dice con exit 2. |

**Lo que la spec dejó abierto y cómo se resolvió** — si la spec cambia, alinear
esto o el código:

1. *Check 2, «el mismo rango de commits».* Sin `--base`, árbol + índice + sin
   seguimiento contra HEAD; con `--base`, `ref...HEAD`. La anotación
   `ai-first: sin-decision` sólo se lee en el segundo modo.
2. *Check 3, cómo una spec «lista archivos».* Sección cuyo título empiece por
   «Archivos» o «Alcance», rutas entre acentos graves, globs permitidos.
3. *Check 4, determinista pero no discreto.* En bruto daba 63 P2 contra el repo
   del sitio; con reglas explícitas (comentadas en el código) bajó a 16, casi
   todos ciertos. **La saturación es real**: 13 P2 dan 100/100. Un tope por
   check o por documento es cambio de spec, no de código. Sin decidir.
4. *`artefactos` son documentos que hablan de ESTE repo.* Un spec genérico o un
   handoff que narra otros repos genera un P2 por cada ruta ajena.

**Decisiones tomadas**, con sus alternativas, en `docs/ADR.md`: dónde vive el
código (001), el nombre en npm (002, superada en la parte del alias por la
011), init mínimo antes que completo (003), publicar desde la cuenta de
usuario `falcux` y no desde una organización (004), el nombre del repo (005),
`skills/` como fuente de verdad en vez de copia del sitio (006), `prod` como
rama publicada (007), la instalación de las skills en «.agents/skills/» con
enlace para Claude Code más el principio editorial en los templates (008),
cinco templates nuevos para los documentos que las skills y el detector ya
asumían (009), la guía de diseño reorganizada y dos skills más (010), y el
alias descartado tras el bloqueo de npm (011).

**Las skills cambiaron de dueño el 2026-09-17** (ADR-006). El sitio borró su
`skills/` y el workflow que la empujaba acá con `rsync --delete`, tras
verificar con `diff -rq` que los 9 archivos eran idénticos a los de `dev` en
`6de6794`. Desde entonces `skills/` se edita acá; `AI-FIRST.md` la quita de
Zonas Prohibidas porque la razón era el rsync. El sitio sigue enlazando a
`prod/skills/<nombre>/SKILL.md`. Tres skills asumen su capítulo «Gobierno del
contexto»: tocarlas obliga a avisar al sitio, y viceversa.

### Lo que sigue, en orden

El publish ya salió: `@falcux/ai-first` está en npm en `0.1.0` desde el
2026-09-17. El alias `ai-first` sin scope se descartó (ADR-011): ver el
detalle abajo, en el paso 4. Lo que sigue son decisiones o pasos manuales de
Charlie:

1. ~~Crear la organización `@falcux` en npm.~~ **No hace falta (ADR-004).** El
   scope `@falcux` ya es de la cuenta de usuario `falcux`, verificado el
   2026-09-17 con `npm whoami` desde esta máquina, ya logueada. Lo único que
   queda de este paso es tener 2FA activo en esa cuenta antes de publicar.
2. ~~Decidir el renombre del repo.~~ **Hecho el 2026-09-17**: es
   `falcux-ai-first-package` (ADR-005), y los dos `package.json` ya declaran
   `repository`, `homepage` y `bugs` con ese nombre. Lo que arrastra al sitio
   se resolvió en la lista del merge, abajo.
3. ~~Quitar `private: true` y subir a `0.1.0`.~~ **Hecho el 2026-09-17.**
   Desde entonces nada frena un `pnpm publish` accidental salvo no correrlo.
4. ~~Primer publish a mano, desde `prod`.~~ **Hecho el 2026-09-17** (ADR-007).
   `pnpm publish --access public` desde `prod`, con 2FA en la cuenta `falcux`:
   `@falcux/ai-first@0.1.0` está en npm, sin provenance —es el precio de no
   crear nunca un token de larga vida—. El segundo comando,
   `pnpm --filter ai-first publish --access public` para el alias, falló con
   403: «Package name too similar to existing package ee-first». No era un
   problema de cuenta ni de 2FA —ese ya estaba resuelto—, es el chequeo de
   npm contra nombres parecidos a paquetes existentes, y no ofrece forma de
   forzarlo para un nombre sin scope. Charlie decidió descartar el alias
   (**ADR-011**) en vez de pedir una excepción a soporte de npm. La carpeta del
   alias, el archivo de workspace de pnpm y su prueba se borraron el mismo día.
   **Pendiente, para cuando haya versión nueva que publicar:** configurar
   trusted publishing en npmjs.com para `@falcux/ai-first` apuntando a este
   repo, y escribir `.github/workflows/publish.yml` disparado por push a
   `prod`, con `id-token: write`, que corre la suite y `audit:self --base`,
   compara la versión del `package.json` con la publicada y publica sólo si
   cambió. Queda por verificar si `pnpm publish` ya habla OIDC con npm; si no,
   el workflow empaqueta con `pnpm pack` y publica el tarball con `npm publish`.
5. ~~**Verificar en una carpeta vacía.**~~ **Hecho el 2026-09-18**:
   `npx @falcux/ai-first --help` desde una carpeta vacía baja el paquete de npm
   y da la ayuda del comando `ai-first`, con salida cero. Lo publicado funciona.

**El merge de `dev` a `main` se hizo el 2026-09-17**, avance directo de 12
commits hasta `b6d3804`, coordinado con el sitio en dos lotes: primero el
nombre nuevo del repo en las 21 URL y el workflow de sincronización, sin mover
rutas; después de nuestro merge, las 8 tarjetas de `/docs/apendices/templates`
a `main/templates/<archivo>`, publicado en `prod` del sitio en `e60c1a2`.
Verificado desde la página publicada: 8 tarjetas a `templates/`, ninguna a la
raíz, cero nombres viejos, las 8 URL en 200. La raíz de `main` siguió dando 200
unos minutos por la caché del CDN de GitHub, no porque los archivos siguieran
ahí. Desde entonces la rama publicada y `dev` van a la par; los merges
siguientes los decide Charlie y ya no arrastran nada del sitio.

**`main` pasó a llamarse `prod` el 2026-09-17** (ADR-007), para que los tres
repos —landing, sitio y paquete— compartan la convención «mergear a `prod`
despliega». Se hizo sin ventana de enlaces rotos: `prod` se creó idéntica a
`main` en `741e422` y se puso por defecto, el sitio cambió sus 16 raw links de
la rama vieja a la nueva con las dos vivas, y `main` se borró al confirmar.

Después del publish, por retorno: el `init` completo, hecho el 2026-09-18
(ADR-018) sin la entrevista, que sigue esperando el esquema del manifiesto
—el bloqueador nº2 se cerró con ADR-014—; y los hooks (hueco 5).

### Lote de actualización de templates y skills (decidido el 2026-09-17)

**El hallazgo.** Los 8 templates se subieron el 2026-04-01 y no cambiaron
desde entonces; Compliance arrancó el 2026-04-15 y en cinco meses evolucionó
justo lo que los templates no tienen: un principio editorial en `AGENTS.md`
(árbol de destinos por tipo de contenido, techo de 200 líneas, frescura, cero
duplicación, y estructura y comandos fuera por derivables de `ls` y
`package.json`), y documentos sin molde —TECH_NOTES (150 commits),
COMPONENT_LIBRARY (163), ARQUITECTURA (31), ROLES_PERMISSIONS_MATRIX (40),
una carpeta de cambios con 20 CHG y una de specs con 26—. Los 4 protocolos
coinciden casi línea a línea con los de Compliance porque allá también se
estancaron: la práctica se mudó a las skills. Las 8 skills sí reflejan
Compliance al 2026-09-15, pero perdieron al generalizarse las referencias de
`ux-writer` (5) e `i18n` (3), los dos checks de `ux-audit`, el paso 7 de
features y el «Enforcement» de `ux-writer`. Y nada en el paquete habla de más
de una herramienta: `skills/README.md` instala con `cp -r` a la carpeta de skills de Claude.

**La decisión multi-agente.** En los proyectos que adopten el paquete, la
fuente de las skills va en «.agents/skills/», el directorio del estándar Agent
Skills que leen nativamente Codex, Cursor, OpenCode y Kimi Code, con un solo
enlace simbólico «.claude/skills» apuntando a «../.agents/skills» para Claude
Code. `AGENTS.md` es el
archivo cross-tool; `CLAUDE.md` sigue siendo `@AGENTS.md`. Lo verificó
`falcux_personal_web` al revés (fuente en la carpeta de Claude, enlaces por skill en
la de agents), probado con Claude Code y Codex. En este repo `skills/` sigue
siendo la carpeta del tarball; lo que cambia es lo que enseña a instalar.

**Tres partes, tres sesiones, un orden.** Cada parte es una sesión de Claude
(`lote-1`, `lote-2`, `lote-3`), cada una en su **worktree y rama** (`lote-1`,
`lote-2`, `lote-3`, nacidas de `dev`), porque comparten archivos. Se mergean a
`dev` **en orden**: primero la 1; la 2 rebasa sobre `dev` cuando la 1 esté
dentro; la 3, cuando la 2. Números de ADR reservados para que el append no
choque: **ADR-008** para la parte 1, **ADR-009** para la 2, **ADR-010** para la
3. Cada sesión escribe su fila con su número aunque la anterior no haya
llegado. Cada commit pasa `pnpm test` por exit code y `audit:self` en 0.

1. **Parte 1 — `lote-1`. Hecha el 2026-09-17, en `dev`.** Seis commits, cada
   uno con la suite en verde y `audit:self` en 0. Lo que quedó: la
   instalación multi-agente en `skills/README.md`; los dos templates de
   contexto con el principio editorial; `ux-writer` con sus cinco referencias
   y la sección de enforcement; `i18n` con tres; `ux-audit` con los dos
   scripts de la Capa 1; `protocolo-features` con el paso 7; `criterio` mudada
   a `.agents/skills/` con `.claude/skills` como enlace; ADR-008. El sitio ya
   tiene el bloque de instalación nuevo en su `dev` y lo publica cuando esta
   parte llegue a `prod`. El capítulo de protocolo de features del
   manual numeraba 6 pasos porque no tenía el inventario de reuso; el sitio
   lo incorporó como paso 2 el mismo día, adaptado del texto de la skill, y
   renumeró 3-7 con los mismos nombres. Capítulo y skill coinciden; está en
   el `dev` del sitio, retenido hasta que esta parte llegue a `prod`. El plan
   original de la parte, tal como se
   escribió: va antes
   de la `0.1.0`. `skills/README.md` con la instalación multi-agente
   («.agents/skills/» más el enlace de Claude). `templates/CLAUDE_MD_TEMPLATE.md` y
   `templates/AGENTS_MD_TEMPLATE.md` con el principio editorial de Compliance,
   sin las secciones derivables, con el índice de skills on-demand y el árbol
   multi-herramienta. Restaurar en las 8 skills lo perdido al generalizar, ya
   generalizado. Opcional: que este repo predique con el ejemplo y mueva
   `.claude/skills/criterio` a «.agents/skills/criterio» con el enlace.
   **Aviso al sitio**: el apéndice de templates repite el bloque `cp -r` de
   instalación; hay que avisar a la sesión `redirects` para que lo cambie.
   Antes de tocar `protocolo-features`, `protocolo-cambios` o
   `protocolo-cierre`, avisar también: asumen el capítulo de gobierno.
2. **Parte 2 — `lote-2`. Necesita al sitio.** Templates nuevos para lo que
   Compliance más editó: un template de TECH_NOTES, uno de inventario de
   componentes (el check 5 del detector ya lo asume), uno de ARQUITECTURA, el
   documento CHG de la carpeta de cambios y la SPEC por módulo. Fuentes: la
   carpeta docs de Compliance, y en `falcux_personal_web` el CHG-template de
   changes/pending y el README de specs. Generalizar como se hizo con
   las skills: sin nombrar el proyecto de origen. Cambian la cadena de
   artefactos del manual y las tarjetas del apéndice: coordinar con `redirects`
   antes del merge a `prod`. Sale en `0.2.0`.
   **Escrita el 2026-09-17 (ADR-009)**: `templates/TECH_NOTES_TEMPLATE.md`,
   `templates/COMPONENT_LIBRARY_TEMPLATE.md`, `templates/ARQUITECTURA_TEMPLATE.md`,
   el molde del CHG y `templates/SPEC_MODULO_TEMPLATE.md`. El sitio
   ya tiene los nombres y agrupa: «Documentos vivos» para los tres primeros,
   CHG y SPEC junto a sus protocolos; escribe las tarjetas cuando lea el
   contenido en `origin/dev` y publica cuando los archivos existan en `prod`.
   El template de `AGENTS.md` ya apunta a `docs/specs/{modulo}.md` desde la
   parte 1; el capítulo del manual todavía dice docs/SPECS_POR_MODULO.md y lo
   cambia el sitio. Queda para un lote posterior: el protocolo de cambios lleva su propia
   anatomía corta del CHG en §2.2 y debería apuntar al template.
3. **Parte 3 — `lote-3`. Hecha el 2026-09-17 (ADR-010).** Reestructurar
   `GUIA_DISENO_TEMPLATE.md` contra la GUIA_DISENO de Compliance (3009 líneas,
   71 commits: tokens, layout en niveles, móvil, formularios) y evaluar, una
   por una y con criterio, las skills transferibles que quedaron fuera:
   `unit-test-fix`, `e2e-fix`, `information-architecture`, `ux-patterns`,
   `clean-architecture`. Agregar una skill es cambiar «las 8» que el sitio
   documenta: coordinar con `redirects`. Sale en `0.2.0` o después.

   **Lo que quedó.** La guía se reorganizó por sistema, en 18 secciones más
   una nota de crecimiento, sin nombrar a ningún proyecto de origen (el
   template viejo nombraba al suyo). Entraron dos skills: `information-architecture`
   (el eslabón que faltaba antes de `protocolo-ux`) y `test-fix` (fusión de
   `unit-test-fix` y `e2e-fix`, que compartían el esqueleto). No entraron
   `ux-patterns` (es 100 % del stack: dos proyectos reales la escribieron sin
   compartir una línea; la guía cierra con la forma para que cada proyecto
   escriba la suya) ni `clean-architecture` (prescribe una arquitectura que el
   manual no enseña). Veredictos y alternativas en ADR-010.

   **Lo que arrastró, hecho en el mismo lote tras el merge de la parte 1:**
   `skills/README.md` (dos filas, orden de adopción, grafo), el índice de
   skills de `templates/AGENTS_MD_TEMPLATE.md`, y una línea en el
   «Complemento» de `protocolo-ux` que nombra a `information-architecture`
   como eslabón previo.

   **Pendientes que deja, en orden:**
   1. Avisar al sitio: «las 8 skills» pasan a 10; enlaces nuevos a
      `prod/skills/information-architecture/SKILL.md` y
      `prod/skills/test-fix/SKILL.md` cuando `dev` llegue a `prod`.
   2. ~~Hallazgo colateral: el template de patrones UX era el precursor de
      `protocolo-ux`, no una plantilla de `ux-patterns`.~~ **Resuelto el
      2026-09-18** (ADR-012): los cuatro templates de protocolo —desarrollo de
      features, gestión de cambios, cierre de sesión y patrones UX— se
      retiraron. Los cuatro llevaban frontmatter de skill con los nombres de
      antes de la generalización (`feature-development`, `change-management`,
      `session-closure`, `ux-patterns`), no se declaraban en `AI-FIRST.md` de
      ningún proyecto ni los leía el detector, y su contenido había divergido:
      las skills `protocolo-*` incorporan Zonas Prohibidas y `docs/ADR.md`, que no
      existían el 2026-04-01. Coordinar con el sitio: 8 archivos lo
      referencian, abajo.

**Lo que ninguna parte hace**: publicar a npm, avanzar `prod`, cambiar los
pesos del puntaje, mover o renombrar rutas de `skills/` o `templates/` que el
sitio enlaza. Para el `init` futuro queda anotado: escribe «.agents/skills/» y
el enlace de Claude, no la carpeta de Claude.

### Se retiran los cuatro templates de protocolo (2026-09-18, ADR-012)

Salieron de `templates/` los cuatro documentos de protocolo que traían
frontmatter de skill: el de desarrollo de features, el de gestión de
cambios, el de cierre de sesión y el de patrones UX. El paquete pasa de 13 a
9 templates; en npm, de 4 protocolos publicados a ninguno —las skills
`protocolo-*` son ahora el único formato. El template del documento de
cambio dejó de nombrar al de gestión de cambios como alternativa.

**Coordinar con el sitio**, que referencia los cuatro nombres en 8 archivos
de `falcux-ai-first-docs-web`: su propio handoff, los cuatro capítulos de
protocolos de la Parte III, el de skills y hooks y el de guía de diseño en
la Parte II, el de AGENTS.md en la Parte II, el apéndice de templates —las 4
tarjetas— y el glosario. No se tocó nada de eso desde acá.

### El molde del CHG se muda dentro de su skill (2026-09-18, ADR-013)

El molde del CHG, que vivía en `templates/`, pasó a ser
`skills/protocolo-cambios/references/documento-de-cambio.md`. La skill llevaba
61 de sus 233 líneas repitiendo la anatomía que el template ya traía completa;
ahora dice cuándo y apunta al molde, y bajó a 190 líneas. El paquete pasa de 9
a 8 templates. El documento producido no se mueve: cada cambio sigue naciendo
en docs/changes/pending/ del proyecto, que es donde el check 3 lo lee y donde
un humano lo revisa en el PR.

**Coordinar con el sitio**: la tarjeta del apéndice que ofrecía ese template
apunta ahora al archivo dentro de la skill, en la misma rama `prod`. La tarjeta
se escribió y quedó retenida en el `dev` del sitio el 2026-09-18, a la espera de
que `prod` de acá tuviera `64375d8`. **Ya lo tiene**: `prod` avanzó ese mismo día
hasta `047d03f`, dos commits de golpe, y el archivo responde 200 en su raw link.
El sitio puede publicar sus tres commits.

### El bloqueador nº2 se cierra por donde no se esperaba (2026-09-18, ADR-014)

El bloqueador se había enunciado como una colisión de nombres: `i18n`,
`version-bump` y otras cuatro son nombres de oficio que un proyecto adoptante
puede tener ya. Al probarlo contra un proyecto con su propia skill de
internacionalización, el daño resultó no estar en el nombre sino en el comando
que `skills/README.md` enseñaba. Un `cp -r` de la carpeta entera hacía tres cosas
en silencio y con salida cero: pisaba el SKILL.md del proyecto, dejaba las
referencias del paquete mezcladas con las suyas, y anidaba un nivel de más el
enlace de la carpeta de Claude Code cuando esa carpeta ya existía. Las tres están
verificadas contra el comando anterior. Contradecía a ADR-003, que ya había
decidido que `init` nunca sobreescribe.

Los diez nombres se quedan. Lo que cambia es la instalación: copia carpeta por
carpeta, salta entera la que ya existe y dice cuál saltó; el enlace no se crea si
hay algo en su sitio. El README gana una sección con las tres salidas ante un
nombre ocupado —quedarse con la suya, borrarla y reinstalar, o tener las dos con
el prefijo `ai-first-`—. **El prefijo es la salida al conflicto, no el nombre por
defecto**, que es lo que evita mover las diez rutas que el sitio enlaza y las
unas 160 menciones cruzadas entre skills.

**Qué desbloquea.** El `init` completo, que es el mayor retorno del mapa: ya no
depende de una decisión de nombres, sólo del esquema del manifiesto. Cuando
instale skills hereda esta política.

**El sitio ya lo aplicó** el 2026-09-18, en su `dev` (`511a9ce`): el apéndice
trae el bucle con un `git clone` delante, porque ahí el lector todavía no tiene el
paquete, más la prosa de que no sobreescribe y las tres salidas. No nombra la
sección nueva del README a propósito, porque cuando lo escribió `prod` de acá
todavía servía la versión anterior; con `prod` ya en `047d03f` la frase es cierta
y puede nombrarla cuando quiera. Ninguna ruta se movió, así que no hubo nada que
retener.

De paso, el dato de qué skills nombran cada instrumento corrigió dos sitios del
sitio que decían «tres skills» —un aviso de su capítulo «Gobierno del contexto» y
una regla de su `AGENTS.md`—, contados a mano allá contra las diez publicadas y
coincidentes con los de acá. Su ADR-010 conserva el «tres» porque era cierto el
2026-09-17, cuando eran ocho: un ADR es una foto fechada.

### `prod` avanza a `047d03f` (2026-09-18)

Dos commits de golpe, los dos del día: el molde del CHG dentro de su skill
(ADR-013) y la instalación que no sobreescribe (ADR-014). Con eso los raw links
del sitio sirven ya las dos cosas, y el sitio puede publicar los tres commits que
tenía retenidos. La versión del `package.json` sigue en `0.1.1`, la misma que
está en npm, así que esto no publica nada: subir la versión sigue siendo la
decisión de publicar (ADR-007). El raw link del README tardó unos minutos en
reflejarlo por la caché del CDN de GitHub, como ya había pasado en el merge del
2026-09-17; lo que manda es el contenido de la rama, no lo que devuelve el raw
mientras tanto.

**Quién avanzó `prod` no está verificado.** Se hizo desde fuera de esta sesión,
y lo más probable es que fuera Charlie, que es quien lo decide; pero nadie lo
confirmó. Queda como supuesto, no como hecho.

**El sitio publicó el mismo día**, en su `prod` (`0fffcc9`), los cuatro commits
que tenía esperando. Antes de mergear verificó este `prod` por tres vías —
`ls-remote`, la API de contenidos y el raw del molde del CHG, que ya daba 200 sin
esperar al CDN—, y comprobó en producción las 19 URL únicas del apéndice en 200,
la tarjeta del CHG apuntando dentro de la skill, el bloque de instalación nuevo y
las cuentas de 8 templates, 10 skills y cinco skills que nombran el ADR. Añadió
además la mención a la sección «Si un nombre ya está ocupado», que con `prod`
avanzada ya es cierta. **No queda nada pendiente entre los dos repos.**

### La `0.1.2` sale a arreglar lo que npm todavía sirve (2026-09-18)

`skills/` viaja en el tarball (`files` del `package.json`), así que el README de
instalación está publicado en npm, y avanzar `prod` no lo toca: mientras la
versión no cambie no hay publish (ADR-007). Comprobado bajando el paquete:
`@falcux/ai-first@0.1.1` entrega el `cp -r` viejo, el que sobreescribe la skill
del proyecto sin avisar. Quien instale desde npm recibe el comando que ADR-014
retiró; el arreglo sólo existía en los raw links.

Por eso la `0.1.2` no es una decisión de publicar sino el arreglo de un defecto
ya distribuido, y sale a mano desde `prod` como la `0.1.0` y la `0.1.1`. El
workflow de publish va detrás, sin atarle el arreglo: es el pendiente 4 de la
lista de arriba y estrena con la `0.2.0`.

### El prefijo `docs/` se unifica en los dos repos (2026-09-18)

Empezó por querer estrenar `protocolo-cierre` en este repo y terminó en dos
decisiones. La primera, **ADR-015**: el registro de sesión es
`docs/SESSION_LOG.md`, la convención del manual. Competían tres —el manual, el
skill que lo pedía en la raíz, y los dos portales de compliance con un archivo
por sesión— y ganó la única con kilometraje: la del manual, que el capítulo
«Gobierno del contexto» respalda con un proyecto real de 626 sesiones. La de
compliance resultó estar vacía: sus dos carpetas tienen sólo su `README.md`.
El defecto no era de `protocolo-cierre`: el mismo documento se nombraba con y
sin prefijo por toda la colección, y se corrigió también en
`protocolo-cambios`, su molde del CHG, `version-bump` y el template de
`AGENTS.md`.

La segunda, **ADR-016**: este handoff, el registro de decisiones y la spec se
mudaron a `docs/`. Este repo era el único que no seguía el layout que su propio
producto escribe. En la raíz queda lo que una herramienta busca ahí sin
negociar; `AI-FIRST.md` entre ellos, porque `src/ai-first-md.ts` lo fija por
nombre. El contrato absorbió la mudanza sin tocar código.

**El sitio adoptó `docs/ADR.md`** y ya lo tiene alineado en su `dev`. No lo hizo
por seguirnos: su manual se contradecía solo, porque la tabla de permisos de su
propio capítulo ya usaba el prefijo y los demás artefactos permanentes lo llevan.
Confirmó además que el punto B no requería arreglo —las skills pasaron a
coincidir con lo que el capítulo ya decía— y dejó dos cosas abiertas para
Charlie: el archivado del registro de sesión pasadas ~50 entradas, que falta en
la skill y no sobra en el manual, y el número «sesión N» de las entradas, que
sobra porque obliga a llevar la cuenta y se desincroniza si dos personas cierran
el mismo día.

**Un dato que valida el `init`:** el repo del sitio tiene su registro de
decisiones en la raíz y eso no contradice al manual. No tiene carpeta `docs/`
—su contenido vive bajo el árbol de Astro— y `src/init.ts` sólo escribe en
`docs/` cuando la carpeta ya existe. Su contrato lo declara ahí y su auditoría
da 0. La regla condicional está probada contra un repo real que cae del otro
lado.

**Corregido de paso:** `AGENTS.md` y la nota del contrato decían que los pesos
están calibrados contra «la landing». Están calibrados contra la portada del
sitio, que es donde vive el ejemplo del 68; la landing comercial es otro repo y
no lo publica. La palabra mandaba a buscar al repo equivocado.

**La herramienta quedó configurada en este repo** al final del día: cinco skills
por enlace en `.agents/skills/`, `docs/changes/` con su registro y su carpeta de
CHG en curso, `alcance.spec` declarado, y los tres tags de versión sobre los
commits publicados. El detalle, en `docs/SESSION_LOG.md`, que estrenó con esta
sesión.

**Hallazgos para el detector**, salidos de usarlo sobre este repo. Ninguno se
tocó hoy; los dos primeros son cambio de spec:

1. *Regla 3 del check 4.* «Si el primer segmento no existe, la ruta es de otro
   árbol» falla para todo adoptante que tenga `docs/`: en cuanto la carpeta
   existe, toda mención a un docs ajeno da P2. Este repo se salvaba por no
   tenerla. La salida que se usó fue escribir las rutas ajenas en prosa, sin
   acentos graves; el arreglo de verdad es del contrato.
2. *Check 3 y los README.* Un `README.md` dentro de la carpeta de specs se lee
   como spec y el check reporta «no lista archivos». Compliance tiene README en
   esas carpetas. Debería ignorarlos.
3. *`init` sugiere un nombre que nadie usa.* La línea 185 de `src/init.ts`
   propone un inventario de componentes con un nombre distinto al del template.
4. *El mensaje del CLI para comandos mapeados* remite al handoff de este repo.
   A quien lo corre desde otro proyecto no le dice nada.

### La `0.1.3` sale a npm (2026-09-18)

Cuarta versión, y la primera que sale con la herramienta configurada en el
propio repo: el bump lo clasificó `version-bump` desde el tag `v0.1.2` —PATCH:
un `refactor:` y el arreglo de rutas de ADR-015, que viajaba en el tarball—, la
entrada de sesión la escribió `protocolo-cierre`, y el tag `v0.1.3` está sobre
el commit de cierre `a2176c3`, que es también el `prod` publicado. Verificado:
el shasum del tarball en el registro es idéntico al construido acá
(`d14c2491…`), `latest` apunta a `0.1.3`, y `npx @falcux/ai-first@0.1.3 --help`
desde una carpeta vacía responde con salida cero.

**Cómo salió, para la próxima.** La cuenta tiene el 2FA en «auth y escrituras»,
así que `pnpm publish` desde una consola no interactiva —la del agente— muere
en `EOTP` antes de subir nada; se intentó dos veces y las dos quedaron ahí.
Desde la Terminal, npm 11.4 abrió el navegador para autenticar y **publicó por
la vía web**; el comando terminó después con `409 Cannot publish over
previously staged version`. Ese 409 no es un fallo: es el CLI chocando con la
versión que la autenticación web acababa de publicar. **Ante un 409 así, mirar
`npm view @falcux/ai-first dist-tags` antes de reintentar**: si `latest` ya es
la versión nueva, terminó bien. La vía web hace innecesario el `--otp`; el
workflow con trusted publishing (pendiente 4) sigue siendo la salida de fondo.
No hubo `--dry-run` contra el registro: el tarball se listó con
`npm pack --dry-run`, que es local.

**El README se quedó en el 17.** Decía publicado «en `0.1.0`» tres versiones
después, y cuenta templates y skills como estaban antes de ADR-012. Se corrigió
sólo la versión; el arreglo de fondo es el que ya está en la cola: el CHANGELOG
y la versión leída de npm, no escrita a mano.

### La `0.2.0` sale a npm (2026-09-18)

Quinta versión y la primera MINOR: el `init` completo (ADR-018). Charlie
avanzó `prod` a `7baf51b` con `--ff-only`, el tag `v0.2.0` está sobre ese
commit, y `latest` apunta a `0.2.0`. Verificado bajando el tarball del
registro y comparándolo con `npm pack` sobre el mismo commit: 49 archivos
idénticos —`dist/src`, las 10 skills, los 8 templates, el README— salvo
`package.json`, que `pnpm publish` normaliza (quita `packageManager` y
reordena `scripts`); por eso el shasum del registro no coincide con el del
`npm pack` local, y no es señal de nada.

**Lo que salió mal, otra vez.** El README publicado dice «la última es la
`0.1.3`» y cuenta templates, skills e `init` completo como «en `dev` para la
0.2.0» cuando viajan en ese mismo tarball. Es la segunda vez en dos días (la
primera, en la sesión 2). CHG-002 quita el número del README —badge que lee
npm, tabla por estado— y deja la regla en `skills/version-bump/SKILL.md`. Ese
README sale con la `0.2.1`, que quedó lista en `dev` con el bump hecho y sin
publicar; mientras tanto la página de npm lo muestra viejo.

**El aviso al sitio de la `0.2.0` llegó**, y llegó dos veces: por eso la regla
acordada con su sesión el 2026-09-18 es que lo manda **una sola vez la sesión
que hizo el `version-bump`** de esa versión, en su cierre. El workflow de
publish (pendiente 4) sigue sin existir: esta versión también salió a mano.

### La `0.2.1` sale a npm (2026-09-21)

Sexta versión, PATCH: el README con badge en vez de número (CHG-002). Charlie
la publicó desde `prod`, que estaba en `469b27b` a la par con `dev`, y `latest`
apunta a `0.2.1` desde las 16:36 UTC. El shasum del registro (`1b227dde…`) es
el que imprimió el propio publish; el README publicado ya abre con el badge, y
`npx @falcux/ai-first@0.2.1 --help` desde una carpeta vacía responde con salida
cero. Para el adoptante no cambia nada más: `dist/`, skills y templates son los
de la `0.2.0`.

**Cómo salió, para la próxima.** El primer `pnpm publish` listó el tarball
completo y murió con `404 Not Found - PUT .../@falcux%2fai-first`, diciendo que
la `0.2.1` «is not in this registry». Ese 404 no habla del paquete: npm lo
devuelve en el PUT de un paquete con scope cuando no reconoce al usuario, para
no revelar si el paquete existe. La prueba está en `npm whoami`, que daba 401:
el token guardado en `~/.npmrc` había caducado. **Ante un 404 en el PUT, correr
`npm whoami` antes que nada**; si da 401, `npm login` por la vía web y repetir.
Salió al segundo intento con el aviso «Your package is being processed», y
`dist-tags` tardó unos minutos en mostrar la versión nueva, como avisa el
propio npm. Junto al 409 de la `0.1.3`, son los dos falsos fallos conocidos del
publish a mano; el workflow con trusted publishing (pendiente 4) evita los dos,
porque no hay token que caducar ni consola que pida OTP.

**Cerrado el mismo día:** el tag `v0.2.1` sobre `469b27b` está en `origin`, y
el aviso al sitio salió una vez, a su sesión `update_package`. El sitio lo
verificó por su lado y devolvió dos hallazgos: su panel mostraba como «salida
real de la 0.2.0» una captura anterior al publish —el código no cambió entre
la `0.2.0` y la `0.2.1`, lo comprobó corriendo las dos—, y el CLI no tenía
`--version`. Lo segundo entró el mismo día (`docs/specs/version-flag.md`).

### La `0.3.0` sale a npm (2026-09-21)

Séptima versión y segunda MINOR: `ai-first --version` y `-v`, que imprimen la
versión del `package.json` del paquete leída en ejecución
(`docs/specs/version-flag.md`). Lo pidió Charlie tras el hallazgo de la sesión
del sitio del mismo día. Publicada desde `prod` en `13c3f1f`, el commit del
bump, a las 19:18 UTC; `latest` apunta a `0.3.0`, el shasum del registro
(`211eab8a…`) es el del publish, y `npx @falcux/ai-first@0.3.0 --version`
desde una carpeta vacía responde `0.3.0`. El aviso al sitio salió una vez, a
`update_package`, desde la línea de trabajo que hizo el bump.

**Cómo salió, para la próxima.** El primer intento se hizo con `prod` un
commit por detrás de `dev`: tenía el `--version` pero no el bump, así que el
tarball salió rotulado `0.2.1` con código nuevo adentro, y npm lo rechazó con
«You cannot publish over the previously published versions». No subió nada;
es el rechazo correcto. La lección es de orden: **el `--ff-only` a `prod` va
después del commit del bump, y antes de publicar se mira que el `version` que
imprime el tarball sea el nuevo.** El workflow de publish (pendiente 4)
compara justamente eso, y por eso sigue siendo la salida de fondo: tres falsos
fallos conocidos ya —el 409, el 404 por token caducado y este rechazo por
versión repetida— y todos por publicar a mano.

### CHG-001: `init` salta lo que existe y sigue (2026-09-18, ADR-017)

El primer cambio del repo que pasa entero por `protocolo-cambios`, y el
prerrequisito del `init` completo cuya spec está en `docs/specs/init-completo.md`.
`init` sobre un repo con `AI-FIRST.md` ya no termina con error: el resultado
trae `saltados` junto a `escritos`, el CLI imprime una línea por archivo
—«escrito» o «saltado (ya existe)»— y sale con 0. El ADR que ya estaba, que
antes se saltaba en silencio, también se reporta. Nunca sobreescribir sigue
entero. Resumen y lecciones en `docs/changes/CHANGE_LOG.md`.

**Lo que dejó ver.** El check 2 compara el árbol de trabajo contra HEAD. La
fila ADR-017 entró en el commit del CHG y el código en el siguiente, así que
el `audit:self` previo al commit de código dio P1 en `src/cli.ts` con la
decisión ya escrita. No es un falso positivo del check sino del orden de los
commits: se verifica con `--base` sobre un rango que incluya la fila, o la fila
y el código viajan juntos. El `init` completo no tiene este problema, porque su
fila ya está.

### El `init` completo (2026-09-18, ADR-018)

Primer feature del repo que pasa entero por `protocolo-features`, con la spec
`docs/specs/init-completo.md` como contrato y en sesión delegada. `init`
configura un repo en un comando: `AI-FIRST.md` con `alcance.spec` declarado,
`docs/ADR.md`, `docs/SESSION_LOG.md`, `docs/changes/CHANGE_LOG.md` y
`docs/changes/pending/`, las cinco skills sin interfaz en `.agents/skills/`
(copia; `--enlazar` para enlaces relativos; `--skills todas` o una lista), el
enlace `.claude/skills` y un bloque delimitado en `AGENTS.md`. Cada ítem sale
escrito, saltado o sugerido. Probado sobre este repo: `init --enlazar` salta
los doce ítems y sólo reescribe el interior de las marcas de `AGENTS.md`; la
segunda corrida no cambia nada. Suite en 67 pruebas.

**Pendiente que comparte con el sitio.** El bloque de instalación de
`skills/README.md` cambió: el comando es el camino principal y el bucle de bash
quedó como alternativa manual, plegada. El apéndice del sitio repite ese bloque
—lo adoptó el 2026-09-18 con un `git clone` delante— y hay que avisarle para
que ponga el comando primero. Lo manda Charlie desde su sesión.

**Lo que dejó ver.** Un enlace relativo calculado sobre rutas textuales nace
roto si la raíz vive bajo un enlace (`/var` → `/private/var` en macOS); se
calcula entre rutas reales. Y el bloque de `AGENTS.md` lista lo que hay en
disco que sea del paquete, no lo que se pidió: así `--skills` distintas en
corridas distintas no se borran entre sí.

### Cómo trabajar acá

`AGENTS.md` tiene las reglas. Las que más duelen si se ignoran: las rutas de
`skills/` y `templates/` que el sitio enlaza no se mueven sin coordinar; `prod`
se avanza sólo cuando Charlie lo decide, y mergear ahí despliega; `pnpm test` en
verde por exit code y
`audit:self` en 0 antes de cada commit.

---

# El plan del paquete (mapeado el 2026-09-16)


## Objetivo

Convertir la metodología AI-First (hoy: 8 templates + 8 skills descargables vía
`git clone`) en un paquete instalable con `npx`, al estilo de Impeccable y
ai-blueprint.dev.

## Naming

- **Metodología:** Falcux AI-First (antes «AI-First Blueprint» — se renombra por
  colisión, ver Posicionamiento)
- **Paquete npm:** `@falcux/ai-first` → `npx @falcux/ai-first`
- **Comando:** `/ai-first`
- **Packs verticales futuros:** `@falcux/compliance-pack`, `@falcux/fintech-pack`
- Verificado libre en npm: `@falcux/*`, `falcux-ai-first`, `create-falcux`, `ai-first`

## Posicionamiento

Tres proyectos ocupan capas distintas y no compiten directamente:

- **ai-blueprint.dev** → ciclo de construcción (`/feature → /implement → /check → /complete`)
- **impeccable.style** → calidad visual del output
- **Falcux AI-First** → **gobierno del contexto**: Zonas Prohibidas, tabla ADR, matriz
  de permisos, entropía documental

Mensaje: no reemplaza a un framework de workflow, se instala encima. Los otros dos
asumen que el contexto está sano; este resuelve que se degrada.

## Estado de los skills (auditado)

Los 8 skills publicados YA están generalizados — sin referencias a AutenTIC ni al
proyecto de compliance donde nacieron. Frontmatter correcto, con disparadores concretos
y desambiguación cruzada entre skills. El contenido no es el problema.

**Único acoplamiento residual:** la secuencia de implementación de `protocolo-features`
asume arquitectura hexagonal (dominio → aplicación → infraestructura). Mitigado en la
nota de adaptación, pero conviene que `init` ofrezca 2–3 secuencias base según
arquitectura detectada (ej. Next.js + Supabase simple vs. hexagonal).

## Los 5 huecos a cerrar

1. ~~**Instalación por `git clone` + `cp`**~~ → **`npx @falcux/ai-first init`
   instala las skills desde el 2026-09-18** (ADR-018): copia o enlaza a
   `.agents/skills/`, crea `.claude/skills`, la estructura de `docs/` y el bloque
   de `AGENTS.md`. Sin entrevista todavía (ese es el hueco 2), y los templates
   siguen siendo manuales; los adaptadores por herramienta no hicieron falta,
   porque «.agents/skills/» las sirve a todas (ADR-008).
2. **Adaptación manual de cada skill** → el comando `init` entrevista el proyecto
   (stack, comandos de verificación, arquitectura, agentes paralelos sí/no) y reescribe
   solo las secciones «Adaptación a tu proyecto». Elimina el warning actual.
3. **Nada ejecutable** → ningún skill declara `allowed-tools` ni trae scripts. Construir
   el **detector de entropía** en código puro (git + fs + regex, sin modelo ni API key).
   Checks iniciales:
   - Zona Prohibida tocada (P0)
   - Decisión arquitectónica sin fila nueva en ADR (P1)
   - Artefacto huérfano: referenciado pero inexistente (P2)
   - Más de N archivos fuera del scope de la spec (P1)
   - Librería de componentes modificada sin actualizar su inventario (P2)

   Salida con exit codes → sirve igual para hook local y para CI.
4. ~~**Falta artefacto de estado**~~ → **`AI-FIRST.md` especificado** el 2026-09-16
   en `docs/SPEC-PAQUETE.md` §5: Markdown con frontmatter YAML, donde el frontmatter lo
   verifica el detector y el cuerpo lo lee un humano en el diff del PR. Con él
   quedaron definidos los cuatro instrumentos, la frontera con `AGENTS.md`, las
   cinco verificaciones y la fórmula del puntaje. Falta el código.
5. **Hooks no se entregan** → la metodología enseña 3 capas (AGENTS.md / skills / hooks)
   pero el paquete solo entrega 1 y 2. Falta el hook de PostToolUse y Stop.

## Mapa de comandos v1

| Comando | Qué hace | Artefacto |
|---|---|---|
| `/ai-first init` | Escanea repo, entrevista, adapta skills, genera artefactos base | AI-FIRST.md, AGENTS.md, ADR.md |
| `/ai-first audit` | Reporte de entropía con severidades | reporte + score |
| `/ai-first sync` | Repara lo que audit encontró | artefactos actualizados |
| `/ai-first adr` | Registra decisión con contexto y consecuencias | fila en ADR.md |
| `/ai-first handoff` | Empaqueta contexto para otro agente/dev | handoff.md |

Los 8 skills actuales (`protocolo-features`, `protocolo-cambios`, `protocolo-cierre`,
`protocolo-ux`, `ux-writer`, `ux-audit`, `i18n`, `version-bump`) se mantienen como están
y se distribuyen dentro del paquete.

## Patrones a replicar (arquitectura, no contenido)

De ai-blueprint.dev:

- Instalador interactivo con checklist de herramientas; copia solo los archivos del
  adaptador seleccionado
- **Manifiesto de estado** (`.state/manifest.json`) para que el `update` distinga
  archivos propios sin modificar de los editados localmente
- Tope de tamaño del contexto durable (~20KB) para que los skills lo carguen on-demand
- El instalador verifica destinos y se detiene ante symlinks o conflictos, sin copiar
  parcialmente

De impeccable.style:

- Detector que corre en código, sin gastar tokens
- Un solo namespace de comandos = una marca

No copiar: texto, estructura de docs ni nombres de comandos ajenos.

## Lo decidido el 2026-09-16 — ver `docs/SPEC-PAQUETE.md`

**El hallazgo que disparó la sesión:** los cuatro instrumentos que la landing vende
—Zonas Prohibidas, tabla ADR, matriz de permisos, entropía documental— **no existen
en el manual ni en las 8 skills**. Verificado con grep: aparecen sólo en
la landing del sitio. El manual enseña otro vocabulario (cadena de artefactos,
`SESSION_LOG`, `CHANGE_LOG`, `CHG-XXX`, `TECH_NOTES`) y el skill `protocolo-cierre`
enruta aprendizajes a cuatro destinos, ninguno de los cuales es ADR. Es entropía
documental del propio proyecto.

Tres decisiones, para no rediscutirlas:

1. **ADR convive; no reemplaza nada.** Fundamentado en CRM Compliance, donde nació
   la metodología: su árbol de decisión de documentación tiene siete destinos y
   ninguno responde «por qué se eligió esto en vez de aquello». El `SESSION_LOG` va
   por 27.682 líneas y 626 sesiones, y hay 385 `CHG-XXX`, así que el porqué de una
   decisión vieja está enterrado sin índice. `TECH_NOTES` guarda cicatrices, no
   decisiones, y ARQUITECTURA.md es documento de estado: al cambiar la decisión,
   la justificación anterior se sobrescribe. ADR agrega la fila que faltaba.

2. **`AI-FIRST.md` es Markdown con frontmatter YAML**, y la frontera con `AGENTS.md`
   es que **`AGENTS.md` es para los agentes y `AI-FIRST.md` es para las
   herramientas**. El manifiesto de instalación es un segundo archivo,
   `.ai-first/manifest.json`; confundirlos es lo que llena de ruido al artefacto de
   estado.

3. **Los cuatro instrumentos entraron al manual** como capítulo nuevo de la Parte
   II: docs/parte-2/gobierno-del-contexto, en la posición 3 de 5 —después de
   `agents-md`, porque presupone que el lector ya sabe qué es el AGENTS.md y qué
   es la cadena de artefactos—. El manual pasa de 11 a **12 capítulos** y el sitio
   de 19 a **20 páginas**.

   Las cifras del capítulo salen del proyecto real donde nació la metodología y
   **no lo nombran**, igual que se hizo al generalizar las skills. Son verificables:
   27.682 líneas de `SESSION_LOG` en 626 sesiones, 1.587 de `TECH_NOTES`, 385
   `CHG-XXX`, un `AGENTS.md` de 201 líneas contra un techo declarado de 200.

**Colisión advertida:** en Compliance, docs/ROLES_PERMISSIONS_MATRIX.md (461
líneas) es la matriz de permisos **del producto**, no la del repositorio. Se resolvió
por ubicación y no por renombre, para no tocar la landing publicada. Detalle en
`docs/SPEC-PAQUETE.md` §4.

## Siguiente paso sugerido

Con `AI-FIRST.md` especificado, el camino se abre en dos y ya no hay dependencia
entre ellos:

- **El detector** (mayor diferenciación). Los checks 1 y 4 son deterministas y se
  pueden construir hoy; el 2 es heurístico por diseño y el que hay que probar
  contra un repo real antes de creerle.
- **`init`** (mayor retorno). Depende además de resolver la colisión de nombres de
  las skills, que es el bloqueador compartido nº2.

El capítulo de la Parte II es trabajo de escritura y no bloquea a ninguno de los dos,
pero sí cierra la brecha entre lo que la landing promete y lo que el sitio define.

---

# Bloqueadores compartidos

> **`blueprint-ai-first-mintlify` se dio de baja el 2026-09-16** —borrado de
> GitHub— después de que sus dos dependencias de orden quedaran resueltas el mismo
> día. Se dejan escritas porque explican por qué el orden importaba:
>
> 1. ~~**`ai-first.falcux.com` apunta hoy a Mintlify**~~ — **resuelto el
>    2026-09-16**: el dominio ya apunta al Worker. Era la dependencia de orden
>    que obligaba a enrutar antes de apagar; ya no existe, así que Mintlify se
>    puede dar de baja cuando se quiera sin tumbar el subdominio.
> 2. ~~**el workflow de sincronización del sitio vive en ese repo.**~~ — **resuelto el 2026-09-16**: las
>    8 skills y el workflow se mudaron a este repo, que pasa a ser la fuente de
>    verdad. El workflow dispara ahora a cada push de `prod` en vez de `main`.
>    Con esto `blueprint-ai-first-mintlify` ya no tiene nada que nadie necesite:
>    se puede apagar cuando se quiera.


Los cuatro puntos donde el sitio y el paquete se tocan. Ninguno es responsabilidad
exclusiva de un frente.

**1. Licencia — decidida: Apache 2.0 a nombre de Charlie Herrera.** Hecho en este
repo (`LICENSE`, y `license` declarado en `package.json`).

Se eligió licencia única y permisiva para todo —código, skills y manual juntos—
porque es lo que hacen los referentes del sector: ai-blueprint.dev usa MIT e
impeccable usa Apache 2.0, y ninguno separa el contenido del código. Entre las dos,
Apache 2.0 por su cláusula 6: deja escrito que licenciar el material no concede
derechos sobre las marcas «Falcux» ni «Blueprint AI-First», que es el activo del
modelo —el blueprint atrae, falcux.com vende—.

Replicado también en `blueprint-ai-first-templates` (commit `7c84650`, ya en su
`main` público): es de donde la gente clona las skills y no declaraba licencia,
así que quien las descargaba no tenía permiso formal para usarlas. Vive en la
raíz a propósito, donde el `rsync --delete` del workflow de sincronización del
sitio no lo alcanzaba, porque ese sincronizaba `skills/` contra `skills/`. (Ese
workflow dejó de existir el 2026-09-17, ADR-006; la razón de ubicación ya no
aplica, pero el archivo sigue bien donde está.)

`blueprint-ai-first-mintlify` **no se corrige**: se da de baja al terminar este
sitio. Su `LICENSE` seguirá diciendo `Copyright (c) 2023 Mintlify` hasta que
desaparezca, y eso es aceptable porque el repo muere. Con eso, el bloqueador
queda cerrado.

**2. ~~Nombres de los skills.~~ Cerrado el 2026-09-18 (ADR-014).** Se enunció
como colisión de nombres genéricos (`i18n`, `version-bump`) en un proyecto que ya
tenga uno igual, y como restricción de diseño del `init` (hueco 2). Al medirlo
resultó ser otra cosa: el daño no lo causaban los nombres sino el comando de
instalación, que sobreescribía en silencio. Los diez nombres se quedan, la
instalación salta lo que ya existe, y el prefijo `ai-first-` queda como salida al
conflicto. Dejó de ser bloqueador compartido: no mueve ninguna ruta que el sitio
enlace, así que ya no toca a los dos frentes. Lo único para el sitio es el aviso
de que el bloque de instalación cambió.

**3. Redirecciones.** Son dos conjuntos que se implementan en el mismo Worker:
   - Las 16 de Mintlify → `/docs/…` (pendiente 4 del sitio).
   - Las del dominio viejo de AutenTIC → falcux.com: verificar que existan los 301; el
     índice de Google todavía apunta allá.

**4. ~~Renombrar los repos.~~ Resuelto el 2026-09-17.** Este repo pasó de
`blueprint-ai-first-templates` a **`falcux-ai-first-package`** (ADR-005); el del
sitio ya era **`falcux-ai-first-docs-web`**, aunque su clon local y los
documentos de acá lo llamaban `falcux-ai-first`. Lo que queda es del sitio: la
línea `repository:` del workflow de sincronización de skills, las 8 tarjetas de templates con el
nombre viejo `docs-ai-first-blueprint`, 11 menciones más en esa página, una en
cada capítulo de protocolos y una en «sobre este proyecto». Todo funciona hoy
por los redirects de GitHub; se corrige en la misma edición que la ruta
`templates/`. El clon local del sitio empuja a `falcux-ai-first.git`, que
redirige: `git remote set-url origin` cuando se abra ese repo.

## Otros hallazgos abiertos del repo de contenido

- **Su `AGENTS.md` es el template de Mintlify sin personalizar**, con el banner de
  *first-time setup* todavía puesto.
- ~~**El README dice que hay que replicar `skills/` a mano al repo público**, pero el
  workflow de sincronización del sitio (commit `fcf5eca`) ya lo automatizaba con `rsync --delete`.
  Una de las dos fuentes miente.~~ **Cerrado el 2026-09-17**: no hay nada que
  replicar en ningún sentido; `skills/` vive sólo acá (ADR-006).

---

