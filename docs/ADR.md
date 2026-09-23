# Registro de decisiones — `@falcux/ai-first`

Una fila por decisión, en orden, sin borrar nunca. Una decisión entra si es
difícil de revertir, tenía alternativas reales y alguien va a preguntar por qué
en seis meses. Formato en `SPEC-PAQUETE.md` §3.

## ADR-001 — El código del paquete vive en `blueprint-ai-first-templates`, rama `dev`, y no en el repo del sitio

- **Fecha:** 2026-09-17
- **Estado:** aceptada

**Contexto.** El detector de entropía estaba especificado y sin escribir. Había
que decidir dónde ponerlo. El repo del sitio (`falcux-ai-first`) es Astro +
Starlight, estático, y Workers Builds lo publica a cada push de `prod`. Este
repo tenía los 8 templates —que no existen en ningún otro lado— y una copia de
las 8 skills que el workflow de sincronización del repo del sitio regenera con
`rsync --delete`. El sitio
publicado descarga skills desde los raw links de `main` de este repo.

**Decisión.** El código se escribe acá, en `dev`. `main` no se toca hasta que
el detector merezca verse: sigue sirviendo los raw links y recibiendo la
sincronización de skills. `SPEC-PAQUETE.md` se muda acá porque es el contrato
del paquete, no del sitio.

**Alternativas.** *Workspace pnpm en el sitio*: obligaba a mover el Astro a un
subdirectorio y a cambiar el root de Workers Builds desde el panel de
Cloudflare, fuera de git, para cero beneficio. *Repo nuevo*: los templates
viven sólo acá y el paquete los necesita; duplicarlos es la entropía que el
producto combate. *Repo privado hasta que funcione*: el diseño ya estaba
publicado entero en el manual, la Apache 2.0 se eligió a propósito, y con cero
estrellas no había audiencia ante la que esconder commits a medias.

**Consecuencias.** Nada del código puede vivir dentro de `skills/`: el rsync lo
borraría. El repo pasa de ser sólo material descargable a ser también un
paquete, y va a necesitar renombrarse antes de publicar. Se desarrolla en
abierto desde el primer commit.

## ADR-002 — Se publica como `@falcux/ai-first`, con `ai-first` como alias funcional

- **Fecha:** 2026-09-17
- **Estado:** aceptada

**Contexto.** Los dos nombres estaban libres en npm. El nombre sin scope es más
corto para la landing (`npx ai-first`). El proyecto tiene previstos packs
verticales (`@falcux/compliance-pack`, `@falcux/fintech-pack`) que son la capa
que se cobra.

**Decisión.** El paquete real es `@falcux/ai-first`. En el mismo primer publish
se publica `ai-first` sin scope como alias fino: depende de `@falcux/ai-first`
y expone el mismo `bin`. El comando es `ai-first audit` en los dos casos. La
primera publicación del scoped lleva `--access public`.

**Alternativas.** *Sólo `ai-first` sin scope*: más corto, pero un nombre sin
scope es del primero que llega y no controla a `ai-first-*` ni a los packs; la
familia se vería como paquetes sueltos de nadie. *Sólo `@falcux/ai-first`*:
deja el nombre corto libre para que otro se lo quede el día que la landing lo
mencione. *Reservar `ai-first` con un placeholder vacío*: la política de
disputas de npm permite reclamar nombres ocupados por paquetes sin contenido
funcional.

**Consecuencias.** Dos paquetes que publicar en cada release, con el alias
siempre apuntando a la misma versión. El scope `@falcux` hay que crearlo en
npm como organización antes del primer publish. Los packs verticales heredan
el namespace sin discusión.

## ADR-003 — Un `init` mínimo antes que el `init` completo del mapa

- **Fecha:** 2026-09-17
- **Estado:** aceptada

**Contexto.** `audit` exige un `AI-FIRST.md` que, sin herramienta, sólo se
escribe leyendo la spec entera. Publicar `audit` solo era publicar algo que no
arranca. El `init` del mapa v1 —escanear, entrevistar, adaptar las 8 skills,
generar AGENTS.md— depende de tres decisiones abiertas: la colisión de
nombres de las skills (bloqueador nº2), el esquema de `.ai-first/manifest.json`
y las secuencias base por arquitectura.

**Decisión.** `init` escanea el repo y escribe dos archivos: `AI-FIRST.md` con
sugerencias derivadas de lo que encuentra, y un `ADR.md` vacío. No toca
skills ni AGENTS.md, no escribe manifiesto y nunca sobreescribe. Es el
primer paso del `init` completo, no un sustituto: la entrevista y las skills
se montan encima cuando sus bloqueadores se resuelvan.

**Alternativas.** *Publicar sólo `audit`*: nadie lo puede usar sin el archivo.
*Esperar al `init` completo*: semanas y tres decisiones que no son código,
sin aprender nada del check 2 en repos ajenos mientras tanto. *Sobreescribir
con `--forzar`*: un `AI-FIRST.md` editado a mano vale más que cualquier
sugerencia automática; la opción era un arma cargada.

**Consecuencias.** La v0.1 se rotula como lo que es: instrumento de medición
más el archivo que lo alimenta, sin reemplazar el `git clone` de las skills.
Quien la instale sigue copiando skills a mano. Lo que `init` escribe se valida
con el mismo lector que usa `audit` antes de tocar el disco.

## ADR-004 — El scope `@falcux` se publica desde la cuenta de usuario `falcux`, no desde una organización

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Supera la consecuencia de ADR-002 que pedía crear
  `@falcux` como organización antes del primer publish.

**Contexto.** ADR-002 dio por hecho que un scope exige una organización. En
npm un scope pertenece a quien lleve ese nombre, sea usuario u organización, y
ya existía la cuenta de usuario `falcux`, verificada con `npm whoami` el
2026-09-17. Usuario y organización comparten el espacio de nombres: una
organización `falcux` no se puede crear mientras exista el usuario; habría que
convertir la cuenta, eligiendo otro nombre para el usuario personal.

**Decisión.** `@falcux/ai-first` y el alias `ai-first` se publican desde la
cuenta de usuario `falcux`, con 2FA activo. No se crea organización ni se
convierte la cuenta.

**Alternativas.** *Convertir la cuenta en organización ahora*: da equipos,
tokens y permisos por miembro que hoy no tiene quién usar, a cambio de
renombrar el usuario personal y rehacer el login en cada máquina. *Crear la
organización con otro nombre*: pierde el scope `@falcux`, que es la marca.

**Consecuencias.** Los paquetes quedan atados al login personal y a su 2FA;
quien publique es una sola persona hasta que se convierta la cuenta. La
conversión conserva el scope y los paquetes, así que se puede hacer el día que
haya más de una persona publicando, sin tocar nada de lo publicado. El paso 1
de la lista de publish en `HANDOFF.md` desaparece.

## ADR-005 — El repo del paquete se llama `falcux-ai-first-package`

- **Fecha:** 2026-09-17
- **Estado:** aceptada

**Contexto.** ADR-001 anticipó que el repo, nacido como material descargable
con el nombre `blueprint-ai-first-templates`, iba a necesitar renombrarse al
volverse paquete: el `repository` del `package.json` es la URL que npm muestra.
El repo del sitio ya se había renombrado a `falcux-ai-first-docs-web`, soltando
`falcux-ai-first`. En GitHub no hay organización `falcux`: el usuario `falcux`
existe desde 2013, sin repos, y no es del proyecto. GitHub redirige los
nombres viejos mientras nadie los reutilice, así que el renombre no bloqueaba
el publish; se hizo antes para editar una sola vez las URL del sitio.

**Decisión.** `HoruxDeEdfu/falcux-ai-first-package`. Los dos `package.json`
declaran `repository`, `homepage` (`ai-first.falcux.com`) y `bugs` con ese
nombre; el alias agrega `directory: alias`.

**Alternativas.** *`falcux-ai-first`*, espejo del nombre npm: estaba libre,
pero cada mención a `falcux-ai-first` en los documentos de este repo pasaba de
desactualizada a señalar al repo equivocado, y el clon local del sitio empuja
todavía a esa URL. *`ai-first`* a secas bajo la cuenta personal: es la
convención de cuentas personales y el más corto, pero junto a
`falcux-ai-first-docs-web` queda huérfano y sin la marca que la Apache 2.0
protege. *`falcux/ai-first`*: exige el handle `falcux`, que no es nuestro;
Charlie va a evaluar pedirlo a GitHub.

**Consecuencias.** Los dos repos se leen como hermanos: `-docs-web` documenta,
`-package` entrega. Si el handle `falcux` se consigue, transferir el repo ahí y
dejarlo en `falcux/ai-first` conserva los redirects; sería una fila nueva.
Hasta entonces, `main` sigue sirviendo raw links por redirect, y el sitio
tiene que actualizar 21 URL y una línea del workflow en la edición del merge.

