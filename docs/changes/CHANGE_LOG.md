# Registro de cambios

> Resumen permanente de cada cambio cerrado con `protocolo-cambios`: fecha, tipo,
> archivos, resumen y lecciones. El documento CHG-XXX vive en `pending/` mientras
> el cambio está en curso y se elimina al cerrarlo; acá queda su resumen.
>
> No confundir con el `CHANGELOG.md` de la raíz, que dice qué cambió en cada
> versión publicada del paquete, para quien lo instala. Existe desde la 0.4.0.

---

## CHG-001 — `init` salta lo que ya existe y sigue, en vez de detenerse

- **Fecha:** 2026-09-18 (abierto y cerrado el mismo día)
- **Tipo:** cambio de requerimiento, flujo corto
- **Decisión:** ADR-017, que supera la parte de ADR-003 que decía «si
  `AI-FIRST.md` existe, se detiene»
- **Archivos:** `src/init.ts`, `src/cli.ts`, `test/init.test.ts`

**Resumen.** `iniciar` ya no lanza cuando `AI-FIRST.md` existe: el resultado
gana `saltados` junto a `escritos`, y ahí van tanto `AI-FIRST.md` como el ADR
que ya estaba —que antes se saltaba sin decirlo—. El CLI imprime una línea por
archivo, «escrito» o «saltado (ya existe)», y sale con 0. Su ayuda deja de
prometer el error. Nunca sobreescribir sigue entero. Era el prerrequisito del
`init` completo (`docs/specs/init-completo.md`), que tiene que poder correr
sobre un repo ya configurado.

**Pruebas.** La que fijaba el error pasa a comprobar que salta, que
`AI-FIRST.md` no cambia ni un byte y que el ADR que falta sí se escribe. Una
nueva cubre el repo con los dos archivos presentes: nada escrito, dos saltados,
sin error. La del ADR existente comprueba que aparece en `saltados`. Suite en
61 pruebas.

**Lecciones.** El check 2 compara el árbol de trabajo contra HEAD: si la fila
del ADR entra en un commit y el código en el siguiente, el `audit:self` previo
al segundo commit da P1 aunque la decisión esté escrita. Se verifica con
`--base` sobre un rango que incluya los dos, o se meten fila y código en el
mismo commit.

## CHG-002 — La versión sale del README a mano y entra por badge; `version-bump` lo enseña

- **Fecha:** 2026-09-18 (abierto y cerrado el mismo día)
- **Tipo:** cambio de requerimiento, flujo completo por contar tres archivos,
  sin schema ni decisión de ADR
- **Archivos:** `README.md`, `skills/version-bump/SKILL.md`, `docs/HANDOFF.md`

**Resumen.** El README dejó de escribir el número de versión: la cabecera
lleva un badge de shields.io que lee npm, y la tabla «Qué hay» clasifica por
estado —publicado o sin escribir— sin nombrar versiones. La skill
`version-bump` gana en «Mostrar la versión» la regla de que el README lleva
badge y no número, y que el detalle de cada versión va al CHANGELOG. El handoff
registra la salida de la `0.2.0`, que no tenía.

**Por qué.** El número a mano mintió dos veces en dos días: «publicado en
0.1.0» tres versiones después (sesión 2), y «la última es la 0.1.3» con la
`0.2.0` ya en npm y todo lo que decía «en `dev`» viajando en ese tarball. Los
dos repos de compliance no llevan versión en el README; npm la muestra del
manifiesto; los paquetes conocidos usan badge.

**Lecciones.** Toda copia a mano de un dato que vive en otro sitio se
desactualiza; la solución no es acordarse, es no copiarlo. Y el shasum del
tarball publicado con `pnpm publish` no coincide con el de `npm pack` local
aunque el contenido sea idéntico: pnpm normaliza el `package.json`. Se compara
desempaquetando, no por shasum.

## CHG-003 — El nombre de la metodología queda en «Falcux AI-First» en todo el paquete

- **Fecha:** 2026-09-21 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo por contar ocho archivos, sin schema ni
  decisión de ADR: la decisión ya estaba tomada y esto la aplica
- **Archivos:** los cinco `SKILL.md` que citan el manual —`protocolo-features`,
  `protocolo-cambios`, `protocolo-cierre`, `protocolo-ux`, `protocolo-arranque`—,
  `skills/README.md`, `README.md`, `docs/HANDOFF.md` y
  `docs/specs/arranque-de-proyecto.md`

**Resumen.** El renombre a «Falcux AI-First» estaba decidido y registrado en la
sección «Naming» del handoff desde antes del primer publish, pero nunca se
aplicó a los archivos que se distribuyen. El paquete publicado en npm enseñaba
el nombre que el propio proyecto había abandonado, y tres variantes circulaban a
la vez: nueve menciones de «Blueprint AI-First», cuatro de «Falcux AI-First» y
tres de «AI-First Blueprint». Lo encontró Charlie leyendo la skill
`protocolo-arranque` recién escrita, que heredó la fórmula de las otras cuatro.

