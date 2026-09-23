# Qué artefactos salen para cada perfil

El perfil está en el frontmatter de `AI-FIRST.md`, con dos ejes. Lo declara la
entrevista de `ai-first init`; si no está, se pregunta al empezar la Fase 1.

```yaml
perfil:
  producto: saas        # saas | landing | api | cli | movil
  repositorio: unico    # unico | monorepo | multiple
```

## Por tipo de producto

| Artefacto | Template | saas | landing | api | cli | movil |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `docs/PRD.md` | `PRD_TEMPLATE.md` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `docs/ARQUITECTURA.md` | `ARQUITECTURA_TEMPLATE.md` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `docs/specs/<modulo>.md` | `SPEC_MODULO_TEMPLATE.md` | ✓ | una sola | ✓ | ✓ | ✓ |
| `docs/GUIA_DISENO.md` | `GUIA_DISENO_TEMPLATE.md` | ✓ | ✓ | — | — | ✓ |
| `docs/COMPONENTES.md` | `COMPONENT_LIBRARY_TEMPLATE.md` | ✓ | ✓ | — | — | ✓ |
| `docs/TECH_NOTES.md` | `TECH_NOTES_TEMPLATE.md` | ✓ | ✓ | ✓ | ✓ | ✓ |

`AGENTS.md` sale de `AGENTS_MD_TEMPLATE.md` en todos los perfiles, y ya existe
con su bloque cuando `init` corrió: se completa **fuera** de las marcas.

Una landing lleva **una sola spec**, del sitio entero. Separar en módulos algo
que son cinco secciones de una página produce cinco documentos que nadie abre.

Un producto sin interfaz no lleva guía de diseño ni inventario de componentes.
Escribirlos «por completitud» es entropía documental: documentos que nadie
mantiene porque nadie los necesita.

## Por forma del repositorio

| | Qué cambia |
|---|---|
| `unico` | Nada. Todo en `docs/` de la raíz. |
| `monorepo` | La arquitectura describe los paquetes y **qué depende de qué**; esa dirección es lo que se rompe primero. Las specs dicen a qué paquete pertenece cada una. `AI-FIRST.md` es uno solo, en la raíz. |
| `multiple` | Cada repo tiene su `AI-FIRST.md` y su `AGENTS.md`. El PRD y la arquitectura viven **en uno solo**, y los demás lo referencian en prosa, sin ruta: una ruta a otro repo la cobra el detector como artefacto huérfano. |

## El inventario de componentes y el detector

`docs/COMPONENTES.md` no es decorativo: es lo que el check 5 vigila. Para que
vigile algo, `AI-FIRST.md` necesita las dos claves, y sin ellas el check se
reporta omitido, nunca aprobado:

```yaml
artefactos:
  inventario_componentes: docs/COMPONENTES.md
  componentes_dir: src/components/
```

## Lo que no es artefacto de arranque

- **El registro de sesión y el de cambios.** Son cronología; nacen vacíos con
  `init` y los llenan `protocolo-cierre` y `protocolo-cambios`.
- **El handoff.** Describe un estado, y al arrancar no hay estado que describir.
- **Las skills.** El paquete trae once y `init` instala las del perfil. Este
  protocolo no escribe skills nuevas: si una del paquete no encaja, se adapta
  dentro de sus marcas, y si falta un oficio entero, eso es una decisión de ADR.
