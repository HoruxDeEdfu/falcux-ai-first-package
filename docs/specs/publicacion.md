# La publicación — `prod` avanza con versión nueva y npm la recibe sola

> Spec de feature, con el formato de `templates/SPEC_MODULO_TEMPLATE.md`. No
> tiene modelo de datos, permisos, API ni interfaz: es un flujo de integración
> continua de este repo y no se reparte con el paquete. Estado: **pedida por
> Charlie el 2026-09-29**. Es el pendiente 4 del handoff, que ADR-007 dejó
> abierto el 2026-09-17. La pre-implementación (`protocolo-features`, pasos 1,
> 2, 5 y 7) está en este documento. Los pasos 3, 4 y 6 no aplican, porque el
> feature no tiene interfaz.

## Contexto de negocio [OBLIGATORIO]

ADR-007 dice que mergear a `prod` despliega dos cosas: los raw links del sitio,
al instante, y npm cuando la versión del `package.json` cambió. Lo segundo nunca
existió. Las nueve versiones publicadas salieron a mano, y el paso manual falló
de cuatro maneras distintas:

- **La `0.2.1` falló por la sesión de npm caducada** en la máquina.
- **La `0.3.0` falló porque `prod` iba detrás** de lo que se quería publicar.
- **La `0.5.0` falló dos veces por autenticación** (`PUT 404` y `PUT 401`). Se
  quedó con el tag y nunca llegó al registro.
- **La `0.5.2` salió desde `cc776eb` y no desde el commit del bump**, así que
  publicó cuatro cambios con un número que no los contaba (CHG-015). Salió con
  `npm publish`, que no lee el `publishBranch` de pnpm: la compuerta de rama no
  actuó.

Ninguna versión lleva provenance, porque publicar a mano sin crear un token de
larga vida no la permite.

## Alcance [OBLIGATORIO]

**Incluye**

1. Un flujo `.github/workflows/publish.yml` que corre en cada push a `prod`, y
   sólo ahí.
2. El flujo compila y corre la suite (`pnpm test`). Si falla, no publica.
3. El flujo corre el detector sobre el rango que se publica,
   `github.event.before`...`HEAD`, **con `--estricto`**. Un P1 frena la
   publicación. Si el rango no tiene base (el push que crea la rama), el paso
   se omite y lo dice.
4. El flujo compara la versión del `package.json` con la **lista completa de
   versiones del registro**, no sólo con `latest`. Si la versión ya existe,
   termina en verde sin publicar y lo dice. Si no existe, publica. Así una
   versión que se quedó con tag y sin registro, como la `0.5.0`, se reintenta
   sola en el siguiente push.
5. Antes de publicar comprueba que `CHANGELOG.md` tenga la entrada
   `## [X.Y.Z] — AAAA-MM-DD` de esa versión y que no diga «sin publicar». Es la
   regla de CHG-004 convertida en compuerta.
6. Publica con `npm publish --access public`, autenticado por **trusted
   publishing (OIDC)**, sin token guardado en el repo. npm genera la provenance
   solo.
7. Si el tag `vX.Y.Z` existe y no apunta al commit que se publica, deja una
   advertencia en la corrida. No mueve ni crea tags: eso lo hace Charlie.
8. Dos pushes seguidos a `prod` no publican en paralelo: `concurrency` los pone
   en fila.
9. Una prueba en `test/` que lee el flujo y fija sus invariantes: sólo push a
   `prod`, `id-token: write`, ningún secreto, `npm publish` y no
   `pnpm publish`, y la fila de `concurrency`.

**No incluye**

- **Crear el tag.** AGENTS.md lo reserva a Charlie, y `version-bump` arranca
  desde el último tag. Automatizarlo es otra decisión.
- **Subir la versión.** Sigue siendo `version-bump`, y subirla sigue siendo la
  decisión de publicar (ADR-007).
