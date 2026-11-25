/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { createBoard } from './board';
import { applyMove, countFlips, countPieces, isGameOver, legalMoves, outcome } from './rules';
import { boardFrom, randomBoard, seeded } from './test-utils';
import { Player } from './types';

describe('rules', () => {
  it('CA-02 conteo de volteos: una dirección con fichas rivales seguidas y una propia al final', () => {
    expect(countFlips(boardFrom(['.cu']), 'user', 0, 0)).toBe(1);
    expect(countFlips(boardFrom(['.cccu']), 'user', 0, 0)).toBe(3);
    expect(countFlips(boardFrom(['.uuc']), 'computer', 0, 0)).toBe(2);
  });

  it('CA-02 conteo de volteos: suma de las 8 direcciones', () => {
    const board = boardFrom(['u.u.u', '.ccc.', 'uc.cu', '.ccc.', 'u.u.u']);
    expect(countFlips(board, 'user', 2, 2)).toBe(8);
  });

  it('CA-02 conteo de volteos: una cadena cortada por casilla vacía o por el borde cuenta 0', () => {
    expect(countFlips(boardFrom(['.c.u']), 'user', 0, 0)).toBe(0);
    expect(countFlips(boardFrom(['.cc']), 'user', 0, 0)).toBe(0);
    expect(countFlips(boardFrom(['.u']), 'user', 0, 0)).toBe(0);
  });

  it('CA-02 conteo de volteos: una casilla ocupada cuenta 0', () => {
    const board = boardFrom(['ucu']);
    expect(countFlips(board, 'user', 0, 0)).toBe(0);
    expect(countFlips(board, 'user', 0, 1)).toBe(0);
    expect(countFlips(board, 'computer', 0, 2)).toBe(0);
  });

  it('CA-03 aplicar jugada: coloca la ficha y voltea exactamente las atrapadas', () => {
    const before = boardFrom(['.cu']);
    const after = applyMove(before, 'user', 0, 0);
    expect(after).toEqual(boardFrom(['uuu']));
    expect(before).toEqual(boardFrom(['.cu'])); // el tablero original no se modifica
  });

  it('CA-03 aplicar jugada: en varias direcciones solo cambian las fichas atrapadas', () => {
    const before = boardFrom(['u.u.u', '.ccc.', 'uc.cu', '.ccc.', 'u.u.u']);
    const after = applyMove(before, 'user', 2, 2);
    expect(after).toEqual(boardFrom(['u.u.u', '.uuu.', 'uuuuu', '.uuu.', 'u.u.u']));
  });

  it('CA-04 jugada legal voltea al menos una: coherencia entre legalMoves, countFlips y applyMove', () => {
    const random = seeded(2026);
    for (let i = 0; i < 200; i++) {
      const board = randomBoard(6, 6, random);
      for (const player of ['user', 'computer'] as Player[]) {
        const moves = legalMoves(board, player);
        const legal = new Set(moves.map((m) => `${m.row},${m.col}`));
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 6; col++) {
            const flips = countFlips(board, player, row, col);
            expect(legal.has(`${row},${col}`)).toBe(flips > 0);
            if (flips > 0) {
              const after = applyMove(board, player, row, col);
              const flat = board.flat();
              const changed = after.flat().filter((cell, k) => cell !== flat[k]).length;
              expect(changed).toBe(flips + 1);
            } else {
              expect(() => applyMove(board, player, row, col)).toThrow();
            }
          }
        }
        expect(moves.every((m) => m.flips >= 1)).toBe(true);
      }
    }
  });

  it('CA-05 fin y resultado: termina cuando ninguno puede mover', () => {
    expect(isGameOver(boardFrom(['uuuu']))).toBe(true);
    expect(isGameOver(boardFrom(['u.c']))).toBe(true); // hay vacía pero nadie puede mover
    expect(isGameOver(boardFrom(['uc.']))).toBe(false); // el usuario puede jugar
    expect(isGameOver(boardFrom(['.cu']))).toBe(false);
  });

  it('CA-05 fin y resultado: gana quien tiene más fichas y con igual cantidad hay empate', () => {
    expect(countPieces(boardFrom(['uuc.']))).toEqual({ computer: 1, user: 2 });
    expect(outcome(boardFrom(['uuc']))).toBe('user');
    expect(outcome(boardFrom(['ucc']))).toBe('computer');
    expect(outcome(boardFrom(['ucuc']))).toBe('tie');
  });

  it('CA-06 fin inmediato solo en 2x2: el resto de los tamaños tiene jugadas al iniciar', () => {
    const sizes = [2, 4, 6, 8, 10, 12, 16, 24];
    for (const rows of sizes) {
      for (const cols of sizes) {
        const over = isGameOver(createBoard(rows, cols));
        expect(over).toBe(rows === 2 && cols === 2);
      }
    }
  });
});
