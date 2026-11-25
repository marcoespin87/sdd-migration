/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Board, Cell, Move, Player, Position } from './types';

/** Las 8 direcciones (fila, columna): horizontal, vertical y diagonal. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function opponent(player: Player): Player {
  return player === 'user' ? 'computer' : 'user';
}

/**
 * Fichas rivales que se voltean en una direccion: una o mas fichas rivales seguidas y despues
 * una ficha propia. Una cadena cortada por una casilla vacia o por el borde no voltea nada.
 */
function flipsInDirection(
  board: Board,
  player: Player,
  row: number,
  col: number,
  dr: number,
  dc: number,
): Position[] {
  const other = opponent(player);
  const found: Position[] = [];
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < board.length && c >= 0 && c < board[0].length) {
    const cell = board[r][c];
    if (cell === other) {
      found.push({ row: r, col: c });
    } else if (cell === player) {
      return found;
    } else {
      return [];
    }
    r += dr;
    c += dc;
  }
  return [];
}

/** Fichas que se voltearian al jugar en la casilla. Una casilla ocupada no voltea nada. */
function flippedCells(board: Board, player: Player, row: number, col: number): Position[] {
  if (board[row][col] !== null) {
    return [];
  }
  return DIRECTIONS.flatMap(([dr, dc]) => flipsInDirection(board, player, row, col, dr, dc));
}

/** Cantidad de fichas que voltearia jugar en la casilla: la suma de sus 8 direcciones. */
export function countFlips(board: Board, player: Player, row: number, col: number): number {
  return flippedCells(board, player, row, col).length;
}

/** Jugadas legales del jugador (casillas que voltean al menos una ficha), en orden fila-columna. */
export function legalMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const flips = countFlips(board, player, row, col);
      if (flips > 0) {
        moves.push({ row, col, flips });
      }
    }
  }
  return moves;
}

/** Aplica una jugada legal y devuelve un tablero nuevo; el original no se modifica. */
export function applyMove(board: Board, player: Player, row: number, col: number): Board {
  const flips = flippedCells(board, player, row, col);
  if (flips.length === 0) {
    throw new Error(`Jugada ilegal en fila ${row + 1}, columna ${col + 1}: no voltea ninguna ficha`);
  }
  const cells: Cell[][] = board.map((line) => [...line]);
  cells[row][col] = player;
  for (const flip of flips) {
    cells[flip.row][flip.col] = player;
  }
  return cells;
}

/** La partida termina cuando ninguno de los dos puede mover. */
export function isGameOver(board: Board): boolean {
  return legalMoves(board, 'user').length === 0 && legalMoves(board, 'computer').length === 0;
}

export function countPieces(board: Board): { computer: number; user: number } {
  const counts = { computer: 0, user: 0 };
  for (const cell of board.flat()) {
    if (cell !== null) {
      counts[cell]++;
    }
  }
  return counts;
}

/** Gana quien tiene mas fichas; con igual cantidad hay empate. */
export function outcome(board: Board): 'user' | 'computer' | 'tie' {
  const { computer, user } = countPieces(board);
  return user > computer ? 'user' : computer > user ? 'computer' : 'tie';
}
