# ADR 0001: Stack Angular 21 para migrar Reversi2

**Estado:** propuesto · **Fecha:** 2026-11-25

## Contexto
El juego existe como un único archivo Java AWT (`Reversi2.java`, applet de Java 1.1) que ya no corre en navegadores y mezcla estado, reglas, IA y vista en una sola clase, con un hilo auxiliar sin sincronización. Se quiere migrarlo a **Angular 21** conservando su comportamiento (`docs/specs/spec-partida-reversi.md`). Antes de la migración (Caso 4) hay que fijar el stack y las convenciones que la condicionan: estructura del proyecto, pruebas, internacionalización, render del tablero y licencia.

Presiones concretas:
- El spec exige un **selector de idioma** inglés/español en pantalla.
- Hay tres defectos del legacy (interfaz congelada al saltar turno, jugada pendiente sobre una partida nueva, resaltado persistente) que la migración debe resolver por diseño.
- La paridad con el legacy debe poder **medirse con pruebas**, no solo leerse.

## Opciones consideradas
Decisiones independientes; cada una con sus alternativas.

**Framework y versión.** El framework (Angular 21) viene dado por el pedido del usuario. Alternativa: Angular 22, la versión activa a la fecha. Angular 21 está en soporte LTS hasta 2027-06.

**i18n (selector es/en en pantalla):**
1. *Transloco (en tiempo de ejecución)* — cambio inmediato sin recargar, un solo build, parámetros en los textos · agrega una dependencia.
2. *`@angular/localize` nativo* — sin dependencias extra · un build por idioma; el selector implica recargar o redirigir.
3. *ngx-translate* — equivalente a Transloco · menos tracción en versiones recientes.

**Pruebas:**
1. *Vitest* — runner por defecto de los proyectos nuevos de Angular reciente; rápido; la lógica pura se prueba sin navegador.
2. *Jest* — estable y conocido · configuración extra con Angular.
3. *Karma + Jasmine* — el legado de Angular, en desuso.

**Render del tablero:**
1. *DOM + CSS grid* — casillas como elementos: hover, clic, colores y parpadeo con CSS y señales; probable con pruebas de componente; accesible.
2. *Canvas 2D* — fidelidad de píxel con el legacy · más código propio (márgenes, paso, hit-test), peor accesibilidad y pruebas.

**Licencia del port:** GPLv3+ (la del original), Apache 2.0 o GPLv2 (ambas permitidas por el README del autor).

**No cambiar:** seguir con Java AWT. Descartada: el applet no corre en navegadores modernos y la ejecución de escritorio depende de un JDK.

## Decisión
- **Angular 21**, componentes *standalone*, **señales** para el estado y **detección de cambios sin zone.js (zoneless)**, TypeScript estricto. *Porqué: es el modelo por defecto de Angular 21 y evita la sobrecarga de zone.js.*
- **Estructura del proyecto:** aplicación nueva en `reversi-angular/`, junto al legacy (que no se toca hasta el cierre de la migración). Tres capas con dependencia en un solo sentido:
  1. `domain/` — reglas, tablero e IA como **TypeScript puro sin dependencias de Angular** (funciones/clases con estado inmutable o explícito); el azar entra por una función inyectable para poder probarlo de forma determinista.
  2. `game/` — servicio de partida con señales: turnos, temporización de la computadora (con temporizadores **cancelables** en lugar de hilos), mensajes.
  3. `ui/` — componentes de tablero, controles y mensajes; sin lógica de reglas.
- **Pruebas:** **Vitest**. La lógica de `domain/` y `game/` se prueba sin navegador; los componentes con el banco de pruebas de Angular. Las pruebas de paridad se derivan de los criterios `CA-NN` del Caso 4.
- **i18n:** **Transloco**, un solo build, inglés (idioma base, paridad con el legacy) y español, con selector en pantalla. Los textos con datos (fila, columna, cantidad de volteos) se definen como plantillas con parámetros.
- **Tablero:** **DOM + CSS grid**. El requisito "solo cuenta el clic dentro de la ficha dibujada" se replica con el área activa del elemento de cada casilla.
- **Licencia:** el port se mantiene bajo **GPLv3+**. *Porqué: es obra derivada del original y es la opción más conservadora.*
- **Prerrequisito de entorno:** Node.js `^20.19`, `^22.12` o `^24` (tabla de compatibilidad de Angular 21). El entorno actual tiene Node 23.5.0, **no soportado**: hay que cambiarlo antes de crear el proyecto.
- **Despliegue:** compilación estática (`ng build`); el hosting se decide en un cambio posterior de arquitectura.

## Consecuencias
- Mejora: los tres defectos del legacy se evitan por construcción (sin hilo auxiliar, la jugada pendiente se cancela con el temporizador; el resaltado depende del cursor sobre el tablero). La lógica queda probada de forma aislada y la paridad se mide.
- Empeora: Transloco es una dependencia más; el DOM no replica al píxel el cálculo de márgenes del `Canvas` del legacy (se acepta una diferencia de presentación mientras se cumpla el spec).
- Deuda aceptada: Angular 21 deja de ser la versión activa (hoy es la 22); su soporte LTS llega hasta 2027-06. Hosting y despliegue quedan por decidir. El detalle de Vitest con Angular zoneless se revisa al crear el proyecto.

## Reversibilidad
Alta mientras no exista código: solo se reemplaza este ADR por otro (`Estado: reemplazado por NNNN`). Con código, cambiar de i18n o de runner de pruebas es de costo bajo a medio por estar aislados detrás de servicios y configuración; cambiar el render del tablero afecta solo a `ui/`; la capa `domain/` no depende de ninguna de estas elecciones.

## Specs afectados
- `spec-partida-reversi.md`: ninguno en este cambio. Sus *Referencias* (ruta del código nuevo) se actualizan en la migración (Caso 4).
