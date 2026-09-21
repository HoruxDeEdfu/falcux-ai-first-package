# Session Log

> Registro cronológico de sesiones de implementación. Cada entrada documenta
> qué se hizo, qué cambió, y qué quedó pendiente.
>
> Lo escribe `protocolo-cierre` (Fase A); lo verifica el humano (Fase B). Sesión
> más reciente arriba. Es cronología: el estado de hoy vive en `docs/HANDOFF.md` y el
> porqué de cada decisión en `docs/ADR.md`. Cuando pase de ~50 entradas, las viejas se
> archivan en `docs/SESSION_LOG_ARCHIVE.md` y acá quedan las últimas 20.

---

## 2026-09-21 (sesión 7) — El arranque de un proyecto entra al paquete: el hueco 2, cerrado

### Resumen
El paquete cubría desde que el repo existía y estaba documentado; la mitad de
arriba del ciclo —definir el producto, decidir el stack, escribir PRD,
arquitectura y specs— vivía en las instrucciones de un proyecto de Claude
Desktop que entregaba un `.zip` para pegar a mano. Esta sesión la migra entera,
sin romper la regla de que el paquete corre sin modelo ni red. Pasó por
`protocolo-features` con la spec `docs/specs/arranque-de-proyecto.md` como
contrato, escrita en la misma sesión.

### La frontera (ADR-019)
- **El comando prepara el terreno y verifica; la skill define y escribe.** El
  modelo que ejecuta la skill es el que el adoptante ya tiene abierto, así que el
  paquete entrega el procedimiento y nunca la inferencia. Fue lo que permitió
  migrar el flujo sin meterle una llave de API al detector.
- `skills/protocolo-arranque/` es la undécima skill: dos fases, como el prompt de
  origen —descubrimiento con benchmark, cuestionamiento sin límite y postura
  propositiva; luego los artefactos desde los templates del paquete, en el repo
  y no en un adjunto—. Su `references/artefactos-por-perfil.md` dice qué sale
  para cada perfil.
- Los ocho `templates/` dejan de ser «manuales»: ésta es la skill que los
  consume. El README y la ayuda de `init` decían lo contrario.

### La entrevista (`src/entrevista.ts`, `src/adaptacion.ts`, `src/cli.ts`)
- Once preguntas con valor por defecto: nombre, fase, perfil, comandos de
  verificación, tipos y lint, agentes en paralelo, manifiesto de versión,
  secuencia de implementación y una confirmación por zona sugerida.
- Las preguntas son **datos**, no llamadas a la terminal: `entrevistar` recibe
  cómo leer, así que la suite la corre entera sin TTY.
- Un proyecto sin documentación se entrevista solo; uno que ya la trae recibe la
  oferta y por defecto la salta. Es el caso de Charlie, que llega con su `docs/`
  ya escrita. `--entrevista` fuerza, `--sin-entrevista` calla, y sin terminal
  interactiva no se pregunta nunca.
- El escaneo aprendió a deducir tres cosas más —comando de tipos, de lint y el
  archivo de la versión— porque una pregunta sin valor por defecto se contesta
  mal.

### Las marcas como manifiesto (ADR-020)
- `ponerBloqueAgents` se generalizó a `ponerBloqueMarcado`, con un encabezado
  bajo el cual insertar la primera vez. La adaptación de cada skill va entre
  `<!-- ai-first:inicio -->` y `<!-- ai-first:fin -->`, dentro de su sección
  «Adaptación a tu proyecto».
- **El bloqueador no era tal.** La spec del `init` completo dejó fuera la
  entrevista porque «reescribir una skill obliga a saber qué escribió la
  herramienta», y eso pedía `.ai-first/manifest.json`. Las marcas ya respondían
  esa pregunta desde ADR-018; generalizarlas costó una función.
- **Una skill enlazada no se adapta nunca**, y se reporta como sugerida:
  escribir ahí cambiaría `skills/`, que es la fuente publicada y la que el sitio
  sirve por raw link. Verificado con una prueba que compara la fuente antes y
  después.

### `git init` (ADR-021)
- Una carpeta sin `.git` se inicializa y el comando sigue, en vez de salir con 2.
  Una carpeta que no existe sigue siendo error de uso. Supera esa regla de
  ADR-003; la prueba vieja se reemplazó por dos.