## ADR-006 — `skills/` es la fuente de verdad de las 8 skills; el sitio deja de sincronizarlas

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Supera la consecuencia de ADR-001 «nada del código
  puede vivir dentro de `skills/`: el rsync lo borraría», y la Zona Prohibida
  que `AI-FIRST.md` declaraba por esa razón.

**Contexto.** El 2026-09-16 las skills se autoraban en el repo del sitio y un
workflow las empujaba acá con `rsync --delete` a cada publicación de `prod`. La
razón era de ese día: el repo Mintlify se daba de baja y éste era un espejo
público sin CI, así que la fuente tenía que estar donde había workflow. Esa
razón caducó al día siguiente, cuando este repo pasó a ser el paquete: la
carpeta `skills/` viaja en el tarball de npm (`files` del `package.json`) y no
se podía editar desde acá. Mantener la sincronización obligaba a distribuir
una carpeta cuyo dueño era otro repo. Lo pidió el sitio con su criterio;
Charlie lo decidió.

**Decisión.** `skills/` vive acá y sólo acá. El sitio borró su copia y el
workflow, tras verificar con `diff -rq` que los 9 archivos eran idénticos a los
de `dev` en `6de6794`. `AI-FIRST.md` queda sin Zonas Prohibidas: la de `skills/`
existía por el rsync, no por importancia, y el check 1 se reporta omitido antes
que inventar una zona.

**Alternativas.** *Seguir sincronizando desde el sitio*: el paquete publicaría
algo que no gobierna, y cada edición a una skill pasaría por un repo privado
ajeno al paquete. *Sincronizar al revés, de acá al sitio*: el sitio no necesita
la copia; enlaza a los raw links de `main`. Un espejo sin lector es entropía.

**Consecuencias.** Las skills se editan acá con las mismas compuertas que el
código: `pnpm test` y `audit:self`. El sitio sigue enlazando a
`main/skills/<nombre>/SKILL.md`; mover o renombrar esas rutas se coordina antes
del merge a `main`, igual que con `templates/`. Nace una dependencia de
contenido en los dos sentidos: `protocolo-features`, `protocolo-cambios` y
`protocolo-cierre` asumen el capítulo «Gobierno del contexto» del manual; si
cambian ellas, se avisa al sitio, y si cambia el capítulo, el sitio avisa acá.
El bloqueador compartido nº2, los nombres genéricos de las skills, pasa a ser
enteramente de este repo.

## ADR-007 — La rama publicada se llama `prod` en los tres repos, y mergear a ella despliega

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Supera lo que ADR-001 dice de `main` como rama que
  sirve los raw links; la rama sigue existiendo con otro nombre.

**Contexto.** El sitio y la landing despliegan con Workers Builds a cada push
de `prod`; este repo usaba `dev` y `main`. Pero mergear a `main` acá ya era un
despliegue: cambia al instante lo que el sitio sirve por raw links, y el
publish a npm iba a colgarse de la misma rama. Una rama que despliega sin
llamarse como las otras dos rompe el hábito de quien opera los tres repos:
«mergear a `prod` despliega» es una sola regla si el nombre es uno solo. Hoy
el costo de renombrar era el más bajo que va a tener: nada publicado en npm,
ningún `repository` apuntando a la rama, y la sesión del sitio cambiando URL
del mismo tipo el mismo día.

**Decisión.** La rama publicada es `prod`; `dev` sigue siendo la de trabajo y
`main` desaparece. `prod` se avanza con `--ff-only` cuando Charlie lo decide, y
mergear a ella despliega dos cosas: los raw links del sitio al instante, y npm
cuando la versión del `package.json` cambió, por un workflow que compara con
la versión publicada y no publica si es la misma. `.npmrc` fija
`publish-branch=prod` para que `pnpm publish` se niegue desde otra rama. El
primer publish, `0.1.0`, sale a mano desde `prod` porque trusted publishing se
configura sobre un paquete que ya existe. El cambio de nombre se hizo sin
ventana: `prod` nació idéntica a `main`, el sitio movió sus 16 raw links con
las dos vivas, y `main` se borró al confirmar.

**Alternativas.** *Mantener `main` acá y `prod` en los otros dos*: era la
recomendación inicial, por ahorrar la edición de 16 URL; perdía ante el
argumento del hábito único y del despliegue implícito que `main` ya tenía.
*Publicar a npm por tag `v*` en vez de por merge*: es la convención de los
paquetes npm, pero mete un segundo gesto («además del merge, el tag») que
rompe la regla única; la comparación de versiones lo resuelve sin tags.
*Renombrar con la API de GitHub en vez de crear y borrar*: más corto, pero
depende de que los redirects de rama alcancen a `raw.githubusercontent.com`,
que no se pudo verificar; crear y borrar no depende de nada.

**Consecuencias.** Un merge a `prod` sin subir la versión sólo actualiza raw
links; con la versión subida, publica los dos paquetes. Subir la versión es,
por tanto, la decisión de publicar. Queda pendiente el workflow y la
configuración de trusted publishing (`HANDOFF.md`, paso 4). Los documentos que
digan `main` de este repo están desactualizados; los de las ADR anteriores se
leen con su fecha.

## ADR-008 — Las skills se instalan en `.agents/skills/` con un enlace para Claude Code, y los templates de contexto adoptan el principio editorial

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Supera lo que `skills/README.md` enseñaba hasta hoy
  (copiar a la carpeta de skills de Claude Code) y las secciones de estructura,
  tech stack y comandos que `templates/AGENTS_MD_TEMPLATE.md` pedía inline.

**Contexto.** Los 8 templates se subieron el 2026-04-01 y no cambiaron; el
proyecto donde nació la metodología arrancó dos semanas después y en cinco
meses aprendió dos cosas que el paquete no enseñaba. La primera: su `AGENTS.md`
pasó de plantilla a documento gobernado por un principio editorial —un árbol de
destinos por tipo de contenido, techo de 200 líneas, regla de frescura, cero
duplicación, y las secciones de estructura, stack y comandos fuera del archivo
por derivables de `ls` y del manifiesto del paquete—, porque cada línea que no
evita un error hoy le quita atención a las que sí. La segunda: nada en el
paquete hablaba de más de una herramienta. `skills/README.md` instalaba con
`cp -r` a `.claude/skills/`, y los equipos que usan Claude Code y Codex sobre el
mismo repo acababan con dos copias o con un enlace por skill. Existe un
estándar abierto, *Agent Skills*, cuyo directorio `.agents/skills/` leen
nativamente Codex, Cursor, OpenCode y Kimi Code; Claude Code lee
`.claude/skills/`. Lo verificó `falcux_personal_web` al revés —fuente en la
carpeta de Claude, un enlace por skill en la de agents—, probado con Claude
Code y Codex. Charlie decidió el alcance el 2026-09-17; esta fila es la Parte 1
del lote que `HANDOFF.md` describe.

**Decisión.** En los proyectos que adopten el paquete, la fuente única de las
skills es `.agents/skills/`, y `.claude/skills` es un enlace simbólico relativo
a «../.agents/skills». `AGENTS.md` sigue siendo el archivo cross-tool y
`CLAUDE.md` sigue siendo `@AGENTS.md`. Este repo predica con el ejemplo: su
única skill propia pasa de `.claude/skills/criterio` a
`.agents/skills/criterio`, con el enlace. `skills/` sigue siendo la carpeta del
tarball; lo que cambia es lo que enseña a instalar. Los templates
`CLAUDE_MD_TEMPLATE.md` y `AGENTS_MD_TEMPLATE.md` incorporan el principio
editorial, generalizado sin nombrar el proyecto de origen, con el índice de
skills bajo demanda y el árbol multi-herramienta. Las ocho skills recuperan lo
que se perdió al generalizarlas: las cinco referencias de `ux-writer` y su
sección de enforcement, las tres de `i18n`, los dos scripts de la Capa 1 de
`ux-audit` y el paso 7 de `protocolo-features`, todo generalizado.

**Alternativas.** *Fuente en `.claude/skills/` y un enlace por skill hacia
`.agents/skills/`*, como hizo `falcux_personal_web`: funciona y está probado,
pero obliga a crear un enlace nuevo por cada skill que se agrega y a recordarlo;
el enlace único de carpeta no. *Copias por herramienta*: dos carpetas con el
mismo contenido son la entropía que el paquete mide; divergen en la primera
edición apurada. *Dejar los templates como estaban y anotar el principio en el
manual*: el template es lo que se copia; un principio que vive sólo en el sitio
no llega al `AGENTS.md` de nadie.

