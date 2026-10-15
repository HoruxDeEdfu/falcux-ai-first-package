---
# Versión del FORMATO de este archivo, no del proyecto.
formato: 1
proyecto: falcux-ai-first
fase: exploracion
actualizado: 2026-09-18

verificacion: pnpm test

# Lo que respondería la entrevista. Este repo instala sus skills con
# --enlazar, así que init no las adapta nunca (ADR-020); queda declarado para
# que el contrato de este repo sea el que enseña el paquete.
perfil:
  producto: cli
  repositorio: unico
adaptacion:
  secuencia: "contrato-cli"
  agentes: "si"
  typecheck: ""
  lint: ""
  manifiesto: "package.json"

# Sin zonas hoy. skills/ lo fue mientras el sitio la sobreescribía con rsync
# (hasta el 2026-09-17, ADR-006); ahora se edita acá. El check 1 se reporta
# omitido, que es lo honesto: no hay zona que inventar.
zonas_prohibidas: []

# El check 3 lee la spec del cambio en curso. Sin CHG abierto se omite, que es
# lo correcto: no hay alcance que exceder.
alcance:
  spec: docs/changes/pending/

# Cambiar la forma del contrato o de la interfaz es decisión. Las dependencias
# de producción las vigila el check 2 sin declararlas.
superficies_de_decision:
  - src/cli.ts
  - src/ai-first-md.ts
  - src/puntaje.ts
  - docs/SPEC-PAQUETE.md

# Sólo documentos que hablan de ESTE repo. docs/SPEC-PAQUETE.md no entra: describe un
# proyecto genérico y sus rutas de ejemplo no tienen por qué existir acá.
artefactos:
  agents: AGENTS.md
  handoff: docs/HANDOFF.md
  adr: docs/ADR.md
  readme: README.md
---

# AI-FIRST.md — `@falcux/ai-first`

> Qué gobierna a este proyecto. Acá está el mapa que las herramientas
> verifican; este paquete es la herramienta, así que se audita a sí mismo con
> `pnpm run audit:self`.

## Notas

Por qué `skills/` dejó de ser Zona Prohibida: lo era porque el sitio la
sobreescribía con `rsync --delete` a cada publicación, no por importancia.
Desde el 2026-09-17 (ADR-006) la fuente de verdad de las skills —ocho entonces,
diez desde ADR-010— es este repo y nada las regenera. Lo que sí sigue: el sitio
enlaza a `prod/skills/<nombre>/SKILL.md`, así que esas rutas no se mueven sin
avisar.

Por qué `src/puntaje.ts` es superficie de decisión: los pesos 40 / 20 / 8
están calibrados contra el único ejemplo publicado en la portada del sitio —no
en la landing comercial, que es otro repo—. Cambiarlos cambia ese número.
