# CHG-XXX — El documento de cambio

> Referencia de la skill `protocolo-cambios`: el molde del documento que esa
> skill exige **antes** de modificar algo que ya funciona. La skill define
> cuándo y con qué flujo; este archivo define qué va adentro. Viaja con la
> skill, así que no hay que descargarlo aparte.
>
> **Principio:** Un cambio sin evaluación de impacto es una apuesta. Este
> documento existe para que el humano entienda qué se toca y qué se puede
> romper antes de que la AI ejecute. Y para que, cerrado el cambio, quede la
> evidencia de qué se decidió y por qué.
>
> **Relación con otros documentos:**
> - `docs/changes/CHANGE_LOG.md` recibe el **resumen** cuando el cambio se cierra; este archivo se elimina
> - `docs/ADR.md` recibe una fila si el cambio es, además, una **decisión** difícil de revertir
> - La spec del módulo se actualiza al cerrar: el cambio ya no es cambio, es el estado
> - Un **runbook** aparte guarda el paso a paso del despliegue cuando hay migración o datos que tocar

---

## Cómo usar este template

1. Copiar como `docs/changes/pending/CHG-XXX_nombre.md`, reemplazando `XXX` por
   el siguiente número correlativo y `nombre` por un identificador en kebab-case
2. Elegir el flujo según el protocolo: **corto** (1–2 archivos, sin schema)
   llena sólo las secciones marcadas **[CORTO]**; **completo** llena todas las
   marcadas **[COMPLETO]**
3. No avanzar a implementación sin las secciones 1–4 llenas y revisadas por
   quien decide
4. La sección «Archivos afectados» lista las rutas **entre acentos graves**:
   es lo que el detector lee para el check 3 (alcance excedido) cuando
   `alcance.spec` apunta a `docs/changes/pending/`
5. Al cerrar: resumen a `docs/changes/CHANGE_LOG.md`, documentación principal al día, y
   **eliminar este archivo** de `pending/`
6. Borrar este bloque de instrucciones en la copia

---

# CHG-XXX: {Título descriptivo del cambio}

## Metadata [CORTO] [COMPLETO]

- **Fecha:** {YYYY-MM-DD}
- **Solicitado por:** {Cliente / PO / Dev / Descubrimiento propio}, {en qué contexto}
- **Tipo:** {Corrección / Ajuste de diseño / Cambio de requerimiento / Cambio de prioridad}
- **Estado:** {Pendiente / En análisis / En implementación / Completado / Descartado}
- **Flujo:** {corto / completo}
- **Migración de datos:** {ninguna / sí — cuál}
- **Relación con otros cambios:** {CHG anteriores que este cierra, corrige o extiende} [si aplica]
- **Prioridad:** {alta / media / baja} [si aplica]

## 1. Qué cambia [CORTO] [COMPLETO]

{Dos o tres frases concretas. Qué se ve o se comporta distinto después. Sin
ambigüedades: si hay captura o referencia, enlazarla.}

## 2. Por qué cambia [CORTO] [COMPLETO]

{El porqué es lo más importante. Si no convence, el cambio se rechaza.
Idealmente un dato concreto: feedback real, métrica observada, error
reproducido o decisión de negocio explícita. Cuando la causa sea técnica,
**medirla** antes de afirmarla: qué existe, qué no, y cómo se comprobó.}

| Evidencia | Estado |
|---|---|
| {qué se buscó o midió} | {qué se encontró} |

## 3. Estado actual [CORTO] [COMPLETO]

{Cómo funciona HOY lo que se va a cambiar. Específico: rutas, componentes,
archivos, endpoints. Es lo que permite revertir y lo que la AI necesita para no
inventar el punto de partida.}

## 4. Estado deseado [CORTO] [COMPLETO]

{Cómo debe funcionar DESPUÉS. Igual de específico. Si hay más de una
superficie afectada, una subsección por superficie. Incluir lo que
**explícitamente no cambia** para acotar el alcance.}

## 5. Alternativas consideradas [COMPLETO]

{Qué otras opciones se evaluaron y por qué se descartaron. Si no se consideró
ninguna, decirlo. Ésta es la sección que, cuando el cambio resulta ser una
decisión, se copia a la fila del ADR.}

- **Alternativa 1:** {descripción}. Descartada porque {razón}.
- **Alternativa 2:** {descripción}. Descartada porque {razón}.

## 6. ¿Es una decisión arquitectónica? [COMPLETO]