Ahora las cinco skills cierran con «Capítulo de referencia: Falcux AI-First», y
los dos README y la cláusula de marcas dicen lo mismo. Ninguna ruta se movió, así
que ningún enlace publicado se rompe.

**Lo que a propósito no cambió.** La transcripción del prompt de origen en
`docs/specs/arranque-de-proyecto.md` conserva «AI-First Blueprint» porque es una
cita literal de un documento que existió con ese nombre; ganó una nota que
aclara cuál es el vigente. La línea del handoff que registra el renombre también
lo conserva, porque su trabajo es nombrarlo.

**Lecciones.**

1. **El detector no vigila nombres propios.** El check 4 comprueba que las rutas
   mencionadas existan, no que los términos sean los vigentes, así que un
   renombre a medias sobrevive a un `audit:self` en 0. Vigilarlo pediría una
   lista de términos vigentes en el contrato de `AI-FIRST.md`: es un feature, no
   un cambio, y queda anotado en el handoff.
2. **Una decisión registrada no es una decisión aplicada.** El handoff decía el
   nombre correcto desde el principio; nadie volvió a leerlo al escribir las
   skills. Un renombre necesita su propio recuento a cero, no sólo su fila.
3. **La fórmula copiada propaga el error.** La skill nueva heredó «Blueprint
   AI-First» de las cuatro anteriores sin que nadie lo notara al escribirla. Lo
   que se copia entre archivos hermanos hay que verificarlo contra la fuente, no
   contra el hermano.

## CHG-004 — La entrada del CHANGELOG se fecha en el commit del bump, no después del publish

- **Fecha:** 2026-09-21 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo por contar tres archivos, sin schema ni
  decisión de ADR
- **Archivos:** `CHANGELOG.md`, `skills/version-bump/SKILL.md`, `docs/HANDOFF.md`

**Resumen.** La cabecera del CHANGELOG pedía fechar cada versión «el día que
salió a npm, no el del commit». Es imposible de cumplir: el tarball se construye
en el publish con lo que ya hay en disco, así que la fecha del publish nunca
llega dentro del artefacto que se publica. En la `0.4.0` se perdió esa carrera y
el paquete en npm dice que la `0.4.0` no está publicada. Ahora la entrada se
fecha en el mismo commit que sube el número del manifiesto, y `version-bump` lo
enseña en su Paso 5, que es donde se aplica el bump.

**Quién lo encontró.** La sesión del sitio, al verificar el aviso de la versión.
No el detector, ni esta sesión, ni el publish.

**Lo que no se tocó.** La entrada de la `0.4.0` ya publicada: lo distribuido es
inmutable, y en `dev` la fecha ya es correcta desde `eee35c3`. Llegará al
registro con la versión siguiente. Si sale una `0.4.1` sólo por esto es decisión
de Charlie, con la `0.2.1` como precedente a favor y el hecho de que no afecta a
ningún comportamiento como argumento en contra.

**Lecciones.**

1. **Ningún texto que describa el publish puede escribirse después del publish.**
   Es la tercera vez que este patrón muerde: la `0.1.2` con la instalación, la
   `0.2.1` con el número del README y ahora el CHANGELOG. La forma de la regla
   es siempre la misma: prosa que afirma un estado que cambia más tarde que
   ella. Lo que quede dentro del tarball tiene que ser cierto en el momento de
   empaquetar.
2. **Una regla que nadie puede cumplir se rompe sola y en silencio.** La
   cabecera lo exigía por escrito y se incumplió en su primera aplicación, sin
   que nada avisara.
3. **El verificador de fuera encuentra lo que el de dentro no busca.** El aviso
   al sitio se manda para que actualicen su inventario; de paso leyeron el
   tarball y hallaron esto. Vale la pena que el aviso siga siendo detallado.

---

## CHG-005 — El handoff describía como abiertos dos huecos cerrados, y contaba diez skills donde hay once

- **Fecha:** 2026-09-22 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo corto, un archivo, sin schema ni decisión de ADR
- **Archivos:** `docs/HANDOFF.md`

**Resumen.** La sección «Los 5 huecos a cerrar» describía el hueco 3 en futuro
—«Construir el detector de entropía»— y cerraba el 4 con «Falta el código»,
cuando los dos están hechos y publicados desde la `0.1.0`: `src/verificaciones/`
tiene los cinco checks y `src/ai-first-md.ts` lee el contrato. El párrafo de
apertura contaba diez skills, que fueron diez hasta que `protocolo-arranque`
llegó con la `0.4.0`. Ahora los cuatro huecos cerrados se leen como cerrados y
sólo el 5, los hooks, sigue abierto.

**Quién lo encontró.** Esta sesión, al responder qué estado tenía el proyecto.
Salió de contrastar la lista con lo que el detector demuestra al correr, no de
leerla.

