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