**Consecuencias.** El apéndice de templates del sitio repite el bloque `cp -r`
y tiene que cambiar; se avisó a la sesión del sitio. El `init` futuro escribe
`.agents/skills/` y el enlace, no la carpeta de Claude. Un equipo en Windows
sin enlaces simbólicos habilitados usa copia en la carpeta de Claude y declara
la fuente en su `AGENTS.md`. Las skills ganan archivos de apoyo dentro de su
carpeta («references/», «checks/»); los `SKILL.md` no se mueven, así que los
enlaces del sitio siguen vivos. Los templates dejan de pedir estructura, stack
y comandos: un `AGENTS.md` generado desde ellos es más corto y envejece más
despacio.

## ADR-009 — Cinco documentos ganan template: cicatrices, inventario de componentes, arquitectura, documento de cambio y spec por módulo

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Parte 2 del lote de actualización de templates y
  skills (`HANDOFF.md`); sale en la 0.2.0.

**Contexto.** Los 8 templates se subieron el 2026-04-01 y no cambiaron desde
entonces. En el proyecto real donde nació la metodología, los documentos que
más se editaron en los cinco meses siguientes no tenían molde: el catálogo de
cicatrices técnicas (150 commits), el inventario de componentes (163), el
documento de arquitectura (31), una carpeta de cambios que llegó a 385
documentos numerados y una de specs con 26. La metodología ya daba por hecho
que existían: el protocolo de cierre enruta aprendizajes a TECH_NOTES, a la
spec del módulo y al inventario; el protocolo de cambios exige el documento
`CHG-XXX` antes de tocar código; el check 5 del detector lee el inventario
contra el directorio de componentes, y el check 3 lee «Archivos» o «Alcance»
de una spec. Quien adoptaba el paquete tenía que inventar el formato de cinco
documentos que las skills y el detector ya asumían.

**Decisión.** Cinco templates nuevos en `templates/`, con el patrón de nombre
existente: `TECH_NOTES_TEMPLATE.md`, `COMPONENT_LIBRARY_TEMPLATE.md`,
`ARQUITECTURA_TEMPLATE.md`, el molde del documento de cambio y
`SPEC_MODULO_TEMPLATE.md`.
Cada uno generaliza el documento real sin nombrarlo, cita sus cifras como «un
proyecto real», y trae la anatomía que el detector lee: encabezado por
componente en el inventario, sección «Archivos afectados» en el CHG y
«Archivos del módulo» en la spec. El criterio de entrada fue doble: que las
skills o el detector ya lo asumieran, **y** que en el proyecto real hubiera
tenido edición sostenida. Quedaron fuera por no cumplir uno de los dos: la
matriz de permisos (40 commits, pero es del producto y no de la metodología;
la colisión está en `SPEC-PAQUETE.md` §4), el log de sesiones y el registro
de cambios (su formato ya está en los protocolos y es trivial), y los runbooks
de despliegue (demasiado atados a la infraestructura de cada proyecto).

**Alternativas.** *Dejarlos como prosa en el manual*: el manual ya los
describía y el proyecto real igual tardó meses en converger a un formato; la
prosa dice qué guardar, no cómo, y el detector necesita el cómo. *Un solo
template «docs» genérico*: cinco documentos con cinco ciclos de vida
distintos —uno se agrega arriba, otro se sobreescribe, otro se elimina al
cerrar— no caben en una anatomía; un template genérico habría sido un índice
con cinco secciones, que es lo que ya hace el `AGENTS.md`. *Meter la anatomía
dentro de los protocolos existentes*: el protocolo de cambios ya lleva una
anatomía corta del CHG en su §2.2, y eso es justo lo que no escaló; el
protocolo dice cuándo y el template dice qué, y se descargan por separado.

**Consecuencias.** El paquete pasa de 8 a 13 templates; el sitio cambia la
cuenta en la landing, el volcado para LLMs y el apéndice, que gana el grupo
«Documentos vivos» y suma CHG y SPEC junto a sus protocolos. La cadena de
artefactos del manual y el template de `AGENTS.md` nombran
docs/SPECS_POR_MODULO.md como archivo único; la spec por módulo lo
reemplaza por la carpeta docs/specs/ con un README índice, que es lo que el
proyecto real terminó haciendo. El template ya lo dice desde ADR-008; el
capítulo lo cambia el sitio. La anatomía del CHG queda en tres sitios —protocolo,
skill y template— hasta que el protocolo se edite para apuntar al template;
esa edición toca un template publicado y va en su propio lote. Nada de esto
mueve rutas que el sitio enlaza. El `init` futuro puede ofrecer estos cinco
archivos además de `AI-FIRST.md` y `ADR.md`.

## ADR-010 — La guía de diseño se reorganiza por sistema, y de las cinco skills candidatas entran dos: `information-architecture` y `test-fix`

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Parte 3 del lote de actualización de templates y
  skills (`HANDOFF.md`).

**Contexto.** El template de la guía de diseño se subió el 2026-04-01 y no
cambió desde entonces: 16 secciones numeradas, extraído de una sola guía y
nombrándola. Desde entonces dos guías reales evolucionaron en direcciones
distintas: la de una aplicación de datos con navegación autenticada, que en
cinco meses pasó por 71 revisiones y llegó a 3.009 líneas organizada por
sistema (tokens, layout en tres niveles, móvil, tablas, formularios extensos,
movimiento), y la de un sitio de contenido en otro stack, de 1.114 líneas con
la mitad de las secciones. Cinco skills de la primera quedaron fuera de las 8
del paquete y son candidatas a transferibles: `unit-test-fix`, `e2e-fix`,
`information-architecture`, `ux-patterns` y `clean-architecture`. Allá la
cadena de diseño es `information-architecture` → `protocolo-ux` →
`ux-patterns`, y el paquete sólo tiene el eslabón del medio.

**Decisión.**

1. *La guía.* Se reorganiza por sistema, no por lista de temas, con lo que las
   dos guías reales comparten y sin nombrar a ninguna. Tres cosas nuevas que no
   estaban y son lo que las mantuvo legibles: una sección «Dónde vive la
   verdad» que declara los valores como derivados del archivo de tokens; la
   regla de que cada norma lleva su cicatriz; y un árbol de destinos para lo
   que no le toca (inventario de componentes, copy, decisiones, changelog). Se
   recogen las reglas que sólo se aprenden con volumen (estados como roles y
   no opacidades, un encabezado por tabla, paginación en servidor, la acción
   de crear dentro del estado vacío, skeletons con retraso y su deriva) y se
   marcan las secciones que un sitio de contenido borra. Cierra con la forma
   de la skill `ux-patterns` que el proyecto escribe a partir de ella.
2. *`information-architecture` entra*, generalizada. Responde una pregunta que
   ninguna de las 8 responde («¿qué es esto, cómo se llama y dónde vive?») y es
   el primer eslabón de la cadena; `protocolo-ux` da por decidida esa
   estructura. Su regla de naming (un concepto, un lema, una forma por capa)
   es entropía documental aplicada a la interfaz: el mismo argumento del
   paquete. De sus 437 líneas, la mitad era sitemap, taxonomía y deuda del
   producto; eso pasa a la sección «Adaptación a tu proyecto» como las cinco
   cosas que el proyecto agrega.
3. *`unit-test-fix` y `e2e-fix` entran fusionadas en `test-fix`.* Comparten el
   esqueleto entero (alcance desde git, salida filtrada por un agente aparte,
   clasificación mecánica vs. negocio, corrección mínima, tope de dos rondas,
   suite completa una vez, reporte) y duplicaban ese texto; la fusión deja una
   sección E2E con lo que sólo ella tiene: prerrequisitos, evidencia, tests
   intocables, y la regla de que corre sólo bajo decisión explícita. Lo que
   gobierna es la frontera entre lo que el agente corrige solo y lo que
   decide el humano: los tests son la especificación.
4. *`ux-patterns` no entra como skill.* Dos proyectos reales la escribieron y
   no comparten una sola línea: es 100 % del stack. Lo compartido es la forma,
   y esa va en la última sección de la guía. `protocolo-ux` y `ux-audit` ya
   dicen «crea un `ux-patterns` propio»; una genérica sería una skill de
   marcadores, el caso que el README de skills advierte como peor que no
   tenerla. Sus reglas agnósticas (tokens, una librería de iconos, i18n, 4
   estados) ya existen como checks en la Capa 1 de `ux-audit`.
