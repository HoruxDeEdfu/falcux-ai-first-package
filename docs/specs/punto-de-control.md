# El punto de control — el detector corre solo, sin que nadie se acuerde

> Spec de feature, con el formato de `templates/SPEC_MODULO_TEMPLATE.md`. Sin
> modelo de datos, permisos, API ni interfaz: un archivo que `init` escribe y un
> flujo de integración continua. Estado: **pedida por Charlie el 2026-09-22**,
> tras revisar si los hooks debían entrar al paquete y con qué forma.
> Pre-implementación (`protocolo-features`, Pasos 1, 2, 5 y 7) en este
> documento; los pasos 3, 4 y 6 no aplican a un CLI sin interfaz.

## Contexto de negocio [OBLIGATORIO]

El detector existe desde la `0.1.0` y **nadie lo corre solo**. `ai-first audit`
se invoca a mano o no se invoca, y una verificación que depende de que alguien
se acuerde es la que falla el día que importa. Este repo es la prueba: CHG-003 y
CHG-005 sobrevivieron a todas las corridas de `audit:self` en 0 porque nadie las
corrió buscando eso.

El handoff lo registraba como el hueco 5, «hooks no se entregan», y lo enunciaba
con el vocabulario de una sola herramienta: «falta el hook de PostToolUse y
Stop». Ese enunciado no sobrevive a dos comprobaciones:

1. **Los hooks quedaron fuera del estándar Agent Skills.** `.agents/skills/` lo
   leen Codex, Cursor, OpenCode y Kimi Code (ADR-008); los hooks no los lee
   nadie más que quien los define. Claude Code los declara en `settings.json`;
   Codex CLI, desde la v0.124.0, en `config.toml` o `hooks.json`; Gemini CLI
   llama `AfterAgent` a su equivalente de `Stop`; OpenCode no admite hooks de
   shell, sino plugins de TypeScript suscritos a eventos. Entregar «el hook»
   son cuatro adaptadores propietarios y un quinto en JavaScript: exactamente
   lo que la spec del paquete §8 apartó como «adaptadores por herramienta» y lo
   que ADR-008 se construyó para no tener que escribir.
2. **`PostToolUse` cobra lo que no se puede silenciar.** Corre después de cada
   escritura, cuando no hay commit. En ese modo el detector va contra el árbol
   de trabajo, y ahí la anotación `<!-- ai-first: sin-decision -->` **no se
   lee**: vive en el cuerpo del commit y sólo existe en modo `--base`. Un
   `PostToolUse` daría P1 en cada edición de una superficie de decisión sin
   dejar forma de anotarla. Un detector que no se puede callar cuando tiene
   razón se desactiva, y con él se van los otros cuatro checks.

Lo que sí falta y no depende de ninguna herramienta: el detector se diseñó con
códigos de salida para dos escenarios —la spec §7 lo dice literal, «el mismo
comando sirve en un hook local, donde interrumpir por un P2 sería intolerable, y
en integración continua, donde se quiere el corte»— y el paquete **no entrega
ninguno de los dos**. Un hook de git y un flujo de integración continua son
estándar de verdad, sirven a cualquier agente y también a un humano sin agente,
y corren donde los cinco checks tienen sentido: sobre commits que ya existen.

## Alcance [OBLIGATORIO]

**Incluye**

1. **`init` escribe un hook de `pre-push`** que corre el detector sobre lo que
   se va a publicar, sin `--estricto`: sólo un P0 interrumpe, un P1 o un P2
   avisan y dejan pasar.
2. **El hook vive en `.githooks/`, versionado**, y `init` apunta el repo con
   `git config core.hooksPath .githooks`. Lo que vive en `.git/hooks/` no viaja
   en un clon, no se ve en un diff y no gobierna a nadie más que a la máquina
   donde se escribió; el paquete vende gobierno de equipo, así que ese es el
   valor por defecto.
2b. **`--hook-local` escribe en `.git/hooks/pre-push`** y **no toca la
   configuración del repo**. Es para quien no quiere que `init` cambie su
   `core.hooksPath` ni versionar un hook: lo pidió Charlie el 2026-09-22. Las
   dos rutas producen el mismo archivo y se prueban las dos. El costo queda
   anotado: una bandera más y una decisión que el adoptante no pedía tomar.