### El perfil, en el contrato (`src/ai-first-md.ts`)
- `perfil: { producto, repositorio }`, opcional y dentro del formato 1. Un valor
  desconocido es error de formato: adivinarlo mal es peor que no tenerlo.
- Decide qué skills se instalan —una API deja de recibir las tres de UX— y qué
  artefactos pide el arranque.

### El CHANGELOG (`CHANGELOG.md`)
- Pendiente arrastrado desde la sesión 5. Reconstruido desde los ocho tags y las
  fechas reales de npm. Deja constancia de que la `0.1.4` tiene tag y no llegó
  al registro: la `0.2.0` salió el mismo día y la incluye.

### Dos hallazgos de la prueba a mano
- **Ctrl+D o la entrada agotada a media entrevista** mataban el comando con un
  stack trace de Node. Ahora sale un mensaje de una línea que dice qué quedó
  escrito. Se vio corriendo el binario bajo un pseudo-terminal; ninguna prueba
  lo habría cazado.
- El bloque escrito dejaba debajo la lista genérica de la skill, que ya
  respondía. No se puede borrar —está fuera de las marcas—, así que el bloque
  cierra diciendo qué relación tienen.

### CHG-003: el nombre de la metodología estaba a medias
Charlie leyó la skill nueva y vio que citaba «Blueprint AI-First». El renombre a
**Falcux AI-First** estaba decidido y registrado en la sección «Naming» del
handoff desde antes del primer publish, pero nunca se aplicó a lo que se
distribuye: nueve menciones del nombre viejo en ocho archivos, cinco de ellos
`SKILL.md` publicados. Fue por `protocolo-cambios`, flujo completo, y se cerró
el mismo día; el resumen está en `docs/changes/CHANGE_LOG.md`.

Dos cosas no se tocaron a propósito: la transcripción del prompt de origen en la
spec, que es cita literal y ganó una nota, y la línea del handoff que registra el
renombre. El detector cobró P1 mientras el CHG estuvo abierto, porque el árbol
traía además todo el feature sin commitear: el check 3 tenía razón, y se apagó
al cerrar el cambio.

### Validación
- typecheck → PASS (lo corre `pnpm test` antes de la suite)
- lint      → no ejecutado (no hay script)
- tests     → PASS por exit code, 91/91 (70 → 91)
- audit:self → 0 / 100. En el camino dio 20 por el P1 de dos superficies de
  decisión sin ADR, que es lo previsto, y 8 por un P2 real: el ADR mencionaba
  entre acentos graves un archivo que sólo existía como alternativa descartada.
  El detector cazó su propia regla.
- A mano: `init --enlazar` sobre este repo sigue reportando todo saltado sin
  cambiar un byte; y la entrevista completa sobre dos carpetas vacías deja
  repos que auditan en 0 / 100.

### Pendiente para la siguiente sesión
- [x] ~~**Avisar al sitio**~~. Enviado el mismo día a la sesión
      `update_package`, una vez y con las tres cosas juntas: once skills en vez
      de diez, el capítulo «Gobierno del contexto» que gana un protocolo
      anterior a los tres que describe, y el nombre de la metodología en cinco
      `SKILL.md` (CHG-003), por si su prosa arrastra el viejo. Ninguna ruta se
      movió, así que no les bloquea nada.
- [x] ~~**Publicar la `0.4.0`**~~. Charlie avanzó `prod` a `2b914b1` y publicó
      el mismo día a las 20:55 UTC. Verificado contra el registro: `latest` en
      `0.4.0`, shasum coincidente y `npx` sobre una carpeta vacía deja un repo
      que audita en 0 / 100. Detalle en `docs/HANDOFF.md`.
- [ ] **Distribuir las skills con las marcas ya puestas**, con su lista genérica
      dentro, para que la entrevista la sustituya en vez de duplicarla. Hoy se
      resuelve con una línea de cierre en el bloque. Tocaría las once skills,
      tres de ellas con aviso al sitio.
- [ ] **El criterio 7 de la spec**: lo que `protocolo-arranque` produce se
      verifica contra un proyecto real la primera vez que se use. Es una skill,
      no código, y ninguna prueba la cubre.
- [ ] **El detector no vigila nombres propios.** CHG-003 sobrevivió a todos los
      `audit:self` en 0 porque el check 4 comprueba que las rutas existan, no
      que los términos sean los vigentes. Vigilarlo pediría una lista de
      términos en el contrato: es un feature, no un cambio.