5. *`clean-architecture` no entra.* Prescribe una arquitectura (dominio →
   aplicación → infraestructura) que el manual no enseña, y el paquete se
   posiciona como gobierno del contexto que se instala encima de cualquier
   framework. Sería agregar el acoplamiento que `HANDOFF.md` ya anota como
   residual en `protocolo-features`. Sus reglas de dependencia son del
   documento de arquitectura del proyecto; una skill de 40 líneas se escribe
   desde ahí.

**Alternativas.** *Fusionar `information-architecture` en `protocolo-ux`*:
una sola skill de diseño, pero mezcla dos momentos (estructura antes de la
spec, comportamiento al diseñarla) y triplica una skill que es corta a
propósito. *Dos skills de tests separadas, como en el origen*: respeta la
activación distinta de E2E, pero al precio de duplicar 40 % del texto; la
regla «E2E sólo bajo decisión explícita» dentro de una sola skill resuelve lo
mismo. *`ux-patterns` como esqueleto con marcadores*: da un archivo que
copiar, pero cada línea sería `{…}`, y una skill sin contenido ocupa
presupuesto de carga sin dar instrucciones. *Reescribir la guía copiando la
de la aplicación y quitando nombres*: 3.000 líneas de las que la mitad son
del producto (pipeline de tokens, barra inferior móvil, formularios de un
dominio, PDFs); el template quedaría inutilizable para un sitio.

**Consecuencias.** El paquete pasa de 8 a **10 skills**; «las 8» que el sitio
documenta y enlaza cambia, y se avisa a la sesión del sitio antes de que `dev`
llegue a `prod`. `skills/README.md` gana las dos filas, el orden de
adopción y el grafo de dependencias; el índice de skills del template de
`AGENTS.md` nombra las dos nuevas; y `protocolo-ux` nombra a
`information-architecture` como eslabón previo en su «Complemento», una
línea que no toca su comportamiento y que se avisó al sitio. Esta parte sale en la 0.2.0 o
después. Hallazgo colateral: el template de protocolo de patrones UX de
`templates/` es, en contenido, el precursor de `protocolo-ux` y no una
plantilla de `ux-patterns`; queda anotado en `HANDOFF.md`, sin mover ni
renombrar, porque el sitio lo enlaza.

## ADR-011 — El alias `ai-first` sin scope se descarta; se publica sólo `@falcux/ai-first`

- **Fecha:** 2026-09-17
- **Estado:** aceptada. Supera la parte de ADR-002 que decidía publicar el
  alias en el mismo primer publish; el nombre en npm del paquete real,
  `@falcux/ai-first`, sigue en pie.

**Contexto.** El primer publish salió el 2026-09-17 desde `prod`, con 2FA en
la cuenta `falcux`: `pnpm publish --access public` en la raíz publicó
`@falcux/ai-first@0.1.0` sin problema. El segundo comando,
`pnpm --filter ai-first publish --access public`, falló con 403: «Package
name too similar to existing package ee-first; try renaming your package to
'@falcux/ai-first'…». No era el 2FA, ya resuelto para el primer comando: es el
chequeo de similitud de npm contra paquetes existentes, pensado contra
typosquatting, y no tiene bandera para forzarlo en un nombre sin scope. El
paquete `ee-first` es una dependencia real y muy instalada (la usa `finalhandler`
de Express), así que no es un falso positivo trivial de desactivar.

**Decisión.** Se descarta el alias. `@falcux/ai-first` es el único nombre en
npm; el comando sigue siendo `ai-first` porque así lo expone el `bin` del
paquete con scope, sólo que se invoca `npx @falcux/ai-first`, no
`npx ai-first`. Se borran la carpeta del alias, el archivo de workspace de
pnpm y su prueba el mismo día.

**Alternativas.** *Pedir a soporte de npm una excepción al chequeo de
similitud*: npm las concede a veces cuando el paquete con scope ya existe y el
propósito es legítimo, pero es un trámite con soporte humano, de duración
incierta, para un nombre que es conveniencia y no necesidad. *Publicar el
alias con otro nombre sin scope* (`falcux-ai-first`, `ai-first-cli`): resuelve
el chequeo pero pierde el nombre corto que motivaba el alias en primer lugar
(ADR-002); no vale la pena mantener dos paquetes por una comodidad menor.

**Consecuencias.** Los packs verticales futuros (`@falcux/compliance-pack`,
`@falcux/fintech-pack`) siguen bajo el scope sin que esto los afecte: nunca
dependieron del alias. `README.md`, `AGENTS.md` y `HANDOFF.md` dejan de
mencionar un segundo paquete. Si en el futuro se quiere un nombre corto, esta
fila es el antecedente de por qué no salió a la primera.

## ADR-012 — Se retiran los cuatro templates de protocolo; las skills `protocolo-*` son el único formato

- **Fecha:** 2026-09-18
- **Estado:** aceptada

**Contexto.** Los cuatro templates de protocolo —desarrollo de features,
gestión de cambios, cierre de sesión y patrones UX— se subieron el
2026-04-01, antes de que este repo existiera como paquete. Los cuatro llevan
frontmatter de skill (nombres `feature-development`, `change-management`,
`session-closure`, `ux-patterns`) con los nombres de antes de la
generalización del 2026-09-15, que los renombró a `protocolo-features`,
`protocolo-cambios`, `protocolo-cierre` y `protocolo-ux`. `lote-3` ya había
encontrado el caso del de patrones UX («es el precursor de `protocolo-ux`,
no una plantilla de `ux-patterns`») y lo dejó sin resolver porque el sitio lo
enlazaba. Al revisar los otros tres, el mismo patrón se repite en los cuatro.
Además, ninguno sigue el mecanismo que sí tienen los demás templates: no se
declaran bajo `artefactos.*` en `AI-FIRST.md`, y ningún check del detector
los lee. Y el contenido divergió: las skills incorporan Zonas Prohibidas y
`ADR.md`, formalizados el 2026-09-16, que los templates no tienen porque son
de un mes y medio antes. El template de `AGENTS.md`, reescrito el
2026-09-17, ya sólo instruye instalar las skills; no hay ningún flujo
vigente que pida copiar estos cuatro documentos a un proyecto.

**Decisión.** Se borran los cuatro. `skills/protocolo-*/SKILL.md` queda como
el único formato de los cuatro protocolos de la Parte III. El paquete pasa de
13 a 9 templates. El template del documento de cambio deja de nombrar al de
gestión de cambios como alternativa a la skill.

**Alternativas.** *Reescribirlos como prosa sin frontmatter de skill,
distinta del contenido de la skill*: es la lectura literal de
`skills/README.md` («protocolo = documento; skill = mismo procedimiento en
formato IA»), pero exige mantener dos versiones del mismo procedimiento
sincronizadas a mano para siempre —la entropía que este producto vende
medir— sin que ningún mecanismo del propio paquete lo vigile. *Dejarlos
como están, marcados obsoletos en una nota*: no evita que alguien los copie
igual, y no corrige el `name:` que colisiona con el nombre real de la skill.

**Consecuencias.** El sitio pierde 4 tarjetas de descarga en el apéndice y
ajusta 8 archivos que nombran los cuatro templates —capítulos de protocolos,
la guía de diseño, el capítulo de AGENTS.md, el glosario—; ninguno se tocó
desde acá. Un proyecto que instaló la versión anterior del paquete y copió
estos cuatro documentos los conserva sin problema: nada los borra
retroactivamente, sólo dejan de distribuirse en versiones nuevas.

## ADR-013 — El molde de un documento que pertenece a una sola skill vive dentro de ella, no en `templates/`

- **Fecha:** 2026-09-18
- **Estado:** aceptada. Supera la consecuencia de ADR-009 que dejaba la
  anatomía del documento de cambio en tres sitios «hasta que el protocolo se
  edite para apuntar al template».

**Contexto.** La skill `protocolo-cambios` repetía adentro la anatomía del
documento de cambio: 61 de sus 233 líneas, contra las 267 del template, que
era la versión completa. ADR-009 ya lo había anotado como deuda. Los cuatro
templates de protocolo retirados el mismo día (ADR-012) demostraron adónde
lleva esa forma: copias paralelas que divergen sin que nada las vigile. El
patrón alternativo ya existía en el paquete desde ADR-008: `ux-writer` lleva
cinco `references/` —su glosario se declara «plantilla con ejemplos»— e `i18n`
tres. El estándar Agent Skills contempla empaquetar plantillas y material de
referencia dentro de la skill, y desde que se instalan como carpeta en
`.agents/skills/`, una referencia viaja con la skill sin descarga aparte, que
era la razón por la que ADR-009 los quería separados.

**Decisión.** El molde del documento de cambio pasa a
`skills/protocolo-cambios/references/documento-de-cambio.md`. La skill dice
cuándo y con qué flujo, y apunta ahí para el qué. El paquete pasa de 9 a 8
templates. La regla general: **si un documento tiene exactamente una skill
dueña y es un artefacto por evento, su molde vive dentro de esa skill**.

