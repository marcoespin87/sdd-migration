# Plan: Migración de Reversi2 a Angular 21

**Fecha:** 2026-11-25
**Estado:** en desarrollo
**Caso:** 4

## Contexto
`reversi-game-java-main/Reversi2.java` es un applet Java 1.1 AWT de un solo archivo (estado, reglas, IA y vista mezclados, con un hilo auxiliar sin sincronizar). `docs/specs/spec-partida-reversi.md` describe su comportamiento (baseline del Caso 5, ya mergeado) y ya incluye el comportamiento correcto de tres defectos del legacy: interfaz congelada al saltar turno (A), jugada pendiente sobre una partida nueva (B) y resaltado persistente (C). El stack destino está decidido en `docs/adr/0001-stack-angular-21.md`. Este plan reescribe la capacidad `partida-reversi` en `reversi-angular/`, por fases, sin cambiar lo que el spec promete.

## Delta
NULO sobre lo que el spec promete. El legacy incumple A, B y C; el port los cumple por diseño. Las únicas adiciones al texto del spec son dos omisiones del baseline (mensaje inicial de créditos y mensaje de nuevo tamaño), que ya eran comportamiento del legacy. En la Fase 3 hay un ajuste menor decidido por el usuario: el aviso de ventana angosta o baja ya no deja la línea vacía al desaparecer, sino que vuelve el último mensaje del juego (escrito en el spec).

## Delta del spec escrito
`spec-partida-reversi.md`: tres entradas en *Decisiones* (migración a Angular, omisiones del baseline y ajuste de dos textos) y *Referencias* nuevas (código, tests, catálogos i18n y ADR). En *Flujo / Inicio de partida* se agregaron tres ítems que el baseline omitió (mensaje inicial, mensaje de *New Game*, mensaje de nuevo tamaño). En la Fase 3 se reescribió el primer ítem de *Modos de falla* (aviso de ventana) y se agregó una entrada en *Decisiones*. El resto de *Comportamiento* e *Invariantes* no se tocó.

## Decisiones tomadas y enfoque técnico
- **Estrategia:** el sistema tiene una sola capacidad, así que la migración va **por fases dentro de ella**, de lo más aislado (lógica pura) a lo más expuesto (interfaz). Cada fase es su propio cambio acotado, con su rama, su ciclo y su merge a `develop`. Un solo plan padre.
- **Paridad medida contra el spec, no contra el Java.** Las pruebas de caracterización se derivan de cada ítem del spec. No se usa un arnés Java como oráculo (decisión del usuario). Consecuencia aceptada: los ítems `[Inferido del código]` se verifican contra lo que el spec dice, no contra una ejecución del legacy, y su corrección depende de la revisión del Caso 5 ya hecha.
- **Layout del tablero** (decisión del usuario): una **función pura** en `domain/` calcula paso, márgenes, grosor de línea, borde interior y tamaño de ficha con las proporciones y mínimos del spec (2 %, 7 %, ≥10 px, margen exterior 10 px, radio 65 %); la UI solo pinta esos valores con variables CSS. El hit-test (clic solo dentro de la ficha) es otra función pura.
- **Estado del spec al cerrar:** la migración cierra los fixes colaterales A, B y C. Al terminar la Fase 4, `spec-partida-reversi.md` pasa de `en desarrollo` a `desplegado`, porque lo que dice ya corre completo. Es la excepción a "la migración no cambia el Estado", y la justifica la regla de la Fase 0 para fixes colaterales.
- **El legacy no se toca** hasta el cierre. Su retiro (borrar `reversi-game-java-main/`) es un cambio posterior y aparte.
- **Precondición de entorno para `/sdd-aplicacion` de la Fase 1:** Node.js `^20.19`, `^22.12` o `^24` (Angular 21). El entorno tenía Node 23.5.0, no soportado. La Fase 1 se construyó con **Node 26.13.1** (decisión del usuario): está fuera de la tabla oficial de Angular 21 y el CLI lo marca `Unsupported`, pero el proyecto compila y las pruebas pasan (Angular 21.2.26, Vitest 4.1.12). Si aparece un problema atribuible a Node, se pasa a Node 24 LTS.
- **Licencia:** GPLv3+ (ADR 0001). El port lleva su propio `LICENSE` y conserva el aviso de copyright y la atribución a Keith Fenske.

### Equivalencias legacy → Angular
| Legacy (Java AWT) | Angular 21 |
|---|---|
| `Reversi2` (Applet + `main`) | componente raíz standalone + `GameService` |
| `Reversi2Board` (Canvas) | `BoardComponent` (DOM + CSS grid, variables CSS del layout) |
| `Choice`, `Button`, `Label` | `<select>`, `<button>`, `<p role="status">` |
| `int[][] boardData` con `PlayHOVER` dentro | tablero inmutable en `domain/`; el resaltado es una señal aparte |
| `Thread` + `Thread.sleep` | temporizadores cancelables en `game/` (nunca bloquean la interfaz) |
| `Math.random()` | función `random` inyectable (determinista en pruebas) |
| `System.out.println` de errores internos | sin equivalente: los estados inválidos no son representables |
| `System.exit`, `Reversi2Window` | sin equivalente |
| `messageText.setText(...)` | señal de mensaje (clave + parámetros) traducida por Transloco |