**Lo que no se tocó.** Las dos menciones de «10 skills» de las líneas 339 y 456:
están dentro de entradas fechadas del 2026-09-18 que narran qué se contó ese
día, y ese día eran diez. Es la misma regla que en CHG-003 dejó viva la
transcripción del prompt: el dato viejo en pasado es registro, no error.

**Lecciones.**

1. **El mismo documento se contradecía y nadie lo vio.** La línea 871 dice
   «Sólo el 5» desde el cierre de la sesión 7, mientras la lista de arriba
   seguía pidiendo construir el detector. Un archivo que crece por el final
   deja de ser coherente por el medio, y es el que este repo manda leer al
   empezar.
2. **Cuarta vez del mismo patrón**, después de la `0.1.2`, la `0.2.1` y
   CHG-004: prosa que afirma un estado que cambia más tarde que ella. Acá la
   variante es de estado interno y no de publicación, lo que sugiere que la
   regla no es sobre el publish sino sobre cualquier texto que describa algo
   que todavía se está moviendo.
3. **Cerrar un hueco incluye tachar el hueco.** Los huecos 1 y 2 se cerraron
   con su fecha y su ADR en el mismo commit que los cerró; el 3 y el 4 se
   cerraron con código y nadie volvió a la lista. Lo hecho se anota donde
   estaba lo pendiente, no sólo donde se hizo.

---

## CHG-006 — El hook frenaba el push cuando quien lo lanzaba no tenía node en el PATH

- **Fecha:** 2026-09-22 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo por contar tres archivos, sin schema ni
  decisión de ADR
- **Archivos:** `plantillas/pre-push`, `.githooks/pre-push`,
  `test/init-punto-de-control.test.ts`

**Resumen.** El primer push real del hook, hecho desde el cliente gráfico de
Charlie, muri´o con `node: command not found` y git abort´o el push. La causa: un
push lanzado fuera de una terminal no hereda el PATH del shell, y `node` vive en
nvm, que se carga desde el perfil. La guarda que el hook ya tenía comprobaba que
el **archivo** del detector existiera —`-f`, `-x`—, no que hubiera con qué
**ejecutarlo**, así que no cubría este caso. Ahora el hook recupera `node` de
Homebrew y de `nvm.sh` antes de elegir nada, y si aun así no aparece avisa y
sale con 0.

**Quién lo encontró.** Charlie, empujando. No el detector, no la suite, no la
prueba de extremo a extremo que empuja a un remoto de verdad: esa hereda el PATH
del proceso de pruebas, que sí tiene node.

**Lo que esto le costó a la versión.** La `0.5.0` quedó etiquetada y sin
publicar, como la `0.1.4` en su día. La `0.5.1` la incluye entera.

**Lecciones.**

1. **Comprobar que el programa existe no es comprobar que se puede ejecutar.**
   Es el bug, en una línea. `[ -x algo ]` no dice nada sobre el shebang de ese
   algo, y `node_modules/.bin/ai-first` empieza por `#!/usr/bin/env node`.
2. **Un hook se estrena en el entorno más pobre, no en el del autor.** Se probó
   desde la terminal, donde todo está en el PATH, y se rompió en el primero que
   no lo tenía. Cualquier cosa que git invoque corre sin perfil: los clientes
   gráficos, los IDE y los servicios del sistema son el caso normal, no el raro.
3. **Una prueba puede pasar por la razón equivocada.** La que verificaba «sin
   `ai-first` alcanzable, avisa y deja pasar» pasaba porque no encontraba nada,
   no porque la guarda funcionara. Al corregir el hook empezó a fallar, que es
   como se supo. Ahora aísla el PATH y el HOME para probar lo que dice probar.

---

## CHG-007 — `publish-branch` se muda al archivo que pnpm va a leer

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo por contar cuatro archivos, sin schema ni
  decisión de ADR
- **Archivos:** `pnpm-workspace.yaml` (nuevo), el .npmrc (borrado), `AGENTS.md`,
  `docs/HANDOFF.md`

**Resumen.** La barrera que impide publicar desde la rama equivocada vivía en el
.npmrc como `publish-branch=prod`, y estaba condenada por los dos lados: npm
avisaba en cada corrida que no reconoce esa clave y que dejará de tolerarla, y
pnpm 11 restringe ese archivo a autenticación y registro. Lo segundo es lo
grave: la comprobación habría **desaparecido en silencio**. Ahora vive en
`pnpm-workspace.yaml` como `publishBranch: prod`, que es donde pnpm lo
documenta. El archivo no declara «packages»: lleva ajustes, y esto no es un
monorepo.

**Verificado, no leído.** Sobre un paquete de mentira en un repo desechable, con
el archivo real de este repo y sin tocar `@falcux`: desde `dev`, pnpm aborta con
`ERR_PNPM_GIT_NOT_CORRECT_BRANCH`. Y `pnpm install` se comporta igual, que era
el único riesgo de meter ese archivo en un repo de un solo paquete.

