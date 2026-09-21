---
name: protocolo-cierre
description: "Ejecuta la Fase A del protocolo de cierre de sesión: actualiza el SESSION_LOG, actualiza los docs afectados y enruta los aprendizajes al destino correcto según el árbol de decisión del AGENTS.md, incluida la fila del ADR cuando la sesión tomó una decisión arquitectónica. Activar al terminar cualquier sesión de implementación, antes de hacer commit. Las Fases B (verificar) y C (commit) las hace el humano."
---

## Propósito

Automatizar la **Fase A** del protocolo de cierre. Es la única fase delegable a la AI.

```
Fase A — Documentar      → la AI (este skill)
Fase B — Verificar       → el humano, no delegable
Fase C — Commit          → el humano, no delegable
```

La razón de la separación: la AI puede describir lo que hizo, pero no puede juzgar si lo que hizo está bien. Y un commit es una firma — la firma tiene dueño.

## Cuándo activar

- Al terminar una sesión de implementación de features
- Al terminar una sesión de corrección de bugs que modificó comportamiento
- Al terminar una sesión de gestión de cambios
- Al terminar un refactor que afectó la arquitectura

**NO activar para:** sesiones exploratorias sin cambios de código, fixes de typos, sesiones de solo lectura.

---

## Ejecución — pasos en orden estricto

### Paso 1 — Recopilar contexto objetivo

```bash
git diff --name-only HEAD    # archivos con cambios staged + unstaged
git status --short           # resumen completo, incluyendo untracked
git log --oneline -10        # últimos commits, para entender el hilo
```

Leer además:
- Las últimas 2 entradas del `docs/SESSION_LOG.md` — para no duplicar y seguir la numeración
- El `docs/changes/CHANGE_LOG.md` — para saber si algún cambio se completó en esta sesión

> **No fabricar.** Lo que no aparece en `git diff` no pasó. Un log de sesión inventado es peor que no tener log: se lee como verdad en la sesión siguiente.

### Paso 2 — Verificar migraciones pendientes

**El hueco que este paso cierra:** se modifica el schema pero se olvida crear la migración. Los tests unitarios mockean la BD y los E2E corren contra una base ya migrada localmente — ninguno de los dos lo detecta. El desalineamiento aparece en producción.

| Condición | Acción |
|-----------|--------|
| El schema no cambió | Saltar este paso |
| El schema cambió **y** hay una migración nueva | OK — anotarlo en el reporte |
| El schema cambió y **no** hay migración | **Bloqueante suave.** Avisar explícitamente en el reporte de Fase B |

**No ejecutar la migración por tu cuenta** — modifica la base local y requiere elegir un nombre descriptivo. Solo avisar.

### Paso 3 — Construir la entrada del SESSION_LOG

```markdown
## YYYY-MM-DD (sesión N) — [Descripción breve]

### Resumen
[1-2 líneas de qué se logró]

### [Una sección por tarea o área de cambio]
- [Cambio específico]

### Validación
- typecheck → [PASS / FAIL / no ejecutado]
- lint      → [PASS / FAIL / no ejecutado]
- tests     → [PASS / FAIL / no ejecutado]

### Pendiente para la siguiente sesión
- [ ] [Tarea — con el contexto necesario para retomarla en frío]
```

Reglas:
- Número de sesión: el último + 1
- Insertar **al tope** del archivo, después del header
- Si no sabes si el typecheck pasó, escribe "no ejecutado". **Nunca** un PASS inventado
- El "pendiente" se escribe para alguien que no estuvo en la sesión — incluye el contexto, no solo la tarea

### Paso 4 — Actualizar los docs afectados

| Documento | Actualizar si… |
|-----------|---------------|
| `AGENTS.md` | Cambió una regla arquitectónica activa, un comando o la estructura del repo |
| `docs/ADR.md` | Se tomó una decisión arquitectónica: difícil de revertir, con alternativas reales descartadas. Fila nueva, nunca editar una vieja |
| Guía de diseño | Se crearon patrones visuales nuevos o cambió uno existente |
| Inventario de componentes | Se creó, modificó, deprecó o renombró un componente compartido (gate obligatorio) |
| Documento de arquitectura | Se agregó un módulo, cambió un pilar o cambió el stack |
| `docs/changes/CHANGE_LOG.md` | Se completó un cambio — moverlo de `docs/changes/pending/` y eliminar el archivo |

