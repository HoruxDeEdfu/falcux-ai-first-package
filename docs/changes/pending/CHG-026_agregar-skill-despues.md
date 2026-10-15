# CHG-026: agregar una skill después de `init`, adaptada, y una skill suelta sin la metodología

## Metadata

- **Fecha:** 2026-10-15
- **Solicitado por:** Charlie, al preguntar cómo se instala una sola skill y cómo se agrega una olvidada
- **Tipo:** Cambio de requerimiento
- **Estado:** Pendiente
- **Flujo:** completo (código en cuatro módulos, pruebas, el contrato de `AI-FIRST.md` y dos specs)
- **Migración de datos:** ninguna. Las claves nuevas del frontmatter son opcionales; un `AI-FIRST.md` sin ellas sigue valiendo
- **Relación con otros cambios:** extiende ADR-019 (la entrevista adapta las skills) y ADR-025 (la selección de skills); toca el mismo comando que sugiere CHG-025 («init --skills protocolo-arranque»), que con esto sale adaptado

## 1. Qué cambia

Dos escenarios, el mismo comando:

1. **Una skill olvidada.** `init --skills X` en un repo ya configurado instala
   X **y la adapta** con lo que respondió la entrevista original, sin volver a
   preguntar. Para eso `init` guarda en el frontmatter de `AI-FIRST.md` las
   respuestas que hoy se pierden.
2. **Una skill suelta.** `init --solo-skills --skills X` instala sólo la skill
   y el enlace `.claude/skills`. No escribe `AI-FIRST.md`, ni `docs/`, ni el
   bloque de `AGENTS.md`, ni el hook, ni el flujo de CI.

## 2. Por qué cambia

Hoy la segunda corrida instala la skill, pero sin adaptar, y una skill sin
adaptar «es peor que no tenerla» (`skills/README.md`). Y quien quiere sólo una
skill no tiene cómo: `init` siempre escribe la metodología entera.

| Evidencia | Estado |
|---|---|
| Cuándo se adapta | `src/init.ts:742`: sólo `if (respuestas)`, es decir, sólo si hubo entrevista en esta corrida |
| Si la segunda corrida entrevista | No por defecto: el repo ya está documentado (`proyectoDocumentado`), así que la entrevista se ofrece y se salta |
| Qué respuestas sobreviven | `generarAiFirst` (`src/init.ts:177`) guarda `fase`, `perfil` y `verificacion`. Se pierden `secuencia`, `agentes`, `typecheck`, `lint` y `manifiesto` |
| Qué usa la adaptación | `src/adaptacion.ts`: `perfil` (todas), `verificacion`, `secuencia` y `agentes` (features, test-fix), `typecheck` y `lint` (features, test-fix), `manifiesto` (version-bump, cierre) |
| Si una clave nueva rompe a un detector viejo | No: `interpretar` (`src/ai-first-md.ts:166`) ignora las claves que no conoce; sólo `formato` desconocido detiene |
| Cómo instalar una skill sin el resto | No hay bandera. `--sin-hook` y `--sin-ci` apagan dos piezas; `AI-FIRST.md`, `docs/` y el bloque de `AGENTS.md` se escriben siempre |

## 3. Estado actual

- `iniciar` (`src/init.ts:636`) escanea, entrevista si el CLI se lo pide,
  escribe `AI-FIRST.md` si falta, el ADR, `docs/`, las skills elegidas
  (saltando entera la que exista, ADR-014), la adaptación **sólo con
  respuestas de esta corrida**, el enlace `.claude/skills`, el hook, el CI y el
  bloque de `AGENTS.md`.
- `aplicarRespuestas` (`src/init.ts:574`) pone las respuestas sobre el escaneo;
  `bloqueDeSkill(nombre, respuestas, escaneo)` (`src/adaptacion.ts`) arma el
  bloque de cada skill; `adaptarSkill` (`src/init.ts:848`) lo escribe entre
  marcas, y respeta las enlazadas y las copias de workspace.
