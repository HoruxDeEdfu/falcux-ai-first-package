---
name: version-bump
description: "Analiza los commits desde el último tag de versión, clasifica el cambio según SemVer (MAJOR/MINOR/PATCH), recomienda el bump apropiado y lo aplica actualizando los manifiestos del proyecto. Pide confirmación explícita antes de aplicar y NUNCA crea el tag — eso lo hace el humano. Activar al final de una sesión de implementación, después de protocolo-cierre."
---

## Propósito

Mantener el versionamiento semántico sincronizado con el trabajo real de cada sesión, en vez de con la memoria de quien hace el release.

El versionamiento manual falla de forma predecible: se bumpea cuando alguien se acuerda, se clasifica por intuición, y tres meses después la versión no dice nada sobre qué cambió. Este skill convierte el historial de commits — que ya existe — en la fuente de la decisión.

## Cuándo activar

- Al finalizar una sesión de implementación, después de `protocolo-cierre`
- Cuando el humano lo pide explícitamente
- Siempre **antes** del commit de cierre — la versión viaja en el mismo commit

**NO activar para:**
- Sesiones de solo lectura, exploración o análisis sin cambios de código
- Sesiones con solo cambios de documentación

---

## Reglas SemVer

### MAJOR (x.0.0) — rompe compatibilidad
- Endpoint eliminado, o forma de la respuesta cambiada de modo incompatible
- Migración de BD destructiva (DROP de columna, cambio de tipo incompatible)
- Reestructuración que rompe integraciones existentes
- Commit `feat!:` / `fix!:`, o `BREAKING CHANGE:` en el cuerpo

### MINOR (0.x.0) — funcionalidad nueva, compatible
- Módulo nuevo completo
- Cambio documentado completado, con features nuevas para el usuario
- Endpoints nuevos que agregan funcionalidad sin romper los existentes
- Pantallas o flujos de usuario completos
- Commits `feat:` con alcance sustancial

### PATCH (0.0.x) — correcciones, sin funcionalidad nueva
- Bug fixes (`fix:`)
- Refactoring interno sin cambio de interfaz (`refactor:`)
- Mejoras de performance sin cambio de API
- Tests agregados (`test:`)
- Ajustes menores de UI, sin features nuevas
- Setup de herramientas de desarrollo

### Ninguno — no amerita bump
- Sesión de solo documentación
- `chore:` / `docs:` sin impacto en código productivo
- Sesión exploratoria sin commits de código

---

## Ejecución

### Paso 1 — Recopilar estado

```bash
# Versión actual declarada en el manifiesto
grep '"version"' package.json

# Último tag de versión
git tag --list 'v*' | sort -V | tail -5

# Commits desde el último tag (o desde el inicio si no hay tags)
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline
```

### Paso 2 — Clasificar cada commit

| Prefijo | Impacto probable |
|---------|-----------------|
| `feat!:` / `fix!:` / `BREAKING CHANGE` | MAJOR |
| `feat:` con módulo nuevo | MINOR |
| `feat:` menor (ajuste de un feature existente) | PATCH |
| `fix:` | PATCH |
| `refactor:` / `test:` | PATCH |
| `docs:` / `chore:` | ninguno |

**Regla del máximo:** gana el más alto. Un solo commit MAJOR en el rango → bump MAJOR, sin importar cuántos PATCH lo acompañen.

> Esta tabla asume commits convencionales. Si tu proyecto no los usa, la clasificación cae de vuelta en leer el diff — que funciona, pero es lento y menos confiable. Adoptar el formato de commit es el prerrequisito barato de este skill.

### Paso 3 — Cruzar con el SESSION_LOG

Leer las últimas 2 entradas de `docs/SESSION_LOG.md` para contexto que el mensaje de commit no captura:

- ¿Se completó un cambio con features nuevas? → confirma MINOR
- ¿La sesión fue solo infra o testing? → probablemente PATCH
- ¿Hubo una migración de BD? → evaluar si fue destructiva

### Paso 4 — Presentar la recomendación

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERSION BUMP — Análisis

