# Especificación — `npx @falcux/ai-first`

Documento de especificación del paquete. **El paquete no está publicado**: acá se
define qué construir, no se describe algo que exista. Todo lo que este documento
llama «el detector» o «el comando» es trabajo futuro.

Estado: **`AI-FIRST.md` especificado** y sus cuatro instrumentos llevados al manual,
en `docs/parte-2/gobierno-del-contexto`. El detector y los comandos, no.

---

## 1. Por qué existe este documento

La landing (`src/pages/index.astro`) publica cuatro instrumentos —Zonas
Prohibidas, tabla ADR, matriz de permisos, entropía documental—, cinco
verificaciones con severidad y cinco comandos. Cuando se escribió este documento el
manual no definía ninguno de los cuatro: enseñaba otro vocabulario —cadena de
artefactos, `SESSION_LOG`, `CHANGE_LOG`, `CHG-XXX`, `TECH_NOTES`, `GUIA_DISENO`— y
las 8 skills siguen sin nombrarlos.

Era entropía documental del propio proyecto: la distancia entre lo que se promete y
lo que se define. Este documento la cierra por el lado de la especificación, y el
capítulo `docs/parte-2/gobierno-del-contexto` —escrito el mismo día, derivado de §3
y §4— la cierra por el lado del manual.

---

## 2. La frontera: qué es `AI-FIRST.md` y qué no

El riesgo obvio de un artefacto nuevo es duplicar `AGENTS.md`, que es
precisamente el problema que la metodología combate. La frontera es una sola
línea:

> **`AGENTS.md` es para los agentes. `AI-FIRST.md` es para las herramientas.**

`AGENTS.md` es normativo y está en presente: «no pongas lógica de negocio en los
controllers». Lo lee un modelo al abrir la sesión y tiene techo de ~150–200
líneas, porque pasado ese techo agregar una regla debilita las demás.

`AI-FIRST.md` es declarativo y no da órdenes: dice qué gobierna a este proyecto y
dónde vive cada cosa, en una forma que `audit` puede verificar sin interpretar
prosa. No lo lee el agente para trabajar; lo lee el detector para medir.

Concretamente: «no toques `/migrations`» es una regla y va en `AGENTS.md`. «La
Zona Prohibida `/migrations` existe desde el 2026-03-12, la verifica el check
`zona-prohibida` y en la última auditoría estaba limpia» es estado y va en
`AI-FIRST.md`.

### Lo que `AI-FIRST.md` tampoco es

No es el manifiesto de instalación. Ese es un segundo archivo,
`.ai-first/manifest.json`, que registra qué archivos escribió el paquete y con
qué huella, para que `update` distinga un archivo intacto de uno que el equipo
editó. Lo escribe la herramienta, no lo edita nadie, y no se lee en un PR.
Confundir los dos —estado del proyecto y estado de la instalación— es el error
que hace que el artefacto de estado se llene de ruido.

| | `AI-FIRST.md` | `.ai-first/manifest.json` |
|---|---|---|
| Quién lo escribe | init, y el equipo a mano | solo la herramienta |
| Quién lo lee | audit, sync, y un humano en el PR | update |
| Qué guarda | qué gobierna al proyecto | qué archivos se instalaron y con qué huella |
| Formato | Markdown + frontmatter YAML | JSON |

---

## 3. El mapa de artefactos

Para que ADR no duplique nada hay que decir qué registra cada artefacto. La tabla
sale del árbol de decisión de documentación de un proyecto real —CRM Compliance,
donde nació la metodología— más la fila que a ese árbol le falta.

| Artefacto | Qué registra | Tiempo verbal | Crece |
|---|---|---|---|
| `AGENTS.md` | La regla vigente | presente | no: tiene techo |
| **`ADR.md`** | **Por qué esa regla existe y qué se descartó** | **pasado, inmutable** | **por filas** |
| `TECH_NOTES.md` | La cicatriz de una librería o versión | pasado | por entradas |
| `SESSION_LOG.md` | Qué se hizo y cuándo | cronológico | sin techo |
| `CHG-XXX` → `CHANGE_LOG.md` | Un cambio formal a algo que ya funciona | por cambio | por filas |
| `GUIA_DISENO.md` | Cómo debe verse y comportarse | presente | con el proyecto |
| `ARQUITECTURA.md` | Cómo está armado hoy | presente | se reescribe |
| `AI-FIRST.md` | Qué gobierna al proyecto | presente | no: es declaración |

### La evidencia de que ADR hace falta

