# ADR 0002: El tronco de integración se llama `main`

**Estado:** propuesto · **Fecha:** 2026-11-25

## Contexto
Durante la migración de Reversi a Angular, el flujo de trabajo definió `develop` como tronco de integración (nacida de `master`, que quedaba como rama estable). Al terminar la migración, la persona dueña del repositorio renombró `develop` a `main`, con el mismo historial: el último commit de la migración (`4c5e5a7`) quedó en `main`.

La decisión se tomó pero no se escribió. El resultado era una incoherencia: `git config sdd.tronco` y `docs/arquitectura.md` seguían diciendo `develop`, una rama que ya no existe, por lo que los scripts de las skills resolvían un tronco inexistente. Este ADR es retroactivo: registra una decisión ya tomada.

## Opciones consideradas
1. **El tronco es `main`** (la rama renombrada) — una sola rama principal con todo el trabajo y el nombre más habitual · costo: `master`, que solo conserva el commit de importación, queda sin uso y puede confundir; hay documentos que actualizar.
2. **Volver a `develop`** — no obliga a tocar los documentos · deshace una decisión ya tomada y dejaría `main` como rama sin sentido.
3. **No cambiar nada** — · los scripts siguen apuntando a una rama que no existe y el estado del ciclo (`sdd-estado.sh`) no es fiable.

## Decisión
El tronco de integración es **`main`**. Se declara en `git config sdd.tronco main` y en `docs/arquitectura.md` (sección "Flujo de trabajo"). `master` conserva únicamente el commit de importación inicial y no recibe cambios; qué hacer con ella (borrarla, o declararla rama de releases con `sdd.release`) se decide en un cambio de entrega aparte.

## Consecuencias
- **Mejora:** los scripts, los documentos y el repositorio vuelven a coincidir, y `sdd-estado.sh` y `sdd-git.sh` operan sobre el tronco real.
- **Se acepta:** los textos históricos que nombran `develop` (el plan de migración, el ADR 0001 y los mensajes de commit) se leen como "el tronco de entonces, hoy `main`". El plan lo deja anotado.
- **Fuera de este cambio:** algunos archivos de las propias skills (`.claude/skills/_shared/ramas-y-commits.md` y otros) traen `develop` como ejemplo del repositorio. No afectan a los scripts, que leen `git config sdd.tronco`, y no son documentación del proyecto.

## Reversibilidad
Alta y sin datos: volver a renombrar la rama y ejecutar `git config sdd.tronco develop`, y revertir este cambio de documentos.

## Specs afectados
Ninguno. `spec-partida-reversi.md` no nombra ramas.
