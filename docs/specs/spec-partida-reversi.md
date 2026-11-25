# Spec: Partida de Reversi

**Estado:** en desarrollo · **Última revisión:** 2026-11-25

## Propósito
Permitir que una persona juegue una partida de Reversi (Othello) contra la computadora en un tablero rectangular de tamaño configurable, con dos niveles de dificultad, viendo sus jugadas legales y recibiendo mensajes de estado en cada paso. Es un juego de un solo jugador humano, sin cuentas ni persistencia.

## Comportamiento
Subcapacidades: Configuración de la partida · Reglas y turnos · Jugador computadora · Tablero y retroalimentación visual · Mensajes e idioma

Convención de etiquetas de la Fase 0: `[Confirmado por docs]` (README, cabecera de `Reversi2.java`, `revers2a.htm`), `[Inferido del código]` (deducido leyendo `Reversi2.java`). No existen tests del legacy, por lo que ningún ítem lleva `[Confirmado por test]`. Los ítems marcados `[Corregido en revisión]` los fijó la revisión humana del 2026-11-25 y describen el comportamiento correcto.

### Alcance
- Un jugador humano contra la computadora, en una sola pantalla. El humano juega las fichas **oscuras** y mueve primero. `[Confirmado por docs]`
- Sin persistencia: la partida vive mientras la pantalla está abierta. `[Inferido del código]`
- Aplica en escritorio con mouse; no hay entrada por teclado. `[Inferido del código]`

### Contrato
Controles y elementos observables de la pantalla:

| Elemento | Acción del usuario | Efecto |
|---|---|---|
| Selector de dificultad | Elegir *Easy* o *Medium* | Cambia cómo juega la computadora desde su próxima jugada; no reinicia la partida. `[Inferido del código]` |
| Selector de filas | Elegir una cantidad | Fija las filas y **reinicia** la partida. `[Inferido del código]` |
| Selector de columnas | Elegir una cantidad | Fija las columnas y **reinicia** la partida. `[Inferido del código]` |
| Botón *New Game* | Clic | Reinicia la partida con el tamaño y la dificultad actuales. `[Inferido del código]` |
| Botón *Skip Turn* | Clic | Cede el turno a la computadora (ver Flujo). `[Inferido del código]` |
| Tablero | Mover el mouse | Resalta la casilla bajo el cursor si es una jugada legal del usuario. `[Confirmado por docs]` |
| Tablero | Clic en una casilla | Intenta jugar en ella (ver Flujo). `[Confirmado por docs]` |
| Línea de mensaje | — | Muestra el último mensaje de estado (ver Flujo; los textos exactos están en Referencias). `[Inferido del código]` |

Idioma: la interfaz y los mensajes se ofrecen en inglés (idioma base) y español, con un selector de idioma. `[Corregido en revisión]`

Cambio de idioma: la aplicación siempre abre en inglés y la elección no se recuerda entre visitas. El selector nombra cada idioma en su propia lengua (English, Español). Cambiar de idioma traduce al instante todos los textos, incluido el último mensaje del juego, sin recargar y sin alterar la partida en curso (tablero, turno, jugada pendiente ni dificultad). `[Corregido en revisión]`

### Flujo
**Reglas.**
- Una jugada legal es una casilla vacía que atrapa una o más fichas del rival en línea recta (horizontal, vertical o diagonal, 8 direcciones) entre la casilla y otra ficha propia. Las fichas atrapadas se voltean y pasan a ser del jugador. `[Confirmado por docs]`
- El conteo de volteos de una casilla es la suma de los volteos de sus 8 direcciones. `[Inferido del código]`
- La partida termina cuando ninguno de los dos puede mover. Gana quien tiene más fichas; si hay igual cantidad, es empate. `[Confirmado por docs]`

