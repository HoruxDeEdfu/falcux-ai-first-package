---
name: protocolo-features
description: "Protocolo de desarrollo de features nuevos: pre-implementación en 7 pasos (spec → inventario de reuso → diseño → UX → dependencias → contexto → secuencia), secuencia estricta de implementación por capas, validación incremental y checklists post-implementación. Comprueba Zonas Prohibidas antes de escribir código y manda al ADR las decisiones difíciles de revertir. Activar ANTES de implementar cualquier feature nuevo, página, módulo o endpoint. Para modificar algo que ya existe, usar protocolo-cambios."
---

## Cuándo activar

- Feature nuevo: página, módulo, endpoint, formulario o flujo
- Cualquier implementación que agregue modelos, casos de uso o componentes nuevos

**NO activar para:** fixes de bugs, cambios cosméticos, refactors sin comportamiento nuevo. Eso sigue `protocolo-cambios`.

---

## Pre-implementación — 7 pasos obligatorios

### Paso 1 — Verificar que existe una spec implementable

Antes de escribir código, confirmar que la spec tiene:

- [ ] Qué hace el feature, desde la perspectiva del usuario
- [ ] Criterios de aceptación concretos y verificables
- [ ] Alcance explícito: qué incluye y **qué no incluye**
- [ ] Dependencias: qué módulos usa y qué módulos **no debe tocar**

Si el proyecto declara **Zonas Prohibidas** —rutas que no se modifican sin
aprobación explícita: migraciones, infraestructura, secretos—, comprobar acá si
el feature entra en alguna. Se resuelve antes de escribir código, pidiendo la
aprobación o replanteando el enfoque. Descubrirlo a mitad de la implementación
obliga a deshacer trabajo ya hecho.

Sin spec, la AI inventa requerimientos. Si no existe, generarla y validarla con quien decide el producto **antes** de implementar.

### Paso 2 — Inventario de reuso y lógica compartida

Este es el paso que más deuda evita y el que más se salta. Responder en **ambas** direcciones:

**a) ¿Qué existe que puedo reusar?**
Buscar por **concepto de dominio** (notificación, validación, scoring, exportación), no por nombre de módulo. Un agente que busca "módulo de facturación" no encuentra la lógica de cálculo que vive en "pedidos".

**b) ¿Lo que voy a construir le sirve a otro módulo?**
Si la lógica nueva tiene relación con otro módulo — actual o del backlog — se diseña compartida **desde el inicio**: servicio de dominio reutilizable, puerto común, o paquete compartido. No enterrada dentro del módulo que la estrena.

**Salida obligatoria del paso.** Esta tabla va en el plan y es auditable:

| Pieza | Decisión | Justificación |
|-------|----------|---------------|
| [lógica / componente] | Reusa `X` / Extiende `X` / Nueva compartida / Nueva local | [por qué] |

Toda pieza marcada **"Nueva local"** justifica por qué no se pudo reusar ni conviene compartir. Sin esta tabla, el plan está incompleto.

> Unificar después siempre cuesta más que diseñar compartido al inicio. La duplicación no duele el día que se escribe — duele el día que las dos copias divergen.

Si alguna fila de esa tabla es una decisión **difícil de revertir** —un paquete
compartido nuevo, un límite entre capas, una dependencia de producción que entra—,
no basta con justificarla en el plan: el plan se archiva y la justificación se
pierde. Va como fila en `docs/ADR.md`, con lo que se descartó. Ver `protocolo-cierre`.

### Paso 3 — Leer la documentación de diseño (features con interfaz)

- [ ] Guía de diseño: tokens, componentes, layout, dark mode
- [ ] `protocolo-ux`: navegación por capas e interacciones estándar
- [ ] Inventario de componentes existentes

Preguntas clave: ¿en qué capa vive? ¿componentes nuevos o existentes? ¿los 4 estados están cubiertos?

### Paso 4 — Validar el enfoque UX antes de implementar

Revisar la spec contra el checklist de `protocolo-ux`. Si tienes un agente crítico de UX, lánzalo aquí — corregir un flujo mal planteado cuesta minutos antes de implementar y horas después. Feature solo-backend: omitir.

### Paso 5 — Verificar dependencias técnicas

- [ ] ¿Requiere migración de base de datos? → planificarla primero
- [ ] ¿Necesita schemas o tipos compartidos nuevos? → crearlos antes
- [ ] ¿Endpoints que no existen? → implementar backend primero
- [ ] ¿Claves de i18n nuevas? → prepararlas antes de usarlas
- [ ] ¿Afecta features existentes? → activar `protocolo-cambios`

### Paso 6 — Preparar el contexto de la AI

