---
name: protocolo-arranque
description: "Protocolo de arranque de un proyecto: del requerimiento en bruto a los artefactos que el desarrollo necesita. Descubrimiento con benchmark de mercado y cuestionamiento exhaustivo hasta cerrar todo vacío, decisión de stack con su fila de ADR, y generación de PRD, arquitectura, specs y guía de diseño a partir de los templates del paquete, en el repo y no en un adjunto. Activar cuando el proyecto todavía no está definido: hay una idea, un requerimiento o notas de reunión, y no hay PRD ni arquitectura escritos. Para implementar un feature de un proyecto ya definido, usar protocolo-features."
---

## Cuándo activar

- Hay una idea, un requerimiento en bruto o notas de reunión, y no hay PRD
- El proyecto se acaba de crear y `docs/` está vacío o sólo tiene lo que escribió `ai-first init`
- Hay que decidir el stack y nadie lo ha registrado
- Un proyecto existente cambia tanto de alcance que su PRD dejó de describirlo

**NO activar para:** implementar un feature —eso es `protocolo-features`—, ni
para cambiar algo que ya funciona —eso es `protocolo-cambios`—. Este protocolo
corre **una vez** por proyecto, o una vez por giro grande de producto.

Lo que este protocolo produce es lo que `protocolo-features` da por hecho en su
Paso 1 cuando pide «una spec implementable». Sin arranque, la spec se inventa.

---

## Antes de empezar

Lee, en este orden, y no preguntes lo que ya esté escrito:

1. `AI-FIRST.md` — el perfil del producto, la fase, el comando de verificación y
   las Zonas Prohibidas. Lo escribió `ai-first init`.
2. `AGENTS.md` — las reglas que el proyecto ya se dio.
3. Lo que haya en `docs/`, aunque esté a medias.
4. `docs/ADR.md` — decisiones ya tomadas que este protocolo no vuelve a abrir.

**El perfil manda sobre qué artefactos escribes.** Está en el frontmatter de
`AI-FIRST.md`, con dos ejes —`producto` y `repositorio`—, y la tabla de qué
sale para cada uno está en `references/artefactos-por-perfil.md`. Si no hay
perfil declarado, pregúntalo antes que nada: es la primera pregunta de la Fase 1.

---

## Fase 1 — Descubrimiento (iterativa, sin límite de preguntas)

No se genera un solo artefacto hasta que esta fase cierra. Un PRD escrito sobre
huecos es peor que no tenerlo: se lee como si fuera cierto.

### 1. El contexto base

Pide lo que haya: el mensaje, el documento, las notas de la reunión, el enlace a
lo que ya existe. Léelo entero antes de preguntar nada, para no preguntar lo que
ya está.

### 2. Benchmark

Identifica herramientas, aplicaciones o flujos del mercado que resuelvan algo
parecido. Para cada uno, una línea: qué hace bien y qué haríamos distinto. Sirve
para dos cosas: proponer mejoras que el usuario no pidió porque no sabía que
existían, y evitar construir algo peor que lo que ya se puede comprar.

Di explícitamente si lo que se quiere construir **ya existe y se puede comprar**.
Es incómodo y es el hallazgo más valioso que puede salir de esta fase.

### 3. Cuestionamiento exhaustivo

Pregunta **todo lo que haga falta, sin límite**, hasta que no quede un vacío.
Agrupa las preguntas en tandas para no interrogar de a una. Los frentes:

- **El problema y el éxito.** Qué duele hoy, a quién, cuánto. Cómo se sabrá
  dentro de tres meses si esto funcionó. Qué pasa si no se construye.
- **Los usuarios.** Quiénes son, cuántos, qué saben hacer, en qué contexto lo
  usan. Quién paga y quién usa, cuando no son el mismo.
- **La lógica de negocio.** Las reglas que no se negocian, los casos borde que
  ya mordieron antes, lo que el negocio hace hoy a mano.
- **Los datos.** De dónde salen, quién los manda, qué pasa cuando llegan mal,
  qué no se puede perder nunca.
- **Las integraciones.** Con qué habla, en qué dirección, qué pasa si el otro
  lado se cae.
- **Las restricciones.** Plazo, presupuesto, equipo, cumplimiento normativo,
  lo que ya está comprado y hay que usar.

**Postura propositiva.** Si una idea del usuario es ineficiente, o hay un camino
más simple, dilo y propón la alternativa con su porqué. Decir que sí a todo no
es servir al proyecto. Si el usuario reafirma su decisión después de oír la
alternativa, es su decisión: se acata y se registra en el ADR con las dos
posturas.

### 4. Cerrar la fase

La fase cierra cuando puedes responder, sin suponer: qué se construye, para
quién, con qué reglas, contra qué datos y con qué se mide el éxito. Pregúntale
al usuario si falta algo antes de pasar a la Fase 2, y enumera lo que quedó
supuesto, si algo quedó.

---

## Fase 2 — Generación de artefactos

