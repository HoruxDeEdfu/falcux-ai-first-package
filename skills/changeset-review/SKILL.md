---
name: changeset-review
description: "Revisa los changesets pendientes de un repo que versiona con Changesets contra el diff real antes de publicar: que el tipo (major, minor, patch o vacío) corresponda a lo que cambió en cada paquete, que una major traiga su guía de migración y no esté partida, y si el lote ya amerita mergear el PR de versiones. Activar antes de mergear ese PR, cuando alguien pregunte si conviene publicar, o al escribir un changeset con dudas sobre su tipo. Sólo reporta: no edita changesets, no crea tags y no mergea sin confirmación. En un repo sin Changesets, la skill es version-bump."
---

## Propósito

En un repo con Changesets, el número de versión no lo decide nadie en la sesión:
lo calcula `changeset version` a partir de los changesets pendientes. Lo que
queda por juzgar es si cada changeset dice la verdad. Un changeset más bajo que
su diff publica como parche un cambio que rompe, y el producto que actualiza se
entera en producción.

Esta skill compara cada changeset pendiente con lo que cambió de verdad en su
paquete y dice si el lote está listo para publicarse. No escribe nada.

## Cuándo activar

- Antes de mergear el PR de versiones que abre `changesets/action`
- Cuando alguien pregunta si conviene publicar ya
- Al escribir un changeset con dudas sobre su tipo
- En el Paso 6 de `protocolo-cierre`, si el proyecto versiona con Changesets

**NO activar** en un repo sin `.changeset/config.json`: ahí el número lo sube
`version-bump`.

---

## Paso 1 — Qué está pendiente

```bash
ls .changeset/*.md | grep -v README.md          # changesets sin publicar
npx changeset status --verbose                   # versión que saldría de cada paquete
gh pr list --head changeset-release/<base> --json number,title,updatedAt,url
git tag --list --sort=-creatordate | head -20    # el último tag de cada paquete
```

La rama base, los paquetes y la forma de los tags están en «Adaptación a tu
proyecto». Por cada changeset: su frontmatter (paquete y tipo), su texto y el
commit que lo trajo:

```bash
git log --diff-filter=A --format='%h %s' -- .changeset/<archivo>.md
```

Si no hay changesets pendientes, decirlo y terminar.

## Paso 2 — El diff de cada paquete desde su último tag

```bash
git diff --stat <tag>..HEAD -- <carpeta del paquete>
git diff <tag>..HEAD -- <carpeta del paquete>/src <carpeta del paquete>/package.json
```

Mirar también lo que el paquete publica fuera de `src/`: lo que declaran `files`
y `exports` de su `package.json`. Lo que no se publica no cuenta para el tipo.

## Paso 3 — ¿El tipo corresponde al diff?

Buscar en el diff las señales de cada tipo. Gana la más alta.

| Señal en el diff | Tipo mínimo |
|---|---|
| Se borra un `export` de un archivo de entrada, o una clave de `exports` en `package.json` | major |
| Se borra o se renombra algo de la API pública: una función, un tipo, una opción | major |
| Una opción pasa de opcional a obligatoria | major |
| Sube la major de un rango en `peerDependencies` | major |
| Sube la versión mínima de Node en `engines` | major |
| Cambia el `name` del paquete | major |
| Export, opción opcional o entrada nuevos | minor |
| Cambia el comportamiento por defecto sin cambiar la API | minor o patch: decidir con quien pidió el cambio |
| Corrige un comportamiento sin cambiar la API | patch |
| Sólo pruebas, scripts o archivos que no se publican | vacío |

Las señales de tu dominio —las props de un componente, los tokens, las
variables CSS, el esquema de una respuesta— van en «Adaptación a tu proyecto».
Esta tabla trae las que valen para cualquier paquete.

Reportar cada desajuste:

- un changeset **más bajo** que el diff. Es lo más grave: un producto actualiza
  y se rompe;
- uno **más alto** que el diff: una major que no pide migrar;
- uno patch o minor que debería ser **vacío**;
- un cambio publicado **sin ningún changeset** que lo cubra.

No inventar la clasificación. Si una señal es ambigua, como un cambio de
comportamiento, preguntar.

## Paso 4 — Si hay una major

- **Guía de migración:** existe y cubre lo que rompe el diff. Si falta, la
  major no está lista. Dónde vive está en «Adaptación a tu proyecto».
- **Una decisión, una major:** ¿hay PRs abiertos, ramas o cambios en curso de
  la misma decisión? Si sí, la serie está partida y el PR de versiones espera.
  Dos majors seguidas por una misma decisión obligan a migrar dos veces.

## Paso 5 — ¿El lote amerita publicarse?

Si el proyecto tiene su política escrita, manda ella. Si no, esta es la de
partida:

- trae un minor o una major completa → sí;
- un producto espera una corrección → sí (preguntar si no se sabe);
- el PR de versiones tiene una semana o más → sí;
- sólo changesets vacíos → no;
- sólo patches y nadie los espera → puede esperar.

## Paso 6 — Reporte

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHANGESET REVIEW

@acme/ui      4.0.1 → 4.1.0 (minor)
@acme/tokens  sin cambios

Changesets (3):
  ✓ nuevo-combobox.md   minor   a1b2c3d   el diff agrega Combobox
  ✗ ajuste-dialog.md    patch   d4e5f6a   closeLabel pasa a obligatorio → major
  ~ solo-pruebas.md     patch   b7c8d9e   sólo test/ → vacío

Major: —
Lote: no listo. Hay un changeset que subestima el cambio.

Acciones propuestas:
  1. ajuste-dialog.md: patch → major, con su guía de migración
  2. solo-pruebas.md: dejarlo vacío
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Qué NO hacer

- NO mergear el PR de versiones. Lo mergea una persona.
- NO editar un changeset ni crear uno sin confirmación explícita. Corregir un
  tipo cambia la versión que va a salir.
- NO crear tags ni correr `changeset version` o `changeset publish`: lo hace el
  flujo de publicación.
- NO sugerir major porque un cambio fue grande. El tamaño no cuenta: cuenta si
  quien usa el paquete tiene que tocar su código.

---

## Adaptación a tu proyecto

1. Agrega a la tabla del Paso 3 las señales de tu dominio. En un sistema de
   diseño: borrar o renombrar una prop o un token es major, y agregar una
   variante es minor.
2. Escribe dónde vive la guía de migración de una major, y si después de
   publicar va una entrada en unas novedades.
3. Si tu proyecto ya decidió cuándo se publica, enlaza ese documento en el
   Paso 5 en vez de la política de partida.

Skills relacionadas: `protocolo-cierre` (su Paso 6 la invoca cuando el proyecto
versiona con Changesets), `version-bump` (la que se usa en un repo sin
Changesets).