Construir el prompt con: la spec, los documentos a consultar, la arquitectura del módulo, las restricciones y **los archivos que no deben modificarse**.

### Paso 7 — Definir la secuencia de implementación

El último paso antes del código, y el que cierra la pre-implementación: dejar **escrito en el plan** cómo se va a recorrer la sección siguiente.

- [ ] Qué variante aplica: full-stack (pasos 1-10), solo-backend (1-5, 7-8, 10) o solo-frontend (6-8, 10)
- [ ] Qué pasos se omiten y por qué (sin migración, sin interfaz, sin paquete compartido)
- [ ] Si hay división por agentes, qué agente ejecuta qué pasos y en qué orden
- [ ] Qué comando verifica cada paso antes de avanzar al siguiente

Sin este paso, la secuencia se decide sobre la marcha, y sobre la marcha es cuando se saltan pasos: el test que «se hace después», el paquete compartido que se toca desde el frontend porque era más rápido. Escribirla cuesta dos minutos; seguirla sin haberla escrito no ocurre.

---

## Secuencia de implementación (orden estricto)

```
1. Schema / Migración de BD        (si aplica)
   ↓
2. Dominio                         entidades, value objects, puertos, errores
   ↓
3. Aplicación                      casos de uso, DTOs
   ↓
4. Infraestructura — Backend       repositorios, controllers, servicios externos
   ↓
5. Compartido                      schemas, tipos y constantes comunes
   ↓
6. Infraestructura — Frontend      páginas, componentes, formularios
   ↓
7. Tests                           unitarios + integración + componentes
   ↓
8. Corrección de tests unitarios   correr la suite, diagnosticar y corregir
   ↓
9. Corrección de tests E2E         solo bajo decisión explícita — no automático
   ↓
10. Verificación final             typecheck + lint → 0 errores
```

Feature solo-backend: pasos 1-5, 7-8 y 10. Feature solo-frontend: pasos 6-8 y 10.

**Regla:** no avanzar al paso siguiente si el actual falla.

**Validación incremental:** después de cada paso → ¿compila? → ¿los tests existentes siguen pasando? → confirmar antes de avanzar.

**Gate de copy (paso 6):** todo string visible nuevo pasa por el skill `ux-writer` **antes** de escribirse. Si el paso 6 lo ejecuta un agente separado, este gate va explícito en su prompt.

---

## División por agentes (features full-stack)

Si tu herramienta soporta múltiples agentes en paralelo, separar por scope evita que se pisen:

| Agente | Scope | Pasos |
|--------|-------|-------|
| Backend | API + BD + paquetes compartidos | 1-5 |
| Frontend | Aplicación web + librería de UI | 6 |
| Test | Archivos de test | 7 |

Regla de orden: Backend completa primero → Frontend después → Test al final. El paquete compartido es propiedad del agente Backend; nadie más lo modifica.

---

## Post-implementación

### Técnico
```bash
typecheck   # 0 errores
lint        # 0 warnings
test        # todos pasan, incluidos los nuevos
```

### UX (features con interfaz)
- [ ] La navegación respeta las capas
- [ ] Los 4 estados están cubiertos
- [ ] El skeleton refleja la estructura real de la pantalla
- [ ] Funciona en mobile
- [ ] Dark mode correcto
- [ ] Textos en archivos de i18n, no hardcodeados

### Completitud
- [ ] Todos los criterios de aceptación se cumplen
- [ ] Se crearon tests para el feature nuevo
- [ ] El feature no rompe features existentes
- [ ] **Lo que estaba fuera de alcance NO se implementó**
- [ ] Si se tocó la librería de componentes, su inventario quedó actualizado en el mismo commit

---

## Señales de alerta

Detener y reevaluar si:

- La AI modifica archivos fuera del scope de la spec
- La implementación requiere cambiar la arquitectura existente → es un cambio, no un feature
- Aparecen más de 3 archivos que no estaban en la spec
- Los tests existentes empiezan a fallar sin razón aparente

---

## Qué NO hacer

- NO implementar sin spec validada.
- NO avanzar al paso siguiente si el actual no compila o rompe tests.
- NO mezclar feature nuevo y modificación de algo existente en el mismo paso.
- NO dejar código a medio implementar sin cierre de sesión — cada parte debe ser funcional por separado.

---

## Adaptación a tu proyecto

1. Ajusta la secuencia de implementación a tu arquitectura: lo que importa es que sea **estricta y de adentro hacia afuera**, no las capas concretas.
2. Reemplaza los comandos de verificación por los de tu stack.
3. Si no usas agentes paralelos, ignora esa sección — el protocolo funciona igual en secuencial.

Capítulo de referencia: Falcux AI-First — Parte III, «Protocolo de desarrollo de features».
