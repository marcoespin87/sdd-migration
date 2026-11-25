/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { chooseMove } from '../domain/ai';
import { DEFAULT_COLS, DEFAULT_LEVEL, DEFAULT_ROWS } from '../domain/board';
import {
  applyMove,
  countFlips,
  countPieces,
  isGameOver,
  legalMoves,
  outcome,
} from '../domain/rules';
import { Board, Level, Move, Position } from '../domain/types';
import { GameMessage } from './messages';
import { BOARD_FACTORY, RANDOM, SCHEDULER } from './tokens';

export type Turn = 'user' | 'computer' | 'over';

/** Espera de la computadora tras la jugada del usuario: entre 1000 y 2499 ms. */
const MIN_WAIT_MS = 1000;
const WAIT_SPREAD_MS = 1500;

/**
 * Parpadeo de la casilla elegida por la computadora, en ms desde que muestra su jugada:
 * encendida 0-600, apagada 600-1000, encendida 1000-1600, apagada 1600-1800; a los 1800 voltea.
 */
const BLINK_OFF_1 = 600;
const BLINK_ON_2 = 1000;
const BLINK_OFF_2 = 1600;
const BLINK_END = 1800;

/**
 * Estado y reglas de una partida contra la computadora. Nunca bloquea: la espera y el parpadeo de la
 * computadora son temporizadores del `Scheduler` inyectado, y cada reinicio cancela los pendientes.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly scheduler = inject(SCHEDULER);
  private readonly random = inject(RANDOM);
  private readonly boardFactory = inject(BOARD_FACTORY);

  private readonly rowsState = signal(DEFAULT_ROWS);
  private readonly colsState = signal(DEFAULT_COLS);
  private readonly levelState = signal<Level>(DEFAULT_LEVEL);
  private readonly boardState = signal<Board>([]);
  private readonly turnState = signal<Turn>('user');
  private readonly messageState = signal<GameMessage>({ key: 'credits' });
  private readonly flashState = signal<Position | null>(null);
  private readonly pointer = signal<Position | null>(null);

  readonly rows = this.rowsState.asReadonly();
  readonly cols = this.colsState.asReadonly();
  readonly level = this.levelState.asReadonly();
  readonly board = this.boardState.asReadonly();
  readonly turn = this.turnState.asReadonly();
  readonly message = this.messageState.asReadonly();
  /** Casilla que esta parpadeando (jugada de la computadora), o null. */
  readonly flash = this.flashState.asReadonly();

  /**
   * Casilla resaltada: la que esta bajo el cursor, solo si es el turno del usuario, esta vacia y es
   * una jugada legal suya. Al ser calculada, desaparece al salir del tablero, al cambiar de casilla
   * y al pasar el turno.
   */
  readonly highlight = computed<Position | null>(() => {
    const pos = this.pointer();
    if (pos === null || this.turnState() !== 'user') {
      return null;
    }
    const board = this.boardState();
    if (board[pos.row]?.[pos.col] !== null) {
      return null;
    }
    return countFlips(board, 'user', pos.row, pos.col) > 0 ? pos : null;
  });

  /** Se incrementa en cada reinicio: un callback de una partida anterior se ignora. */
  private generation = 0;
  private timers = new Set<unknown>();

  constructor() {
    this.reset({ key: 'credits' });
  }

  newGame(): void {
    this.reset({ key: 'begin' });
  }

  setRows(rows: number): void {
    this.rowsState.set(rows);
    this.reset({ key: 'newBoard', params: { rows, cols: this.colsState() } });
  }

  setCols(cols: number): void {
    this.colsState.set(cols);
    this.reset({ key: 'newBoard', params: { rows: this.rowsState(), cols } });
  }

  /** Cambia la dificultad sin reiniciar: aplica desde la siguiente jugada de la computadora. */
  setLevel(level: Level): void {
    this.levelState.set(level);
  }

  /** Clic del usuario; `null` es un clic que no cae sobre una ficha. */
  click(pos: Position | null): void {
    const turn = this.turnState();
    if (turn === 'over') {
      this.messageState.set({ key: 'gameFinished' });
      return;
    }
    if (turn !== 'user') {
      this.messageState.set({ key: 'notYourTurn' });
      return;
    }
    const board = this.boardState();
    if (legalMoves(board, 'user').length === 0) {
      this.messageState.set({ key: 'mustSkip' });
      return;
    }
    if (pos === null) {
      this.messageState.set({ key: 'clickPosition' });
      return;
    }
    if (board[pos.row][pos.col] !== null) {
      this.messageState.set({ key: 'occupied' });
      return;
    }
    const flips = countFlips(board, 'user', pos.row, pos.col);
    if (flips === 0) {
      this.messageState.set({ key: 'invalidMove' });
      return;
    }
    this.messageState.set({
      key: 'userMove',
      params: { row: pos.row + 1, col: pos.col + 1, count: flips },
    });
    this.boardState.set(applyMove(board, 'user', pos.row, pos.col));
    this.startComputerTurn(true);
  }

  /** Cede el turno a la computadora, aunque el usuario tenga jugadas. Retorna de inmediato. */
  skipTurn(): void {
    const turn = this.turnState();
    if (turn === 'over') {
      this.messageState.set({ key: 'skipNoGame' });
    } else if (turn === 'computer') {
      this.messageState.set({ key: 'skipNotYourTurn' });
    } else {
      this.startComputerTurn(false);
    }
  }

  /** Casilla bajo el cursor; `null` cuando el cursor no esta sobre una ficha o salio del tablero. */
  pointerAt(pos: Position | null): void {
    this.pointer.set(pos);
  }

  /** Reinicia la partida: cancela lo pendiente, tablero nuevo, turno del usuario y mensaje inicial. */
  private reset(initial: GameMessage): void {
    this.generation++;
    this.cancelTimers();
    this.flashState.set(null);
    this.boardState.set(this.boardFactory(this.rowsState(), this.colsState()));
    this.turnState.set('user');
    this.messageState.set(initial);
    this.evaluateUserTurn();
  }

  /** El usuario tiene el turno: la partida puede haber terminado o el usuario puede no tener jugadas. */
  private evaluateUserTurn(): void {
    const board = this.boardState();
    const userCanMove = legalMoves(board, 'user').length > 0;
    const computerCanMove = legalMoves(board, 'computer').length > 0;
    if (!userCanMove && !computerCanMove) {
      this.finish();
    } else if (!userCanMove) {
      this.messageState.set({ key: 'mustSkip' });
    }
  }

  private finish(): void {
    const board = this.boardState();
    const { computer, user } = countPieces(board);
    const result = outcome(board);
    this.turnState.set('over');
    this.flashState.set(null);
    this.messageState.set(
      result === 'user'
        ? { key: 'endUserWins', params: { user, comp: computer } }
        : result === 'computer'
          ? { key: 'endComputerWins', params: { comp: computer, user } }
          : { key: 'endTie', params: { count: computer } },
    );
  }

  /** Pasa el turno a la computadora: con espera aleatoria tras una jugada, sin espera tras Skip Turn. */
  private startComputerTurn(withWait: boolean): void {
    this.turnState.set('computer');
    if (withWait) {
      const delay = MIN_WAIT_MS + Math.floor(this.random() * WAIT_SPREAD_MS);
      this.schedule(delay, () => this.computerStep());
    } else {
      this.computerStep();
    }
  }

  private computerStep(): void {
    const board = this.boardState();
    if (isGameOver(board)) {
      this.finish();
      return;
    }
    const move = chooseMove(board, this.levelState(), this.random);
    if (move === null) {
      this.messageState.set({ key: 'computerCantMove' });
      this.turnState.set('user');
      return;
    }
    this.messageState.set({
      key: 'computerMove',
      params: { row: move.row + 1, col: move.col + 1, count: move.flips },
    });
    this.blinkThenPlay(move);
  }

  private blinkThenPlay(move: Move): void {
    const cell: Position = { row: move.row, col: move.col };
    this.flashState.set(cell);
    this.schedule(BLINK_OFF_1, () => this.flashState.set(null));
    this.schedule(BLINK_ON_2, () => this.flashState.set(cell));
    this.schedule(BLINK_OFF_2, () => this.flashState.set(null));
    this.schedule(BLINK_END, () => {
      this.boardState.set(applyMove(this.boardState(), 'computer', move.row, move.col));
      this.turnState.set('user');
      this.evaluateUserTurn();
    });
  }

  /** Agenda un paso; si hubo un reinicio entretanto, el callback se ignora. */
  private schedule(ms: number, fn: () => void): void {
    const generation = this.generation;
    const handle = this.scheduler.setTimeout(() => {
      this.timers.delete(handle);
      if (generation === this.generation) {
        fn();
      }
    }, ms);
    this.timers.add(handle);
  }

  private cancelTimers(): void {
    for (const handle of this.timers) {
      this.scheduler.clearTimeout(handle);
    }
    this.timers.clear();
  }
}
