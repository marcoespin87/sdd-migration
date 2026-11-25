/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { legalMoves } from './rules';
import { Board, Level, Move, Random } from './types';

/**
 * Jugada de la computadora. Easy: cualquier jugada legal, al azar. Medium: al azar entre las de
 * mayor cantidad de volteos. Devuelve null si no tiene jugadas. El azar se inyecta para poder
 * probarlo: el indice elegido es `floor(azar x cantidad)` sobre las jugadas en orden fila-columna.
 */
export function chooseMove(board: Board, level: Level, random: Random): Move | null {
  const moves = legalMoves(board, 'computer');
  if (moves.length === 0) {
    return null;
  }
  const best = level === 'medium' ? Math.max(...moves.map((m) => m.flips)) : 1;
  const candidates = moves.filter((m) => m.flips >= best);
  return candidates[Math.floor(random() * candidates.length)];
}
