# CHG-025: `init` avisa cuando un proyecto sin documentación queda sin `protocolo-arranque`

## Metadata

- **Fecha:** 2026-10-15
- **Solicitado por:** Charlie, al revisar en qué casos se instala `protocolo-arranque`
- **Tipo:** Ajuste de diseño
- **Estado:** Pendiente
- **Flujo:** completo (cinco archivos de código y prueba, más la spec)
- **Migración de datos:** ninguna
- **Relación con otros cambios:** extiende ADR-019 (la entrevista y la skill de arranque) y ADR-025 (la selección de skills en la entrevista)

## 1. Qué cambia

Cuando `init` corre sobre un proyecto sin documentación —carpeta vacía, sólo
`.git`, o código sin `docs/`— y al terminar `protocolo-arranque` no está
instalada, el reporte lo dice en una línea propia: que el proyecto parece sin
definir, qué hace esa skill y el comando para instalarla. Hoy se queda fuera
sin que nada lo diga.

## 2. Por qué cambia

`protocolo-arranque` es la skill que lleva de una idea al PRD, la arquitectura
y las specs. `init` sólo la instala cuando entrevista, y hay cuatro caminos en
los que un proyecto sin nada definido termina sin ella y sin aviso. El más
probable es el primero: un agente que corre `init` por el adoptante no tiene
terminal interactiva.

| Evidencia | Estado |
|---|---|
| Quién decide instalarla | `src/init.ts:663`: sólo entra con perfil de entrevista (`[...skillsDelPerfil(perfil), SKILL_ARRANQUE]`); sin entrevista, `SKILLS_POR_DEFECTO`, que no la trae |
| Cuándo hay entrevista | `src/cli.ts:266`: `!--sin-entrevista && hayTerminal()` |
| Qué dice la salida sin terminal | `src/cli.ts:279`: «Sin entrevista: no hay terminal interactiva.» No nombra la skill |
| Qué dice con `--sin-entrevista` | Nada (`test/cli.test.ts:71` lo fija) |
| Con `--skills` sin incluirla, o desmarcada en la entrevista | Se respeta y no se avisa |

## 3. Estado actual

- `iniciar` (`src/init.ts`) devuelve `items` con estado `escrito`, `saltado`
  o `sugerido`. El CLI imprime una línea por ítem con `lineaDeItem`
  (`src/cli.ts:166`).
- `proyectoDocumentado(raiz)` (`src/init.ts:556`) da las señales de
  documentación: `AI-FIRST.md`, `AGENTS.md` o hasta tres `.md` bajo `docs/`,
  del listado de git (seguidos y sin seguir no ignorados), sin contar los que
  `init` mismo escribe. Hoy sólo se consulta para pasárselo al entrevistador.
- Nada mira si `protocolo-arranque` quedó instalada.

## 4. Estado deseado

En `iniciar`:

1. `proyectoDocumentado(raiz)` se calcula **una vez, antes de escribir nada**,
   y se reutiliza para el entrevistador. Calcularlo después contaría el
   `AGENTS.md` que esta misma corrida escribió.
2. Al terminar de instalar las skills, si las señales están vacías, el paquete
   trae `protocolo-arranque` y en `.agents/skills/protocolo-arranque` no hay
   nada —ni de esta corrida ni de una anterior—, se agrega un ítem:

   ```
   sugerido .agents/skills/protocolo-arranque — el proyecto no tiene documentación todavía
            y esta skill no se instaló: es la que define el producto (PRD, arquitectura, specs).
            Instálala con «npx @falcux/ai-first@latest init --skills protocolo-arranque».
   ```

   El texto final se ajusta al implementar; lo fijo es que nombra la causa, la
   skill y el comando.
3. El CLI, además, cierra el reporte con una línea corta en el bloque de
   avisos, junto a «Sin entrevista», que remite a la lista sin repetirla:

   ```
     Proyecto sin documentación y sin protocolo-arranque: ver «sugerido» arriba.
   ```

   La lista lleva el detalle; el final, lo que se lee. El CLI la pone cuando
   `sugeridos` trae la ruta de la skill, sin volver a calcular nada.
4. El aviso sale **por cualquiera de los cuatro caminos**: sin terminal, con
   `--sin-entrevista`, con `--skills` sin la skill o desmarcada en la entrevista.
   Es un aviso, no un error: el exit code sigue en 0.

**Lo que no cambia:**

- Qué se instala por defecto. Sin entrevista siguen siendo las cinco de
  siempre; el cambio sólo avisa.
- La línea «Sin entrevista: no hay terminal interactiva.» se queda.
- Un proyecto con documentación no recibe el aviso, aunque no tenga la skill.
- `init` sigue sin sobreescribir nada.

## 5. Alternativas consideradas

- **Instalarla siempre que el proyecto no tenga documentación.** Descartada por
  Charlie el 2026-10-15: prefirió el aviso. Instalarla cambiaría qué reparte
  `init` por defecto, y quien corre con `--skills` ya eligió.
