/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { chooseMove } from './ai';
import { createBoard } from './board';
import { legalMoves } from './rules';
import { boardFrom, randomBoard, seeded } from './test-utils';

describe('ai', () => {
  // En un 4x4 inicial la computadora tiene 4 jugadas de 1 volteo, en orden fila-columna:
  // (0,2), (1,3), (2,0), (3,1).
  const initial = () => createBoard(4, 4);
  const expected = [
    { row: 0, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 0 },
    { row: 3, col: 1 },
  ];

  it('CA-07 easy: elige entre todas las jugadas legales con índice floor(azar × cantidad)', () => {
    const picks = [0, 0.25, 0.5, 0.99].map((r) => chooseMove(initial(), 'easy', () => r));
    expect(picks.map((m) => ({ row: m!.row, col: m!.col }))).toEqual(expected);
  });

  it('CA-07 easy: elige jugadas de cualquier volteo, no solo las máximas', () => {
    const board = boardFrom(['.uuc.', '.....', '.uc..']);
    const last = chooseMove(board, 'easy', () => 0.99);
    expect(last).toMatchObject({ row: 2, col: 0, flips: 1 });
  });

  it('CA-07 easy: el índice es floor(azar × cantidad), no un redondeo (2 jugadas)', () => {
    const board = boardFrom(['.uuc.', '.....', '.uc..']); // jugadas: (0,0) y (2,0)
    expect(chooseMove(board, 'easy', () => 0)).toMatchObject({ row: 0, col: 0 });
    expect(chooseMove(board, 'easy', () => 0.25)).toMatchObject({ row: 0, col: 0 });
    expect(chooseMove(board, 'easy', () => 0.49)).toMatchObject({ row: 0, col: 0 });
    expect(chooseMove(board, 'easy', () => 0.5)).toMatchObject({ row: 2, col: 0 });
    expect(chooseMove(board, 'easy', () => 0.99)).toMatchObject({ row: 2, col: 0 });
  });

  it('CA-07 easy: sin jugadas devuelve null y nunca devuelve una jugada ilegal', () => {
    expect(chooseMove(boardFrom(['uuuu']), 'easy', () => 0.5)).toBeNull();
    const random = seeded(7);
    for (let i = 0; i < 200; i++) {
      const board = randomBoard(6, 6, random);
      const move = chooseMove(board, 'easy', random);
      const legal = legalMoves(board, 'computer');
      if (legal.length === 0) {
        expect(move).toBeNull();
      } else {
        expect(legal.some((m) => m.row === move!.row && m.col === move!.col)).toBe(true);
      }
    }
  });

  it('CA-08 medium: solo entre las jugadas de máximo volteo', () => {
    const board = boardFrom(['.uuc.', '.....', '.uc..']);
    for (const r of [0, 0.5, 0.99]) {
      expect(chooseMove(board, 'medium', () => r)).toMatchObject({ row: 0, col: 0, flips: 2 });
    }
  });

  it('CA-08 medium: uniforme entre las empatadas', () => {
    const picks = [0, 0.25, 0.5, 0.99].map((r) => chooseMove(initial(), 'medium', () => r));
    expect(picks.map((m) => ({ row: m!.row, col: m!.col }))).toEqual(expected);
  });

  it('CA-08 medium: siempre devuelve una jugada legal de máximo volteo si hay jugadas', () => {
    const random = seeded(11);
    for (let i = 0; i < 200; i++) {
      const board = randomBoard(6, 6, random);
      const legal = legalMoves(board, 'computer');
      const move = chooseMove(board, 'medium', random);
      if (legal.length === 0) {
        expect(move).toBeNull();
      } else {
        const max = Math.max(...legal.map((m) => m.flips));
        expect(move!.flips).toBe(max);
        expect(legal.some((m) => m.row === move!.row && m.col === move!.col)).toBe(true);
      }
    }
  });
});