### Catálogo de textos (propuesta para aprobar en el gate)
Inglés = legacy, con tres ajustes: sin "Java applet"/"Applet window" y "black circles" → "dark pieces". Español = propuesta nueva. `{…}` son parámetros.

| Clave | Inglés | Español |
|---|---|---|
| `credits` | Reversi or Othello.  Copyright (c) 2004 by Keith Fenske.  GNU Public License. | Reversi u Othello.  Copyright (c) 2004 de Keith Fenske.  Licencia Pública GNU. |
| `begin` | Click the mouse on a position of your choice.  You are the dark pieces. | Haz clic en la casilla que elijas.  Tú juegas con las fichas oscuras. |
| `mustSkip` | You can't move, so please click the "Skip Turn" button. | No puedes mover; pulsa el botón «Saltar turno». |
| `skipNotYourTurn` | But it's the computer's turn to play! | ¡Pero es el turno de la computadora! |
| `skipNoGame` | You must start a new game before you can skip your turn. | Debes iniciar una partida nueva antes de saltar tu turno. |
| `gameFinished` | This game is finished.  You must start a new game before you can move again. | La partida terminó.  Debes iniciar una partida nueva para volver a mover. |
| `notYourTurn` | Sorry, it's not your turn to move.  The computer is thinking. | Lo siento, no es tu turno.  La computadora está pensando. |
| `clickPosition` | Please click on a board position. | Haz clic en una casilla del tablero. |
| `occupied` | Sorry, that board position has already been chosen. | Lo siento, esa casilla ya fue elegida. |
| `invalidMove` | Choose an empty position that flips at least one computer position. | Elige una casilla vacía que voltee al menos una ficha de la computadora. |
| `userMove.one` / `userMove.other` | Your move is row {row} and column {col} with one reversed position. / … with {count} reverses. | Tu jugada es la fila {row} y la columna {col}, con una ficha volteada. / … con {count} fichas volteadas. |
| `computerMove.one` / `computerMove.other` | Computer's move is row {row} and column {col} with one reversed position. / … with {count} reverses. | La jugada de la computadora es la fila {row} y la columna {col}, con una ficha volteada. / … con {count} fichas volteadas. |
| `newBoard` | New game board is {rows} rows by {cols} columns. | El nuevo tablero tiene {rows} filas por {cols} columnas. |
| `tooNarrow` | The window is too narrow to display {cols} columns. | La ventana es demasiado angosta para mostrar {cols} columnas. |
| `tooShort` | The window is too short to display {rows} rows. | La ventana es demasiado baja para mostrar {rows} filas. |
| `computerCantMove` | The computer can't move, so it's your turn again. | La computadora no puede mover, así que es tu turno otra vez. |
| `endComputerWins` | Nobody can move.  Computer wins, {comp} positions to your {user} positions. | Nadie puede mover.  Gana la computadora, {comp} casillas contra tus {user}. |
| `endUserWins` | Nobody can move.  You win with {user} positions to the computer's {comp} positions. | Nadie puede mover.  Ganas con {user} casillas contra {comp} de la computadora. |
| `endTie` | Nobody can move.  Game is tied.  We both have {count} positions. | Nadie puede mover.  Empate: ambos tenemos {count} casillas. |
| Etiquetas | Easy · Medium · Rows · Columns · New Game · Skip Turn · Language | Fácil · Medio · Filas · Columnas · Nueva partida · Saltar turno · Idioma |

La regla de singular/plural del legacy es: exactamente 1 volteo usa la forma `one`; cualquier otra cantidad usa `other`.

### Diseño del servicio de partida (Fase 2)
Decisiones técnicas de la F2 para aprobar en su gate. No cambian lo que promete el spec.