- [ ] El workflow de publish (pendiente 4 del handoff). Van siete versiones a
      mano.
- [ ] Los hooks (hueco 5), único que queda del mapa de cinco.
- [ ] `publish-branch` de `.npmrc`: npm avisa que dejará de tolerar la clave.

## 2026-09-21 (sesión 6) — Sale la `0.2.1`, y la sesión de npm en la máquina estaba caducada

### Resumen
Sesión de estado y publish, sin cambios de código. Charlie publicó la `0.2.1`
desde `prod` (`469b27b`, la misma punta que `dev`). El primer intento murió con
un 404 en el PUT que no era del paquete sino de la autenticación: el token de
`~/.npmrc` había caducado y `npm whoami` daba 401. Con `npm login` por la vía
web salió al segundo intento.

### El publish (`docs/HANDOFF.md`)
- `@falcux/ai-first@0.2.1` en npm a las 16:36 UTC; `latest` apunta a ella.
  El shasum del registro (`1b227dde…`) es el mismo que imprimió el publish.
- El README publicado ya lleva el badge y no el número: es lo que CHG-002
  arregló y lo único que cambia para el adoptante respecto a la `0.2.0`.
- `npx @falcux/ai-first@0.2.1 --help` desde una carpeta vacía responde con
  salida cero.
- Handoff: sección «La `0.2.1` sale a npm», con el 404 explicado para la
  próxima, junto al 409 de la `0.1.3`. El aviso de la `0.2.0` ya había llegado
  al sitio (dos veces); queda anotado.

### `--version` (`src/cli.ts`, `test/cli.test.ts`, `docs/specs/version-flag.md`, `README.md`)
- Hallazgo de la sesión del sitio al verificar la `0.2.1`: `--version` moría
  con `ERR_PARSE_ARGS_UNKNOWN_OPTION`. Charlie pidió agregarlo; pasó por
  `protocolo-features` con spec corta en `docs/specs/`.
- `--version` y `-v` imprimen la versión del `package.json` del paquete,
  leída en ejecución desde el módulo como `init` resuelve `skills/`; ganan a
  cualquier comando y salen con 0. `--help` la lista.
- Primera prueba que ejecuta el binario compilado de punta a punta: 67 → 70.
- `src/cli.ts` es superficie de decisión y no hubo decisión: el commit lleva
  `<!-- ai-first: sin-decision -->`. En modo árbol `audit:self` da el P1
  hasta el commit, como está previsto.
- El sitio también reportó que su panel mostraba una captura anterior al
  publish como «salida real de la 0.2.0»; ya lo corrigió por su lado. Quedó
  anotado en el handoff.

### Validación
- typecheck → PASS (lo corre `pnpm test` antes de la suite)
- lint      → no ejecutado (no hay script)
- tests     → PASS por exit code, 70/70
- audit:self → 0 / 100 con el árbol limpio; 20 (1 P1, `src/cli.ts` sin fila
  de ADR) con el `--version` sin commit, que es lo esperado

### Versión
- 0.2.1 → 0.3.0, MINOR confirmado por Charlie: `--version` es una opción
  nueva del CLI, compatible. Único manifiesto, `package.json`. Tag y publish
  son suyos; la `0.3.0` estrena el `--version` y es la candidata para
  estrenar también el workflow de publish, si llega antes.

### Pendiente para la siguiente sesión
- [x] ~~Publicar la `0.3.0` y avisar al sitio~~. Publicada por Charlie el
      mismo día a las 19:18 UTC desde `prod` en `13c3f1f`; aviso enviado una
      vez a `update_package`. El primer intento salió como `0.2.1` porque
      `prod` se había avanzado antes del commit del bump: npm lo rechazó
      («cannot publish over previously published versions») y no subió nada.
- [ ] El tag `v0.3.0` sobre `13c3f1f`: al escribir esto no estaba en `origin`.
      Lo pone Charlie.
- [x] ~~El tag `v0.2.1` sobre `469b27b`~~. Puesto y en `origin` el mismo día,
      a pedido de Charlie, en `301ab84`.
