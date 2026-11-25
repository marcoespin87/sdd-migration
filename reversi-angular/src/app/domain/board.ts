/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Board, Level } from './types';

// Esqueleto (CA-01, CA-09): valores y comportamiento por implementar.
export const ALLOWED_SIZES: readonly number[] = [];
export const DEFAULT_ROWS = 0;
export const DEFAULT_COLS = 0;
export const DEFAULT_LEVEL: Level = 'easy';
export const LEVELS: readonly Level[] = [];

export function createBoard(_rows: number, _cols: number): Board {
  throw new Error('no implementado');
}