- **Reloj inyectable, no *fake timers* globales.** `game/tokens.ts` define `Scheduler { setTimeout(fn, ms): handle; clearTimeout(handle) }` con un token de Angular cuyo valor por defecto envuelve `setTimeout`. Las pruebas usan un `FakeScheduler` con `advance(ms)`: así CA-15 verifica los tiempos exactos (1000, 2499, 600, 400, 600, 200) sin depender del reloj real. El azar (`RANDOM`, por defecto `Math.random`) se inyecta igual.
- **Mensajes como clave + parámetros.** `game/messages.ts` define `GameMessage { key, params? }` con las claves del catálogo del plan. El servicio nunca produce texto; los plurales ("una ficha volteada" / "N fichas") los resuelve la capa de i18n a partir de `params.count` (F3 y F4). Las pruebas comprueban clave y parámetros.
- **Forma del servicio.** `game/game.service.ts`: `GameService` inyectable, con señales de solo lectura `rows`, `cols`, `level`, `board`, `turn` (`'user'` | `'computer'` | `'over'`), `message`, `flash` (casilla que parpadea, o `null`) y `highlight` (casilla resaltada, o `null`). Acciones: `newGame()`, `setRows(n)`, `setCols(n)`, `setLevel(l)`, `click(pos | null)` (`null` = clic fuera de una ficha), `skipTurn()`, `pointerAt(pos | null)` (`null` = el cursor salió del tablero). El layout y los píxeles quedan fuera: la interfaz los traduce a posiciones con `domain/layout`.
- **Turno de la computadora, como secuencia de pasos con temporizadores.** Al pasar el turno se agenda una espera de `1000 + floor(azar × 1500)` ms (0 ms tras *Skip Turn*). Al vencer: se evalúa el fin de partida; si la computadora no tiene jugadas, mensaje y vuelve el usuario; si tiene, se emite el mensaje de su jugada y se agenda el parpadeo: `flash` encendido de 0 a 600 ms, apagado hasta 1000, encendido hasta 1600, apagado hasta 1800 y entonces se aplica la jugada y vuelve el turno al usuario, evaluando si el usuario puede mover o si la partida terminó. Cada paso es un temporizador que el servicio guarda en una lista.
- **Cancelación (fix B).** Cada reinicio (*New Game*, cambio de filas o columnas) incrementa una *generación*, cancela todos los temporizadores pendientes y deja que cualquier callback rezagado se ignore si su generación ya no es la vigente. Así no puede aplicarse ninguna jugada sobre una partida distinta de la que la originó.
- ***Skip Turn* sin bloqueo (fix A).** `skipTurn()` pasa el turno y decide la jugada de la computadora de inmediato (el mensaje de la jugada ya está visible al retornar) y solo agenda el parpadeo; retorna de inmediato y el servicio sigue aceptando acciones durante el parpadeo.
- **Resaltado derivado (fix C).** El servicio guarda solo la casilla bajo el cursor; `highlight` es calculado: está encendido únicamente si es el turno del usuario, la casilla está vacía y es una jugada legal suya. Desaparece solo al salir del tablero (`pointerAt(null)`), al cambiar de casilla y al pasar el turno. Detalle observable respecto al legacy: si el turno vuelve al usuario con el cursor quieto sobre una jugada legal, se resalta de inmediato en lugar de esperar al siguiente movimiento del mouse; ambas cosas cumplen el spec ("resalta la casilla bajo el cursor si es una jugada legal del usuario").
- **Estado inicial y reinicios.** Al crear el servicio: 6×10, Medium, mensaje de créditos. *New Game* → instrucciones; cambio de filas o columnas → mensaje de nuevo tamaño; tras cualquier reinicio se evalúa el tablero (2×2 termina de inmediato y su resultado reemplaza al mensaje; si el usuario no pudiera mover, mensaje de *Skip Turn*).
- **Orden del clic del usuario** (igual al spec): partida terminada, no es su turno, sin jugadas disponibles, fuera de ficha, casilla ocupada, jugada sin volteos, jugada legal. Los seis rechazos no tocan el tablero.
- **Fuera de esta fase:** los mensajes de ventana angosta o baja (dependen del layout y de la precedencia que decida F3), el catálogo en español y los componentes.

### Diseño de la interfaz (Fase 3)
Decisiones técnicas de la F3 para aprobar en su gate. Lo que cambia respecto del legacy está en el spec (ver *Modos de falla* y *Decisiones*).