**Lo que NO se mueve.** El documento producido sigue en el repo del proyecto:
cada cambio nace en `docs/changes/pending/CHG-XXX.md`, que es donde el check 3
lo lee y donde un humano lo revisa en el PR. Y los demás templates se quedan en
`templates/`, porque no cumplen la regla: la spec de módulo la mencionan seis
skills, arquitectura cuatro, y `AGENTS.md`, el PRD, la guía de diseño, las
cicatrices y el inventario de componentes son documentos permanentes que
`AI-FIRST.md` declara bajo `artefactos` y que el detector lee. Meterlos dentro
de una skill obligaría a elegir una dueña arbitraria y los escondería de quien
no instale esa skill.

**Alternativas.** *Dejar el template en `templates/` y que la skill lo nombre*:
conserva la tarjeta de descarga tal cual, pero mantiene dos archivos que se
editan por separado y ningún check vigila que digan lo mismo; es exactamente lo
que produjo los cuatro fósiles de ADR-012. *Mover también la spec de módulo*:
tiene seis skills lectoras y es un documento permanente del proyecto, no un
artefacto por evento; entraría en la misma trampa de dueño arbitrario.

**Consecuencias.** El sitio cambia la tarjeta del apéndice para que apunte al
archivo dentro de la skill, en la misma rama `prod`; sigue siendo descargable.
Quien instale la skill recibe el molde sin pedirlo. La regla queda escrita para
los moldes que aparezcan después: si nace un documento por evento con una sola
skill dueña, va adentro de ella.

## ADR-014 — Los nombres de las skills se quedan; lo que cambia es que la instalación no sobreescribe

- **Fecha:** 2026-09-18
- **Estado:** aceptada. Cierra el bloqueador compartido nº2 de `HANDOFF.md`,
  reformulándolo, y con él la restricción de diseño que ADR-003 dejaba abierta
  para el `init` completo.

**Contexto.** El bloqueador nº2 se enunció el 2026-09-16 como «las skills se
instalan con nombres genéricos —i18n, version-bump— y chocan en un proyecto que
ya tenga uno igual», y desde entonces figura como restricción de diseño del
`init` en ADR-003 y en la spec. Al medirlo contra un proyecto de prueba que ya
tenía su propia skill de internacionalización, el daño no resultó venir del
nombre sino del comando que el paquete enseñaba a correr. Un
`cp -r skills/* .agents/skills/` hace tres cosas, las tres en silencio y con
salida cero: sobreescribe el SKILL.md del proyecto, deja las referencias del
paquete mezcladas dentro de la carpeta del proyecto, y —si la carpeta de skills
de Claude Code ya existía como directorio real— anida el enlace simbólico un
nivel más abajo, donde no lo lee ninguna herramienta. Eso contradice de frente
lo que ADR-003 ya había decidido para `init` —«nunca sobreescribe», y por eso no
existe ni va a existir `--forzar`—: el README enseñaba justo lo que el ADR
prohíbe. La colisión de nombres propiamente dicha es el problema menor. El
estándar Agent Skills no define namespacing: el directorio es plano y el nombre
es la clave. Cada herramienta resuelve el empate por su cuenta —una gana por
precedencia y avisa del duplicado, otra muestra las dos en su selector—, lo que
es confuso pero no destruye nada.

**Decisión.** Los diez nombres se quedan como están. Lo que cambia es la
instalación: `skills/README.md` copia carpeta por carpeta y salta entera la que
ya existe, diciendo cuál saltó, en vez de fusionar; y el enlace de Claude Code
no se crea si hay algo en su sitio. Ante un nombre ocupado el adoptante tiene
tres salidas —quedarse con la suya, borrarla y reinstalar, o tener las dos—, y
sólo para la tercera existe el prefijo `ai-first-<nombre>`, con el `name:` del
frontmatter editado para que coincida con la carpeta. **El prefijo es la salida
al conflicto, no el nombre por defecto.** El `init` que instale skills hereda
esta política: verifica los destinos antes de escribir, no toca nada que ya
exista y reporta lo que saltó.

**Alternativas.** *Prefijar los diez en el origen*: da un namespace propio y
elimina la ambigüedad, pero mueve las diez rutas de SKILL.md que el sitio enlaza
—lo primero que `AGENTS.md` marca como coordinación obligada antes del merge—,
toca unas 160 menciones cruzadas en las skills y los templates, y le cobra un
nombre largo al 100 % de los adoptantes para cubrir a los pocos que tengan una
homónima. Además no arregla el `cp -r`: el día que exista una skill ajena que se
llame igual que una nuestra ya prefijada, se pisa igual. *Cambiar sólo el
comando a `cp -rn`*: una línea en vez de un bucle y protege el SKILL.md, pero
salta archivo por archivo y el conflicto es de skill, así que fusiona las
carpetas igual y las referencias del paquete terminan dentro de la skill del
proyecto —el segundo de los tres fallos queda intacto—.

**Consecuencias.** El `init` de skills deja de estar bloqueado por una decisión
de nombres, que era lo que lo frenaba desde ADR-003; lo que le queda por delante
es el esquema del manifiesto. No se mueve ninguna ruta, así que no hay nada que
coordinar con el sitio antes del merge, pero su apéndice de templates repite el
bloque de instalación desde ADR-008 y hay que avisarle que cambió. La spec
pierde el ítem de la colisión en su lista de lo que queda fuera. Un proyecto que
haya instalado con el comando anterior y perdido una skill no la recupera desde
acá: el daño se hizo al copiar y esto sólo impide que vuelva a pasar.

## ADR-015 — El registro de sesión es `docs/SESSION_LOG.md`: el paquete se alinea al manual y corrige las rutas de `protocolo-cierre`

- **Fecha:** 2026-09-18
- **Estado:** aceptada

**Contexto.** Al preparar la instalación de `protocolo-cierre` en este repo —el
paquete usando sus propias skills— aparecieron tres convenciones distintas para
el mismo documento. El manual publicado define el registro de sesión como un
archivo único bajo `docs`, con su formato de entrada y una regla de archivado
pasadas las ~50 entradas (Parte III, «Protocolo de cierre de sesión»), y el
capítulo «Gobierno del contexto» lo respalda citando un proyecto real de 626
sesiones. `skills/protocolo-cierre/SKILL.md` pedía ese mismo archivo pero en la
raíz, y lo mismo con el registro de cambios, que su hermana
`skills/protocolo-cambios/SKILL.md` sí escribe en la carpeta que el manual
define. Y dos proyectos reales —los dos portales de compliance— montaron una
tercera: un archivo por sesión bajo una carpeta `sessions`, con los cambios
nombrados por fecha y slug. Al medirla, esa tercera estaba vacía: las dos
carpetas contienen sólo su `README.md`, cero sesiones y cero cambios
registrados en ninguno de los dos repos. Andamiaje montado y nunca ejercido.

**Decisión.** El registro de sesión es un archivo único, `docs/SESSION_LOG.md`,
con la sesión más reciente arriba: la convención del manual, que es la que tiene
kilometraje. El paquete corrige las tres rutas de `protocolo-cierre`, que
escribía en la raíz:

```
SESSION_LOG.md   → docs/SESSION_LOG.md
CHANGE_LOG.md    → docs/changes/CHANGE_LOG.md
pending/         → docs/changes/pending/
```

y `skills/version-bump/SKILL.md` nombra el archivo en su Paso 3, donde antes
pedía «las últimas 2 entradas» sin decir de dónde. El defecto no era suyo: el
mismo documento se nombraba con y sin el prefijo dentro de la misma colección
—la arquitectura, las notas técnicas, la guía de diseño, el registro de cambios
y el PRD—, así que la corrección se extiende a `skills/protocolo-cambios/SKILL.md`,
su molde del CHG y `templates/AGENTS_MD_TEMPLATE.md`. La forma canónica es con
`docs/`; el título de un template y el árbol de carpetas no lo llevan, porque
ahí el nombre no es una ruta. Este repo abre el suyo;
`HANDOFF.md` se queda con el estado, los pendientes y los bloqueadores que
comparte con el sitio, que es otra cosa que la cronología. Los dos portales de
compliance se alinean el día que se los toque.