3. **La base del rango sale de git, no de una suposición.** `pre-push` recibe
   por entrada estándar una línea por referencia con `<ref local> <sha local>
   <ref remota> <sha remoto>`; el sha remoto es la base y se pasa como
   `--base`. Una rama que aún no existe en el remoto llega con el sha en ceros:
   entonces se omite `--base` y el detector corre en modo árbol de trabajo, que
   es lo que hay.
4. **`init` escribe `.github/workflows/ai-first.yml`**, que corre el detector
   con `--base` y **con `--estricto`** sobre cada `pull_request`. Es donde el
   corte por P1 y P2 sí se quiere.
5. **Nada de esto sobreescribe.** Un `.githooks/pre-push` que ya existe se
   salta y se reporta, igual que todo lo demás (ADR-003). Un `core.hooksPath`
   ya configurado —husky, lefthook— **no se toca**: se reporta como sugerido,
   con la ruta que habría que añadir.
6. **El hook encuentra el comando sin exigir instalación global**: usa el
   `ai-first` del proyecto si está en `node_modules/.bin`, y si no, cae a
   `npx --no-install @falcux/ai-first`. Si no hay ninguno, **no rompe el push**:
   avisa en una línea y sale con 0. Un hook que bloquea por no encontrarse a sí
   mismo es un hook que se desinstala.
7. **`--sin-hook` y `--sin-ci`** para saltarlos, y las líneas correspondientes
   en `--help`, junto con `--hook-local`.
8. **Este repo adopta su propio hook en la misma sesión**, con el valor por
   defecto, por lo que `AGENTS.md` manda: lo que el paquete sepa hacer se usa
   acá antes que en ningún sitio. Desde entonces cada push pasa por el detector.

**No incluye**

- **El hook del agente.** Entra después, como adaptador opcional y con el evento
  correcto: `Stop`, el «hook de cierre» que la spec del paquete ya nombra al
  explicar que `auditoria` sólo se reescribe desde ahí o con `--registrar`. No
  `PostToolUse`, por lo dicho en el contexto. Cuando entre, será un archivo por
  herramienta y se empieza por Claude Code sin prometer las otras cuatro.
- **Adaptadores de integración continua que no sean GitHub Actions.** El comando
  ya sirve en cualquiera: lo que se entrega es un archivo de ejemplo, no una
  abstracción. GitLab o Circle se añaden cuando alguien los pida.
- **Un hook de `pre-commit`.** Se evaluó y se descartó: en `pre-commit` el
  commit todavía no existe, así que arrastra el mismo defecto que `PostToolUse`
  —el check 2 cobraría P1 sin que la anotación pueda existir aún— y además
  interrumpe en el momento de menor tolerancia. `pre-push` llega cuando los
  commits ya están escritos, el rango es exactamente el que se va a publicar y
  la anotación ya se puede leer.
- **Vigilar `publish-branch`.** Que el mismo `pre-push` pueda proteger la rama
  de publicación es cierto y queda anotado, pero es otro feature.

## Dependencias [OBLIGATORIO]

- **Ninguna nueva de ejecución.** El hook es un script de shell y el flujo es
  YAML. Sigue siendo `yaml` la única dependencia del paquete.
- **Módulos que se usan:** `src/init.ts` (escritura e informe), `src/git.ts`
  (nada nuevo; el rango lo aporta git al invocar el hook), `src/cli.ts` (las dos
  banderas y la ayuda).
- **Módulos que no se tocan:** `src/audit.ts`, `src/verificaciones/`,
  `src/puntaje.ts` y `src/ai-first-md.ts`. Este feature **no cambia qué detecta
  el detector ni cuánto puntúa**: sólo lo invoca desde otro sitio. Si hiciera
  falta tocarlos, la spec está mal.

## Reglas de negocio [OBLIGATORIO]

1. **Un hook que no se puede saltar no se adopta.** `git push --no-verify` es la
   salida y no se combate. El detector informa; la disciplina es del equipo.
2. **Local avisa, integración continua corta.** Es la misma regla de códigos de
   salida de la spec §7, aplicada: sin `--estricto` en el hook, con `--estricto`
   en el flujo.
3. **`init` nunca sobreescribe** (ADR-003), y eso incluye la configuración de
   git: un `core.hooksPath` ajeno se respeta y se reporta.
4. **El hook no habla con la red.** `npx --no-install` no descarga: si el
   paquete no está, avisa. Es la misma regla del detector (sin modelo, sin API,
   sin red) aplicada a lo que el paquete escribe.