- **Estructura `src/app/ui/`** (dependencia en un solo sentido, `ui` → `game` → `domain`; la UI no decide reglas): `controls.component.ts` (dificultad, filas, columnas, *New Game*, *Skip Turn*), `message-line.component.ts`, `board.component.ts`, `element-size.directive.ts`, `colors.ts` y `message-text.ts`. `app.component.*` pasa a componer estas piezas y se reemplaza el HTML de plantilla del CLI.
- **Medición del espacio.** `BoardComponent` recibe `width` y `height` como entradas; una directiva `element-size` los mide en el navegador con `ResizeObserver` sobre el contenedor. En las pruebas (jsdom no tiene layout ni `ResizeObserver`) las entradas se fijan a mano; el redimensionamiento real lo cubre CA-28.
- **Mouse.** Las coordenadas del evento se convierten a coordenadas del tablero con `getBoundingClientRect()` del contenedor y se pasan a `hitTest`. `mousemove` → `pointerAt(posición | null)`; `mouseleave` → `pointerAt(null)` (fix C); `click` → `click(posición | null)`. La UI solo entrega al servicio posiciones que salen de `hitTest` y, en los selectores, valores de `ALLOWED_SIZES` y `LEVELS` (el servicio no valida sus entradas).
- **Pintado.** Contenedor con el ancho y alto medidos, fondo rosa; las líneas de la cuadrícula son `filas + 1` y `columnas + 1` elementos de `gridLine` px; cada casilla es un cuadrado de `symbolSize` px con `border-radius` igual a `cornerRadius`. Los colores del spec viven como constantes en `colors.ts` y se aplican como estilo en línea (jsdom no calcula variables CSS): computadora cian, usuario gris oscuro, casilla resaltada o parpadeando azul, casilla vacía del color del fondo.
- **Aviso de ventana (decisión del usuario).** Se calcula a partir del layout: si `tooShortRows` no es nulo, aviso de filas; si no, y `tooNarrowColumns` no es nulo, aviso de columnas. La línea de mensaje muestra el aviso con prioridad y, al desaparecer, vuelve a mostrar el último mensaje del juego.
- **Plurales.** `message-text.ts` convierte un `GameMessage` en clave de catálogo y parámetros: para `userMove` y `computerMove` usa `userMove.one` / `computerMove.one` si `count === 1` y `.other` en cualquier otro caso. El español y el selector de idioma son de la F4.
- **i18n.** Primera dependencia nueva: `@jsverse/transloco` 8.4.0 (MIT, peer `@angular/core >=16`), con inglés como idioma por defecto y el catálogo en `public/i18n/en.json`. Las plantillas no llevan texto literal. En pruebas se carga el mismo archivo con un cargador de prueba, para que F4 pueda comparar `en` y `es`.
- **Página.** Título de la pestaña: "Reversi or Othello". Disposición como el legacy: fila de controles arriba (dificultad, filas, columnas y los dos botones), debajo la línea de mensaje centrada y el tablero ocupando el resto; fondo de página rosa.
- **CA-28 manual.** Se arranca `ng serve` y se juegan las dos partidas; puedo ayudar con capturas del navegador, pero el resultado lo confirma el usuario.
- **Fuera de esta fase:** selector de idioma, `es.json`, plurales en español, atribución en cada archivo (CA-33) y el recuento final de textos (CA-30).

## Mapa de ramas
| Fase | Rama | Depende de | Spec(s) | Estado |
|---|---|---|---|---|
| F1 Dominio e IA | `migrate/partida-reversi-dominio` | tronco | `spec-partida-reversi.md` | mergeada a `develop` |
| F2 Servicio de partida | `migrate/partida-reversi-juego` | F1 | `spec-partida-reversi.md` | mergeada a `develop` |
| F3 Interfaz y tablero | `migrate/partida-reversi-ui` | F2 | `spec-partida-reversi.md` | construida; pendiente de verificación |
| F4 i18n y cierre | `migrate/partida-reversi-i18n` | F3 | `spec-partida-reversi.md` | pendiente |

Las fases se mergean en orden a `develop`; cada una nace del tronco ya actualizado con la anterior.

## Tareas
**F1 — Dominio e IA** (rama `migrate/partida-reversi-dominio`)
- [x] Crear el proyecto `reversi-angular/` (Angular 21 zoneless, TypeScript estricto, Vitest, `LICENSE` GPLv3 y aviso de atribución). Configuración sin comportamiento: sin prueba previa.
- [x] `domain/board`: tablero, posición inicial y tamaños permitidos (cubre CA-01, CA-09).
- [x] `domain/rules`: jugadas legales, volteos, aplicar jugada, fin de partida y resultado (cubre CA-02, CA-03, CA-04, CA-05, CA-06).
- [x] `domain/ai`: dificultad Easy y Medium con azar inyectable (cubre CA-07, CA-08).
- [x] `domain/layout`: cálculo del layout y hit-test (cubre CA-10, CA-11, CA-12).

**F2 — Servicio de partida** (rama `migrate/partida-reversi-juego`)
- [x] `game/tokens.ts`, `game/messages.ts` y `game/test-utils.ts` (reloj y azar inyectables, `FakeScheduler`, tipos de mensaje). Soporte sin comportamiento propio: se prueba a través de las demás tareas.
- [x] `game/GameService`: estado, reinicios y mensajes por clave; clic del usuario en sus 7 casos; *Skip Turn*; cambio de dificultad (cubre CA-13, CA-14, CA-17, CA-18, CA-21, CA-22).
- [x] Turno de la computadora con temporizadores cancelables y cancelación por generación (cubre CA-15, CA-16, CA-19).
- [x] Resaltado derivado del cursor (cubre CA-20).
- [x] Partidas completas simuladas con semillas (cubre CA-23).