- [x] ~~Mandar al sitio el aviso de la `0.2.1`~~. Enviado el mismo día a la
      sesión del sitio, `update_package`, una vez. La sesión `init-completo`,
      que hizo el bump, lo tenía como pendiente; se le avisó para que no lo
      duplicara, y confirmó que no salió otro.
- [ ] El workflow de publish (pendiente 4 del handoff). Ya son seis versiones
      a mano, y ésta costó un login: con trusted publishing no habría token
      que caducar.
- [ ] npm avisa que `publish-branch` de `.npmrc` es una clave que no conoce y
      que dejará de tolerarla en su próxima mayor. La lee pnpm, que es quien
      la respeta; conviene vigilar si al subir de npm el aviso pasa a error.
- [ ] Los de la sesión 5 siguen en pie: el CHANGELOG del paquete, los
      hallazgos del detector, las divergencias de `protocolo-cierre`, la
      entrevista de `init` y los hooks.

## 2026-09-18 (sesión 5) — CHG-002: la versión sale del README; se registra la `0.2.0`

### Resumen
Charlie avanzó `prod` y publicó la `0.2.0` entre la sesión 4 y ésta. Al revisar
el estado del paquete apareció el README diciendo `0.1.3`, por segunda vez en
dos días. `criterio` dio el veredicto —un número a mano en el README no es
buena práctica; el badge sí es convención— y el cambio fue por
`protocolo-cambios` como CHG-002. Misma sesión que la 4, no limpia: la skill lo
pide y se anotó al clasificar; el riesgo era bajo por ser prosa.

### CHG-002 (`README.md`, `skills/version-bump/SKILL.md`, `docs/HANDOFF.md`)
- README: badge de npm bajo el título, cabecera sin número, tabla «Qué hay»
  por estado. Todo lo que decía «en `dev` para la 0.2.0» ya viajaba en el
  tarball publicado.
- `version-bump`, sección «Mostrar la versión»: cubre el README —badge, no
  número; el detalle de cada versión al CHANGELOG—. No es de las tres skills
  que asumen el capítulo de gobierno; la ruta no se mueve.
- Handoff: sección «La `0.2.0` sale a npm». Verificado bajando el tarball del
  registro: idéntico a `npm pack` sobre `7baf51b` salvo el `package.json`
  normalizado por pnpm, que es por lo que el shasum no coincide.
- Resumen en `docs/changes/CHANGE_LOG.md`; el CHG salió de `pending/`. El
  check 3 estuvo activo mientras el CHG existió y aprobó el alcance.

### Validación
- typecheck → PASS (lo corre `pnpm test` antes de la suite)
- lint      → no ejecutado (no hay script)
- tests     → PASS por exit code, 67/67 (sin cambios en `src/` ni `test/`)
- audit:self → 0 / 100, con el CHG en `pending/` y después de retirarlo

### Versión
- 0.2.0 → 0.2.1, PATCH confirmado por Charlie: el README publicado en la
  `0.2.0` es un defecto ya distribuido, como lo fue el de la `0.1.2`. Tag y
  publish son suyos.

### Pendiente para la siguiente sesión
- [ ] Publicar la `0.2.1` desde `prod` y poner el tag; avisar al sitio de la
      `0.2.0` y de la `0.2.1`, como en cada publish.
- [ ] Los de la sesión 4 siguen en pie: el workflow de publish (pendiente 4,
      que habría evitado que esta versión también saliera a mano), el
      CHANGELOG del paquete, los hallazgos del detector, las divergencias de
      `protocolo-cierre`, la entrevista de `init` y los hooks.

## 2026-09-18 (sesión 4) — El `init` completo: el repo se configura con su propio comando

### Resumen
`init` pasa de escribir dos archivos a configurar el repo entero: skills,
estructura de `docs/`, `alcance.spec` y el bloque de `AGENTS.md`. Primer
feature que pasa entero por `protocolo-features`, con la spec
`docs/specs/init-completo.md` como contrato. Sesión delegada por Charlie desde
otra sesión de Claude Code; la pre-implementación ya estaba en la spec.

### El feature (`src/init.ts`, `src/cli.ts`, `test/init.test.ts`)
- `iniciar` instala skills en `.agents/skills/` desde la carpeta `skills/` del
  paquete, resuelta con `import.meta.url`: copia por defecto, enlace simbólico
  relativo con `--enlazar`; las cinco sin interfaz por defecto, `--skills todas`
  o una lista. Salta entera la que exista. Crea `.claude/skills` sólo si no hay
  nada en su sitio; un directorio real se reporta y se deja.