Cada artefacto sale de su template en `templates/` del paquete. **No inventes la
estructura**: el template ya la trae, y respetarla es lo que hace que otro
agente sepa leerlo.

Escríbelos **en el repo, en su ruta definitiva**. No en un adjunto, no en un
`.zip`, no pegados en el chat: el trasvase manual es donde se pierden cosas.

### El orden, y por qué

```
1. Decisión de stack        → fila en docs/ADR.md
   ↓
2. docs/PRD.md              → qué se construye y para quién
   ↓
3. docs/ARQUITECTURA.md     → componentes, límites y el diagrama
   ↓
4. docs/GUIA_DISENO.md      → si el producto tiene interfaz
   ↓
5. docs/specs/<modulo>.md   → una por módulo, en orden de construcción
   ↓
6. AI-FIRST.md y AGENTS.md  → completar con lo que ahora se sabe
```

El stack va primero porque condiciona todo lo demás y porque es la decisión más
cara de revertir. La arquitectura va después del PRD porque no se diseña lo que
todavía no se sabe qué es. Las specs van al final porque cada una necesita saber
en qué capa vive.

### La decisión de stack

Es una decisión de ADR de manual: difícil de revertir, con alternativas reales,
y alguien va a preguntar por qué en seis meses. La fila lleva **qué se eligió,
qué se descartó y por qué**, no sólo lo primero. Registra también lo que el
usuario impuso sin discusión: «lo decidió el cliente» es un contexto válido y
explica más que el silencio.

**No instales nada.** Deja escritos los comandos de instalación en la fila del
ADR o en el PRD, y que los corra el humano o el agente en su turno. Este
protocolo define y registra; ejecutar es otro trabajo.

### Las specs

Una por módulo, con el formato de `SPEC_MODULO_TEMPLATE.md`, y cada una con su
sección de archivos, que es la que el detector lee para medir el alcance. En una
landing, una sola spec del sitio: no hay módulos que separar.

No escribas las specs de todo el backlog. Las de lo que se va a construir
primero, y la lista de las que faltan al final del PRD.

---

## Validación final

Antes de dar por cerrado el arranque, comprueba una por una:

- [ ] Cada artefacto es **directamente interpretable** por quien vaya a
      implementar con un agente: rutas concretas, nombres concretos, sin «TBD»
      escondido en una tabla
- [ ] El PRD y la arquitectura no se contradicen
- [ ] Toda decisión difícil de revertir tiene su fila en `docs/ADR.md`
- [ ] `AI-FIRST.md` declara las Zonas Prohibidas que la arquitectura hizo
      evidentes —migraciones, infraestructura, secretos—, con su razón
- [ ] Las specs listan archivos, en una sección «Archivos» o «Alcance», con las
      rutas entre acentos graves
- [ ] `ai-first audit` corre y da 0, o lo que no da 0 está explicado
- [ ] Lo que quedó supuesto está escrito como supuesto, no como hecho

---

## Señales de alerta

Detén la generación y vuelve a la Fase 1 si:

- Estás escribiendo «se definirá más adelante» en un artefacto
- Dos artefactos dicen cosas distintas del mismo flujo
- El PRD crece de features que nadie pidió en el descubrimiento
- No puedes nombrar al usuario del producto sin decir «el usuario»

---

## Qué NO hacer

- NO generes artefactos con la Fase 1 abierta. El descubrimiento primero, siempre.
- NO copies la estructura de otro proyecto: los templates están para eso.
- NO instales dependencias ni corras generadores de proyecto.
- NO escribas specs de features que no se van a construir todavía.
- NO dejes decisiones de stack fuera del ADR porque «son obvias». En seis meses
  no lo son.
- NO reescribas un artefacto que ya existía sin pasar por `protocolo-cambios`.

---

## Adaptación a tu proyecto

1. **Los artefactos.** La tabla de `references/artefactos-por-perfil.md` cubre
   los cinco perfiles del paquete. Si el tuyo produce otro documento de arranque
   —un modelo de datos aparte, una matriz de permisos del producto—, agrégalo a
   la lista del orden de la Fase 2.
2. **El benchmark.** Si trabajas en un dominio cerrado donde no hay con qué
   comparar, reemplázalo por el inventario de lo que la organización ya tiene.
3. **La decisión de stack.** Si tu organización ya la tiene tomada para todos
   sus proyectos, este paso es registrarla, no decidirla: la fila del ADR igual
   se escribe, y dice que viene dada.
4. **Quién valida.** Nombra quién firma el cierre de la Fase 1. Sin un nombre,
   la fase la cierra quien tenga prisa.

Skills siguientes en el flujo: `protocolo-features` (implementar lo que este
protocolo definió) y `protocolo-cierre` (al terminar el arranque, como cualquier
otro tramo).

Capítulo de referencia: Falcux AI-First — Parte II, «Gobierno del contexto», y
Parte III, «Protocolo de desarrollo de features».
