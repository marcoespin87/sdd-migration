/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Injectable, signal } from '@angular/core';
import { Board, Level, Position } from '../domain/types';
import { GameMessage } from './messages';

export type Turn = 'user' | 'computer' | 'over';

// Esqueleto (CA-13 a CA-23): estado y comportamiento por implementar.
@Injectable({ providedIn: 'root' })
export class GameService {
  readonly rows = signal(0).asReadonly();
  readonly cols = signal(0).asReadonly();
  readonly level = signal<Level>('easy').asReadonly();
  readonly board = signal<Board>([]).asReadonly();
  readonly turn = signal<Turn>('over').asReadonly();
  readonly message = signal<GameMessage>({ key: 'gameFinished' }).asReadonly();
  readonly flash = signal<Position | null>(null).asReadonly();
  readonly highlight = signal<Position | null>(null).asReadonly();

  newGame(): void {
    throw new Error('no implementado');
  }
  setRows(_rows: number): void {
    throw new Error('no implementado');
  }
  setCols(_cols: number): void {
    throw new Error('no implementado');
  }
  setLevel(_level: Level): void {
    throw new Error('no implementado');
  }
  click(_pos: Position | null): void {
    throw new Error('no implementado');
  }
  skipTurn(): void {
    throw new Error('no implementado');
  }
  pointerAt(_pos: Position | null): void {
    throw new Error('no implementado');
  }
}
