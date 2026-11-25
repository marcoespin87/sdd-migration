/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Board, Cell } from './types';

/** Construye un tablero desde texto: 'u' usuario, 'c' computadora, '.' vacia. */
export function boardFrom(rows: string[]): Board {
  return rows.map((line) =>
    [...line].map((ch): Cell => (ch === 'u' ? 'user' : ch === 'c' ? 'computer' : null)),
  );
}

/** Generador pseudoaleatorio determinista (mulberry32) para pruebas con semilla fija. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tablero aleatorio con semilla: cada casilla vacia, usuario o computadora. */
export function randomBoard(rows: number, cols: number, random: () => number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): Cell => {
      const r = random();
      return r < 0.34 ? null : r < 0.67 ? 'user' : 'computer';
    }),
  );
}