- **Un estado nuevo `aviso` en `EstadoItem`.** Descartada: `sugerido` ya
  significa «no se hizo; la razón dice qué hacer» y el CLI ya lo imprime con su
  razón. Un estado más obliga a tocar `lineaDeItem` y `ResultadoInit` sin
  ganar nada.
- **Sólo el ítem en la lista, o sólo el bloque al final.** Descartada por
  Charlie el 2026-10-15: van los dos. En un reporte de veinte líneas el ítem
  se pierde, y el bloque solo no lleva el comando.
- **Avisar sólo cuando no hubo entrevista.** Descartada: Charlie pidió que el
  repo vacío o sin docs avise siempre, y desmarcarla en la entrevista también
  deja el proyecto sin la skill.

## 6. ¿Es una decisión arquitectónica?

No. Es un aviso en el reporte y se revierte con un `git revert`.

**Decisión:** no

## 7. Análisis de impacto

### Archivos afectados

- [ ] `src/init.ts` — calcular las señales una vez, antes de escribir, y agregar el ítem sugerido
- [ ] `test/init.test.ts` — los casos de §10
- [ ] `src/cli.ts` — la línea de cierre en el bloque de avisos
- [ ] `test/cli.test.ts` — el ítem y la línea de cierre en la salida sin terminal
- [ ] `docs/specs/arranque-de-proyecto.md` — el aviso, junto a cuándo se instala la skill
- [ ] `docs/changes/pending/CHG-025_aviso-sin-arranque.md` — este documento
- [ ] `docs/SESSION_LOG.md` y `docs/HANDOFF.md` — la apertura y el cierre del CHG
- [ ] `docs/changes/CHANGE_LOG.md` — el resumen al cerrar

`lineaDeItem` no cambia: ya imprime los ítems sugeridos con su razón.

### Datos

- [ ] ¿Modifica un schema de validación? no
- [ ] ¿Modifica el modelo de datos? no
- [ ] ¿Requiere migración? no

### Pruebas que pueden fallar

Las que comparan la lista exacta de `items` o de `sugeridos` en un repo
desechable vacío y sin entrevista: ahora tendrán un ítem más. Hay que revisarlas
una por una y no relajar las aserciones.

## 9. Documentación a actualizar

- `docs/specs/arranque-de-proyecto.md`: el aviso.
- `CHANGELOG.md`: lo escribe `version-bump` cuando salga la versión.
- `README.md`: probablemente no; se revisa al cerrar.

## 10. Validación

- [ ] Repo recién creado (sólo `.git`), sin entrevista → hay ítem sugerido para `protocolo-arranque`
- [ ] Carpeta sin `.git` → `init` hace `git init` y avisa
- [ ] Repo con código pero sin `docs/` ni `AGENTS.md` → avisa
- [ ] Con entrevista que la deja marcada → no avisa
- [ ] Con entrevista que la desmarca, o con `--skills test-fix` → avisa
- [ ] Repo con un `.md` bajo `docs/` → no avisa
- [ ] Segunda corrida sobre el mismo repo, con la skill ya instalada → no avisa
- [ ] Segunda corrida sin la skill: el `AGENTS.md` que escribió la primera hace que el proyecto cuente como documentado → no avisa (ver §12.2)
- [ ] CLI sin terminal sobre repo vacío → la salida trae el ítem y la línea de cierre, y sale con 0
- [ ] CLI sobre repo documentado → ni ítem ni línea de cierre
- [ ] `pnpm test` en verde por exit code
- [ ] `pnpm run audit:self` en 0 / 100

## 11. Rollback

- ¿Reversible con `git revert`? sí
- ¿Requiere acción fuera del repo? no

## 12. Decisiones abiertas

1. ¿Es `sugerido` el estado correcto, o el aviso merece un bloque aparte al
   final del reporte, junto a «Sin entrevista»? — **Respuesta:** los dos
   (Charlie, 2026-10-15). El ítem lleva el detalle y el comando; el bloque, una
   línea que remite a él.
2. En la segunda corrida, el `AGENTS.md` que escribió la primera hace que el
   proyecto cuente como documentado, así que el aviso sale una sola vez. ¿Basta,
   o debería ignorarse un `AGENTS.md` que sólo tiene el bloque de `init`? —
   Recomiendo dejarlo así en este CHG: ignorar el
   bloque cambia también cuándo se ofrece la entrevista, y eso es otro cambio.
   — **Respuesta:** así, una sola vez (Charlie, 2026-10-15).

---

## 13. Implementación

### Commits

### Notas durante la implementación

---

## 14. Cierre

- [ ] El estado deseado (§4) se cumple; validaciones de §10 ejecutadas y en verde
- [ ] «Documentación a actualizar» al día
- [ ] Resumen agregado a `docs/changes/CHANGE_LOG.md`
- [ ] Log de sesión actualizado con la sesión donde se hizo
- [ ] **Este archivo eliminado de `pending/`**
- [ ] Estado final: Completado

**Fecha de cierre:**