## Archivos del módulo [OBLIGATORIO]

- `src/init.ts` — escribir el hook y el flujo; configurar `core.hooksPath`;
  los ítems nuevos del informe.
- `src/cli.ts` — `--sin-hook`, `--sin-ci` y la ayuda.
- `plantillas/pre-push` — el cuerpo del hook, como archivo y no como cadena
  incrustada, para poder leerlo y probarlo.
- `plantillas/ai-first.yml` — el flujo de integración continua.
- `test/init-punto-de-control.test.ts` — las pruebas del feature.
- `docs/HANDOFF.md` — el hueco 5, reescrito.
- `docs/ADR.md` — la fila de la decisión.
- `AI-FIRST.md` — este repo estrena su propio hook, como primer adoptante.

## Criterios de aceptación [OBLIGATORIO]

1. `init` sobre un repo limpio deja `.githooks/pre-push` ejecutable,
   `core.hooksPath` en `.githooks` y `.github/workflows/ai-first.yml`.
2. Un `push` con un P0 en el rango sale distinto de 0 y el push no ocurre.
3. Un `push` con sólo un P1 o un P2 imprime los hallazgos y **el push ocurre**.
4. Una rama que no existe en el remoto (sha en ceros) no rompe el hook.
5. Un `.githooks/pre-push` preexistente se salta y se reporta; el archivo no
   cambia ni un byte.
6. Un `core.hooksPath` ya configurado no se pisa y se reporta como sugerido.
7. Sin `ai-first` instalado ni alcanzable, el hook avisa y sale con 0.
8. `--sin-hook` y `--sin-ci` saltan lo suyo y lo dicen.
8b. `--hook-local` escribe `.git/hooks/pre-push`, deja `.githooks/` sin crear y
    **no toca** `core.hooksPath`.
9. Este repo corre con su propio hook y `pnpm test` sigue en verde.
10. `audit:self` en 0 / 100 al cerrar.

## Estado de implementación [CRECE]

**Implementada el 2026-09-22** (ADR-022). Los diez criterios de aceptación en
verde, 99 pruebas y `audit:self` en 0 / 100. Este repo corre con su propio hook
desde ese día.

## Notas de implementación [CRECE]

**El repo del paquete no puede usar su propia plantilla.** Al adoptar el hook
acá apareció lo obvio en cuanto se ve: la plantilla busca el paquete instalado
—`node_modules/.bin`, el PATH, `npx`— y este repo **es** el paquete, con su
detector en `dist/`. Con la plantilla tal cual, el hook de este repo habría
avisado de que no se encuentra y habría dejado pasar todo. Los dos archivos de
este repo llevan esa diferencia anotada arriba del todo; `init` no los volverá a
tocar porque nunca sobreescribe. La plantilla que se reparte queda sin ese caso,
que es de uno.

**Crear `.github/workflows/` despertó un P2 dormido.** En cuanto la carpeta
existió, el check 4 cobró una mención del handoff al publish.yml que sigue sin
escribirse: es exactamente lo que `AGENTS.md` advierte —una ruta entre acentos
graves se cobra en cuanto exista la primera carpeta del camino— y la regla
esperó cinco días a que alguien creara esa carpeta. Se corrigió poniendo la ruta
futura en prosa pelada.

**Lo que el detector cazó de esta misma sesión.** Dos P2 al escribir el hueco 5,
por poner entre acentos graves los archivos de configuración de Claude Code y de
Codex, que son de otras herramientas. Es la primera vez que el detector encuentra
algo antes que quien escribía, y ocurrió mientras se escribía el feature que
existe para que eso pase siempre.

## Preguntas abiertas [OPCIONAL]

Las tres se respondieron el 2026-09-22, antes de escribir código.

1. **¿`.githooks/` versionado, o `.git/hooks/` local?** — **Los dos**, con
   `.githooks/` por defecto y `--hook-local` para el otro caso. Charlie prefirió
   no obligar a quien no quiera tocar la configuración del repo.
2. **¿El flujo de integración continua entra en este feature o en otro?** —
   **En este.** Sin él el corte por P1 y P2 no existe en ningún sitio.
3. **¿Este repo adopta su propio hook en la misma sesión?** — **Sí**, con el
   valor por defecto. Es la lista de aceptación real.

## Changelog de esta spec

| Fecha | Cambio |
|---|---|
| 2026-09-22 | Escrita. Reemplaza el enunciado del hueco 5 del handoff. |
