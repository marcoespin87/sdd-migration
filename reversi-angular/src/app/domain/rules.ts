/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Board, Move, Player, Position } from './types';

// Esqueleto (CA-02 a CA-06): comportamiento por implementar.
export function countFlips(_board: Board, _player: Player, _row: number, _col: number): number {
  throw new Error('no implementado');
}
export function legalMoves(_board: Board, _player: Player): Move[] {
  throw new Error('no implementado');
}
export function applyMove(_board: Board, _player: Player, _row: number, _col: number): Board {
  throw new Error('no implementado');
}
export function isGameOver(_board: Board): boolean {
  throw new Error('no implementado');
}
export function countPieces(_board: Board): { computer: number; user: number } {
  throw new Error('no implementado');
}
export function outcome(_board: Board): 'user' | 'computer' | 'tie' {
  throw new Error('no implementado');
}
export type { Position };