**F3 — Interfaz y tablero** (rama `migrate/partida-reversi-ui`)
- [x] Instalar `@jsverse/transloco` y configurarlo (inglés por defecto, catálogo `public/i18n/en.json`); título de la página. Configuración sin comportamiento propio: sin prueba previa.
- [x] `ui/colors.ts`, `ui/message-text.ts` y `ui/element-size.directive.ts` (colores del spec, clave de catálogo y plural, medición con `ResizeObserver`). Soporte: se prueba a través de las demás tareas.
- [x] `ui/controls.component`: selectores y botones con textos del catálogo (cubre CA-24).
- [x] `ui/board.component`: pintado, mouse y recálculo al cambiar el tamaño (cubre CA-25, CA-26, CA-27).
- [x] `ui/message-line.component` y `app.component`: aviso de ventana con prioridad, composición y reemplazo de la plantilla del CLI (cubre CA-27, CA-29).
- [ ] Partida completa en el navegador (CA-28, manual; lo ejecuta el usuario).

**F4 — i18n y cierre** (rama `migrate/partida-reversi-i18n`)
- [ ] Catálogo en español, selector de idioma, plurales (cubre CA-30, CA-31, CA-32).
- [ ] Atribución y licencia (CA-33), build y pruebas completas (CA-35), legacy intacto (CA-36).
- [ ] Cierre: spec a `desplegado` y plan a `destilado` (CA-34).

## Criterios de aceptación
**F1 — Dominio e IA**
- **CA-01** Para cada tamaño permitido, la posición inicial tiene el cuadrado central 2×2 en la fila `filas/2 - 1` y columna `columnas/2 - 1`: computadora en la diagonal principal, usuario en la antidiagonal, el resto vacío. Verificación: automática — `reversi-angular/src/app/domain/board.spec.ts::CA-01 posición inicial por tamaño`
- **CA-02** El conteo de volteos de una casilla vacía es la suma de las 8 direcciones; una dirección cuenta solo si hay una o más fichas rivales seguidas y luego una ficha propia; una cadena cortada por casilla vacía o por el borde cuenta 0; una casilla ocupada cuenta 0. Verificación: automática — `…/domain/rules.spec.ts::CA-02 conteo de volteos`
- **CA-03** Aplicar una jugada legal coloca la ficha y voltea exactamente las fichas atrapadas; ninguna otra casilla cambia. Verificación: automática — `…/domain/rules.spec.ts::CA-03 aplicar jugada`
- **CA-04** (invariante) Sobre tableros generados con semilla fija, toda jugada que el dominio declara legal voltea al menos una ficha, y aplicar una casilla con 0 volteos es rechazado. Verificación: automática — `…/domain/rules.spec.ts::CA-04 jugada legal voltea al menos una`
- **CA-05** La partida termina cuando ninguno de los dos puede mover; gana quien tiene más fichas y, con igual cantidad, hay empate. Verificación: automática — `…/domain/rules.spec.ts::CA-05 fin y resultado`
- **CA-06** El tablero 2×2 está terminado al iniciar; en los otros 63 tamaños permitidos hay al menos una jugada disponible al iniciar. Verificación: automática — `…/domain/rules.spec.ts::CA-06 fin inmediato solo en 2x2`
- **CA-07** Easy elige entre todas las jugadas legales con probabilidad uniforme (con un azar controlado, cada jugada legal es alcanzable y el índice sale de `floor(azar × cantidad)`) y nunca elige una ilegal. Verificación: automática — `…/domain/ai.spec.ts::CA-07 easy`
- **CA-08** (invariante) Medium elige solo entre las jugadas con el máximo de volteos, uniforme entre las empatadas, y nunca una ilegal; si hay jugadas, siempre devuelve una. Verificación: automática — `…/domain/ai.spec.ts::CA-08 medium`
- **CA-09** Los valores permitidos de filas y columnas son 2, 4, 6, 8, 10, 12, 16 y 24; el tamaño por defecto es 6 filas × 10 columnas y la dificultad por defecto es Medium. Verificación: automática — `…/domain/board.spec.ts::CA-09 valores y defaults`
- **CA-10** El layout cumple las proporciones del spec: grosor de línea = 2 % del paso (mínimo 1 px), borde interior = 7 % (mínimo 2 px), ficha de al menos 10 px, margen exterior de 10 px, tablero centrado, casillas cuadradas y radio de esquina del 65 % del paso. Verificación: automática — `…/domain/layout.spec.ts::CA-10 proporciones`
- **CA-11** El hit-test devuelve una casilla solo si el punto cae dentro de la ficha dibujada; en el borde interior, en una línea de la cuadrícula o fuera del tablero devuelve ninguna. Verificación: automática — `…/domain/layout.spec.ts::CA-11 hit-test`
- **CA-12** Si el espacio no alcanza para las columnas o las filas, el layout informa el indicador "angosto"/"bajo" con la cantidad y calcula igualmente el tamaño mínimo; con espacio suficiente no informa nada. Verificación: automática — `…/domain/layout.spec.ts::CA-12 espacio insuficiente`

