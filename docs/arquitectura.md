# Arquitectura y convenciones

## Regla de trabajo (regla 3.1)
Leer el spec de la capacidad antes de proponer un cambio y escribir el delta del spec antes de codificar. Si al construir aparece algo que el spec no previó, detenerse, proponer el ajuste del spec y pedir OK. Ciclo: `/sdd-exploracion` → `/sdd-propuesta` → `/sdd-aplicacion` → `/sdd-verificacion`.

## Estado actual (AS-BUILT)
- **Sistema vigente:** juego de Reversi contra la computadora, un solo archivo `reversi-game-java-main/Reversi2.java` (applet Java 1.1 AWT, ejecutable también como aplicación con `main()`).
- **Patrón:** clase única `Reversi2` con estado, reglas, IA y vista mezclados; `Reversi2Board` es un lienzo que delega todo en ella; `Reversi2Window` solo cierra la aplicación.
- **Concurrencia:** un hilo auxiliar (`run()`) ejecuta la jugada de la computadora sobre el mismo estado que usa la interfaz, sin sincronización.
- **Entorno:** el script de compilación `make-revers2.bat.txt` usa una ruta absoluta de JDK 1.4.2; los `.class` y el `.jar` del repo son artefactos de compilación.
- **Tests:** ninguno.

## Stack destino (decidido en ADR 0001; aún no implementado)
Detalle y alternativas en `docs/adr/0001-stack-angular-21.md`.
- **Framework:** Angular 21, componentes standalone, señales, sin zone.js (zoneless), TypeScript estricto.
- **Ubicación:** `reversi-angular/`, junto al legacy.
- **Capas (dependencia en un solo sentido, `ui` → `game` → `domain`):**
  - `domain/`: reglas, tablero e IA en TypeScript puro, sin Angular; el azar se inyecta.
  - `game/`: servicio de partida con señales, turnos, temporizadores cancelables y mensajes.
  - `ui/`: componentes de tablero (DOM + CSS grid), controles y mensajes; sin lógica de reglas.
- **Pruebas:** Vitest; lógica sin navegador, componentes con el banco de pruebas de Angular.
- **i18n:** Transloco en tiempo de ejecución; inglés (base) y español, con selector en pantalla.
- **Licencia del port:** GPLv3+.
- **Despliegue:** compilación estática; el hosting está por decidir.

## Invariantes transversales
- La lógica del juego (reglas, IA) no depende de la interfaz ni de Angular, para probarla de forma aislada.
- Ningún componente decide reglas: solo muestra estado y emite acciones del usuario.
- Los textos visibles al usuario pasan por i18n; no hay literales en las plantillas.
- La interfaz soporta inglés y español (decisión del 2026-11-25, ver `docs/specs/spec-partida-reversi.md`).
- El código original es GPLv3+; el port mantiene GPLv3+ (ADR 0001).

## Restricciones del entorno
- Node.js `^20.19`, `^22.12` o `^24` para Angular 21. El entorno de desarrollo tenía Node 23.5.0, no soportado; hay que cambiarlo antes de crear el proyecto.

## Comandos útiles
- Legacy: `javac Reversi2.java` y `java Reversi2` desde `reversi-game-java-main/`.
- Angular 21: se fijan al crear el proyecto (`ng serve`, `ng build`, `ng test`).

## Flujo de trabajo
- **Tronco de integración:** `main` (antes `develop`, renombrada al terminar la migración; ver ADR 0002). `master` conserva solo el commit de importación y no recibe cambios
- **Ramas:** `<tipo>/<capacidad>-<slug>` (tipos: `init`, `feat`, `change`, `refactor`, `fix`, `migrate`, `baseline`, `arq`, `spec`, `hotfix`).
- **Commits:** Conventional Commits con trailers `SDD-*`, hechos con `sdd-git.sh`.
- **Merge:** local, con OK explícito tras `/sdd-verificacion`. Sin push, pull ni PR desde las skills.

## Despliegue y reversión
Compilación estática del proyecto Angular. El hosting y la reversión se deciden en un cambio posterior de arquitectura. El legacy no tiene despliegue documentado.

## ADRs
- `docs/adr/0001-stack-angular-21.md` — stack Angular 21, estructura, pruebas, i18n, tablero y licencia.
- `docs/adr/0002-tronco-main.md` — el tronco de integración se llama `main` (antes `develop`).