- Crea `docs/SESSION_LOG.md`, `docs/changes/CHANGE_LOG.md` y
  `docs/changes/pending/.gitkeep` con las cabeceras del manual. Por eso el ADR
  nuevo va siempre a `docs/ADR.md` (pregunta abierta 1 de la spec, decidida).
- El `AI-FIRST.md` que escribe declara `alcance.spec` y `agents: AGENTS.md`;
  en uno que ya existía no toca nada y sugiere la línea, salvo que ya esté.
- `AGENTS.md`: bloque entre `<!-- ai-first:inicio -->` y `<!-- ai-first:fin -->`
  con las skills instaladas, cuándo se invoca cada una y la tabla de
  equivalencias. Crea, añade al final o reemplaza el interior; una sola marca
  es error antes de escribir nada.
- Reporte por ítem: escrito, saltado o sugerido. Los errores de uso se
  detectan antes de tocar disco. 61 → 67 pruebas, una por criterio de la spec.
- Un bug cazado por la prueba del criterio 3: el enlace relativo calculado
  sobre rutas textuales nace roto cuando la raíz vive bajo un enlace (`/var`
  → `/private/var` en macOS). Se calcula entre rutas reales.

### El criterio 1, sobre este repo
- Gesto humano de una vez: la sección «Cómo se trabaja acá» de `AGENTS.md`
  ganó las marcas a mano. La prosa propia del repo —primer adoptante, las de
  UX no aplican, `criterio` es carpeta real, specs en `docs/specs/`, sin base
  de datos— quedó fuera de las marcas; adentro, lo que el comando genera. Los
  dos matices que la tabla a mano tenía y el bloque no —el CHG aunque sea
  flujo corto, el cierre otra vez si hubo más trabajo— fueron al bloque.
- `node dist/src/cli.js init --enlazar`: doce ítems saltados, `AGENTS.md`
  escrito, salida 0, `git status` sólo con `AGENTS.md`. Segunda corrida: trece
  saltados y `git status` sin cambios.

### Docs
- ADR-018, en el mismo commit que el código (lección de CHG-001): las cinco
  decisiones validadas en la spec y sus alternativas.
- `skills/README.md`: el comando es el camino principal; el bucle de bash,
  alternativa manual plegada. Obliga a avisar al sitio: anotado en el handoff,
  lo manda Charlie.
- `README.md`, la ayuda del CLI, la spec (estado y changelog), el índice de
  specs y el handoff (fila de `init`, hueco 1, sección nueva).

### Validación
- typecheck → PASS (lo corre `pnpm test` antes de la suite)
- lint      → no ejecutado (no hay script)
- tests     → PASS por exit code, 67/67
- audit:self → 0 / 100 con la fila ADR-018 en el árbol

### Pendiente para la siguiente sesión
- [ ] Aviso al sitio por el bloque de instalación de `skills/README.md`: su
      apéndice repite el bucle y ahora el camino principal es el comando.
- [ ] El workflow de publish (pendiente 4 del handoff), que estrena con la
      `0.2.0`: es otro feature, no entró acá.
- [ ] Los de la sesión 1 siguen en pie: las dos divergencias de
      `protocolo-cierre`, el CHANGELOG con el componente del sitio, y los
      cuatro hallazgos del detector, más el quinto que la spec anotó (el
      check 3 no ve una spec activa en `docs/specs/`).
- [ ] La entrevista de `init` (hueco 2), cuando exista el manifiesto; escribe
      dentro de las mismas marcas.

## 2026-09-18 (sesión 3) — CHG-001: `init` salta lo que existe y sigue

### Resumen
Primer cambio del repo que pasa entero por `protocolo-cambios`: `init` deja de
morir cuando `AI-FIRST.md` existe. Lo saltado se reporta y el comando sale con
0. Es el prerrequisito del `init` completo. Sesión delegada por Charlie desde
otra sesión de Claude Code, con el CHG como contrato.

### CHG-001 (`src/init.ts`, `src/cli.ts`, `test/init.test.ts`)
- `ResultadoInit` gana `saltados`; `AI-FIRST.md` existente y el ADR existente
  van ahí. El error «Ya existe AI-FIRST.md» desaparece.