**F2 — Servicio de partida**
- **CA-13** El clic del usuario aplica el primer caso que corresponda, en este orden: partida terminada, no es su turno, sin jugadas disponibles, fuera de casilla, casilla ocupada, jugada sin volteos, jugada legal. La jugada legal muestra fila y columna (base 1) y la cantidad de volteos, voltea y pasa el turno a la computadora. Los seis casos de rechazo muestran su mensaje y no modifican el tablero. Verificación: automática — `…/game/game.service.spec.ts::CA-13 clic del usuario`
- **CA-14** *Skip Turn* en el turno del usuario cede el turno a la computadora aunque el usuario tenga jugadas legales; con la computadora pensando muestra su mensaje; con la partida terminada muestra el mensaje de partida nueva. Verificación: automática — `…/game/game.service.spec.ts::CA-14 skip turn`
- **CA-15** Tras la jugada del usuario, la computadora espera un tiempo entre 1000 y 2500 ms (se prueba con el azar en sus dos extremos), muestra su mensaje, parpadea la casilla 600/400/600/200 ms, voltea y devuelve el turno. Verificación: automática (`FakeScheduler`) — `…/game/game.service.spec.ts::CA-15 tiempos de la computadora`
- **CA-16** (fix A) *Skip Turn* retorna de inmediato: la computadora juega sin la espera inicial pero con el parpadeo, y durante ese tiempo el servicio sigue aceptando acciones. Verificación: automática (`FakeScheduler`) — `…/game/game.service.spec.ts::CA-16 skip no bloquea`
- **CA-17** Si la computadora no tiene jugadas pero el usuario sí, se muestra el mensaje correspondiente y el turno vuelve al usuario; si el usuario no tiene jugadas tras la jugada de la computadora, se muestra el mensaje de *Skip Turn* y el turno no pasa solo. Verificación: automática — `…/game/game.service.spec.ts::CA-17 pases de turno`
- **CA-18** El fin de partida se evalúa antes de la jugada de la computadora (tras su espera) y muestra el mensaje de ganador, derrota o empate con las cantidades. Verificación: automática — `…/game/game.service.spec.ts::CA-18 fin de partida`
- **CA-19** (fix B, invariante) *New Game* o un cambio de filas o columnas durante la espera o durante cada paso del parpadeo cancela la jugada pendiente: al avanzar el reloj no cambia el tablero nuevo y no hay errores. Verificación: automática (`FakeScheduler`) — `…/game/game.service.spec.ts::CA-19 cancelar jugada pendiente`
- **CA-20** (fix C, invariante) Solo se resalta la casilla bajo el cursor si está vacía, es jugada legal del usuario y es su turno; el resaltado desaparece al salir del tablero, al cambiar de casilla y al pasar el turno. Verificación: automática — `…/game/game.service.spec.ts::CA-20 resaltado`
- **CA-21** Cambiar la dificultad no reinicia la partida y aplica desde la siguiente jugada de la computadora. Verificación: automática — `…/game/game.service.spec.ts::CA-21 cambio de dificultad`
- **CA-22** Al abrir se muestra el mensaje de créditos; *New Game* muestra las instrucciones y reinicia con el tamaño y la dificultad vigentes; cambiar filas o columnas reinicia y muestra el mensaje de nuevo tamaño; en 2×2 la partida arranca ya terminada con su resultado. Verificación: automática — `…/game/game.service.spec.ts::CA-22 inicio y reinicios`
- **CA-23** (invariante) En partidas completas simuladas con semillas fijas, toda jugada de la computadora es legal, el usuario siempre mueve primero y la partida termina. Verificación: automática — `…/game/game.service.spec.ts::CA-23 partidas simuladas`

**F3 — Interfaz y tablero**
- **CA-24** La pantalla muestra el selector de dificultad (Easy y Medium, Medium por defecto), los selectores de filas y columnas con los valores permitidos y sus defaults, los botones *New Game* y *Skip Turn* y la línea de mensaje, con sus textos tomados del catálogo en inglés. Verificación: automática (prueba de componente) — `…/ui/controls.component.spec.ts::CA-24 controles`
- **CA-25** El tablero muestra filas × columnas casillas con los colores del spec según su estado (fondo, línea de cuadrícula, usuario, computadora, resaltada) y fichas de esquinas redondeadas. Verificación: automática (prueba de componente) — `…/ui/board.component.spec.ts::CA-25 colores y casillas`
- **CA-26** El movimiento del mouse y el clic sobre una ficha se traducen a la casilla correcta; un clic en el borde interior o fuera de la ficha produce el mensaje de "hacer clic en una casilla"; al salir el cursor del tablero se avisa al servicio y desaparece el resaltado. Verificación: automática (prueba de componente) — `…/ui/board.component.spec.ts::CA-26 mouse y clic`
- **CA-27** Al cambiar el tamaño disponible el tablero se recalcula con el layout del dominio; si no caben las filas o las columnas se muestra el aviso con prioridad sobre el mensaje del juego (si faltan ambas, el de filas) y, al volver a haber espacio, el aviso desaparece y la línea muestra otra vez el último mensaje del juego. Verificación: automática (prueba de componente) — `…/ui/board.component.spec.ts::CA-27 redimensionar`
- **CA-28** Se juega una partida completa en el navegador (6×10 y 8×8, dificultad Medium): resaltado, jugada, parpadeo de la computadora y mensaje final correctos. Verificación: manual — pasos: `ng serve`, jugar las dos partidas, anotar resultado y captura; lo ejecuta el usuario.
- **CA-29** (fix A) Con la computadora parpadeando, los botones y selectores responden; *New Game* funciona y cancela la jugada. Verificación: automática (prueba de componente, reloj simulado) — `…/ui/app.component.spec.ts::CA-29 interfaz responde`

