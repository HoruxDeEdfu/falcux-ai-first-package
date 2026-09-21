# `--version` — el CLI dice qué versión está instalada

> Spec de feature, con el formato de `templates/SPEC_MODULO_TEMPLATE.md`. Sin
> modelo de datos, permisos, API ni interfaz: una opción del CLI. Estado:
> **pedida por Charlie el 2026-09-21**, a raíz de un hallazgo de la sesión del
> sitio. Pre-implementación (`protocolo-features`, Pasos 1, 2, 5 y 7) en este
> documento; los pasos 3, 4 y 6 no aplican a un CLI sin interfaz.

## Contexto de negocio [OBLIGATORIO]

`ai-first` no tiene forma de decir qué versión corre. `npx @falcux/ai-first
--version` muere con `ERR_PARSE_ARGS_UNKNOWN_OPTION` y una traza, porque
`parseArgs` no conoce la opción. Lo encontró la sesión del sitio el
2026-09-21 al verificar la `0.2.1`. Toda herramienta de línea de comandos
responde a `--version`; es lo primero que se pide cuando una salida no coincide
con lo documentado, que es justo lo que pasó ese día con el panel del sitio.

## Alcance [OBLIGATORIO]

**Incluye**

1. `ai-first --version` y `ai-first -v` escriben la versión del `package.json`
   del paquete instalado, sola y con salto de línea, en `stdout`, y salen con 0.
2. La versión se lee en tiempo de ejecución del `package.json` del paquete,
   resuelto desde el módulo con `import.meta.url`, igual que `init` resuelve
   `skills/`. Funciona desde `node_modules` y desde este repo. No hay constante
   que sincronizar en el build ni paso extra de `version-bump`.
3. `--help` lista la opción.

**No incluye**

- Un mensaje limpio para las demás opciones desconocidas: hoy salen con 2 y
  la traza de `parseArgs`. Es un cambio del comportamiento existente y va por
  `protocolo-cambios` si se decide.
- Avisar si hay una versión más nueva en npm. El detector no habla con la red.

## Dependencias [OBLIGATORIO]

- Usa `node:fs` y `node:url`. No entra ninguna dependencia.
- Toca `src/cli.ts`, superficie de decisión en `AI-FIRST.md`. No es decisión
  arquitectónica: el commit lleva `<!-- ai-first: sin-decision -->`.
- No toca `src/init.ts`, `src/audit.ts` ni las verificaciones.

### Inventario de reuso (Paso 2)

| Pieza | Decisión | Justificación |
|---|---|---|
| Resolver rutas del paquete desde el módulo | Reusa el patrón de `carpetaSkillsDelPaquete` | Mismo `new URL(..., import.meta.url)`; no se extrae una función común porque son dos usos con destinos distintos y una línea cada uno |
| Leer y parsear `package.json` | Nueva local, en `src/cli.ts` | Sólo el CLI necesita la versión; ningún check la lee |
| Prueba que ejecuta el binario compilado | Nueva local, `test/cli.test.ts` | Las pruebas existentes importan funciones; ésta necesita el proceso entero porque lo que se prueba es `parseArgs` y la salida |

## Reglas de negocio [OBLIGATORIO]

- `--version` gana a todo lo demás: con o sin comando, con o sin `--help`,
  escribe la versión y sale con 0. Es lo que hacen `node` y `npm`.
- La salida es sólo el número, para que un script pueda compararla.

## Archivos del módulo [OBLIGATORIO]

- `src/cli.ts`: la opción, la ayuda y `versionDelPaquete()`.
- `test/cli.test.ts`: nuevo.
- `README.md`: una línea en el bloque de uso.

## Criterios de aceptación [OBLIGATORIO]

1. `node dist/src/cli.js --version` imprime exactamente la `version` del
   `package.json` más un salto de línea, y sale con 0.
2. `node dist/src/cli.js -v` hace lo mismo.
3. `node dist/src/cli.js --help` menciona `--version`.
4. La suite sigue en verde y `audit:self` da 0 con el árbol limpio.

## Estado de implementación [CRECE]

### Implementado
- 2026-09-21: los tres criterios, en el mismo commit que esta spec.

## Secuencia (Paso 7)

Variante solo-backend sin schema ni capa compartida: código en `src/cli.ts`
(paso 4 de la secuencia), prueba (7), corrección si falla (8), `pnpm test` por
exit code y `audit:self` (10). Una sola sesión, sin división por agentes.

## Changelog de esta spec

- 2026-09-21: escrita e implementada.