- `interpretar` lee `perfil` y `verificacion`, no las demás respuestas.
- Si `AI-FIRST.md` ya existe, no se toca: `sugerirAlcance` es el precedente de
  cómo se sugiere una clave que falta sin escribirla.

## 4. Estado deseado

### Persistir las respuestas

- `generarAiFirst` escribe, cuando hubo entrevista, un mapa nuevo en el
  frontmatter:

  ```yaml
  # Lo que respondió la entrevista y no se puede deducir del repo. init lo usa
  # para adaptar las skills que se instalen después. audit no lo lee.
  adaptacion:
    secuencia: contrato-cli
    agentes: no
    typecheck: "pnpm exec tsc --noEmit"
    lint: ""            # vacío: este proyecto no tiene comando de lint
    manifiesto: package.json
  ```

  Una respuesta vacía se guarda vacía: «no hay lint» también es respuesta
  (`aplicarRespuestas` ya la trata así).
- `interpretar` lee `adaptacion` como mapa opcional de cadenas; un valor que no
  sea cadena es error de formato, igual que `perfil`. `audit` no lo usa.
- `SPEC-PAQUETE.md` §5 documenta la clave. Sigue siendo `formato: 1`.

### Adaptar sin entrevista

- Sin entrevista en esta corrida, `iniciar` reconstruye las respuestas desde
  `AI-FIRST.md`: `perfil`, `verificacion`, `fase` y el mapa `adaptacion`. Con
  eso adapta **sólo las skills que escribió en esta corrida**; las que ya
  estaban no se tocan (puede haberlas adaptado el humano a mano dentro de las
  marcas, y esta corrida no tiene nada nuevo que decirles).
- Si `AI-FIRST.md` no tiene `perfil`, no hay adaptación: la skill nueva sale
  `sugerido`, con la razón «AI-FIRST.md no tiene perfil; corre init --entrevista».
- Si hay `perfil` pero no `adaptacion` (un repo iniciado con la 0.6.x), se
  adapta con lo que haya y lo que falte queda fuera del bloque, como ya hace
  `adaptacion.ts` con las respuestas vacías.
- Con entrevista en esta corrida, mandan sus respuestas, como hoy. Si
  `AI-FIRST.md` ya existía, no se reescribe: el bloque `adaptacion` sale como
  `sugerido`, con el YAML para pegar, al estilo de `sugerirAlcance`.

### `--solo-skills`

- Requiere `--skills`: sin lista sale con 2. Elegir «las cinco por defecto» de
  una metodología que no se está adoptando no tiene sentido.
- Escribe sólo `.agents/skills/<x>` y `.claude/skills`, con las mismas reglas
  de siempre: nunca sobreescribe, salta entera la que exista.
- No escribe `AI-FIRST.md`, ADR, `docs/`, bloque de `AGENTS.md`, hook ni CI.
- Adapta si hay `AI-FIRST.md` con perfil; si no, ver §12.

**Lo que no cambia:**

- `init` sin banderas nuevas hace lo mismo que hoy en un repo nuevo, salvo el
  mapa `adaptacion` en el `AI-FIRST.md` que escribe tras entrevistar.
- `init` sigue sin sobreescribir nada (ADR-003). Ninguna skill ya instalada se
  re-adapta sin entrevista.
- `audit` no cambia: no lee `adaptacion`.
- Las skills enlazadas y las copias de workspace siguen sin adaptarse.

## 5. Alternativas consideradas

- **Un comando nuevo, `ai-first agregar X`.** Descartada por Charlie el
  2026-10-15: en un repo iniciado `init` ya salta todo lo demás, y
  `init --skills X` es lo que enseñan el README y CHG-025. Un comando más es
  superficie pública sin ganancia.