**Hallazgo del propio detector, y es un defecto suyo.** Con el cambio en el
árbol, el check 3 cobró P1 por el .npmrc «fuera del alcance declarado», aunque
el CHG lo declaraba entre acentos graves en su sección «Archivos afectados». La
causa está en `pareceRuta` (`src/markdown.ts`): un token cuenta como ruta si
tiene «/» o una extensión conocida, y un dotfile de la raíz no tiene ninguna de
las dos. Git sí lo cuenta como tocado, así que **un archivo como el .npmrc, el
.nvmrc, un Makefile o un Dockerfile no se puede declarar en una spec**, y su P1
no hay forma de apagarlo. Se apagó solo al cerrar el cambio, como en CHG-003,
pero la asimetría sigue ahí. Queda como pendiente con su caso real.

**Lecciones.**

1. **Una clave que dos herramientas dejan de leer avisa una sola vez.** npm lo
   decía en cada corrida y era ruido fácil de ignorar; pnpm no lo va a decir, y
   ahí el modo de fallo es que la protección desaparece sin que nadie lo note.
2. **Lo que el detector puede ver y lo que puede declarar no coinciden**, y esa
   asimetría produce un P1 imposible de silenciar. Vale para cualquier archivo
   de configuración sin extensión, que es medio repo en su raíz.

---

## CHG-008 — Un archivo sin extensión no se podía declarar en una spec

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo, sin schema. **Con decisión: ADR-023**
- **Archivos:** `src/markdown.ts`, `src/verificaciones/alcance-excedido.ts`,
  `test/verificaciones.test.ts`, `docs/ADR.md`

**Resumen.** `pareceRuta` cerraba exigiendo «/» o una extensión conocida, así
que un archivo de configuración de la raíz no contaba como ruta. Los archivos
tocados los da git, que sí los ve: el resultado era que el .npmrc, un `LICENSE`
o un `Makefile` **no se podían declarar** en un documento de cambio, y su P1 no
tenía forma de apagarse. Ahora el check 3 lee las referencias con
`permitirSinExtension`, y el check 4 sigue exactamente igual.

**La decisión, en una línea.** Los dos checks leen las mismas referencias y
hacen cosas opuestas con ellas: en el 3 una ruta **excusa** un archivo tocado;
en el 4 **acusa** con un P2. Un filtro puede ser laxo donde excusa y tiene que
ser estricto donde acusa. Está en ADR-023.

**Lo que decidió el diseño fue una medición, no una preferencia.** La opción
obvia —una lista blanca de nombres conocidos para los dos checks— se descartó al
medirla contra este repo: `docs/ADR.md` cita el `.zshrc` de una máquina en una
analogía y el .npmrc que CHG-007 acababa de borrar, así que la lista habría
producido dos P2 sobre un documento que **se agrega y no se edita**. El hallazgo
no habría tenido arreglo posible.

**Lecciones.**

1. **Antes de elegir la regla, medir qué cobraría hoy.** Media hora de `grep`
   sobre los artefactos reales descartó la solución que parecía obvia y señaló
   la que no se veía.
2. **Un documento que no se edita es una restricción de diseño**, no sólo una
   convención de proceso: cualquier regla nueva del detector tiene que poder
   convivir con lo que el ADR ya dice, porque el ADR no se va a acomodar.
3. **Dos consumidores del mismo filtro no tienen por qué querer lo mismo.**
   Compartían `pareceRuta` desde el principio y nadie había preguntado si debían.

---

## CHG-009 — El molde del documento de cambio no decía que ya se pueden declarar archivos sin extensión

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo corto, un archivo, sin schema ni decisión de ADR
- **Archivos:** `skills/protocolo-cambios/references/documento-de-cambio.md`

**Resumen.** CHG-008 hizo que el check 3 acepte nombres sin barra ni extensión,
y el párrafo que le enseña al adoptante **qué puede declarar** seguía enumerando
sólo «rutas entre acentos graves (con globs)». Ahora los nombra, con tres
ejemplos, y añade en una línea por qué acá el filtro es más permisivo que el del
check 4: lo declarado excusa, y para excusar tiene que coincidir exacto.

**Por qué era una frase y no una omisión menor.** De los once archivos que
mencionan la convención, ése es el único que **enumera** qué cuenta como ruta.
Los demás dicen «rutas entre acentos graves» sin abrir la lista, y siguen siendo
ciertos. Quien leyera el molde concluiría que su .npmrc es indeclarable: el
defecto corregido en el código habría seguido vivo en lo que el adoptante cree
que puede hacer.

**Toca una skill que obliga a avisar al sitio.** `protocolo-cambios` es una de
las tres que asumen el capítulo «Gobierno del contexto», así que el aviso de la
próxima versión lo lleva. Ninguna ruta se movió: no hay enlace publicado roto.

**Lecciones.**