**Alternativas.** *Adoptar la convención de compliance*, un archivo por sesión,
se defiende sola: diffs más limpios, crece sin necesitar archivado, y ya estaba
montada en dos repos. Pero obligaba a cambiar dos capítulos publicados del sitio
y dos skills publicadas para adoptar una convención con cero archivos detrás,
mientras la del manual lleva 626 sesiones de uso real. *Dejar las rutas como
estaban y mapear el registro de sesión a `HANDOFF.md` sólo en este repo*: cero
cambios en skills publicadas, pero deja el defecto en pie para todo el que
instale —el skill escribe en la raíz lo que el manual pone bajo `docs`— e
inventa para este repo una equivalencia que ningún otro proyecto tiene.

**Consecuencias.** No se mueve ninguna ruta de SKILL.md ni de `templates/`:
ningún enlace publicado se rompe. Pero `protocolo-cierre` es una de las tres que
asumen el capítulo «Gobierno del contexto», y `protocolo-cambios` es otra, así
que hay que avisar al sitio antes del merge a `prod`; el aviso es liviano, porque el skill pasa a coincidir
con el capítulo y el capítulo no cambia. Quedan dos divergencias abiertas entre
el skill y el manual, ninguna de ruta: el skill no implementa el archivado que
el manual define, y numera las entradas («sesión N») donde el manual sólo las
fecha. El registro de sesión **no** entra en `artefactos` de `AI-FIRST.md`: es
cronología que sólo crece y que nombra lo ya retirado, y el check 4 lo cobraría
como un P2 por cada ruta muerta, para siempre.

## ADR-016 — La prosa se muda a `docs/`: el handoff, el registro de decisiones y la spec dejan la raíz

- **Fecha:** 2026-09-18
- **Estado:** aceptada. Cierra el domicilio del registro de decisiones que
  ADR-015 dejó abierto.

**Contexto.** La raíz cargaba cuatro documentos de prosa junto a los
manifiestos. Hasta ayer no había alternativa, porque no existía carpeta `docs/`;
ADR-015 la creó para el registro de sesión y con ella quedó a la vista que este
repo era el único que no seguía el layout que su propio producto escribe. Los
dos templates de contexto ya dicen `docs/ADR.md`, el árbol de
`templates/CLAUDE_MD_TEMPLATE.md` pone el registro de decisiones bajo `docs/`,
`src/init.ts` lo escribe ahí en cuanto el proyecto tiene la carpeta, y los dos
portales de compliance lo hacen así. El paquete predicaba una cosa y practicaba
otra.

**Decisión.** A `docs/` se mudan el handoff, este registro y la spec del
detector. En la raíz se queda sólo lo que una herramienta busca ahí sin
negociar: los manifiestos y los dotfiles, `README.md`, la licencia, `AGENTS.md`,
`CLAUDE.md` y `AI-FIRST.md` —que `src/ai-first-md.ts` fija por nombre—, más los
directorios de primer nivel, con `skills/` y `templates/` entre ellos por ser
superficie publicada. El contrato absorbe el cambio sin tocar código:
`artefactos` y `superficies_de_decision` declaran las rutas nuevas. En el mismo
barrido, las 29 menciones sueltas del registro de decisiones en la prosa de las
skills y los templates pasan a la forma canónica.

**Alternativas.** *Dejarlos en la raíz*: cero movimiento y cero riesgo, pero
conserva la contradicción entre lo que el paquete enseña y lo que hace, que es
justamente el argumento de venta. *Mudar también `AI-FIRST.md`*: coherente a la
vista e imposible de hecho, porque es el contrato que el detector abre por
nombre en la raíz, igual que el manifiesto de npm.

**Consecuencias.** Ningún enlace publicado se rompe: los 18 del sitio apuntan
sólo a las dos carpetas del producto, verificado antes de mover. Las filas
viejas de este registro siguen nombrando los tres documentos sin el prefijo, y
no se reescriben —el registro se agrega, no se edita—; el check 4 las resuelve
igual, porque un nombre sin carpeta lo busca en todo el repo. Lo que sí se
pierde es cualquier enlace externo a esos tres archivos en la raíz.

## ADR-017 — `init` salta lo que ya existe y sigue, en vez de detenerse

- **Fecha:** 2026-09-18
- **Estado:** aceptada. Supera la parte de ADR-003 que dice «si `AI-FIRST.md`
  existe, se detiene». El resto de ADR-003 —nunca sobreescribe, no hay
  `--forzar`— queda entero.

**Contexto.** ADR-003 hizo del `init` mínimo un comando de una sola corrida:
escribe `AI-FIRST.md` y un ADR vacío, y si el primero ya existe termina con
error. Tenía sentido cuando `init` sólo escribía esos dos archivos. La spec
del `init` completo, validada el 2026-09-18 (`docs/specs/init-completo.md`),
lo convierte en un comando que se corre sobre repos ya configurados para
añadir lo que falte —skills, la carpeta de cambios, el registro de sesión—, y
su primer criterio de aceptación es correrlo sobre este mismo repo, que ya
tiene `AI-FIRST.md`. Con el error en pie, ese criterio es imposible.

**Decisión.** `init` reporta cada archivo en uno de dos estados, escrito o
saltado, y sale con 0 en ambos casos. `AI-FIRST.md` existente se salta y se
dice; el ADR ya se saltaba y ahora también se dice. Nada se sobreescribe,
nunca: la regla de oro de ADR-003 no cambia, cambia sólo que saltar deja de
ser un error. `src/cli.ts` deja de prometer el error en su ayuda.

**Alternativas.** *Una flag para continuar*: conserva el error por defecto,
pero el caso «ya tengo `AI-FIRST.md`» pasa a ser el normal, no la excepción,
en cuanto `init` instale skills; una flag para el caso normal es una flag mal
puesta. *Un subcomando aparte para lo nuevo*: ADR-003 ya decidió que el
completo se monta encima del mínimo, y dos comandos que hacen mitades de lo
mismo obligan a explicar cuál corre cuándo.

**Consecuencias.** Quien corriera `init` esperando el error para detectar un
repo ya configurado pierde esa señal; la gana en el reporte, que es más
legible. Cambia una prueba que fijaba el error. Es el cambio previo al `init`
completo y va solo, por `protocolo-cambios` (CHG-001), para no mezclar en un
mismo paso el feature y la modificación de lo que ya existe.

## ADR-018 — El `init` completo: mismo comando, copia por defecto, cinco skills, un bloque con marcas en `AGENTS.md` y `docs/` siempre

- **Fecha:** 2026-09-18
- **Estado:** aceptada. Completa ADR-003 («init mínimo antes que completo»):
  el completo se monta encima del mínimo, como ADR-003 dijo que pasaría.
  Hereda la política de ADR-014 (saltar entera la skill que ya existe) y la de
  ADR-017 (saltar no es error).

**Contexto.** Configurar un repo para la metodología eran seis pasos a mano
siguiendo `skills/README.md`, y este repo los hizo así el 2026-09-18. Su regla
dice que si el `init` completo no configura este repo, no está terminado. La
spec `docs/specs/init-completo.md`, validada por Charlie, deja fuera la
entrevista y la reescritura de skills —piden el manifiesto que ADR-003 dejó
pendiente— y resuelve todo lo demás con una versión que **nunca reescribe**:
crea lo que falta y reporta lo que ya estaba. Cinco decisiones de diseño
tenían alternativas reales.

**Decisión.**

1. *El mismo `init`, incremental.* Un solo comando que se corre las veces que
   haga falta y añade lo que falte: `AI-FIRST.md`, el ADR, las skills, la
   estructura de `docs/`, el bloque de `AGENTS.md`. Cada ítem sale como
   escrito, saltado o sugerido. Salida 0; 2 sólo ante error de uso, y los
   errores de uso —una skill que el paquete no trae, una marca sin pareja— se
   detectan antes de escribir nada.
2. *Copia por defecto, `--enlazar` a pedido.* El adoptante recibe archivos
   suyos; el enlace simbólico relativo es para este repo y para quien
   vendoriza las skills en un monorepo. La fuente es la carpeta `skills/` del
   propio paquete, resuelta desde el módulo con `import.meta.url`.
3. *Cinco skills por defecto*, las que no tienen interfaz: `protocolo-features`,
   `protocolo-cambios`, `protocolo-cierre`, `version-bump`, `test-fix`.
   `--skills todas` instala las diez; `--skills a,b,c` elige.
4. *Un bloque delimitado en `AGENTS.md`*, entre `<!-- ai-first:inicio -->` y
   `<!-- ai-first:fin -->`, con qué skills quedaron instaladas, cuándo se
   invoca cada una y la tabla de equivalencias del manual. Tres casos y nada
   más: sin archivo, lo crea con el bloque y el puntero al template; sin
   marcas, lo añade al final; con marcas, reemplaza sólo el interior. Fuera de
   las marcas no toca una letra; con una sola marca no escribe. Es el patrón
   de `nvm`, `husky` o `direnv` con el `.zshrc`, y la analogía de Charlie: el
   `/init` de Claude Code tampoco reemplaza el archivo, lo mejora; esto es lo
   mismo hecho determinista. Las marcas son el manifiesto de ese archivo.