- **Pasar a pnpm 11** para usar `pnpm publish` con OIDC. Es otra dependencia de
  herramienta, con su propia migración y con un defecto abierto justo en este
  camino (pnpm/pnpm#11513).
- **Arreglar que el flujo `ai-first.yml` de este repo sólo corra en
  `pull_request`**, cuando acá se empuja directo a `dev` y se avanza `prod` con
  `--ff-only`. Hoy ese flujo no corre nunca. Es un cambio de algo que existe:
  va por `protocolo-cambios` si se decide. Este flujo nuevo lo compensa en
  parte, porque corre la suite y el detector antes de cada publicación.
- **Avisar al sitio.** Lo sigue mandando la sesión que hizo el `version-bump`,
  en su cierre.

## Dependencias [OBLIGATORIO]

- **npm CLI 11.5.1 o superior, y Node 22.14 o superior**, que es lo que exige
  trusted publishing según la documentación de npm, consultada el 2026-09-29.
  Node 22 trae npm 10, así que el flujo instala npm 11 antes de publicar.
- **pnpm 10.28.2 no maneja OIDC al publicar.** Ninguna versión 10.x lo anuncia;
  llegó con pnpm 11. Por eso el flujo compila con pnpm y publica con npm. Es la
  herramienta con la que salió la `0.5.2`, y su tarball era idéntico al commit.
- **El campo `repository` del `package.json` tiene que coincidir exactamente
  con el repo de GitHub.** Hoy dice
  `git+https://github.com/HoruxDeEdfu/falcux-ai-first-package.git`, y coincide.
- **Configuración manual de Charlie en npmjs.com**, antes del primer push a
  `prod` que suba la versión: trusted publisher para `@falcux/ai-first`, usuario
  `HoruxDeEdfu`, repositorio `falcux-ai-first-package`, workflow `publish.yml`,
  sin environment. Sin eso, el paso de publicar falla con 404 y no se publica
  nada: falla cerrado.
- Sin dependencias de ejecución nuevas. La prueba usa `yaml`, que ya está.
- No toca `src/`, `plantillas/`, `skills/` ni `templates/`. No cambia lo que
  viaja en el tarball: `.github/` no está en `files`.

### Inventario de reuso (Paso 2)

| Pieza | Decisión | Justificación |
|---|---|---|
| Checkout, pnpm y Node en el flujo | Reusa los pasos de `.github/workflows/ai-first.yml` | Las mismas acciones, con las mismas versiones y `fetch-depth: 0`, porque el detector necesita la historia |
| Suite y detector antes de publicar | Reusa `pnpm test` y `node dist/src/cli.js audit --base` | Es lo mismo que ya corre el `pre-push` de `.githooks/`. Acá se usa `--estricto` porque es la última compuerta antes de algo irreversible |
| Comparar la versión con el registro | Nueva local, en el flujo | Sólo la publicación la necesita. El detector no puede usarla: no habla con la red (ADR-019) |
| Compuerta del CHANGELOG | Nueva local, en el flujo | Es un `grep` de una línea. Si algún día `version-bump` la necesita también, se extrae |
| Prueba de invariantes del flujo | Nueva local, `test/publicacion.test.ts` | Ninguna prueba lee flujos de este repo. Las de `init` prueban la plantilla que se reparte, que es otra cosa |

## Reglas de negocio [OBLIGATORIO]

- **Publicar es irreversible**: npm no deja reutilizar un número. Por eso toda
  duda cierra: si el registro no responde o el rango no se puede auditar, el
  flujo falla y no publica.
- **La versión que existe en el registro es la que manda**, no la del tag ni la
  de `latest`.
- **Lo que se publica es la punta de `prod`**, que es el commit que disparó el
  flujo. Con esto, CHG-015 ya no puede repetirse sin que se vea, porque el paso
  del tag avisa.

## Criterios de aceptación [OBLIGATORIO]

1. Un push a `prod` con una versión que ya está en el registro termina en verde
   y dice «ya publicada».
2. Un push a `dev` no dispara el flujo.
3. Una versión sin entrada fechada en `CHANGELOG.md` no se publica.
4. Un P1 en el rango frena la publicación.
5. `pnpm test` incluye la prueba de invariantes y está en verde.
6. El primer push a `prod` después de este feature, con `0.5.2` ya publicada,
   corre el flujo entero y termina en «ya publicada». Es la verificación del
   cableado. El paso de publicar en sí, por OIDC, recién se prueba con la
   siguiente versión: no hay forma de ensayarlo sin publicar.

## Archivos del módulo [OBLIGATORIO]

- `.github/workflows/publish.yml`
- `test/publicacion.test.ts`
- `docs/ADR.md`: fila nueva, porque cómo se publica es difícil de revertir y
  tiene alternativas reales descartadas.
- `docs/specs/README.md`: la fila de esta spec.

## Secuencia de implementación (Paso 7)

Es la variante de infraestructura sin capas: no hay schema, dominio ni
interfaz. Se hacen los pasos 4 (el flujo), 7 (la prueba), 8 (la suite) y 10
(la verificación final), en ese orden. La verificación es `pnpm test` en verde
por su código de salida, y `audit:self` en 0 / 100. `actionlint` se corre si
está instalado. Si no, se dice que no se corrió.

## El Release de GitHub (CHG-019, 2026-09-30)

El flujo de publish no crea el Release: lo crea `.github/workflows/release.yml`
cuando Charlie empuja el tag `vX.Y.Z`. Crearlo al publicar habría puesto el tag
desde el flujo, porque a esa hora todavía no existe. El flujo del Release:

1. Corre sólo con el push de un tag `v*.*.*`, con `contents: write` y sin
   `id-token`.
2. Falla si el `package.json` del commit del tag dice otra versión, o si la
   versión no está en npm. Un tag que nunca llegó al registro, como `v0.5.0`,
   no gana Release. Como el tag suele llegar antes de que el publish termine,
   espera hasta 10 minutos a que npm sirva la versión, consultando cada 30
   segundos (CHG-021).
3. Toma como cuerpo la entrada de la versión en `CHANGELOG.md`, sin su
   cabecera, y falla si no está, si está vacía o si dice «sin publicar».
4. Si el Release ya existe, no lo toca: mover un tag no lo duplica.
5. Crea el Release con `--verify-tag`, que nunca crea un tag.

Las versiones hasta la `0.5.4` no tienen Release, y no se van a crear
(Charlie, 2026-09-30). La prueba de invariantes cubre también este flujo.