El árbol de decisión de Compliance tiene siete destinos y ninguno responde «¿por
qué se eligió esto en vez de aquello?». Se nota en los números: el `SESSION_LOG`
va por **27.682 líneas y 626 sesiones**, y hay **385 `CHG-XXX`**. El porqué de una
decisión de hace ocho meses está enterrado en uno de los dos, sin índice.

`TECH_NOTES` no lo cubre: guarda hallazgos —«Prisma 7 actualiza los tipos pero no
el cliente que corre»—, que es otra cosa que una decisión. Y `ARQUITECTURA.md`
tampoco: es un documento de estado, así que cuando la decisión cambia, la
justificación anterior se sobrescribe. Queda el qué y se pierde el por qué, que es
justo lo que alguien necesita seis meses después para saber si la decisión sigue
siendo válida o si su premisa ya no aplica.

**ADR no reemplaza a nada.** `SESSION_LOG` sigue siendo la bitácora y `CHANGE_LOG`
el registro de cambios. ADR agrega la fila que faltaba en el árbol:

| Tipo de contenido | Destino |
|---|---|
| Por qué se eligió una tecnología, un patrón o un límite entre capas, y qué se descartó | `docs/ADR.md` |

### Qué entra en ADR y qué no

Entra si cumple las tres: **es difícil de revertir**, **tiene alternativas reales
que se descartaron**, y **alguien va a preguntar por qué en seis meses**.

- Sí: elegir Postgres sobre Mongo; pasar de una cola propia a SQS; que el dominio
  no importe de infraestructura; adoptar monorepo.
- No: subir una versión menor de una librería (eso es `SESSION_LOG`); un fix de
  un gotcha de Prisma (eso es `TECH_NOTES`); cambiar el color de un botón (eso es
  `GUIA_DISENO`); modificar un feature que ya funciona (eso es `CHG-XXX`).

Un ADR no se edita cuando cambia de opinión: se agrega uno nuevo que lo supera y
el viejo queda marcado como superado, con el enlace. Es un registro, no un estado.

### Formato de una fila

```markdown
## ADR-007 — La cola de trabajos pasa a SQS

- **Fecha:** 2026-09-12
- **Estado:** aceptada
- **Supera a:** ADR-003

**Contexto.** La cola propia sobre Postgres aguantaba 200 trabajos por minuto y
el pico de cierre de mes llegó a 1.400. Escalarla significaba operar reintentos,
visibilidad y letra muerta a mano.

**Decisión.** Se adopta SQS con cola de letra muerta. `src/lib/queue.ts` pasa a
ser un adaptador.

**Alternativas.** Redis + BullMQ: menos latencia, pero suma una pieza que hay que
operar. Subir la cola propia: más barato hoy, y nos deja manteniendo
infraestructura que no es el producto.

**Consecuencias.** Dependemos de AWS en una pieza más. Los tests de integración
necesitan un doble local. El costo sube ~40 USD al mes.
```

---

## 4. Los cuatro instrumentos, definidos

**Zona Prohibida.** Una ruta o patrón del repositorio que el agente no modifica
sin aprobación explícita. Se declara en `AI-FIRST.md` y se enuncia como regla en
`AGENTS.md`. La diferencia con un `.gitignore` o un CODEOWNERS: una Zona Prohibida
no impide el cambio, lo **hace visible** — el detector emite P0 y corta el flujo,
y un humano decide.

**Tabla ADR.** Definida en §3.

**Matriz de permisos.** Quién puede modificar qué parte del repositorio: personas,
equipos y agentes. Vive en el cuerpo de `AI-FIRST.md`.

> **Colisión de nombre, advertida.** En CRM Compliance,
> `docs/ROLES_PERMISSIONS_MATRIX.md` (461 líneas) es la matriz de roles y permisos
> **del producto** —SuperAdmin, Oficial de Cumplimiento, Analista sobre recursos
> del CRM—, no de quién toca qué en el repositorio. Son dos cosas distintas con
> el mismo nombre, y al instalar el paquete en un proyecto así conviven.
>
> Se resuelve por ubicación y no por renombre, para no tocar la landing publicada:
> el instrumento se sigue llamando «matriz de permisos» hacia afuera, y la sección
> dentro de `AI-FIRST.md` se titula **«Permisos del repositorio»**. Si la colisión
> molesta en la práctica, la alternativa es renombrar el instrumento a «matriz de
> custodia», lo que sí obliga a corregir la landing.

**Entropía documental.** La distancia entre lo que el proyecto documenta y lo que
el proyecto es. Se mide con las cinco verificaciones de §6 y se resume en el
puntaje de §7.

---

## 5. `AI-FIRST.md` — el formato

