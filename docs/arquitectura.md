# Arquitectura y convenciones

## Regla de trabajo (regla 3.1)
Leer el spec de la capacidad antes de proponer un cambio y escribir el delta del spec antes de codificar. Si al construir aparece algo que el spec no previó, detenerse, proponer el ajuste del spec y pedir OK. Ciclo: `/sdd-exploracion` → `/sdd-propuesta` → `/sdd-aplicacion` → `/sdd-verificacion`.

## Estado actual (AS-BUILT)
- **Sistema:** juego de Reversi contra la computadora, un solo archivo `reversi-game-java-main/Reversi2.java` (applet Java 1.1 AWT, ejecutable también como aplicación con `main()`).
- **Patrón:** clase única `Reversi2` con estado, reglas, IA y vista mezclados; `Reversi2Board` es un lienzo que delega todo en ella; `Reversi2Window` solo cierra la aplicación.
- **Concurrencia:** un hilo auxiliar (`run()`) ejecuta la jugada de la computadora sobre el mismo estado que usa la interfaz, sin sincronización.
- **Entorno:** el script de compilación `make-revers2.bat.txt` usa una ruta absoluta de JDK 1.4.2; los `.class` y el `.jar` del repo son artefactos de compilación.
- **Tests:** ninguno.

## Objetivo
Migrar a **Angular 21** (Caso 4). La elección del stack, la estructura del proyecto, el test runner y la estrategia de i18n se deciden y registran en un cambio dedicado con `/sdd-arquitectura` (ADR en `docs/adr/`), antes de la migración. Hasta entonces este documento no fija el stack destino.

## Invariantes transversales
- La lógica del juego (reglas, IA) no depende de la interfaz, para poder probarla de forma aislada.
- La interfaz soporta inglés y español (decisión del 2026-11-25, ver `docs/specs/spec-partida-reversi.md`).
- El código original es GPLv3+ (el README permite convertirlo a Apache 2.0 o GPLv2). La licencia del port está **pendiente de decidir** en el ADR.

## Comandos útiles
- Legacy: `javac Reversi2.java` y `java Reversi2` desde `reversi-game-java-main/`.
- Angular 21: por definir en el ADR.

## Flujo de trabajo
- **Tronco de integración:** `master`
- **Ramas:** `<tipo>/<capacidad>-<slug>` (tipos: `init`, `feat`, `change`, `refactor`, `fix`, `migrate`, `baseline`, `arq`, `spec`, `hotfix`).
- **Commits:** Conventional Commits con trailers `SDD-*`, hechos con `sdd-git.sh`.
- **Merge:** local, con OK explícito tras `/sdd-verificacion`. Sin push, pull ni PR desde las skills.

## Despliegue y reversión
Por definir junto con el stack destino. El legacy no tiene despliegue documentado.

## ADRs
Ninguno todavía. Directorio: `docs/adr/`.