**Inicio de partida.**
- El tablero parte vacío salvo un cuadrado central de 2×2 ubicado en la fila `filas/2 - 1` y columna `columnas/2 - 1` (base 0): la computadora ocupa la diagonal principal (superior izquierda e inferior derecha) y el usuario la antidiagonal. `[Inferido del código]`
- El turno inicial es del usuario. `[Confirmado por docs]`
- Al abrir la pantalla, la línea de mensaje muestra un texto de créditos y licencia ("Reversi or Othello", copyright de Keith Fenske, GNU Public License) en lugar de las instrucciones. `[Inferido del código]`
- Con *New Game* se muestra el mensaje de instrucciones (hacer clic en una casilla; el usuario es el jugador oscuro). `[Inferido del código]`
- Al cambiar filas o columnas se muestra el mensaje "nuevo tablero de R filas por C columnas" con los valores vigentes. `[Inferido del código]`
- Al iniciar una partida (al abrir, con *New Game* o al cambiar el tamaño) se evalúa si ya terminó. En un tablero de 2×2 nadie puede mover y la partida termina de inmediato, mostrando el resultado; en cualquier otro tamaño permitido hay jugadas disponibles al inicio. `[Inferido del código]`

**Turno del usuario (clic en el tablero).** Se evalúa en este orden y se aplica el primer caso que corresponda: `[Inferido del código]`
1. Partida terminada: mensaje de partida finalizada; no se juega.
2. No es el turno del usuario (la computadora está pensando): mensaje de espera; no se juega.
3. El usuario no tiene ninguna jugada legal: mensaje que le indica usar *Skip Turn*.
4. El clic no cae sobre una casilla (borde, margen o espacio entre casillas): mensaje pidiendo hacer clic en una casilla.
5. La casilla ya está ocupada: mensaje de casilla ya elegida.
6. La casilla está vacía pero no voltea ninguna ficha: mensaje pidiendo una casilla que voltee al menos una ficha rival.
7. Jugada legal: se muestra un mensaje con fila y columna (base 1) y la cantidad de fichas volteadas, se voltea, el turno pasa a la computadora y se programa su jugada.

**Skip Turn.** `[Inferido del código]`
- En el turno del usuario, *Skip Turn* cede el turno a la computadora **aunque el usuario tenga jugadas legales**. `[Corregido en revisión]` (se conserva la funcionalidad del legacy).
- Con la computadora pensando: mensaje indicando que es su turno. Con la partida terminada: mensaje pidiendo iniciar una partida nueva.
- La jugada de la computadora tras *Skip Turn* se hace sin la espera aleatoria de 1,0–2,5 s, pero sí con el parpadeo de la casilla.
- Mientras la computadora juega, la interfaz sigue respondiendo (el botón no se bloquea ni se congela la pantalla). `[Corregido en revisión]`

**Turno de la computadora.**
- Tras la jugada del usuario, la computadora espera un tiempo aleatorio entre 1,0 y 2,5 s antes de jugar. `[Inferido del código]`
- Antes de evaluar su jugada se determina si la partida terminó (nadie puede mover). Por eso el cierre de la partida tras una jugada del usuario se muestra al cabo de esa espera. `[Inferido del código]`
- Si la computadora no tiene jugadas legales pero el usuario sí, se muestra un mensaje de que la computadora no puede mover y el turno vuelve al usuario. `[Inferido del código]`
- Si juega: muestra un mensaje con la fila, la columna (base 1) y la cantidad de fichas volteadas; parpadea la casilla elegida (resaltada 600 ms, vacía 400 ms, resaltada 600 ms, vacía 200 ms); luego voltea. El turno vuelve al usuario. `[Inferido del código]`
- Si, al volver al usuario, este no tiene jugadas legales, se muestra el mensaje que lo invita a usar *Skip Turn* y el juego espera ese clic; el turno no pasa solo. `[Inferido del código]`

**Cambios durante la jugada de la computadora.** Si el usuario pulsa *New Game* o cambia filas o columnas mientras la computadora espera o parpadea, esa jugada pendiente se cancela: no se aplica ninguna jugada de la computadora sobre la partida nueva, y no se producen errores. `[Corregido en revisión]`