1. **Un arreglo del detector no está terminado hasta que la documentación que
   se distribuye lo dice.** El código y el molde viajan en el mismo tarball; el
   adoptante lee el segundo.
2. **El detector volvió a separar dos cambios mezclados.** Cobró P1 porque el
   árbol traía CHG-008 sin commitear junto al CHG-009 abierto, igual que en
   CHG-003. Commitear el primero dejó el segundo solo y el check pasó. Es la
   tercera vez que el check 3 señala un árbol con dos cambios encima.

---

## CHG-010 — Le atribuimos a un capítulo del manual algo que decía otro

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo corto, dos archivos, sin schema ni decisión de ADR
- **Archivos:** `docs/HANDOFF.md`, `AGENTS.md`

**Resumen.** Desde la sesión 9 el handoff afirmaba que el capítulo «Gobierno del
contexto» enumera tres capas y llama «hooks» a la tercera. El sitio, que es la
fuente, lo corrigió al responder el aviso: los hooks del agente los enseña
**«Skills, hooks y gestión de contexto»**, y ahí son **capa 2**. «Gobierno del
contexto» ya decía «hook local e integración continua», así que en ese capítulo
no había nada que arreglar.

**No fue un dato que caducó, fue una suposición presentada como hecho.** Era
falsa cuando se escribió, y viajó en dos avisos al sitio pidiéndoles revisar el
capítulo equivocado. El daño fue leve porque ellos conocen su manual y lo
enrutaron solos.

**Lo que ellos cambiaron, y conviene no deshacer.** Mantienen los hooks del
agente como metodología, con una nota de que el hook del paquete es de git, y
**retiraron la afirmación de que los hooks eran «específicos de Claude Code»** —
lo mismo que ADR-022 midió por su cuenta al comparar los cuatro formatos.

**Lecciones.**

1. **Cuando el aviso depende de lo que diga el otro repo, se pregunta, no se
   afirma.** Desde acá no se puede leer el manual, y eso se sabía: la frase
   debió salir como pregunta desde el primer aviso.
2. **Un aviso no está recibido hasta que contestan.** El de la `0.5.1` se dio por
   entregado y la sesión destinataria se cerró sin leerlo; se procesó un día
   después, junto con el siguiente.
3. **El verificador de fuera vuelve a encontrar lo que el de dentro no busca.**
   Es la segunda vez, después de CHG-004: ellos verificaron la `0.5.1` contra el
   registro por su cuenta en vez de fiarse del aviso.

## CHG-011 — El comando para empezar es `npx @falcux/ai-first@latest init`

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, tres archivos, sin schema ni decisión de ADR
- **Archivos:** `README.md`, `src/cli.ts`, `test/cli.test.ts`

**Resumen.** Charlie probó la instalación en una carpeta vacía con
`npx @falcux/ai-first init` y le respondió la 0.1.0, que se niega fuera de un
repositorio. npx guarda una entrada por cada forma en que se invocó el paquete:
la del nombre sin versión apuntaba a `^0.1.0` y se reutilizaba sin consultar el
registro, que ya iba en la 0.5.1. Antes, el botón de la portada del sitio le
había dado `npx @falcux/ai-first`, sin `init`, que sólo imprime la ayuda.

Ahora la ayuda abre con «Para empezar, en la raíz del proyecto:
`npx @falcux/ai-first@latest init`», que es lo primero que ve quien llega por
ese botón, y el README enseña lo mismo con una frase sobre la caché. La tabla del
README decía que la entrevista estaba «escrito, sin publicar» desde antes de la
0.4.0, que la publicó. Se descartó que el CLI avisara de versiones nuevas: sería
una llamada de red (ADR-019).

**Lecciones.**

1. **Probar el comando publicado desde una máquina limpia no prueba el de quien
   ya lo probó.** La verificación de la 0.5.1 fijó la versión
   (`npx @falcux/ai-first@0.5.1`), y así esquivó justo la caché que atrapa al
   adoptante que vuelve.
2. **El texto que se copia es interfaz.** El botón de la portada es el primer
   comando que corre casi cualquiera, y no estaba en ninguna prueba de este repo.

## CHG-012 — La cuenta de skills dice once, y la de las que asumen el ADR, cinco

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, sólo prosa, sin schema ni decisión de ADR
- **Archivos:** `skills/README.md`, `README.md`, `AGENTS.md`, `docs/SPEC-PAQUETE.md`, `skills/protocolo-arranque/references/artefactos-por-perfil.md`

**Resumen.** Al reestructurar su documentación, el sitio contó las skills contra
`prod` y encontró dos cuentas viejas. La de todas decía «diez» en cinco sitios,
de antes de que entrara `protocolo-arranque` (ADR-019). La de las que asumen el
capítulo «Gobierno del contexto» decía tres acá y seis en el sitio: son cinco
—arranque, features, cambios, cierre e information-architecture—, y el sitio
contaba a `test-fix` porque su `grep` encontraba «adr» dentro de «cuadran». La
tabla de `skills/README.md` nombra ahora las cinco. Queda fuera, a propósito,
dónde se declaran las Zonas Prohibidas: la tabla sigue diciendo «en el
AGENTS.md» y el paquete las lee de `AI-FIRST.md`. Es una deuda del capítulo, y
se corrige con él.