- **Guardar las respuestas en un archivo aparte** (un JSON junto a las
  skills). Descartada: es un archivo más que viaja y nadie lee, y `perfil` y
  `verificacion` ya viven en el frontmatter.
- **No guardar nada y reconstruir del escaneo.** Descartada: `typecheck`,
  `lint` y `manifiesto` se deducen, pero `secuencia` y `agentes` no, y la
  respuesta de la entrevista puede diferir de lo deducido.
- **Leer las respuestas de las skills ya adaptadas.** Descartada: es parsear
  prosa generada, y el humano puede haberla editado.
- **Dejar la skill suelta en la vía manual del README.** Descartada por
  Charlie el 2026-10-15: entra en este cambio.

## 6. ¿Es una decisión arquitectónica?

Sí. Agrega una clave al contrato de `AI-FIRST.md`, que comparten `init` y
`audit` y que el sitio documenta, y abre un modo de `init` que instala skills
sin la metodología, cosa que hasta hoy el paquete no hacía a propósito.

**Decisión:** sí → ADR-026, escrita con la apertura de este documento

## 7. Análisis de impacto

### Archivos afectados

- [ ] `src/ai-first-md.ts` — leer el mapa `adaptacion`
- [ ] `src/init.ts` — escribirlo en `generarAiFirst`, reconstruir respuestas desde `AI-FIRST.md`, adaptar sólo lo escrito en la corrida, el sugerido del bloque, el modo `--solo-skills`
- [ ] `src/cli.ts` — la bandera `--solo-skills`, su validación y la ayuda
- [ ] `src/adaptacion.ts` — sólo si reconstruir obliga a tocar `bloqueDeSkill`; se evita si alcanza con pasarle respuestas armadas
- [ ] `test/ai-first-md.test.ts` — la clave nueva, válida e inválida
- [ ] `test/init.test.ts` — los casos de §10
- [ ] `test/cli.test.ts` — `--solo-skills` sin `--skills`, y la ayuda
- [ ] `docs/SPEC-PAQUETE.md` — §5, la clave `adaptacion`
- [ ] `docs/specs/init-completo.md` — la segunda corrida y el modo suelto
- [ ] `skills/README.md` — agregar una skill después, y la skill suelta
- [ ] `README.md` — la bandera nueva, si la lista de opciones vive ahí
- [ ] `AI-FIRST.md` — el bloque `adaptacion` de este repo, para que su propio `init` lo use
- [ ] `docs/ADR.md` — ADR-026
- [ ] `docs/changes/pending/CHG-026_agregar-skill-despues.md` — este documento
- [ ] `docs/SESSION_LOG.md` y `docs/HANDOFF.md` — la apertura y el cierre
- [ ] `docs/changes/CHANGE_LOG.md` — el resumen al cerrar

### Datos

- [ ] ¿Modifica un schema de validación? sí — el frontmatter de `AI-FIRST.md`, con una clave opcional
- [ ] ¿Modifica el modelo de datos? no
- [ ] ¿Requiere migración? no: sin la clave, todo sigue como hoy

### Dependencias

- [ ] ¿Afecta otros módulos? `audit` no; comparte el lector
- [ ] ¿Afecta contratos públicos? sí — el formato de `AI-FIRST.md` y una bandera de la CLI. Aviso al sitio
- [ ] ¿Hay tests que van a fallar? los que comparan el `AI-FIRST.md` generado tras entrevistar, y los que fijan la ayuda
- [ ] ¿Toca una Zona Prohibida? no: el `AI-FIRST.md` de este repo no declara ninguna (`audit:self` la omite)
- [ ] ¿Es incompatible para usuarios existentes? no

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Re-adaptar una skill que el humano ya tocó | media | alto | Sin entrevista, sólo se adaptan las escritas en esta corrida |
| El `AI-FIRST.md` de un repo iniciado con la 0.6.x no trae `adaptacion` | alta | bajo | Se adapta con lo que haya; lo que falta no se escribe |
| `--solo-skills` se usa en un repo con metodología y el adoptante cree que la configuró | baja | medio | El reporte dice qué no se escribió |