### Límites y defaults
- Tamaño por defecto: **6 filas × 10 columnas**. `[Inferido del código]` (la documentación dice 8×8; se decidió conservar el comportamiento del código).
- Valores permitidos de filas y de columnas, independientes entre sí: 2, 4, 6, 8, 10, 12, 16, 24. `[Inferido del código]`
- Dificultad por defecto: *Medium*. Niveles disponibles: *Easy* y *Medium*. `[Confirmado por docs]`
- Easy: elige al azar, con probabilidad uniforme, entre todas las jugadas legales. `[Confirmado por docs]`
- Medium: elige al azar, con probabilidad uniforme, entre las jugadas legales con la **mayor** cantidad de volteos. `[Confirmado por docs]`
- Tiempos de la computadora: espera 1000–2500 ms (aleatoria), parpadeo 600/400/600/200 ms. `[Inferido del código]`
- Dibujo del tablero: las casillas son cuadradas y se ajustan al espacio disponible, centradas, con un margen exterior de 10 px. Línea de cuadrícula del 2 % del paso de casilla (mínimo 1 px), borde interior del 7 % (mínimo 2 px) y ficha de al menos 10 px. Las fichas se dibujan como rectángulos de esquinas redondeadas, con un arco de diámetro igual al 65 % del paso (radio efectivo del 32,5 %). `[Inferido del código]`
- Colores: fondo rosa claro (255,204,204), líneas de cuadrícula (204,153,153), fichas del usuario gris oscuro (51,51,51), fichas de la computadora cian claro (204,255,255), casilla resaltada azul (102,102,255). `[Inferido del código]`
- Un clic cuenta como clic sobre una casilla solo si cae dentro de la ficha dibujada; el borde interior de la casilla y las líneas de cuadrícula no cuentan. `[Inferido del código]`

### Modos de falla
- Si el espacio disponible es demasiado angosto o bajo para mostrar todas las columnas o filas, se muestra un aviso que lo indica y el tablero se dibuja igualmente con el tamaño mínimo. `[Inferido del código]`
- El aviso tiene prioridad sobre el mensaje del juego mientras falte espacio; si faltan columnas y filas a la vez, se informa el de filas. Al volver a haber espacio suficiente el aviso desaparece y la línea vuelve a mostrar el último mensaje del juego. `[Corregido en revisión]`
- Las acciones no permitidas (clic fuera de turno, casilla ocupada, jugada sin volteos, etc.) no cambian el tablero; solo muestran el mensaje correspondiente. `[Inferido del código]`

## Invariantes (no negociables)
- **El usuario siempre mueve primero:** toda partida nueva parte con turno del usuario. *(Porqué: lo declara la documentación del juego y es parte de la experiencia esperada.)* `[Confirmado por docs]`
- **Una jugada legal voltea al menos una ficha:** nunca se coloca una ficha que no voltea. *(Porqué: es la regla fundamental de Reversi; sin ella el resto de las reglas pierde sentido.)* `[Confirmado por docs]`
- **Solo el cursor sobre una jugada legal del usuario, en su turno, se resalta:** nunca se resaltan casillas ocupadas, ilegales ni fuera del turno del usuario. *(Porqué: el resaltado es la ayuda al usuario y no debe sugerir jugadas inválidas.)* `[Confirmado por docs]`
- **El resaltado desaparece cuando el cursor sale del tablero.** *(Porqué: de lo contrario queda una casilla marcada que ya no corresponde a la posición del cursor.)* `[Corregido en revisión]`
- **La jugada de la computadora nunca se aplica sobre una partida distinta de la que la originó.** *(Porqué: evita fichas fuera de lugar o errores al reiniciar o redimensionar durante su espera.)* `[Corregido en revisión]`
- **La computadora siempre juega una jugada legal cuando tiene alguna.** *(Porqué: una jugada ilegal rompería el resultado de la partida.)* `[Inferido del código]`