5. *`docs/` se crea si no existe, y el ADR va adentro.* `init` crea
   `docs/SESSION_LOG.md`, `docs/changes/CHANGE_LOG.md` y
   `docs/changes/pending/`, así que la carpeta existe al terminar y el ADR
   nuevo va siempre a `docs/ADR.md`, donde ADR-016 lo puso en este repo. El
   `AI-FIRST.md` que escribe declara `alcance.spec` apuntando a la carpeta
   recién creada, y `agents: AGENTS.md`, porque acaba de crearlo.

**Alternativas.** *Un subcomando aparte* para lo nuevo: dos comandos que hacen
mitades de lo mismo obligan a explicar cuál corre cuándo, y ADR-017 ya lo
descartó. *Detectar «estoy en el repo del paquete» y enlazar solo*: es magia
que falla en silencio en el primer monorepo; una flag se lee. *Instalar las
diez*: `skills/README.md` dice «no instales las diez el primer día», y cinco de
ellas no aplican a un proyecto sin interfaz. *Imprimir el bloque para pegarlo a
mano, o no tocar `AGENTS.md`*: deja el último paso manual, que es justo el que
la regla de este repo prohíbe; y *reconocer la prosa existente para envolverla*
es indecidible en código. *Dejar el ADR en la raíz* cuando no había `docs/`:
contradice lo que el propio `init` acaba de crear un directorio más abajo.

**Consecuencias.** La prueba del repo vacío cambia: el ADR va a `docs/`. El
bloque de instalación de `skills/README.md` pasa a ser la alternativa manual y
el comando el camino principal; el apéndice del sitio repite ese bloque, así que
hay que avisarle. El enlace relativo se calcula entre rutas reales, no
textuales: en macOS `/var` es un enlace a `/private/var` y la cuenta textual de
`..` deja el enlace roto; lo cazó la prueba del criterio 3. El bloque de
`AGENTS.md` lista lo que de verdad hay en `.agents/skills/` que sea del paquete,
no lo que se pidió instalar: así una corrida con `--skills` distinta no borra
del bloque lo instalado antes. En este repo, la sección «Cómo se trabaja acá»
de `AGENTS.md` ganó las marcas a mano, una sola vez: la prosa propia del repo
quedó fuera y lo genérico adentro. Lo que queda para otra spec es la entrevista
(hueco 2), que escribirá dentro de las mismas marcas cuando exista el
manifiesto.

---

## ADR-019 — El arranque de un proyecto entra al paquete: el comando prepara y verifica, una skill define y escribe

- **Fecha:** 2026-09-21
- **Estado:** aceptada. Cierra el hueco 2 del mapa, que ADR-018 dejó fuera del
  `init` completo, y lo hace sin el manifiesto que se creía necesario.

**Contexto.** El ciclo que la metodología vende empieza antes del repo: definir
de qué trata el proyecto, decidir el stack, escribir el PRD, la arquitectura y
las specs. Esa mitad vivía fuera del paquete, en las instrucciones de un
proyecto de Claude Desktop que producían los artefactos en un `.zip` para
pegarlos a mano en el repo recién creado. El prompt está transcrito en
`docs/specs/arranque-de-proyecto.md`.

Tres costos. Se desincroniza: el prompt pedía visitar el sitio de la metodología
en cada corrida «porque suele haber actualizaciones», cuando las skills y los
templates que la definen viajan dentro del paquete. No se versiona: unas
instrucciones de Desktop no tienen tag, ni ADR, ni prueba. Y obliga al trasvase
manual que ADR-014 demostró que se hace mal. Un cuarto, más callado: los ocho
`templates/` no los consumía nadie, y son exactamente los artefactos de esa fase.

La tensión que había que resolver: un PRD lo escribe un modelo, y el paquete
corre sin modelo, sin llave y sin red, que es lo que sostiene el argumento de
venta del detector.

**Decisión.**

1. *La frontera.* **El comando prepara el terreno y verifica; la skill define y
   escribe.** El modelo que ejecuta la skill es el que el adoptante ya tiene
   abierto, así que el paquete entrega el procedimiento y nunca la inferencia.
   Ninguna llamada a un modelo entra al código, ni en `init` ni en `audit`.
2. *La skill `protocolo-arranque`*, la undécima. Dos fases, como el prompt de
   origen: descubrimiento con benchmark, cuestionamiento sin límite y postura
   propositiva; y generación de artefactos desde los templates del paquete,
   **en el repo y en su ruta definitiva**. Se instala sólo cuando se entrevista:
   se usa una vez, al principio.
3. *El perfil*, dos ejes en el frontmatter de `AI-FIRST.md` —`producto` y
   `repositorio`—, opcional y dentro del formato 1. Decide qué skills se
   instalan y qué artefactos pide el arranque. Un valor desconocido es error de
   formato: adivinarlo mal es peor que no tenerlo.
4. *La entrevista de `init`.* Un proyecto sin documentación se entrevista; uno
   que ya la trae recibe la oferta y por defecto se salta. Sin terminal
   interactiva no se entrevista nunca. Es el caso de quien llega con su PRD y
   sus specs ya escritas: las skills se instalan igual, y preguntarle de nuevo
   lo que ya decidió es hacerle perder el tiempo.

**Alternativas.** *Que el CLI llamara a la API de Claude*: rompe la regla que
sostiene el detector y obliga al adoptante a tener una llave para configurar un
repo. *Dejar el arranque fuera, como está*: es lo que causó los cuatro costos.
*Un comando `ai-first arranque` que imprimiera el prompt para pegarlo*: un paso
manual más, y el prompt sin acceso al repo no puede leer lo que ya hay.
*Generar skills nuevas por proyecto*, como pedía el prompt de origen: ya hay
diez; lo que faltaba era adaptarlas.

**Consecuencias.** El paquete pasa de diez a once skills. No se mueve ninguna
ruta, así que los enlaces publicados del sitio siguen sirviendo, pero su
catálogo dice diez: hay que avisarle. `templates/` deja de ser «manual» y gana
su consumidor; la ayuda de `init` ya no dice lo contrario. Un proyecto sin
interfaz deja de recibir skills de UX que no aplican, y una landing deja de
recibir `information-architecture`. La instalación por defecto ya no es fija:
con entrevista la decide el perfil, sin entrevista siguen siendo las cinco.

---

## ADR-020 — Las marcas son el manifiesto también dentro de cada `SKILL.md`, y una skill enlazada no se adapta nunca

- **Fecha:** 2026-09-21
- **Estado:** aceptada. Extiende el punto 4 de ADR-018 de `AGENTS.md` a
  cualquier archivo que la herramienta mantenga. Supera lo que ADR-003 y la
  spec del `init` completo daban por hecho: que reescribir una skill instalada
  exigía `.ai-first/manifest.json`.

**Contexto.** La entrevista tiene que escribir lo que responde el adoptante
dentro de la sección «Adaptación a tu proyecto» de cada skill instalada. Hasta
hoy se creía que eso obligaba a construir el manifiesto con huellas, para
distinguir un archivo intacto de uno que el equipo editó. Pero el problema ya
estaba resuelto un nivel más abajo: en `AGENTS.md`, las marcas dicen qué
escribió la herramienta y qué escribió el humano, sin huella ninguna.

**Decisión.**

1. *El mismo mecanismo, generalizado.* `ponerBloqueMarcado` reemplaza sólo lo
   que hay entre `<!-- ai-first:inicio -->` y `<!-- ai-first:fin -->`, en
   `AGENTS.md` y en cada `SKILL.md`. Lo único que cambia es dónde entra la
   primera vez: en una skill, bajo su encabezado de adaptación; en el resto, al
   final. Una marca sin pareja no escribe nada y se reporta, como ya era.
2. *`.ai-first/manifest.json` no se construye.* Sigue haciendo falta el día que
   exista un comando `update` que actualice archivos sin marcas.
3. *Una skill instalada como enlace no se adapta nunca.* Se reporta como
   sugerida, con la razón. Escribir ahí modificaría la carpeta `skills/` del
   paquete, que es la fuente de verdad publicada (ADR-006) y la que el sitio
   sirve por raw link.

**Alternativas.** *Construir el manifiesto con huellas*: mucho más trabajo para
resolver lo que las marcas ya resuelven, y un segundo lugar donde se registra la
verdad sobre los mismos archivos. *Escribir la adaptación en un
archivo de adaptación aparte, fuera de las skills*: el agente tendría que leer dos archivos para saber
cómo trabajar, y la adaptación perdería el contexto de la skill que adapta.
*Adaptar también las enlazadas y confiar en que nadie corra la entrevista en el
repo del paquete*: el cambio viajaría al siguiente que instalara el paquete.

