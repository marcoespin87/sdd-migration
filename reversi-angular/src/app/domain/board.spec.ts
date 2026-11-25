/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { ALLOWED_SIZES, DEFAULT_COLS, DEFAULT_LEVEL, DEFAULT_ROWS, LEVELS, createBoard } from './board';

describe('board', () => {
  it('CA-01 posición inicial por tamaño: cuadrado central 2x2, computadora en la diagonal principal', () => {
    expect(ALLOWED_SIZES.length).toBeGreaterThan(0);
    for (const rows of ALLOWED_SIZES) {
      for (const cols of ALLOWED_SIZES) {
        const board = createBoard(rows, cols);
        const r = rows / 2 - 1;
        const c = cols / 2 - 1;
        expect(board.length).toBe(rows);
        expect(board.every((line) => line.length === cols)).toBe(true);
        expect(board[r][c]).toBe('computer');
        expect(board[r][c + 1]).toBe('user');
        expect(board[r + 1][c]).toBe('user');
        expect(board[r + 1][c + 1]).toBe('computer');
        const empty = board.flat().filter((cell) => cell === null).length;
        expect(empty).toBe(rows * cols - 4);
      }
    }
  });

  it('CA-01 posición inicial por tamaño: hay 64 combinaciones permitidas', () => {
    expect(ALLOWED_SIZES.length * ALLOWED_SIZES.length).toBe(64);
  });

  it('CA-09 valores y defaults: tamaños permitidos, 6x10 y dificultad Medium', () => {
    expect([...ALLOWED_SIZES]).toEqual([2, 4, 6, 8, 10, 12, 16, 24]);
    expect(DEFAULT_ROWS).toBe(6);
    expect(DEFAULT_COLS).toBe(10);
    expect(DEFAULT_LEVEL).toBe('medium');
    expect([...LEVELS]).toEqual(['easy', 'medium']);
  });
});