Versión actual:  0.X.X
Versión nueva:   0.Y.Z  (MINOR)

Commits analizados (desde v0.X.X):
  feat: módulo de reportes implementado   (→ MINOR)
  fix: corrección en el filtro de listado (→ PATCH)
  test: suite de componentes              (→ PATCH)

Justificación: 1 commit feat: con módulo nuevo → MINOR.

¿Aplicar el bump a 0.Y.Z?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Esperar confirmación explícita antes del Paso 5.** Sin excepción.

### Paso 5 — Aplicar (solo tras confirmación)

Actualizar **todos** los manifiestos del proyecto a la misma versión. En un monorepo, esto significa cada paquete — las versiones desincronizadas entre paquetes son una fuente de confusión permanente.

```bash
NEW_VERSION="0.Y.Z"

for PKG in $(find . -name package.json -not -path "*/node_modules/*"); do
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$PKG', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('$PKG', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "✓ $PKG → $NEW_VERSION"
done
```

**Y en el mismo commit, fecha la entrada del CHANGELOG.** Si el proyecto
mantiene uno, la entrada de esta versión deja de estar «sin publicar» y gana la
fecha de hoy, junto al número que acabas de subir.

Fecharla después, cuando el paquete ya salió, llega tarde siempre: el tarball se
construye con lo que hay en disco en ese momento, así que la única fecha que
alcanza a viajar dentro del artefacto es la del bump. Si el publish se retrasa a
otro día, se corrige al publicar, que entonces sí es antes de empaquetar.

### Paso 6 — Reportar

```
✓ Manifiestos actualizados a v0.Y.Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tu turno:
□ Verificar que todos los manifiestos tienen la versión correcta
□ Incluirlos en el commit de cierre de sesión
□ Después del commit: git tag v0.Y.Z && git push origin v0.Y.Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**El tag lo crea el humano, no la AI.** El tag apunta al commit final — que incluye los manifiestos actualizados — y ese commit lo hace el humano en la Fase C del cierre. Un tag creado antes apunta al lugar equivocado.

---

## Mostrar la versión: en la interfaz y en el README

La versión vive en **un** sitio, el manifiesto, y el tag la refleja. Todo lo
demás la lee de ahí; nada la copia.

Si el producto muestra su versión, que la lea del manifiesto en vez de tenerla
hardcodeada:

```js
import { version } from './package.json';
```

Si el README la muestra, que sea un badge que lee el registro, no un número en
prosa:

```markdown
[![npm](https://img.shields.io/npm/v/@scope/paquete)](https://www.npmjs.com/package/@scope/paquete)
```

Un número escrito a mano en el README es un segundo manifiesto que nadie
bumpea: se queda en la versión del día que alguien lo escribió, y el lector no
tiene cómo saberlo. El README dice **estado** —qué está publicado y qué no—;
qué cambió en cada versión va al `CHANGELOG.md`, que es su documento.

El CHANGELOG sí lleva fechas, y ésas se escriben en el commit del bump, por lo
del Paso 5: ningún texto que describa el publish puede escribirse después del
publish y seguir llegando al paquete publicado.

Así el bump se refleja solo, sin un segundo lugar que actualizar y olvidar.

---

## Qué NO hacer

- NO aplicar el bump sin confirmación explícita del usuario.
- NO crear el git tag — es del humano.
- NO bumpear MAJOR por refactoring interno o cambios de tests.
- NO bumpear si la sesión fue solo documentación.
- NO desincronizar versiones entre paquetes del monorepo.
- NO inventar la clasificación si los commits no la soportan — preguntar.

---

## Adaptación a tu proyecto

1. Reemplaza `package.json` por el manifiesto de tu ecosistema (`pyproject.toml`, `Cargo.toml`, `*.csproj`, `build.gradle`).
2. Si publicas paquetes, considera si el bump debe disparar la publicación o quedarse en el tag.
3. Si usas versionado por fecha (CalVer) en vez de SemVer, cambia las reglas de clasificación pero conserva el flujo: analizar → recomendar → confirmar → aplicar → el humano taggea.

Skill previo en el flujo: `protocolo-cierre`.
