# Registro de cambios

> Resumen permanente de cada cambio cerrado con `protocolo-cambios`: fecha, tipo,
> archivos, resumen y lecciones. El documento CHG-XXX vive en `pending/` mientras
> el cambio está en curso y se elimina al cerrarlo; acá queda su resumen.
>
> No confundir con el `CHANGELOG.md` de la raíz, que dice qué cambió en cada
> versión publicada del paquete, para quien lo instala. Existe desde la 0.4.0.

---

## CHG-001 — `init` salta lo que ya existe y sigue, en vez de detenerse

- **Fecha:** 2026-09-18 (abierto y cerrado el mismo día)
- **Tipo:** cambio de requerimiento, flujo corto
- **Decisión:** ADR-017, que supera la parte de ADR-003 que decía «si
  `AI-FIRST.md` existe, se detiene»
- **Archivos:** `src/init.ts`, `src/cli.ts`, `test/init.test.ts`

**Resumen.** `iniciar` ya no lanza cuando `AI-FIRST.md` existe: el resultado
gana `saltados` junto a `escritos`, y ahí van tanto `AI-FIRST.md` como el ADR
que ya estaba —que antes se saltaba sin decirlo—. El CLI imprime una línea por
archivo, «escrito» o «saltado (ya existe)», y sale con 0. Su ayuda deja de
prometer el error. Nunca sobreescribir sigue entero. Era el prerrequisito del
`init` completo (`docs/specs/init-completo.md`), que tiene que poder correr
sobre un repo ya configurado.

**Pruebas.** La que fijaba el error pasa a comprobar que salta, que
`AI-FIRST.md` no cambia ni un byte y que el ADR que falta sí se escribe. Una
nueva cubre el repo con los dos archivos presentes: nada escrito, dos saltados,
sin error. La del ADR existente comprueba que aparece en `saltados`. Suite en
61 pruebas.

**Lecciones.** El check 2 compara el árbol de trabajo contra HEAD: si la fila
del ADR entra en un commit y el código en el siguiente, el `audit:self` previo
al segundo commit da P1 aunque la decisión esté escrita. Se verifica con
`--base` sobre un rango que incluya los dos, o se meten fila y código en el
mismo commit.

## CHG-002 — La versión sale del README a mano y entra por badge; `version-bump` lo enseña

- **Fecha:** 2026-09-18 (abierto y cerrado el mismo día)
- **Tipo:** cambio de requerimiento, flujo completo por contar tres archivos,
  sin schema ni decisión de ADR
- **Archivos:** `README.md`, `skills/version-bump/SKILL.md`, `docs/HANDOFF.md`

**Resumen.** El README dejó de escribir el número de versión: la cabecera
lleva un badge de shields.io que lee npm, y la tabla «Qué hay» clasifica por
estado —publicado o sin escribir— sin nombrar versiones. La skill
`version-bump` gana en «Mostrar la versión» la regla de que el README lleva
badge y no número, y que el detalle de cada versión va al CHANGELOG. El handoff
registra la salida de la `0.2.0`, que no tenía.

**Por qué.** El número a mano mintió dos veces en dos días: «publicado en
0.1.0» tres versiones después (sesión 2), y «la última es la 0.1.3» con la
`0.2.0` ya en npm y todo lo que decía «en `dev`» viajando en ese tarball. Los
dos repos de compliance no llevan versión en el README; npm la muestra del
manifiesto; los paquetes conocidos usan badge.

**Lecciones.** Toda copia a mano de un dato que vive en otro sitio se
desactualiza; la solución no es acordarse, es no copiarlo. Y el shasum del
tarball publicado con `pnpm publish` no coincide con el de `npm pack` local
aunque el contenido sea idéntico: pnpm normaliza el `package.json`. Se compara
desempaquetando, no por shasum.

## CHG-003 — El nombre de la metodología queda en «Falcux AI-First» en todo el paquete

- **Fecha:** 2026-09-21 (abierto y cerrado el mismo día)
- **Tipo:** corrección, flujo completo por contar ocho archivos, sin schema ni
  decisión de ADR: la decisión ya estaba tomada y esto la aplica
- **Archivos:** los cinco `SKILL.md` que citan el manual —`protocolo-features`,
  `protocolo-cambios`, `protocolo-cierre`, `protocolo-ux`, `protocolo-arranque`—,
  `skills/README.md`, `README.md`, `docs/HANDOFF.md` y
  `docs/specs/arranque-de-proyecto.md`

**Resumen.** El renombre a «Falcux AI-First» estaba decidido y registrado en la
sección «Naming» del handoff desde antes del primer publish, pero nunca se
aplicó a los archivos que se distribuyen. El paquete publicado en npm enseñaba
el nombre que el propio proyecto había abandonado, y tres variantes circulaban a
la vez: nueve menciones de «Blueprint AI-First», cuatro de «Falcux AI-First» y
tres de «AI-First Blueprint». Lo encontró Charlie leyendo la skill
`protocolo-arranque` recién escrita, que heredó la fórmula de las otras cuatro.

Ahora las cinco skills cierran con «Capítulo de referencia: Falcux AI-First», y
los dos README y la cláusula de marcas dicen lo mismo. Ninguna ruta se movió, así
que ningún enlace publicado se rompe.

**Lo que a propósito no cambió.** La transcripción del prompt de origen en
`docs/specs/arranque-de-proyecto.md` conserva «AI-First Blueprint» porque es una
cita literal de un documento que existió con ese nombre; ganó una nota que
aclara cuál es el vigente. La línea del handoff que registra el renombre también
lo conserva, porque su trabajo es nombrarlo.

**Lecciones.**

1. **El detector no vigila nombres propios.** El check 4 comprueba que las rutas
   mencionadas existan, no que los términos sean los vigentes, así que un
   renombre a medias sobrevive a un `audit:self` en 0. Vigilarlo pediría una
   lista de términos vigentes en el contrato de `AI-FIRST.md`: es un feature, no
   un cambio, y queda anotado en el handoff.
2. **Una decisión registrada no es una decisión aplicada.** El handoff decía el
   nombre correcto desde el principio; nadie volvió a leerlo al escribir las
   skills. Un renombre necesita su propio recuento a cero, no sólo su fila.
3. **La fórmula copiada propaga el error.** La skill nueva heredó «Blueprint
   AI-First» de las cuatro anteriores sin que nadie lo notara al escribirla. Lo
   que se copia entre archivos hermanos hay que verificarlo contra la fuente, no
   contra el hermano.