{Responder sí o no. Es decisión si es difícil de revertir, tenía alternativas
reales y alguien va a preguntar por qué en seis meses. Si es **sí**: fila nueva
en `docs/ADR.md` en el mismo commit que este documento, con el contexto de §2, la
decisión de §4 y las alternativas de §5. No es duplicar: este documento se
archiva al cerrar; la fila del ADR sobrevive.}

**Decisión:** {no / sí → ADR-{nnn}}

## 7. Análisis de impacto [COMPLETO]

> Se llena en una sesión **dedicada al análisis**, sin modificar archivos.

### Archivos afectados

> Rutas entre acentos graves, una por línea. El detector las lee para
> verificar que la implementación no se salió del alcance declarado.

- [ ] `{ruta_1}` — {qué cambia en este archivo}
- [ ] `{ruta_2}` — {qué cambia}
- [ ] `{carpeta}/**` — {si el cambio abarca una carpeta, un glob}

### Datos

- [ ] ¿Modifica un schema de validación? {sí / no — cuál}
- [ ] ¿Modifica el modelo de datos? {sí / no — cuál}
- [ ] ¿Requiere migración? {sí / no → si sí, describir y enlazar el runbook}
- [ ] ¿Requiere backfill o corrección de datos existentes? {sí / no}

### Dependencias

- [ ] ¿Afecta otros módulos o features? {sí / no — cuáles}
- [ ] ¿Afecta la API o contratos públicos? {sí / no — cuáles}
- [ ] ¿Hay tests que van a fallar? {sí / no — cuáles}
- [ ] ¿Toca una Zona Prohibida declarada en `AI-FIRST.md`? {sí / no → si sí, aprobación explícita antes de seguir}
- [ ] ¿Es visible para el usuario final? {sí / no}
- [ ] ¿Es un cambio incompatible para usuarios existentes? {sí / no → plan de comunicación}

### Documentación a actualizar

- [ ] Spec del módulo: `docs/specs/{modulo}.md` — {qué sección}
- [ ] `docs/PRD.md` — {qué sección} [si cambia el qué]
- [ ] `docs/ARQUITECTURA.md` — {qué sección} [si cambia el cómo entre módulos]
- [ ] Guía de diseño — {qué sección} [si cambia algo visual]
- [ ] Inventario de componentes — {qué entrada} [si toca componentes compartidos]
- [ ] `AGENTS.md` — {qué regla} [sólo si cambia una regla activa]
- [ ] `docs/ADR.md` — {fila} [si §6 dijo sí]
- [ ] `docs/TECH_NOTES.md` — {entrada} [si el cambio dejó una cicatriz]

## 8. Riesgos y mitigaciones [COMPLETO] [OPCIONAL en cambios sin datos]

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| {riesgo} | {baja / media / alta} | {bajo / medio / alto} | {mitigación} |

## 9. Plan de implementación [CORTO] [COMPLETO]

> Orden estricto: datos → backend → frontend → tests → documentación. Cada paso
> lo suficientemente chico para validarlo solo; si un paso toca más de 3
> archivos, subdividirlo.

1. {Paso 1 — archivos que toca}
2. {Paso 2 — archivos que toca}
3. {Paso N}

## 10. Plan de validación [CORTO] [COMPLETO]

> Ejecutable, no «verificar que funciona».

- [ ] {Validación 1: comando, test o comprobación concreta}
- [ ] {Validación 2}
- [ ] Features adyacentes: {cuáles y cómo se comprueba que siguen funcionando}
- [ ] Verificación manual: {qué probar y dónde}

## 11. Rollback [COMPLETO]

- ¿Reversible con `git revert`? {sí / no}
- ¿Requiere acción fuera del repo? {migración inversa, datos, configuración}
- **Runbook de despliegue:** {ruta al runbook, si hay migración o datos que tocar; el paso a paso vive ahí, no acá}

## 12. Decisiones abiertas [COMPLETO]

> Lo que quien decide el producto tiene que responder antes o durante la
> implementación. Se numeran para poder referirlas desde el log de sesión.

1. {Pregunta} — **Respuesta:** {pendiente / lo que se decidió, con fecha}

---

## 13. Implementación [CORTO] [COMPLETO] — se llena durante el trabajo

### Commits

- `{tipo}: {descripción}` — `{sha}`

### Notas durante la implementación

