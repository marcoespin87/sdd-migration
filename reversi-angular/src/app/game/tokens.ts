/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { InjectionToken } from '@angular/core';
import { createBoard } from '../domain/board';
import { Board, Random } from '../domain/types';

/** Reloj inyectable: permite probar los tiempos de la computadora sin esperar. */
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export type BoardFactory = (rows: number, cols: number) => Board;

export const SCHEDULER = new InjectionToken<Scheduler>('SCHEDULER', {
  providedIn: 'root',
  factory: () => ({
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  }),
});

/** Fuente de azar inyectable (por defecto, Math.random). */
export const RANDOM = new InjectionToken<Random>('RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

/** Crea el tablero de una partida nueva (por defecto, la posicion inicial del juego). */
export const BOARD_FACTORY = new InjectionToken<BoardFactory>('BOARD_FACTORY', {
  providedIn: 'root',
  factory: () => createBoard,
});