**Regla de oro:** si el doc no fue afectado por esta sesión, no lo toques. No "mejorar de paso" secciones no relacionadas.

### Paso 5 — Enrutar los aprendizajes

Si en la sesión apareció un error, un gotcha o una decisión no obvia, tiene que ir a **un** destino — no a todos:

| Tipo de aprendizaje | Destino |
|------|---------|
| Invariante arquitectónico **activo** | `AGENTS.md`, sección «Qué NO hacer» |
| **Por qué** se eligió algo, y qué se descartó | `docs/ADR.md`, fila nueva |
| Cicatriz de stack: fix de una librería o versión | `docs/TECH_NOTES.md`, por stack |
| Regla visual, microinteracción o UX | Guía de diseño, sección «Gotchas» |
| Decisión de un módulo específico | La spec de ese módulo |

> **`AGENTS.md` y `docs/ADR.md` no compiten: guardan cosas distintas de la misma
> decisión.** En el primero va la regla en presente —«el dominio no importa de
> infraestructura»—; en el segundo, por qué esa regla existe y qué se consideró
> antes. Si la decisión cambia, la regla se reescribe y el ADR **no**: se agrega
> uno nuevo que lo supera. Esa asimetría es el punto.

**Filtro antes de agregar algo al AGENTS.md:**

> *«¿Remover esto haría que la próxima sesión cometa un error ahora mismo?»*

Si la respuesta no es inmediata, va a `docs/TECH_NOTES.md`. El AGENTS.md tiene techo — pasado ese techo, agregar una regla **debilita** las demás.

### Paso 6 — Evaluar el bump de versión

Clasificar la sesión según las reglas del skill `version-bump`:

- Feature con módulo nuevo o cambio completado → **MINOR**
- Fixes, refactors, tests → **PATCH**
- Solo docs o chores → **ninguno**
- Breaking change explícito → **MAJOR**

Si amerita bump, ejecutar `version-bump` (que pedirá confirmación). Si no, indicarlo en el reporte.

### Paso 7 — Reportar

```
✓ docs/SESSION_LOG.md actualizado (sesión N)
✓ [Doc actualizado] — [qué sección]
  (si no hubo otros: "No se actualizaron otros docs — la sesión no los afectó")
✓ Versión: 0.X.X → 0.Y.Z (MINOR)  |  "sin cambio (solo fixes/docs)"
✓ Schema: sin cambios  |  "schema + migración presentes"  |  "⚠ schema modificado SIN migración"
✓ ADR: sin decisiones esta sesión  |  "ADR-00N agregado"  |  "⚠ hubo decisión y no se registró"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE B — Tu turno (no delegable):

□ ¿El resumen refleja lo que hiciste? (cruzar con git diff --name-only)
□ ¿Los docs actualizados son precisos? (leer las secciones modificadas)
□ ¿Los aprendizajes agregados son reales, no genéricos?
□ ¿Pasa la suite completa de tests?
□ ¿Quedó algo sin documentar?
□ Si hubo bump: ¿las versiones quedaron sincronizadas?

Cuando todo esté verde → Fase C: commit de código + docs juntos.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Qué NO hacer

- NO hacer cambios de código — este skill es solo documentación.
- NO escribir "tests → PASS" si no se ejecutaron. Escribir "no ejecutado".
- NO agregar aprendizajes genéricos ("no usar eval()") — solo los reales de esta sesión.
- NO tocar docs que la sesión no afectó.
- NO engordar el AGENTS.md con gotchas de stack ya resueltas.
- NO fabricar archivos modificados — solo los que aparecen en `git diff` / `git status`.
- NO hacer el commit. Eso es Fase C.

---

## Adaptación a tu proyecto

1. Ajusta la tabla de documentos a los artefactos reales de tu proyecto.
2. El árbol de enrutamiento de aprendizajes es lo más valioso de este skill: define los destinos **antes** de necesitarlos, o todo termina en el AGENTS.md.
3. Si no versionas, elimina el Paso 6.

Capítulo de referencia: Falcux AI-First — Parte III, «Protocolo de cierre de sesión».