**Consecuencias.** El hueco 2 se cierra sin el bloqueador que lo detenía. Quien
usa `--enlazar` —este repo, y quien vendoriza en un monorepo— recibe las skills
sin adaptar y el reporte se lo dice: es el precio correcto de compartir la
fuente. Cuando exista `update`, el manifiesto vuelve a la mesa sólo para los
archivos que no tengan marcas.

---

## ADR-021 — `init` sobre una carpeta que no es repositorio la inicializa, en vez de tratarlo como error de uso

- **Fecha:** 2026-09-21
- **Estado:** aceptada. Supera la regla de ADR-003 por la que no ser repo git
  era error de uso con salida 2.

**Contexto.** «Un proyecto que todavía no ha sido creado» era el caso que la
entrevista tenía que cubrir, y el comando lo rechazaba: en una carpeta sin
`.git`, `init` salía con 2 y pedía correr `git init` a mano. El adoptante tenía
que recordar un comando previo para poder correr el comando que configura el
repo.

**Decisión.** Si la carpeta existe y no es repositorio, `init` corre `git init`
y sigue; el reporte lo dice como un ítem escrito más. Si la carpeta no existe,
sigue siendo error de uso. No se crean commits ni se toca la configuración del
usuario: `git init` y nada más.

**Alternativas.** *Preguntar antes de inicializar*: un paso más en el caso más
común, y la respuesta obvia. *Seguir exigiendo repo git y mejorar el mensaje*:
deja el primer paso manual, que es justo lo que este comando existe para
eliminar. *Crear también el primer commit*: el commit es del adoptante, y qué
entra en él es una decisión suya.

**Consecuencias.** `mkdir proyecto && cd proyecto && npx @falcux/ai-first init`
basta para tener un repo gobernado. La prueba que verificaba el error de uso se
reemplazó por una que verifica la inicialización, y otra que comprueba que una
carpeta inexistente sigue fallando. Es lo único que `git init` escribe en el
repo del adoptante sin que lo haya pedido explícitamente, y por eso se reporta.

## ADR-022 — La tercera capa se entrega como hook de git y flujo de integración continua, no como hook de agente

- **Fecha:** 2026-09-22
- **Estado:** aceptada. Supera el enunciado del hueco 5 de `docs/HANDOFF.md`
  —«falta el hook de PostToolUse y Stop»— y precisa lo que la spec del paquete
  §8 apartó como «adaptadores por herramienta».

**Contexto.** El detector existe desde la `0.1.0` y nadie lo corre solo: se
invoca a mano o no se invoca. Este repo es la prueba, con CHG-003 y CHG-005
pasando por debajo de todas las corridas en 0 porque nadie las corrió buscando
eso. El hueco 5 reclamaba esa automatización, pero con el vocabulario de una
sola herramienta, y ese enunciado no sobrevivió a dos comprobaciones hechas el
2026-09-22. La primera: **los hooks quedaron fuera del estándar Agent Skills**.
`.agents/skills/` lo leen Codex, Cursor, OpenCode y Kimi Code (ADR-008); los
hooks no los lee nadie más que quien los define, y cada herramienta trae el
suyo con formato propio —settings.json, config.toml, hooks.json, o plugins de
TypeScript en el caso de OpenCode, que no admite hooks de shell—. La segunda:
**`PostToolUse` corre sin commit**, y en el modo de árbol de trabajo la
anotación `ai-first: sin-decision` no se lee, porque vive en el cuerpo del
commit y sólo existe con `--base`. Habría dado P1 en cada edición de una
superficie de decisión sin dejar forma de anotarla.

**Decisión.** `init` escribe un hook de **`pre-push`** que corre `audit --base`
con el sha remoto que git le entrega, **sin `--estricto`** —sólo un P0
interrumpe—, y un flujo de integración continua que lo corre **con
`--estricto`** en cada pull request. El hook va a `.githooks/` y `init` apunta
`core.hooksPath` ahí; `--hook-local` lo pone en `.git/hooks/` y no toca la
configuración. El hook de agente queda para después, como adaptador opcional y
sobre **`Stop`**, que es el «hook de cierre» que la spec del paquete ya nombra.

**Alternativas.** *Los adaptadores por herramienta, empezando por Claude Code*:
convierte una promesa de metodología en una función de una herramienta, cuando
el paquete vende once skills para cinco agentes; y son cuatro formatos que
mantener. *`pre-commit` en vez de `pre-push`*: arrastra el mismo defecto que
`PostToolUse` —el commit todavía no existe— e interrumpe en el momento de menor
tolerancia. *`.git/hooks/` como único destino*: no viaja en el clon, no se ve en
un diff y gobierna sólo la máquina donde se escribió; queda como opción tras
pedirlo Charlie, no como valor por defecto. *No entregar nada y dejarlo al
adoptante*: es el estado que este repo ya demostró que no funciona.

**Consecuencias.** El paquete gana una carpeta `plantillas/`, declarada en
`files`, con los dos archivos como archivos y no como cadenas incrustadas: se
leen y se prueban sueltos. `src/git.ts` gana `hooksPathConfigurado` y
`fijarHooksPath`, y con ellas `init` toca por primera vez la configuración del
repo —nunca la global— y sólo cuando estaba vacía: una configuración ajena se
reporta como sugerida, que es ADR-003 aplicado a algo que no es un archivo.
Este repo adoptó su propio hook el mismo día, y al hacerlo apareció el límite
de la plantilla: el repo del paquete **es** el paquete, así que su hook y su
flujo tienen que correr el detector de `dist/` y no el de la versión publicada,
que sería la anterior a los cambios del PR. Los dos archivos de este repo
llevan esa diferencia anotada; `init` no los volverá a tocar porque nunca
sobreescribe.

## ADR-023 — Las rutas se leen con dos varas: laxa donde excusan, estricta donde acusan

- **Fecha:** 2026-09-23
- **Estado:** aceptada. Precisa la convención que el check 3 adoptó cuando la
  spec del paquete §6 dejó abierto cómo «listar archivos».

**Contexto.** CHG-007 borró el .npmrc, lo declaró entre acentos graves en la
sección «Archivos afectados» de su documento de cambio, y el check 3 lo cobró
igual como fuera de alcance. La causa estaba en `pareceRuta`, que cierra
exigiendo «/» o una extensión de una lista: un archivo de configuración en la
raíz no cumple ninguna de las dos. Los archivos tocados los da git, que sí los
ve, así que el resultado era un P1 **imposible de apagar haciendo lo correcto**
—no hay forma de declarar lo indeclarable—, el mismo defecto por el que ADR-022
descartó `PostToolUse`. En este repo afecta a `LICENSE`, `.gitignore` y
`.nvmrc`.

**Decisión.** `pareceRuta` gana `permitirSinExtension`, que acepta además un
token con forma de nombre de archivo sin barra ni extensión, y **sólo la activa
el check 3**. Los dos checks siguen leyendo las mismas referencias, con reglas
distintas, porque hacen cosas opuestas con ellas: en el check 3 una ruta
declarada **excusa** un archivo tocado, y tiene que coincidir exacto con él para
lograrlo; en el check 4 una ruta mencionada que no existe **acusa**, con un P2.
Un filtro puede permitirse ser laxo donde excusa y tiene que ser estricto donde
acusa.

**Alternativas.** *Una lista blanca de nombres conocidos aplicada a los dos
checks*: descartada por lo que se midió en este repo, no por principio. Con ella,
`docs/ADR.md` pasaría a dar dos P2 —cita el `.zshrc` de una máquina en una
analogía, y el .npmrc que CHG-007 acaba de borrar— sobre un documento **que se
agrega y no se edita**, así que el hallazgo no tendría arreglo. Además la lista
envejece: cada proyecto trae sus archivos de configuración. *Una regla general
de dotfiles en los dos checks*: lo mismo y peor, porque `.length` o `.trim` en
prosa técnica entrarían.

**Consecuencias.** El check 4 no cambia en nada, y hay una prueba que lo fija
con el caso del `.zshrc`. Un documento de cambio ya puede declarar el .npmrc, un
LICENSE o un Makefile. El precio es que el check 3 acepta como «declarado» algún
token que no es una ruta —`prod` entre acentos graves, por ejemplo—; es
inofensivo, porque para excusar algo tiene que coincidir exactamente con una
ruta que git reporta como tocada. Es la primera vez que las dos verificaciones
dejan de compartir el mismo filtro, y la razón es que nunca hicieron lo mismo
con él.