{Lo que no estaba previsto. Decisiones tomadas en el camino. Si alguna es
arquitectónica, vuelve a §6.}

---

## 14. Cierre [CORTO] [COMPLETO]

- [ ] El estado deseado (§4) se cumple; validaciones de §10 ejecutadas y en verde
- [ ] «Documentación a actualizar» al día
- [ ] Fila en `docs/ADR.md` escrita, si §6 dijo sí
- [ ] Resumen agregado a `docs/changes/CHANGE_LOG.md`: fecha, tipo, archivos, migración, resumen, lecciones
- [ ] Log de sesión actualizado con la sesión donde se hizo
- [ ] **Este archivo eliminado de `pending/`**
- [ ] Estado final: Completado

**Fecha de cierre:** {YYYY-MM-DD}

---

## Apéndice — Antes de pedir aprobación

Un documento que no cumple esto sigue en borrador:

- [ ] Las secciones 1–4 se entienden sin contexto adicional
- [ ] §2 tiene evidencia, no opinión
- [ ] «Archivos afectados» lista rutas reales, entre acentos graves
- [ ] §10 es ejecutable
- [ ] §6 está respondido

---

# Notas sobre el template

## Flujo corto y flujo completo

El protocolo distingue el cambio que toca 1–2 archivos sin schema del que toca
3 o más, modifica datos o cambia navegación. El primero llena Metadata, §1–§4,
§9, §10 y §13–§14: un documento de media página que se escribe en cinco
minutos y evita que la AI arranque sin saber el punto de partida. El segundo
llena todo. Las marcas **[CORTO]** y **[COMPLETO]** dicen cuál es cuál.

## De dónde sale este formato

En un proyecto real de cinco meses la carpeta de cambios llegó a 385
documentos numerados. Tres cosas que ese volumen enseñó y que este template
ya trae:

1. **La tabla de evidencia en §2.** Los cambios que salieron mal fueron los
   que afirmaban la causa sin medirla. «El layout no tiene el provider» se
   verifica con un `grep` antes de escribir el plan; cuando se verificó, el
   plan cambió.
2. **§6, la pregunta del ADR.** Un documento de cambio se archiva al cerrarse;
   seis meses después nadie lo relee. Si el cambio decidió algo difícil de
   revertir, ese porqué tiene que sobrevivir en otro lado. Sin la pregunta
   explícita, no sobrevivía.
3. **El runbook aparte.** Cuando hay migración, backfill o datos de producción
   que tocar, el paso a paso del despliegue creció hasta ahogar el documento
   de diseño. Se separó: el cambio dice **qué y por qué**; el runbook, **cómo
   se despliega**, con snapshot, verificación y rollback, y se borra al
   aplicarse. Es el mismo ciclo de vida de `pending/`.

## Por qué se elimina de `pending/`

`pending/` contiene trabajo en curso, no historia. Un archivo que sobrevive
ahí después de cerrado se lee como trabajo por hacer, y en una carpeta con
veinte documentos nadie distingue cuáles son de verdad. El resumen en
`docs/changes/CHANGE_LOG.md` es el registro permanente; el ADR guarda lo que era decisión;
la spec del módulo absorbe el nuevo estado. Con los tres al día, el documento
individual ya no tiene lector. Algunos proyectos prefieren moverlo a
`applied/` en vez de borrarlo; funciona igual mientras `pending/` quede limpio.

## Cómo lo lee el detector

Con `alcance.spec: docs/changes/pending/` en `AI-FIRST.md`, el check 3 toma
todos los documentos de esa carpeta, busca la sección cuyo título empiece por
«Archivos» o «Alcance», extrae las rutas entre acentos graves —con globs, y
también nombres sin barra ni extensión, como `.npmrc`, `LICENSE` o `Makefile`—
y compara contra los archivos tocados en la sesión. Más archivos fuera de lo
declarado que la tolerancia configurada → P1. Por eso la subsección se llama
«Archivos afectados» **sin número delante** —el título tiene que empezar por
la palabra— y por eso las rutas van entre acentos graves: no es estilo, es lo
que la máquina lee. Los placeholders con `{llaves}` y `XXX` se ignoran.

Acá se admite más de lo que parece una ruta porque lo declarado **excusa** un
archivo tocado, y para excusarlo tiene que coincidir exacto con él: declarar de
más no acusa a nadie. Donde el detector busca artefactos que no existen es al
revés, y ahí sólo cuenta lo que lleva barra o una extensión conocida.