## Decisiones
- 2026-11-25: el tamaño por defecto se mantiene en 6×10, como el código, y no en 8×8 como dice la documentación — *Porqué: decisión del usuario en la revisión de la Fase 0.*
- 2026-11-25: colores y forma de las fichas se conservan como en el código (rectángulos redondeados, gris oscuro y cian claro), no círculos negros y blancos como dice la documentación — *Porqué: decisión del usuario.*
- 2026-11-25: *Skip Turn* se conserva tal cual, permitido incluso con jugadas legales — *Porqué: decisión del usuario, mantener la funcionalidad existente.*
- 2026-11-25: se conservan las esperas y el parpadeo de la computadora, y los valores de filas/columnas del legacy — *Porqué: decisión del usuario.*
- 2026-11-25: se corrigen tres defectos del legacy (interfaz congelada al saltar turno, jugada pendiente sobre una partida nueva, resaltado que persiste al salir del tablero) — *Porqué: decisión del usuario; el comportamiento correcto ya está descrito arriba y lo cubre la migración a Angular.*
- 2026-11-25: los mensajes se internacionalizan en inglés y español — *Porqué: decisión del usuario.*
- 2026-11-25: la aplicación siempre abre en inglés, sin recordar el idioma elegido ni tomar el del navegador — *Porqué: decisión del usuario; paridad con el legacy y con el idioma base del spec, de modo que la primera pantalla es siempre la misma.*
- 2026-11-25: se corrige el ítem de dibujo del tablero: en el legacy el 65 % del paso es el **diámetro** del arco de las esquinas de la ficha (`fillRoundRect`), no su radio, de modo que el radio efectivo es el 32,5 % del paso — *Porqué: hallazgo de la verificación de la Fase 3; el baseline lo había leído como radio y el port dibujaba círculos en lugar de rectángulos redondeados.*
- 2026-11-25: el aviso de ventana angosta o baja tiene prioridad sobre el mensaje del juego y, al desaparecer, la línea vuelve a mostrar el último mensaje del juego en lugar de quedar vacía como en el legacy; si faltan columnas y filas a la vez se informa el de filas, como en el legacy — *Porqué: decisión del usuario; así no se pierde el mensaje del juego al redimensionar la ventana.*
- 2026-11-25: la capacidad se migra de `Reversi2.java` a Angular 21 (capas `domain`, `game`, `ui`; Vitest; Transloco; tablero en DOM con layout calculado por las mismas fórmulas del legacy), sin cambiar lo que este spec describe — *Porqué: el applet Java 1.1 ya no corre en navegadores; ver `docs/adr/0001-stack-angular-21.md`.*
- 2026-11-25: se agregan a *Flujo* dos omisiones del baseline (mensaje inicial de créditos y mensaje de nuevo tamaño) y se ajustan dos textos que ya no son ciertos: se retira la mención al applet ("Java applet", "Applet window") y "black circles" pasa a "dark pieces" (las fichas son rectángulos redondeados oscuros) — *Porqué: son comportamiento del legacy que el baseline no describió y sin ellos la paridad no se puede verificar; la referencia al applet deja de ser cierta en la versión web.*

## Fuera de alcance
- Niveles *Hard* y *Expert*: el legacy tiene ganchos no seleccionables que repiten el comportamiento de *Medium*; no se ofrecen ni se describen.
- Modo de dos jugadores humanos, deshacer jugadas, guardar o reanudar partidas, ranking y estadísticas.
- Entrada por teclado y accesibilidad más allá de lo que ya hace el legacy.
- Ejecución como applet de navegador o aplicación de escritorio Java.

## Referencias
- Historias: ninguna (el código legacy no nació de historias de usuario).
- Código: `reversi-game-java-main/Reversi2.java` (lógica y tablero en `Reversi2`; lienzo en `Reversi2Board`). Versión Angular: `reversi-angular/` (`src/app/domain`, `src/app/game`, `src/app/ui`).
- Documentación de origen: `reversi-game-java-main/README.md`, comentario de cabecera de `Reversi2.java`, `reversi-game-java-main/revers2a.htm`.
- Tests: ninguno en el legacy. Versión Angular: `reversi-angular/src/app/**/*.spec.ts` (Vitest).
- Textos exactos de los mensajes: `Reversi2.java` (constantes `beginMessage` y `skipMessage` y llamadas a `messageText.setText`). Versión Angular: catálogos en `reversi-angular/public/i18n/en.json` y `es.json`.
- ADR: `docs/adr/0001-stack-angular-21.md`.
- Licencia del código original: GPLv3+ (`reversi-game-java-main/LICENSE`).
