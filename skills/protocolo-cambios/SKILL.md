---
name: protocolo-cambios
description: "Protocolo para modificar features ya implementados: clasificación del cambio (corrección / ajuste / requerimiento / prioridad), flujo corto (1-2 archivos) vs. flujo completo (3+ archivos o cambio de schema), documento CHG-XXX obligatorio antes de tocar código, análisis de impacto, implementación por pasos en sesión limpia y cierre en el CHANGE_LOG. Distingue el cambio, que se archiva, de la decisión arquitectónica, que va al ADR y sobrevive. Activar cuando algo que YA funciona necesita cambiar."
---

## Cuándo activar

- Un requerimiento cambia después de implementado
- La AI implementó algo incorrecto y hay que corregirlo
- Un patrón no funciona en la práctica y necesita ajustarse
- Cambian prioridades que afectan features existentes

**NO activar para:** bugs simples (un typo, un botón roto), refactors que no cambian comportamiento, features nuevos que no tocan nada existente (eso es `protocolo-features`).

---

## Paso 0 — Clasificar el cambio

| Tipo | Ejemplo | Riesgo |
|------|---------|--------|
| **Corrección** | Un patrón se implementó mal | Bajo |
| **Ajuste de diseño** | Algo no funciona en mobile | Bajo-medio |
| **Cambio de requerimiento** | Wizard → formulario directo | Medio-alto |
| **Cambio de prioridad** | Feature X se pospone, Y se adelanta | Variable |

**Regla de flujo:**

- 1-2 archivos, sin cambio de schema → **flujo corto**
- 3+ archivos, cambia el schema, o cambian flujos de navegación → **flujo completo**

**Y una pregunta aparte del flujo:** ¿este cambio es además una decisión
arquitectónica —difícil de revertir, con alternativas reales que se descartaron—?
Si lo es, va también como fila en `docs/ADR.md`. No es duplicar: el `CHG-XXX` documenta
*qué* cambió y cómo revertirlo, y se archiva al cerrarse; el ADR documenta *por qué*
se eligió esto y sobrevive al cambio. Seis meses después nadie relee un CHG cerrado.

Si el cambio toca una **Zona Prohibida** del proyecto, se pide aprobación antes de
escribir el documento, no después.

---

## El documento de cambio (obligatorio antes de implementar)

Crear en `docs/changes/pending/CHG-XXX_nombre.md`, copiando el molde de
`references/documento-de-cambio.md`. Ese archivo trae las secciones, cuáles
son obligatorias en el flujo corto y cuáles en el completo, y el formato que
el detector lee.

Dos cosas que no se negocian, y que están ahí explicadas:

- **El par «estado actual / estado deseado» es el corazón del documento.** Sin
  el estado actual descrito con precisión, la AI reconstruye el feature desde
  cero en vez de modificarlo.
- **«Archivos afectados» lista las rutas entre acentos graves.** Es lo que el
  detector compara contra lo que el commit tocó de verdad.

---

## Flujo corto (1-2 archivos, sin schema)

```
CHG mínimo → sesión limpia → implementar → verificar → cerrar
```

Prompt:

```
CONTEXTO: Ajuste menor al feature [nombre].
ESTADO ACTUAL: [cómo funciona hoy — archivo específico]
CAMBIO REQUERIDO: [qué debe cambiar]

RESTRICCIONES:
- Solo modificar [archivo(s) específico(s)]
- No tocar [archivos fuera de scope]
- Mantener [patrones/convenciones existentes]

Implementa paso a paso. Muéstrame qué cambiaste antes de continuar.
```

---

## Flujo completo (3+ archivos o cambia el schema)

```
Documentar → Analizar impacto → Planificar → Implementar por pasos → Verificar → Actualizar docs → Cerrar
```

### Paso 1 — Documentar
Crear el CHG-XXX completo. **No avanzar sin este documento.**

### Paso 2 — Analizar impacto (sesión dedicada, sin implementar)

```
Lee docs/changes/pending/CHG-XXX_nombre.md
Analiza sin modificar nada:
1. Archivos afectados directa e indirectamente
2. ¿Requiere migración de BD?
3. ¿Hay tests que van a fallar?
4. ¿Contradice algo en el AGENTS.md, la guía de diseño o la spec?
5. ¿Hay lógica o componentes existentes que cubran parte del cambio?
6. ¿La lógica nueva tiene relación con otro módulo y conviene diseñarla compartida?

Dame el análisis en lista. NO implementes nada.
```