**Lección.** Un conteo por `grep` sin límite de palabra cuenta subcadenas. Para
contar menciones de una sigla, `grep -w`.

## CHG-013 — El hook deja pasar el push cuando el detector no pudo correr

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, sin schema ni decisión de ADR: alinea el hook con ADR-022
- **Archivos:** `plantillas/pre-push`, `.githooks/pre-push`, `test/init-punto-de-control.test.ts`, `CHANGELOG.md`

**Resumen.** El sitio, al documentar el punto de control, notó que el hook
terminaba en `ai-first audit` y salía con su código: un 2 —error de uso— frenaba
el push igual que un P0, contra lo que dicen el comentario del hook, la ayuda y
ADR-022. Ahora el código se captura; con 2 el hook avisa y sale con 0, y con
cualquier otro sale con él. Es la misma regla que ya tenían las dos guardas de
arriba: no medir no es motivo para frenar un push. La copia de este repo, que
corre el detector de `dist/`, recibe el mismo cambio. Nueva prueba con un
`ai-first` de mentira que sale con 2.

**Lección.** Un script que termina en el comando que envuelve hereda todos sus
códigos de salida, no sólo el que se pensó. Cuando el contrato distingue
códigos, el script los tiene que distinguir con nombre.

## CHG-014 — Una opción mal escrita responde en español y sin traza

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, sin schema ni decisión de ADR
- **Archivos:** `src/cli.ts`, `test/cli.test.ts`, `CHANGELOG.md`

**Resumen.** `parseArgs` corría sin protección y sus `TypeError` llegaban al
manejador final, que imprime la traza de todo lo que no sea `ErrorAiFirst`. El
sitio lo encontró documentando los errores de uso: `audit --nada` devolvía una
traza en inglés. `leerOpciones` traduce los tres errores de `parseArgs` —opción
desconocida, sin su valor, con un valor que no lleva— a un `ErrorAiFirst`; el
resto de lo inesperado sigue con traza, que es lo que sirve para reportarlo.

**Lección.** El manejador de «lo inesperado» se llena de lo esperado si nadie lo
vacía: una opción mal escrita es el error de uso más común que hay.

## CHG-015 — La 0.5.2 publicada trae cuatro cambios que el CHANGELOG daba por no publicados

- **Fecha:** 2026-09-23 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo corto, un archivo, sin schema ni decisión de ADR
- **Archivos:** `CHANGELOG.md`

**Resumen.** El bump a 0.5.2 se hizo en `0a4e831`, y ahí quedó el tag. El publish
salió después con `npm publish` desde `prod` en `cc776eb`, así que el tarball
trae también CHG-011 (la ayuda con `@latest`), CHG-013 (el hook) y CHG-014 (la
opción mal escrita); CHG-012 viaja pero sólo toca texto de dos skills. Se
comprobó bajando el tarball del registro: sus archivos son idénticos a
`cc776eb`, y su `dist/` es igual al de compilar ese commit. El `CHANGELOG.md`
ahora cuenta esos cambios en la 0.5.2 y dice desde dónde salió; el del tarball
conserva el texto viejo, porque el registro no deja reemplazarlo. El tag lo
mueve Charlie a `cc776eb`.

**Lecciones.**

1. **Lo que se publica es la punta de la rama, no el commit del bump.** Todo lo
   que entra entre el bump y el publish viaja con un número que no lo cuenta.
   Si entró algo, se vuelve a correr `version-bump` antes de publicar.
2. **`npm publish` no lee el `publishBranch` de pnpm.** Esta vez no importó
   porque se publicó desde `prod`, pero la compuerta de rama sólo existe con
   `pnpm publish`.

## CHG-016 — La prueba «sin node en el PATH» daba por hecho que la máquina no tiene node donde el hook lo busca

- **Fecha:** 2026-09-29 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo corto, una prueba, sin schema ni decisión de ADR
- **Archivos:** `test/init-punto-de-control.test.ts`

**Resumen.** La primera corrida del flujo de publish (ADR-024) falló en
`pnpm test`, sin llegar a npm. La prueba de CHG-006 simula una máquina sin node
recortando el PATH a `/usr/bin:/bin`, pero el hook agrega por su cuenta
`/opt/homebrew/bin` y `/usr/local/bin`, y el runner de GitHub trae node en la
segunda. El hook lo encontraba, que es lo correcto, y la prueba esperaba el
aviso. Ahora la prueba mira primero si hay node en alguna de esas cuatro
carpetas: si lo hay, se omite y dice cuál; si no, corre como antes. Se verificó
en las dos ramas, la segunda simulando un node alcanzable. El hook no cambió.

