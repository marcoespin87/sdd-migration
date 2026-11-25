/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

/** Colores del juego (ver "Límites y defaults" del spec), en el formato que normaliza el navegador. */
export const COLORS = {
  /** Fondo rosa claro, tambien el de las casillas vacias. */
  background: 'rgb(255, 204, 204)',
  /** Fichas de la computadora: cian claro. */
  computer: 'rgb(204, 255, 255)',
  /** Lineas de la cuadricula: rosa mas oscuro. */
  gridLine: 'rgb(204, 153, 153)',
  /** Casilla resaltada o parpadeando: azul. */
  highlight: 'rgb(102, 102, 255)',
  /** Fichas del usuario: gris oscuro. */
  user: 'rgb(51, 51, 51)',
} as const;