### Paso 3 — Planificar la secuencia
Orden estricto: Schema → Backend → Frontend → Tests → Documentación.
Cada paso toca **≤ 3 archivos**. Si no, se subdivide.
Si el cambio toca strings visibles, el paso que los escribe carga `ux-writer` antes — esto aplica también al flujo corto.

### Paso 4 — Implementar (sesión limpia nueva)

```
Vamos a implementar CHG-XXX (docs/changes/pending/CHG-XXX_nombre.md).
Implementa SOLO el paso [N]: [descripción].

RESTRICCIONES: solo archivos del paso N. Muéstrame el diff antes de continuar.
NO avances al siguiente paso hasta que yo confirme.
```

### Paso 5 — Verificar

```
CHG-XXX implementado. Verifica:
1. ¿La implementación cumple el "estado deseado" del documento?
2. ¿Los archivos listados en "dependencias" tienen errores o inconsistencias?
3. Si el cambio tocó la interfaz: ¿el skeleton sigue reflejando la pantalla real?
4. Ejecuta los tests relevantes.

Dame un reporte de verificación.
```

> **El skeleton es la deriva silenciosa.** Se escribe una vez con la estructura de ese día y los evolutivos lo dejan atrás. Los dos archivos nunca caen juntos en el mismo diff, así que la deriva no se ve en code review. Aplica sobre todo al **flujo corto** — es donde más se pierde, porque "son solo 2 archivos" nunca incluye el estado de carga.

### Paso 6 — Cerrar
Actualizar los docs afectados. Agregar el resumen a `docs/changes/CHANGE_LOG.md`. Eliminar el archivo de `pending/`.

---

## Reglas anti-regresión

- **Sesión limpia:** nunca implementar un cambio en la misma sesión donde se trabajó en otra cosa.
- **Branch por cambio:** `git checkout -b change/CHG-XXX-nombre` para cambios de requerimiento o prioridad.
- **Validar después de cada paso:** diff → prueba manual → tests → aprobar → siguiente paso.
- **Restricciones explícitas:** siempre decirle a la AI qué **no** debe tocar.

---

## Checklist

Antes de implementar:
- [ ] ¿Tengo el CHG-XXX con estado actual y estado deseado?
- [ ] ¿Sé cuántos archivos se afectan? (decide flujo corto vs. completo)
- [ ] ¿Tengo el análisis de impacto? (flujo completo)
- [ ] ¿Validé reuso y lógica compartida?
- [ ] ¿Voy a usar una sesión limpia?
- [ ] ¿Definí explícitamente qué NO debe cambiar?

Después de implementar:
- [ ] ¿El feature modificado cumple el estado deseado?
- [ ] ¿Los features adyacentes siguen funcionando?
- [ ] ¿Los tests pasan?
- [ ] ¿Los estados de carga siguen alineados con la pantalla real?
- [ ] ¿La documentación está actualizada?
- [ ] ¿El resumen está en el CHANGE_LOG?
- [ ] ¿Eliminé el archivo de `pending/`?

---

## Ciclo de vida del documento

```
docs/changes/pending/CHG-XXX.md (Pendiente)
    ↓ análisis
docs/changes/pending/CHG-XXX.md (En implementación)
    ↓ implementación + docs
docs/changes/CHANGE_LOG.md (resumen permanente)  +  docs/changes/pending/CHG-XXX.md ELIMINADO
```

Un archivo en `docs/changes/pending/` sin actividad por 2+ semanas: revisarlo y moverlo al CHANGE_LOG como "Descartado" si ya no aplica.

---

## Adaptación a tu proyecto

1. El prefijo `CHG` es convención — usa el que quieras, pero mantenlo estable y correlativo.
2. Si ya usas un tracker (Jira, Linear), el documento puede vivir ahí; lo que no es negociable es el par estado actual / estado deseado.
3. Ajusta el umbral de "flujo corto" a tu proyecto: 1-2 archivos es un buen punto de partida.

Capítulo de referencia: Falcux AI-First — Parte III, «Protocolo de gestión de cambios».