**Lecciones.**

1. **Una suite que nunca corrió fuera de una máquina tiene supuestos de esa
   máquina.** `ai-first.yml` sólo corre en `pull_request`, y acá no hay PRs: la
   primera vez que la suite corrió en otra máquina fue en el flujo de publish.
2. **Una prueba que depende del entorno se omite con su razón, no se aprueba
   ni se borra.** Es la misma regla que el detector aplica a sus checks.

## CHG-017 — La revisión de CI corre en cada push a `dev`, y las acciones pasan a Node 24

- **Fecha:** 2026-09-29 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo, sin schema ni decisión de ADR
- **Archivos:** `.github/workflows/ai-first.yml`, `.github/workflows/publish.yml`, `plantillas/ai-first.yml`, `CHANGELOG.md`

**Resumen.** El `ai-first.yml` de este repo solo corría en `pull_request`, y
acá no hay PRs: no había corrido nunca. Por eso el defecto de CHG-016 recién
apareció en la última compuerta antes de npm. Ahora corre también en cada push
a `dev`, auditando `before...HEAD` con `--estricto` y la misma comprobación de
base que `publish.yml`. La lógica se ensayó en local en sus cuatro casos: PR,
rama nueva, rango válido y base inexistente. Las acciones pasan de `@v4`, que
corren sobre Node 20, a `checkout@v7`, `setup-node@v7` y `pnpm/action-setup@v6`,
que corren sobre Node 24. Antes se leyeron sus notas de versión, y ningún cambio
incompatible afecta este uso. La plantilla que reparte `init` recibe las dos
acciones que usa, con `package-manager-cache: false`, y queda anotada en el
CHANGELOG para el próximo PATCH. Su disparador no cambia: es decisión de quien
adopta el paquete.

**Lección.** Con un CHG abierto en `pending/`, auditar localmente un rango de
commits anteriores cobra como «fuera de alcance» archivos que ese CHG nunca
declaró, porque el check 3 lee el cambio en curso. En CI no pasa, porque el CHG
se borra en el mismo commit que lo cierra, pero confunde al ensayar: se
confirmó sacando el documento un momento.

## CHG-018 — La entrevista no adapta una skill que es copia de un workspace

- **Fecha:** 2026-09-29 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo, sin schema ni decisión de ADR: extiende la regla de ADR-020
- **Archivos:** `src/init.ts`, `test/init.test.ts`, `CHANGELOG.md`, `AGENTS.md`

**Resumen.** Lo destapó el laboratorio de la plantilla de workspace de polirepos
(`Autentic-Latam-SAS/atc-develop-workspace`). Su `sync-context.sh` reparte las
skills del catálogo a cada repo hijo como copias con la cabecera
«<!-- COPIA DE SOLO LECTURA». `init` saltaba su instalación porque ya existían,
pero la entrevista las adaptaba igual. Después, el `--check` del workspace las
daba por editadas, y el siguiente sync borraba la adaptación sin avisar.
`adaptarSkill` gana un cuarto caso: si la `SKILL.md` lleva esa cabecera en sus
primeras 60 líneas, la reporta como sugerida y no escribe. Nueva prueba en
`test/init.test.ts`, que falla si se quita la protección. El caso con
entrevista no se pudo correr en el laboratorio porque exige una terminal; lo
prueba la suite con un entrevistador de mentira.

**Lecciones.**

1. **Una regla que protege un caso protege la causa, no el síntoma.** ADR-020
   miró «es un enlace», cuando lo que había que mirar era «acá no está la
   fuente». Un segundo dueño de la misma carpeta repite el defecto con otra
   forma.
2. **El paquete ahora reconoce un texto que define otro repo**, la cabecera de
   la plantilla de workspace. Si la plantilla la cambia, esto deja de funcionar
   sin error: cambiarla obliga a cambiar `esCopiaDeWorkspace`.

## CHG-019 — El tag de una versión publicada crea su Release en GitHub

- **Fecha:** 2026-09-30 (abierto y cerrado el mismo día)
- **Tipo:** cambio de requerimiento, flujo completo, sin decisión de ADR: extiende ADR-024 sin superarlo
- **Archivos:** `.github/workflows/release.yml`, `test/publicacion.test.ts`, `docs/specs/publicacion.md`, `docs/HANDOFF.md`, `AGENTS.md`

**Resumen.** El repo es público y no tenía ningún Release, así que nadie podía
suscribirse a las versiones nuevas. El handoff proponía crearlo desde el flujo
de publish, pero a esa hora el tag todavía no existe y `gh release create` lo
habría puesto por su cuenta, contra la regla de que el tag lo pone Charlie. Lo
crea un flujo aparte, disparado por el push del tag: comprueba que el
manifiesto diga la misma versión y que npm la tenga, toma la entrada del
CHANGELOG como cuerpo y no toca un Release que ya existe. Se descartó también
un borrador desde publish, porque sumaba un paso manual por versión. Las
versiones hasta la `0.5.4` se quedan sin Release, por decisión de Charlie.
Cuatro invariantes nuevas en `test/publicacion.test.ts`. Se ensayaron en local
la extracción del CHANGELOG (la `0.5.4` da su entrada y una versión ausente da
vacío) y la consulta al registro (la `0.5.4` está y la `0.5.0` no). No se
verificó en GitHub Actions, y `actionlint` no está instalado.