**F4 — i18n y cierre**
- **CA-30** Los catálogos `en.json` y `es.json` tienen exactamente las mismas claves y contienen todos los textos del catálogo aprobado; no queda texto literal en las plantillas. Verificación: automática — `…/i18n/catalogos.spec.ts::CA-30 catálogos completos`
- **CA-31** El selector de idioma cambia todos los textos al instante, sin recargar y sin perder la partida en curso; el idioma base es inglés. Verificación: automática (prueba de componente) — `…/ui/app.component.spec.ts::CA-31 selector de idioma`
- **CA-32** Los mensajes con cantidad usan la forma singular con exactamente 1 volteo y la plural con cualquier otra cantidad, en ambos idiomas, y sustituyen fila, columna y cantidades. Verificación: automática — `…/i18n/catalogos.spec.ts::CA-32 plurales y parámetros`
- **CA-33** El port incluye `LICENSE` (GPLv3) y un aviso con el copyright de Keith Fenske; ningún archivo del port omite la atribución en su encabezado de licencia. Verificación: medición — comando `grep -L "Keith Fenske" ...` sobre `reversi-angular/` (debe listar 0 archivos fuente sin aviso); manual para `LICENSE`.
- **CA-34** El spec queda con `Estado: desplegado` y `Última revisión` actualizada, y el plan con `Estado: destilado`, solo si CA-16, CA-19, CA-20 y CA-29 pasaron. Verificación: manual — revisión del diff del spec en `/sdd-verificacion`.
- **CA-35** `ng build` produce un build estático sin errores y `ng test` pasa completo. Verificación: automática — comandos `ng build` y `ng test` en `reversi-angular/`.
- **CA-36** El legacy no cambia: `git diff develop -- reversi-game-java-main/` está vacío en cada fase. Verificación: medición — comando `git diff --stat <tronco>...HEAD -- reversi-game-java-main/`, sin salida.

## Trazabilidad
| Criterio | Sección del spec | Prueba | Resultado |
|---|---|---|---|
| CA-01 | Flujo · Inicio de partida | `domain/board.spec.ts` | ✅ 2026-11-25 |
| CA-02 | Flujo · Reglas | `domain/rules.spec.ts` | ✅ 2026-11-25 |
| CA-03 | Flujo · Reglas | `domain/rules.spec.ts` | ✅ 2026-11-25 |
| CA-04 | Invariantes · Una jugada legal voltea al menos una ficha | `domain/rules.spec.ts` | ✅ 2026-11-25 |
| CA-05 | Flujo · Reglas | `domain/rules.spec.ts` | ✅ 2026-11-25 |
| CA-06 | Flujo · Inicio de partida | `domain/rules.spec.ts` | ✅ 2026-11-25 |
| CA-07 | Límites y defaults · Easy | `domain/ai.spec.ts` | ✅ 2026-11-25 |
| CA-08 | Límites y defaults · Medium; Invariantes · computadora siempre legal | `domain/ai.spec.ts` | ✅ 2026-11-25 |
| CA-09 | Límites y defaults · tamaño, valores y dificultad | `domain/board.spec.ts` | ✅ 2026-11-25 |
| CA-10 | Límites y defaults · Dibujo del tablero | `domain/layout.spec.ts` | ✅ 2026-11-25 |
| CA-11 | Límites y defaults · clic dentro de la ficha | `domain/layout.spec.ts` | ✅ 2026-11-25 |
| CA-12 | Modos de falla · espacio insuficiente | `domain/layout.spec.ts` | ✅ 2026-11-25 |
| CA-13 | Flujo · Turno del usuario | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-14 | Flujo · Skip Turn | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-15 | Flujo · Turno de la computadora; Límites · tiempos | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-16 | Flujo · Skip Turn (la interfaz sigue respondiendo) | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-17 | Flujo · Turno de la computadora | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-18 | Flujo · Turno de la computadora | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-19 | Flujo · Cambios durante la jugada; Invariantes · jugada nunca sobre otra partida | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-20 | Invariantes · resaltado (dos) | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-21 | Contrato · Selector de dificultad | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-22 | Flujo · Inicio de partida; Contrato · New Game y selectores | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-23 | Invariantes · usuario mueve primero; computadora siempre legal | `game/game.service.spec.ts` | ✅ 2026-11-25 |
| CA-24 | Contrato · tabla de controles | `ui/controls.component.spec.ts` | pendiente |
| CA-25 | Límites y defaults · Colores y Dibujo | `ui/board.component.spec.ts` | pendiente |
| CA-26 | Contrato · Tablero; Límites · clic dentro de la ficha | `ui/board.component.spec.ts` | pendiente |
| CA-27 | Modos de falla · espacio insuficiente | `ui/board.component.spec.ts` | pendiente |
| CA-28 | Alcance · Flujo completo | manual: partida completa en el navegador | pendiente |
| CA-29 | Flujo · Skip Turn (fix A) | `ui/app.component.spec.ts` | pendiente |
| CA-30 | Contrato · Idioma | `i18n/catalogos.spec.ts` | pendiente |
| CA-31 | Contrato · Idioma | `ui/app.component.spec.ts` | pendiente |
| CA-32 | Flujo · mensajes con cantidad | `i18n/catalogos.spec.ts` | pendiente |
| CA-33 | Referencias · Licencia | medición: grep de atribución | pendiente |
| CA-34 | Estado del spec | manual: diff del spec | pendiente |
| CA-35 | Decisiones · migración | `ng build`, `ng test` | pendiente |
| CA-36 | Alcance de la migración (legacy intacto) | medición: `git diff` vacío | pendiente |

