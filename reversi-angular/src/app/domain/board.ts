/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Board, Cell, Level } from './types';

/** Cantidades permitidas de filas y de columnas, independientes entre si. */
export const ALLOWED_SIZES: readonly number[] = [2, 4, 6, 8, 10, 12, 16, 24];
export const DEFAULT_ROWS = 6;
export const DEFAULT_COLS = 10;
export const DEFAULT_LEVEL: Level = 'medium';
export const LEVELS: readonly Level[] = ['easy', 'medium'];

/**
 * Tablero inicial: vacio salvo un cuadrado central de 2x2 en la fila `filas/2 - 1` y la
 * columna `columnas/2 - 1`; la computadora ocupa la diagonal principal y el usuario la antidiagonal.
 */
export function createBoard(rows: number, cols: number): Board {
  const cells: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
  const r = Math.floor(rows / 2) - 1;
  const c = Math.floor(cols / 2) - 1;
  cells[r][c] = 'computer';
  cells[r][c + 1] = 'user';
  cells[r + 1][c] = 'user';
  cells[r + 1][c + 1] = 'computer';
  return cells;
}
