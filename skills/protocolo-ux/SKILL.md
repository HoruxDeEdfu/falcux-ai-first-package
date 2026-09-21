---
name: protocolo-ux
description: "Reglas de comportamiento e interacción: cuándo modal vs. página nueva, confirmaciones destructivas, navegación por capas (Browse → Create/Edit → Detail), patrones de tabla, formularios, toasts y los 4 estados obligatorios. Activar al DISEÑAR cómo debe comportarse un feature con interfaz — antes de escribir código. Define el QUÉ (comportamiento), no el CÓMO (implementación en el stack)."
---

## Cuándo activar

- Al planificar un feature nuevo con interfaz, antes de implementar
- Al decidir si algo va en modal o en página nueva
- Al definir dónde vive un feature (navegación principal vs. configuración)
- Al diseñar flujos de creación, detalle o edición

**Complemento:** este skill define el *qué* (comportamiento del usuario). Antes de él, `information-architecture` decide qué es la cosa, cómo se llama y dónde vive; después, para el *cómo* (componentes concretos de tu stack), crea un skill `ux-patterns` propio del proyecto.

---

## Navegación por capas

```
Capa 1 (Browse) → click en registro   → Capa 3 (Detail)
Capa 1 (Browse) → click en "Crear"    → Capa 2 (Create)
Capa 3 (Detail) → click en "Editar"   → Capa 2 (Edit)
Capa 2/3        → "Volver"/"Cancelar" → Capa anterior
```

**Capa 1 — Browse:** navegación principal visible. Listados, dashboards.
**Capa 2 — Create/Edit:** sin navegación principal. Wizards y formularios. Nunca mostrar el menú lateral durante un flujo de creación — distrae y rompe el foco.
**Capa 3 — Detail:** sin navegación principal. Detalle de un registro, con "Volver" arriba.

**Navegación principal vs. configuración:** la frecuencia de uso decide, no el rol del usuario.

- Alta frecuencia (diaria/semanal) → navegación principal
- Baja frecuencia (onboarding, ajustes ocasionales) → sección de configuración

---

## Tablas

- Columna de acciones: siempre la última a la derecha y **sticky** (visible con scroll horizontal).
- Acción principal siempre **visible y nombrada** con el verbo real ("Revisar", "Editar"). Las secundarias van en un menú adosado; sin secundarias, no hay menú.
- Fila clickeable = misma acción principal. El botón nombrado es la vía accesible por teclado; la fila es el atajo. Sin permiso para la acción principal → la fila no es clickeable.
- **Nunca** esconder la acción principal dentro del menú de tres puntos.
- **Nunca** usar el texto de una celda como única vía de navegación al detalle.
- Filtros: encima de la tabla, nunca dentro del header de columna.
- Selección múltiple: checkbox en la primera columna + barra de acciones bulk al seleccionar.

---

## Formularios

- Labels siempre encima del campo. Nunca solo placeholder.
- Campos obligatorios marcados con `*` junto al label.
- Validar al salir del campo (on blur), no en tiempo real.
- Al enviar con errores: scroll automático al primer campo con error.
- Con cambios sin guardar al intentar salir: diálogo de confirmación.
- Botón primario a la derecha; el secundario (Cancelar) a su izquierda.

---

## Modal vs. página nueva

| Usar modal | Usar página nueva (Capa 2 o 3) |
|---|---|
| Confirmaciones | Formularios con 5+ campos |
| Formularios cortos (≤ 4 campos) | Vistas de detalle |
| Alertas informativas | Flujos multi-paso (wizard) |
| Preview rápido de solo lectura | Contenido independiente del contexto |

**Confirmaciones destructivas:**

- Título: `¿Eliminar [nombre del recurso]?`
- Descripción: `Esta acción no se puede deshacer.`
- Botón destructivo con estilo destructivo y **texto explícito** ("Eliminar"), nunca "Aceptar".
- Se cierra con X, Cancelar, click en overlay y Escape — los cuatro deben funcionar.

---

## Toasts y notificaciones

- Posición consistente en todo el producto (convención habitual: esquina superior derecha).
- Duración: 5 segundos para info/success. **Persistente para errores** — requieren acción del usuario.
- Única acción permitida dentro de un toast: "Deshacer". Ninguna otra.

---

## Los 4 estados

Todo componente que muestra datos cubre los cuatro, sin excepción:

1. **Loading** — skeleton que replica la estructura real. Nunca el texto "Cargando…".
2. **Empty** — mensaje + icono del módulo + CTA para crear el primer registro.
3. **Error** — mensaje descriptivo + botón "Reintentar".
4. **Success** — datos mostrados, con transición suave desde el skeleton.

Un skeleton que no coincide con la pantalla real es peor que no tenerlo: promete una estructura y entrega otra. Si agregas una columna, un tab o una acción de header, el skeleton entra en el mismo commit.

---

## Checklist de verificación

Antes de dar por terminada cualquier interfaz:

- [ ] ¿La navegación respeta las 3 capas?
- [ ] ¿Las features de configuración están fuera de la navegación principal?
- [ ] ¿La acción principal de cada tabla está visible y nombrada?
- [ ] ¿Los formularios validan on blur y hacen scroll al primer error?
- [ ] ¿Los 4 estados están cubiertos?
- [ ] ¿El skeleton refleja la estructura real de la pantalla?
- [ ] ¿Los modales destructivos tienen botón destructivo y texto explícito?
- [ ] ¿Los modales se cierran con X, Cancelar, overlay y Escape?
- [ ] ¿Los toasts solo tienen "Deshacer" como acción interna?
- [ ] ¿La vista funciona en mobile, tablet y desktop?

---

## Qué NO hacer

- NO mostrar la navegación principal durante wizards o formularios de creación.
- NO usar texto de celda como única vía de navegación al detalle.
- NO poner features de administración en la navegación principal.
- NO usar "Aceptar" como texto de un botón destructivo.
- NO agregar acciones a un toast más allá de "Deshacer".
- NO implementar sin haber definido los 4 estados.

---

## Adaptación a tu proyecto

1. Ajusta los nombres de las capas al vocabulario de tu producto.
2. Reemplaza los patrones de tabla por los de tu librería de componentes, manteniendo las reglas de comportamiento.
3. Documenta las excepciones reales de tu producto — y solo esas.
4. Complementa con un skill `ux-patterns` propio que traduzca estas reglas a los componentes concretos de tu stack.

Capítulo de referencia: Falcux AI-First — Parte III, «Protocolo UX».