**Lección.** Lo que el handoff proponía como el camino obvio chocaba con una
regla de AGENTS.md que no mencionaba. Antes de implementar un pendiente escrito
como sugerencia, hay que leerlo contra las reglas del repo.

## CHG-020 — La entrevista deja elegir las skills, el hook y el CI

- **Fecha:** 2026-09-30 (abierto y cerrado el mismo día)
- **Tipo:** cambio de requerimiento, flujo completo
- **Decisión:** ADR-025, que supera la parte de ADR-019 donde el perfil decidía las skills
- **Archivos:** `src/entrevista.ts`, `src/init.ts`, `src/cli.ts`, `test/entrevista.test.ts`, `test/init.test.ts`, `docs/ADR.md`, `CHANGELOG.md`, `README.md`, `skills/README.md`, `docs/HANDOFF.md`

**Resumen.** Nuevo tipo de pregunta `seleccion`, que se contesta con números o
nombres. Enter deja lo marcado y «ninguna» no deja nada. Con ella, la
entrevista ofrece las skills opcionales con las del perfil y `protocolo-arranque`
marcadas; los tres protocolos (`SKILLS_FIJAS`) no se ofrecen y van siempre.
Luego pregunta por el hook y el CI. `iniciar` calcula un `AlcanceEntrevista`
con lo que ninguna bandera decidió y se lo pasa al entrevistador; el CLI lo
pasa a la terminal. Sin alcance, `entrevistar` es la de antes, así que las
pruebas previas no cambiaron. Siete pruebas nuevas, entre ellas una que falla
si Enter cambia lo instalado respecto de antes y otra que falla si una bandera
deja de ganar. Se comprobó que dos fallan al quitar los protocolos fijos. La
corrida real en una pseudo-terminal, sobre una carpeta vacía, instaló lo
elegido y respetó el «no» al hook.

**Lección.** `script` de macOS no reenvía el fin de la entrada a un programa
interactivo, y la corrida se cuelga. Para probar una entrevista de verdad
sirvió `pty` de Python, contando los prompts antes de responder.

## CHG-021 — El flujo del Release espera a que npm sirva la versión

- **Fecha:** 2026-10-05 (abierto y cerrado el mismo día)
- **Tipo:** corrección de CHG-019, flujo corto, sin decisión de ADR
- **Archivos:** `.github/workflows/release.yml`, `test/publicacion.test.ts`, `docs/specs/publicacion.md`, `docs/HANDOFF.md`

**Resumen.** El primer Release, el de `v0.6.0`, falló con E404: el tag llegó
9 segundos después de `prod` y npm tardó unos 2,5 minutos en servir la
versión. Con un solo `npm view`, empujar el tag junto con `prod` fallaba
siempre. Ahora el paso consulta cada 30 segundos, hasta 10 minutos, y solo
falla si en ese tiempo la versión no aparece. Se ensayó el bucle en local: con
la `0.6.0` sale al primer intento, y con una versión inexistente falla. Una
invariante nueva en la prueba.

**Lección.** CHG-019 dejó la carrera anotada como «se relanza la corrida», sin
comprobar quién podía relanzarla. Hacen falta permisos de admin, y la cuenta
activa de `gh` en esta máquina no los tiene. Si un paso manual queda como
salida de un fallo previsto, hay que probar antes que alguien pueda darlo.

## CHG-022 — El cuerpo del Release une las líneas de cada párrafo

- **Fecha:** 2026-10-05 (abierto y cerrado el mismo día)
- **Tipo:** corrección de CHG-019, flujo corto, sin decisión de ADR
- **Archivos:** `.github/workflows/release.yml`, `test/publicacion.test.ts`, `docs/specs/publicacion.md`

**Resumen.** El primer Release, el de `v0.6.0`, salió con un `<br>` al final
de cada línea: un Release, a diferencia de un `.md`, muestra cada salto, y el
CHANGELOG está cortado a 80 columnas. El `awk` que extrae la entrada ahora une
las líneas de continuación a la anterior. No une las que están en blanco, los
títulos, los marcadores de lista ni el código. La prueba extrae el programa del
flujo y lo ejecuta sobre un CHANGELOG de muestra con viñetas, párrafo, código y
lista numerada, así que se prueba el `awk` real, no una copia.

**Lección.** CHG-019 verificó el texto que se extraía, pero no cómo se veía
una vez publicado. En una superficie que renderiza otro, hay que mirar el HTML
resultante: la API lo da con `Accept: application/vnd.github.html+json`.
