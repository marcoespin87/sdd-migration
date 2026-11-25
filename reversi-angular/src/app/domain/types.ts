/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

export type Player = 'computer' | 'user';
export type Cell = Player | null;
export type Board = readonly (readonly Cell[])[];
export type Level = 'easy' | 'medium';
/** Fuente de azar inyectable: devuelve un numero en [0, 1). */
export type Random = () => number;

export interface Position {
  readonly row: number;
  readonly col: number;
}

export interface Move extends Position {
  readonly flips: number;
}