Markdown con frontmatter YAML. El frontmatter lo lee el detector sin ambigüedad;
el cuerpo lo lee un humano en el diff del PR. **El cuerpo no repite el
frontmatter**: si un dato está en los dos lados, uno de los dos va a mentir.

### Frontmatter

```yaml
---
# Versión del FORMATO de este archivo, no del proyecto.
formato: 1
proyecto: crm-compliance
fase: produccion              # exploracion | mvp | produccion
actualizado: 2026-09-16

# El comando que decide si el proyecto está sano. Lo corre el humano, no el
# detector: audit mide documentación, no compila nada.
verificacion: pnpm build && pnpm test

zonas_prohibidas:
  - ruta: migrations/
    razon: esquema vivo en produccion
    desde: 2026-03-12
  - ruta: infra/
    razon: terraform, DNS y secretos
    desde: 2026-03-12
  - ruta: .env*
    razon: credenciales
    desde: 2026-03-12

# Superficies donde un cambio se presume decisión arquitectónica. Ver §6, check 2.
superficies_de_decision:
  - packages/*/src/index.ts
  - "**/*.config.*"
  - packages/prisma/schema.prisma
  - src/lib/queue.ts

alcance:
  # De dónde sale el alcance declarado de la sesión en curso.
  spec: docs/changes/pending/
  # Archivos fuera de ese alcance que se toleran antes de emitir P1.
  tolerancia: 3

artefactos:
  adr: docs/ADR.md
  arquitectura: docs/ARQUITECTURA.md
  guia_diseno: docs/GUIA_DISENO.md
  inventario_componentes: docs/COMPONENT_LIBRARY.md
  componentes_dir: packages/ui/src/components/
  session_log: docs/SESSION_LOG.md
  change_log: docs/changes/CHANGE_LOG.md
  tech_notes: docs/TECH_NOTES.md

# Solo la última corrida. El detalle de hallazgos vive en el reporte, que es
# efímero. Acá van tres campos para que el diff del PR muestre si la entropía
# subió o bajó.
auditoria:
  fecha: 2026-09-16
  entropia: 68
  hallazgos: { p0: 1, p1: 1, p2: 1 }
---
```

Notas de diseño:

- **`artefactos` admite ausencias.** Un proyecto sin librería de componentes omite
  las dos claves y el check 5 no corre. Un check que no puede correr se reporta
  como omitido, nunca como aprobado.
- **`auditoria` no se reescribe en cada corrida local.** Solo con
  `audit --registrar` o desde el hook de cierre. Si cada `audit` tocara el archivo,
  el ruido en los diffs haría que el equipo lo ignore, que es como mueren los
  artefactos de estado.
- **`formato: 1` permite migrar.** Un `AI-FIRST.md` de formato desconocido detiene
  al detector con un mensaje, no lo interpreta a medias.

### Cuerpo

Dos tablas y las notas que ninguna máquina puede verificar:

```markdown
# AI-FIRST.md — CRM Compliance

> Qué gobierna a este proyecto. Las reglas que el agente obedece están en
> `AGENTS.md`; acá está el mapa que las herramientas verifican.

## Árbol de decisión de documentación

| Tipo de contenido | Destino |
|---|---|
| Invariante arquitectónico o convención vigente | `AGENTS.md` |
| Por qué se eligió esto, y qué se descartó | `docs/ADR.md` |
| Cicatriz de una librería o versión | `docs/TECH_NOTES.md` |
| Estado de fase, progreso, pendientes | `docs/SESSION_LOG.md` |
| Cambio formal con diseño y rollback | `docs/changes/pending/CHG-XXX.md` |
| Reglas de diseño, UX, microinteracciones | `docs/GUIA_DISENO.md` |
| Detalles de un módulo | `docs/specs/{modulo}.md` |
| Estructura de carpetas y comandos | no entra: es derivable de `ls` y de los manifiestos |

## Permisos del repositorio

| Superficie | Quién modifica | Agentes |
|---|---|---|
| `packages/prisma/` | backend | con aprobación |
| `packages/ui/` | diseño y frontend | sí |
| `infra/` | solo la persona de infraestructura | no |
| `docs/ADR.md` | quien toma la decisión | solo propone |

## Notas

Por qué `migrations/` es Zona Prohibida: el esquema está vivo en producción con
datos de 40 tenants y una migración mal ordenada no se revierte sin ventana.
```