## Pendientes de decisión
Ninguno.

## Ajustes durante la construcción
Ninguno en el spec.

Detalles de implementación de la Fase 3 respecto al diseño aprobado (no cambian el spec):
- `colors.ts` quedó en `ui/` y las pruebas de la interfaz comparten `ui/test-utils.ts` (banco de pruebas con el catálogo real `public/i18n/en.json`, reloj simulado y un `ResizeObserver` de prueba). `tsconfig.json` habilita `resolveJsonModule` y `tsconfig.app.json` excluye los `test-utils.ts` del build.
- Se añadió la clave `ui.level` ("Difficulty") al catálogo para el `aria-label` del selector de dificultad, de modo que ni siquiera los atributos llevan texto literal.
- Antes de medir el contenedor (0 × 0) no se muestra ningún aviso de ventana; así no parpadea un aviso falso en el primer dibujo.
- Comprobación extra, fuera de los criterios automáticos: la aplicación se probó en un navegador real (`ng serve`). Cargó el catálogo por HTTP sin errores de consola; un clic real jugó la casilla (3, 4) con el mensaje en singular; la computadora respondió y volteó; al reducir la ventana apareció "too narrow to display 10 columns" y al restaurarla volvió el mensaje de la computadora; el resaltado azul aparece con el cursor sobre una jugada legal y desaparece al salir del tablero. No sustituye a CA-28, que sigue siendo una partida completa jugada por el usuario.

Detalles de implementación de la Fase 2 respecto al diseño aprobado (no cambian el spec):
- Se agregó una tercera ficha de inyección, `BOARD_FACTORY` (por defecto `createBoard`), para poder probar escenarios con tableros fijos (usuario sin jugadas, computadora sin jugadas, final de partida) sin depender de largas secuencias de juego.
- `skipTurn()` decide la jugada de la computadora de forma síncrona (sin espera) y solo el parpadeo es asíncrono: el mensaje de la jugada ya está visible al retornar.
- `.prettierrc`: `endOfLine: auto`, porque Git en Windows reescribe el árbol con CRLF al cambiar de rama.

Seguimientos que dejó la verificación de la Fase 1 (no son ajustes del spec):
- **F3:** si faltan columnas y filas a la vez, el legacy muestra solo el mensaje de filas ("too short"); `computeLayout` informa ambos indicadores, y la interfaz decide la precedencia para igualar al legacy.
- **F3:** `hitTest` devuelve `NaN` si recibe coordenadas `NaN`; los eventos reales del mouse siempre dan números.
- **Pendiente de verificación global:** `npm audit` y licencias de dependencias transitivas (requieren red).

Seguimientos que dejó la verificación de la Fase 2 (no son ajustes del spec):
- **F3:** `GameService` no valida sus entradas: `click` con una posición fuera de rango lanza un error, y `setRows`/`setCols` con un valor no permitido deja el estado inconsistente. La interfaz debe pasarle solo posiciones de `domain/layout` (`hitTest`) y valores de los selectores permitidos (`ALLOWED_SIZES`).
- **F3:** `GameService` no tiene `ngOnDestroy`; con un solo servicio durante toda la vida de la aplicación no hay fuga relevante.
- **F3:** decidir la precedencia de los mensajes de ventana angosta o baja respecto del mensaje del juego (ya anotado en la Fase 1).
- Un clic o un segundo *Skip Turn* durante el parpadeo reemplaza el mensaje de la jugada por el de "no es tu turno", y ese mensaje permanece al terminar la jugada. Es igual al legacy para el clic y lo pide el spec; queda registrado por si el diseño de la interfaz quiere otra cosa.
