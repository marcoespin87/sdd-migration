# Reversi (Angular 21)

Versión web del juego Reversi / Othello contra la computadora. Es una migración de
`reversi-game-java-main/Reversi2.java`, un applet Java 1.1 AWT de Keith Fenske, que conserva su
comportamiento y corrige tres defectos del original.

- **Comportamiento:** `docs/specs/spec-partida-reversi.md`.
- **Decisiones de arquitectura:** `docs/adr/0001-stack-angular-21.md`.
- **Plan de migración:** `docs/plan-migracion-reversi-angular-2026-11-25.md`.

## Cómo ejecutarlo
Requiere **Node.js 22.12 o superior** (Angular 21 declara oficialmente `^20.19`, `^22.12` o `^24`; el
proyecto se construyó y probó con Node 26.13.1, que el CLI marca como no soportado pero funciona).

```
npm install
npm start                      # servidor de desarrollo en http://localhost:4200
npx ng test --watch=false      # pruebas (Vitest), una sola pasada
npm test                       # pruebas en modo vigilancia
npm run build                  # compilación estática en dist/reversi-angular/browser
```

## Estructura
- `src/app/domain/` — reglas, IA y layout del tablero en TypeScript puro, sin Angular.
- `src/app/game/` — `GameService`: turnos, mensajes, temporización de la computadora (reloj inyectable).
- `src/app/ui/` — componentes: controles, línea de mensaje y tablero.
- `src/app/i18n/` — carga del catálogo de textos y lista de idiomas.
- `public/i18n/en.json` y `es.json` — catálogos de textos (mismas claves en los dos).

## Idiomas
La aplicación **siempre abre en inglés**; el selector de idioma cambia a español (o de vuelta) al
instante, sin recargar y sin alterar la partida. La elección no se recuerda entre visitas ni se toma
del navegador. Los textos no están en las plantillas: salen de los catálogos.

## Despliegue y límites conocidos
- **Archivos estáticos.** `npm run build` genera una carpeta que se sirve con cualquier servidor de
  archivos. Los catálogos (`i18n/en.json` y `es.json`) viajan dentro de esa carpeta.
- **Subdirectorios.** El catálogo se pide con una ruta relativa a `<base href>` (por defecto `/`). Si la
  aplicación se publica en un subdirectorio, hay que construirla con `--base-href`, por ejemplo
  `npx ng build --base-href /reversi/`; de lo contrario no encontrará los catálogos.
- **Sin catálogo.** Si el catálogo no se puede cargar, la pantalla muestra las claves de los textos
  (`credits`, `ui.newGame`…) en lugar de los textos. No hay un aviso de error propio: es una decisión
  del proyecto, porque el catálogo es un archivo estático del mismo origen.
- **Altura en móviles.** La pantalla ocupa `100vh`; en algunos navegadores móviles la barra de
  direcciones cuenta en ese alto y puede recortar la parte baja del tablero.
- **Solo mouse.** Como el applet original, el tablero se juega con el mouse (no hay teclado ni toque).
- **Qué no incluye.** El retiro del código Java original, la elección de un hosting y su despliegue son
  cambios aparte (ver `docs/arquitectura.md`).

## Licencia y atribución
Reversi2 — Copyright (c) 2004 by Keith Fenske (https://kwfenske.github.io/).
Obra derivada, distribuida bajo la GNU General Public License, versión 3 o posterior (ver `LICENSE`).
Todos los archivos `.ts`, `.html` y `.css` de `src/` llevan la atribución en su encabezado; los
archivos JSON de configuración no admiten comentarios y quedan cubiertos por este aviso y por `LICENSE`.