## 9. Plan de implementación

1. El contrato: `src/ai-first-md.ts`, `test/ai-first-md.test.ts`, `docs/SPEC-PAQUETE.md` §5.
2. Escribir el mapa al entrevistar: `generarAiFirst` en `src/init.ts` y su prueba.
3. Reconstruir y adaptar sin entrevista, y el sugerido del bloque: `src/init.ts` y sus pruebas.
4. `--solo-skills`: `src/init.ts`, `src/cli.ts` y sus pruebas.
5. Documentación: `docs/specs/init-completo.md`, `skills/README.md`, `README.md`, el `AI-FIRST.md` de este repo.

## 10. Plan de validación

- [ ] `pnpm test` en verde por su exit code
- [ ] `pnpm run audit:self` en 0 / 100
- [ ] Repo desechable: `init` con entrevista fijada → el `AI-FIRST.md` trae `adaptacion` y `audit` lo lee sin error
- [ ] Mismo repo: `init --skills i18n` sin entrevista → `i18n` escrita y adaptada; las cinco anteriores sin tocar
- [ ] Repo con `AI-FIRST.md` sin `perfil`: `init --skills i18n` → instalada, adaptación `sugerido`
- [ ] Repo vacío: `init --solo-skills --skills i18n` → sólo `.agents/skills/i18n` y `.claude/skills`
- [ ] `init --solo-skills` sin `--skills` → exit 2
- [ ] Adyacentes: `init` en repo nuevo, con y sin entrevista, da lo mismo que hoy salvo el mapa

## 11. Rollback

- ¿Reversible con `git revert`? sí
- ¿Fuera del repo? Si sale publicado, los `AI-FIRST.md` escritos con la clave
  siguen siendo válidos para una versión vieja: la ignora.

## 12. Decisiones abiertas

Criterio de Charlie para todas, el 2026-10-15: la solución más limpia, no la
más rápida.

1. ¿`--solo-skills` inicializa git si la carpeta no es repo? —
   **Respuesta (2026-10-15):** no; una skill suelta no necesita git.
   Consecuencia para el análisis: `escanear` lista con git (`listarArchivos`),
   así que sin repo hay que resolver de dónde salen los valores por defecto de
   la entrevista reducida sin un camino paralelo a medias.
2. ¿`--solo-skills` entrevista cuando hay terminal y no hay `AI-FIRST.md` con
   perfil? — **Respuesta (2026-10-15):** sí, sin persistir, porque no hay
   dónde. La entrevista pregunta sólo las claves que usan las skills elegidas:
   cada adaptación de `src/adaptacion.ts` declara qué respuestas lee y la
   entrevista se filtra por eso, en vez de mantener a mano una segunda lista de
   preguntas. Sin terminal, la skill sale sin adaptar y el reporte lo dice.
3. ¿El nombre de la bandera? — **Respuesta (2026-10-15):** `--solo-skills`.
4. ¿`--solo-skills` escribe el bloque de `AGENTS.md`? — **Respuesta
   (2026-10-15):** no; ese bloque nombra `docs/SESSION_LOG.md` y
   `docs/changes/`, que en ese modo no existen.

---

## 13. Implementación

### Commits

### Notas durante la implementación

---

## 14. Cierre

- [ ] El estado deseado (§4) se cumple; validaciones de §10 en verde
- [ ] «Documentación a actualizar» al día
- [ ] ADR-026 escrita
- [ ] Resumen en `docs/changes/CHANGE_LOG.md`
- [ ] SESSION_LOG con la sesión donde se hizo
- [ ] Aviso al sitio: cambia el formato de `AI-FIRST.md` y hay bandera nueva
- [ ] Este archivo eliminado de `pending/`
- [ ] Estado final: Completado

**Fecha de cierre:**