- El CLI imprime `escrito <archivo>` / `saltado <archivo> (ya existe)`, y la
  ayuda deja de prometer el error.
- La prueba que fijaba el error pasa a comprobar que salta sin cambiar un byte
  y que el ADR que falta sí se escribe; una prueba nueva cubre el repo con los
  dos archivos presentes. 60 → 61 pruebas.
- Verificado a mano sobre un repo desechable: dos corridas seguidas, la segunda
  con los dos archivos saltados, salida 0 y `AI-FIRST.md` idéntico.

### Cierre del cambio
- Resumen en `docs/changes/CHANGE_LOG.md`; el CHG salió de `pending/`. Con eso
  el check 3 vuelve a omitirse, como se esperaba.
- La spec `docs/specs/init-completo.md` marca el cambio previo como hecho.
  README y el handoff dicen que `init` salta en vez de detenerse.
- Sin fila nueva de ADR: ADR-017 ya estaba escrita en `abda74c`.

### Validación
- typecheck → PASS (lo corre `pnpm test` antes de la suite)
- lint      → no ejecutado (no hay script)
- tests     → PASS por exit code, 61/61
- audit:self → 20 / 100 antes del commit (P1 en `src/cli.ts`: la fila ADR-017
  está en el commit anterior y el check compara el árbol contra HEAD). Se
  verifica con `--base v0.1.3` tras el commit, rango que incluye la fila.

### Pendiente para la siguiente sesión
- [ ] El `init` completo con `/protocolo-features`, ya sin bloqueo: la spec
      está validada y su cambio previo, hecho.
- [ ] Los de la sesión 1 siguen en pie: las dos divergencias de
      `protocolo-cierre`, el CHANGELOG con el componente del sitio, y los
      cuatro hallazgos del detector.

## 2026-09-18 (sesión 2) — Sale la 0.1.3, y las skills recién instaladas no se usaron

### Resumen
Se publicó la `0.1.3` y se documentó cómo salió. Los tres commits posteriores al
primer cierre se hicieron a mano, sin invocar ninguna de las skills instaladas
en la sesión 1. Esta entrada existe para registrarlo y para dejar la regla en
`AGENTS.md`.

### Publicación
- `prod` avanzó a `a2176c3` y la `0.1.3` salió a npm por la vía web de npm 11,
  con el 2FA de la cuenta. El tarball publicado es idéntico al construido acá
  (shasum `d14c2491…`); `npx @falcux/ai-first@0.1.3 --help` responde desde una
  carpeta vacía con salida cero.
- El `409 previously staged version` que siguió no fue un fallo: el CLI chocó
  con la versión que la autenticación web ya había publicado. La regla —mirar
  `dist-tags` antes de reintentar— quedó en `docs/HANDOFF.md`.

### Commits hechos fuera de las skills (b4702fb, 9da1985, 7c33437)
- Registro del publish en el handoff, y corrección del README, que decía
  «publicado en 0.1.0» tres versiones después.
- Un P2 llegó al commit `b4702fb`: un archivo inexistente nombrado entre
  acentos graves en el handoff. Se leyó la última línea de `audit:self` en vez
  de comprobar el resultado; corregido en `9da1985` con la compuerta puesta.
- Regla nueva en `AGENTS.md`: este repo es el primer adoptante de su paquete.
- Ninguno pasó por `protocolo-cambios`, y el tramo no se cerró con
  `protocolo-cierre` hasta esta entrada. Lo señaló Charlie.

### Validación
- typecheck → no ejecutado en este tramo (sin cambios en `src/`)
- lint      → no ejecutado (no hay script)
- tests     → no ejecutado en este tramo (sin cambios en `src/` ni `test/`)
- audit:self → 0 / 100 en cada commit, salvo `b4702fb` (8 / 100, corregido en `9da1985`)

### Pendiente para la siguiente sesión
- [ ] Los de la sesión 1 siguen en pie: el `init` completo con
      `/protocolo-features`, las dos divergencias de `protocolo-cierre`, el
      CHANGELOG con el componente del sitio, y los cuatro hallazgos del detector.
- [ ] Sin bump en este tramo: los tres commits son `docs:`.

## 2026-09-18 (sesión 1) — El repo empieza a usar su propia metodología

