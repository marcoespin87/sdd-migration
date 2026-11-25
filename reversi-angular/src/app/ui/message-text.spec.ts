/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { computeLayout } from '../domain/layout';
import { lineText, toText, windowWarning } from './message-text';

describe('message-text', () => {
  it('CA-24 selección de plural: exactamente 1 volteo usa la forma "one", cualquier otra cantidad "other"', () => {
    const move = (key: 'userMove' | 'computerMove', count: number) =>
      toText({ key, params: { row: 3, col: 4, count } });
    expect(move('userMove', 1)).toEqual({
      key: 'userMove.one',
      params: { row: 3, col: 4, count: 1 },
    });
    expect(move('userMove', 2).key).toBe('userMove.other');
    expect(move('userMove', 0).key).toBe('userMove.other');
    expect(move('computerMove', 1).key).toBe('computerMove.one');
    expect(move('computerMove', 7).key).toBe('computerMove.other');
  });

  it('CA-24 los demás mensajes conservan su clave y sus parámetros', () => {
    expect(toText({ key: 'credits' })).toEqual({ key: 'credits', params: {} });
    expect(toText({ key: 'newBoard', params: { rows: 8, cols: 12 } })).toEqual({
      key: 'newBoard',
      params: { rows: 8, cols: 12 },
    });
    expect(toText({ key: 'endTie', params: { count: 2 } }).key).toBe('endTie');
  });

  it('CA-27 aviso de ventana: si faltan filas y columnas a la vez se informa el de filas', () => {
    const both = computeLayout(100, 100, 24, 24);
    expect(windowWarning(both)).toEqual({ key: 'tooShort', params: { rows: 24 } });
  });

  it('CA-27 aviso de ventana: solo columnas, solo filas o ninguno', () => {
    expect(windowWarning(computeLayout(120, 1000, 2, 24))).toEqual({
      key: 'tooNarrow',
      params: { cols: 24 },
    });
    expect(windowWarning(computeLayout(1000, 60, 24, 2))).toEqual({
      key: 'tooShort',
      params: { rows: 24 },
    });
    expect(windowWarning(computeLayout(700, 500, 6, 10))).toBeNull();
  });

  it('CA-27 la línea muestra el aviso con prioridad y, sin aviso, el mensaje del juego', () => {
    const game = { key: 'userMove', params: { row: 3, col: 4, count: 2 } } as const;
    const warning = windowWarning(computeLayout(100, 100, 24, 24));
    expect(lineText(game, warning)).toEqual({ key: 'tooShort', params: { rows: 24 } });
    expect(lineText(game, null)).toEqual({
      key: 'userMove.other',
      params: { row: 3, col: 4, count: 2 },
    });
  });
});