**Por qué el árbol de decisión se muda acá.** Hoy vive en `AGENTS.md` y se come
27 de sus 201 líneas, contra un techo declarado de 200. Es contenido específico
del proyecto, lo necesita `sync` para saber a dónde mandar cada cosa, y el agente
lo sigue viendo porque `AGENTS.md` lo referencia —el mismo patrón que ya usa para
delegar la estructura del monorepo a `ARQUITECTURA.md`.

---

## 6. Las cinco verificaciones

Todas corren en código puro: git, sistema de archivos y expresiones regulares.
Sin modelo, sin conexión, sin API key. Cada una declara qué lee y cómo falla.

| # | Check | Sev. | Lee de `AI-FIRST.md` |
|---|---|---|---|
| 1 | Zona Prohibida tocada | P0 | `zonas_prohibidas[].ruta` |
| 2 | Decisión sin fila en ADR | P1 | `superficies_de_decision`, `artefactos.adr` |
| 3 | Alcance excedido | P1 | `alcance.spec`, `alcance.tolerancia` |
| 4 | Artefacto huérfano | P2 | `artefactos.*` |
| 5 | Inventario de componentes desactualizado | P2 | `artefactos.inventario_componentes`, `componentes_dir` |

**1 — Zona Prohibida tocada.** `git diff --name-only` contra los patrones
declarados. Determinista, cero falsos positivos. Corta el flujo.

**2 — Decisión sin fila en ADR.** El más difícil de los cinco, porque «se tomó una
decisión arquitectónica» no es detectable con regex. Se resuelve declarándolo en
vez de adivinarlo, con dos señales:

- cambió un archivo listado en `superficies_de_decision`, o
- `package.json` agregó o quitó una dependencia de producción.

Si hay señal y `ADR.md` no ganó una fila en el mismo rango de commits → P1.

**Es una heurística y produce falsos positivos**: tocar un `*.config.*` para subir
un timeout no es una decisión arquitectónica. Se silencia agregando la fila, o con
`<!-- ai-first: sin-decision -->` en el cuerpo del commit. Un check que no se puede
silenciar se desactiva entero, que es peor.

**3 — Alcance excedido.** Los archivos tocados contra los que declara la spec
activa en `alcance.spec`. Por encima de `tolerancia` → P1. Requiere que la spec
liste archivos; si no lo hace, el check se reporta omitido.

**4 — Artefacto huérfano.** Resuelve cada ruta referenciada desde los documentos
declarados en `artefactos` y verifica que el destino exista. Determinista.

**5 — Inventario desactualizado.** Componentes agregados o eliminados en
`componentes_dir` que no aparecen en `inventario_componentes`. Compara nombres de
archivo contra menciones; es por nombre, así que un renombre sin actualizar el
inventario también lo caza.

---

## 7. El puntaje de entropía

**Mide entropía, no salud: más alto es peor.** 0 es documentación alineada con el
proyecto; 100 es documentación desconectada.

```
entropia = min(100, 40·P0 + 20·P1 + 8·P2)
```

Los pesos están calibrados contra el único ejemplo publicado en la landing: 1 P0 +
1 P1 + 1 P2 = 40 + 20 + 8 = **68 / 100**, que es el número que la landing muestra.

Un solo P0 pone el puntaje en 40 sin ayuda de nadie, que es la intención: una Zona
Prohibida tocada no se compensa con documentación impecable en todo lo demás.

**Exit codes.** `0` sin hallazgos; `1` con cualquier P0; `1` también con P1 o P2 si
se pasa `--estricto`, y `0` con advertencias si no. Así el mismo comando sirve en
un hook local, donde interrumpir por un P2 sería intolerable, y en integración
continua, donde se quiere el corte.

---

## 8. Qué queda fuera de esta especificación

- **Los cinco comandos.** `init`, `audit`, `sync`, `adr` y `handoff` están mapeados
  en `docs/HANDOFF.md` §Parte B, no especificados.
- **`.ai-first/manifest.json`.** Definido en §2 por su frontera, no en su esquema.
- **Los adaptadores por herramienta.** Claude Code primero; Cursor y Codex después.
- ~~**La colisión de nombres de las skills.**~~ **Resuelta el 2026-09-18**
  (ADR-014): los diez nombres se quedan y lo que cambia es que la instalación
  salta lo que ya existe en vez de sobreescribirlo. El prefijo queda como salida
  al conflicto, no como nombre por defecto. Deja de ser restricción de diseño
  de `init`, al que ya sólo le falta el esquema del manifiesto.
- **Los cuatro instrumentos, en las once skills.** Van a medias: cinco nombran
  el ADR y dos las Zonas Prohibidas, incorporadas al generalizarlas. La matriz
  de permisos no la invoca ninguna, y la entropía documental sólo aparece de
  pasada en una.