### Resumen
Las rutas de las skills se alinearon con el manual, la prosa del repo se mudó a
`docs/`, y cinco skills del paquete quedaron instaladas en `.agents/skills/` por
enlace. Es la primera entrada de este registro: existe porque esta sesión lo creó.

### Skills y templates — publicado en `prod` (c7170e3)
- `protocolo-cierre`, `protocolo-cambios`, `version-bump` y cinco templates: el
  registro de sesión y el de cambios pasan a `docs/`. El mismo documento se
  nombraba con y sin prefijo por toda la colección (ADR-015).
- Las 29 menciones del registro de decisiones en skills y templates pasan a
  `docs/ADR.md` (ADR-016).
- `AGENTS.md` y `AI-FIRST.md`: el ejemplo del 68 está en la portada del sitio,
  no en la landing comercial, que es otro repo.

### Estructura del repo — publicado en `prod` (c7170e3)
- `HANDOFF.md`, `ADR.md` y `SPEC-PAQUETE.md` → `docs/`, con `git mv`.
  `AI-FIRST.md` se queda en la raíz: el detector lo abre por nombre.
- `artefactos` y `superficies_de_decision` apuntan a las rutas nuevas. Nueve
  comentarios de `src/` y el mensaje del CLI para comandos mapeados, también.
- Seis rutas de otros repos en el handoff y en ADR-010 perdieron los acentos
  graves: el check 4 las cobraba como P2 desde que existe `docs/`.

### La herramienta configurada acá — sin commitear al escribir esto
- Cinco enlaces en `.agents/skills/` hacia `skills/`: `protocolo-features`,
  `protocolo-cambios`, `protocolo-cierre`, `version-bump`, `test-fix`. Cargaron
  en la misma sesión, sin reiniciar.
- `docs/changes/CHANGE_LOG.md` y `docs/changes/pending/` creados;
  `alcance.spec` declarado en `AI-FIRST.md`. El check 3 pasa de «no declarado»
  a «sin spec activa».
- `AGENTS.md`: sección «Cómo se trabaja acá» con la tabla de equivalencias, y
  una regla nueva en «What NOT to do» sobre las rutas ajenas.
- Tags locales `v0.1.0`, `v0.1.1` y `v0.1.2` sobre los commits que salieron a
  npm (975c1c4, 8fb98ed, 93c19e9).

### Coordinación con el sitio
- El sitio adoptó `docs/ADR.md` en sus cuatro menciones y verificó nuestro
  `prod`. De paso corrigió dos errores propios: un aviso que decía que el
  detector estaba sin publicar, y un conteo de 9 templates.
- Sin decidir: el archivado del registro de sesión pasadas ~50 entradas, que el
  manual define y la skill no implementa, y quitar el «sesión N» de las
  entradas. El sitio y esta sesión coinciden en hacer las dos.

### Validación
- typecheck → PASS (tsc corre dentro de `pnpm test`)
- lint      → no ejecutado (no hay script de lint)
- tests     → PASS (60/60, exit 0)
- audit:self → 0 / 100

### Pendiente para la siguiente sesión
- [ ] **El `init` completo.** Los seis pasos que esta sesión hizo a mano son su
      lista de aceptación: enlazar o copiar las skills elegidas, crear
      `docs/changes/pending/` y `docs/changes/CHANGE_LOG.md`, declarar
      `alcance.spec`, abrir `docs/SESSION_LOG.md`, añadir la sección de
      equivalencias a `AGENTS.md`, y no tocar nada que ya exista. Arrancar con
      `/protocolo-features`; es el pendiente que `docs/HANDOFF.md` tiene primero
      después del publish. **Su primera corrida real es sobre este repo**: si no
      lo configura, no está terminado (regla en `AGENTS.md`).
- [ ] Decidir las dos divergencias de `protocolo-cierre` con el manual
      (archivado y numeración) e implementarlas. Toca una skill protegida:
      aviso al sitio.
- [ ] `CHANGELOG.md` en la raíz —no confundir con `docs/changes/CHANGE_LOG.md`—
      y, en el sitio, un componente que lea la versión de npm y las notas del
      CHANGELOG. Es la petición con la que arrancó la sesión.
- [ ] Cuatro hallazgos del detector, anotados en `docs/HANDOFF.md` bajo la
      entrada del 2026-09-18.
