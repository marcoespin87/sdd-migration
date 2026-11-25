/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { TestBed } from '@angular/core/testing';
import { createBoard } from '../domain/board';
import { countPieces, legalMoves } from '../domain/rules';
import { boardFrom, seeded } from '../domain/test-utils';
import { Level } from '../domain/types';
import { GameService } from './game.service';
import { FakeScheduler } from './test-utils';
import { BOARD_FACTORY, BoardFactory, RANDOM, SCHEDULER } from './tokens';

interface SetupOptions {
  /** Valor fijo del azar (0 => espera de 1000 ms; 0.9999 => 2499 ms). */
  random?: number;
  /** Azar propio, p. ej. con semilla. */
  randomFn?: () => number;
  factory?: BoardFactory;
  ignoreClear?: boolean;
}

function setup(options: SetupOptions = {}) {
  TestBed.resetTestingModule();
  const scheduler = new FakeScheduler({ ignoreClear: options.ignoreClear });
  const fixed = options.random ?? 0;
  TestBed.configureTestingModule({
    providers: [
      { provide: SCHEDULER, useValue: scheduler },
      { provide: RANDOM, useValue: options.randomFn ?? (() => fixed) },
      { provide: BOARD_FACTORY, useValue: options.factory ?? createBoard },
    ],
  });
  const game = TestBed.inject(GameService);
  return { game, scheduler };
}

/** Tablero fijo para escenarios: se usa para toda partida nueva. */
const fixedBoard = (rows: string[]): BoardFactory => {
  return () => boardFrom(rows);
};

// En el tablero inicial de 6x10 el usuario puede jugar en (2,3), (1,4), (3,6) y (4,5).
const LEGAL = { row: 2, col: 3 };
const OCCUPIED = { row: 2, col: 4 };
const NO_FLIPS = { row: 0, col: 0 };

describe('GameService', () => {
  it('CA-22 inicio: 6x10, Medium, mensaje de créditos y el usuario mueve primero', () => {
    const { game } = setup();
    expect(game.rows()).toBe(6);
    expect(game.cols()).toBe(10);
    expect(game.level()).toBe('medium');
    expect(game.turn()).toBe('user');
    expect(game.message()).toEqual({ key: 'credits' });
    expect(game.board()).toEqual(createBoard(6, 10));
    expect(game.flash()).toBeNull();
    expect(game.highlight()).toBeNull();
  });

  describe('clic del usuario', () => {
    it('CA-13 caso 1: partida terminada => mensaje y no se juega', () => {
      const { game } = setup();
      game.setRows(2);
      game.setCols(2);
      const before = game.board();
      game.click({ row: 0, col: 0 });
      expect(game.turn()).toBe('over');
      expect(game.message()).toEqual({ key: 'gameFinished' });
      expect(game.board()).toEqual(before);
    });

    it('CA-13 caso 2: no es el turno del usuario => mensaje de espera', () => {
      const { game } = setup();
      game.click(LEGAL);
      expect(game.turn()).toBe('computer');
      const before = game.board();
      game.click({ row: 1, col: 4 });
      expect(game.message()).toEqual({ key: 'notYourTurn' });
      expect(game.board()).toEqual(before);
    });

    it('CA-13 caso 3: el usuario sin jugadas recibe el mensaje de Skip Turn, aunque el clic sea válido', () => {
      const { game } = setup({ factory: fixedBoard(['.uc']) });
      const before = game.board();
      game.click({ row: 0, col: 0 });
      expect(game.message()).toEqual({ key: 'mustSkip' });
      expect(game.board()).toEqual(before);
      expect(game.turn()).toBe('user');
    });

    it('CA-13 caso 3: el usuario sin jugadas tiene prioridad sobre un clic fuera de una ficha', () => {
      const { game } = setup({ factory: fixedBoard(['.uc']) });
      game.click(null);
      expect(game.message()).toEqual({ key: 'mustSkip' });
    });

    it('CA-13 caso 4: un clic fuera de una ficha pide hacer clic en una casilla', () => {
      const { game } = setup();
      const before = game.board();
      game.click(null);
      expect(game.message()).toEqual({ key: 'clickPosition' });
      expect(game.board()).toEqual(before);
    });

    it('CA-13 caso 5: una casilla ocupada muestra su mensaje', () => {
      const { game } = setup();
      const before = game.board();
      game.click(OCCUPIED);
      expect(game.message()).toEqual({ key: 'occupied' });
      expect(game.board()).toEqual(before);
    });

    it('CA-13 caso 6: una casilla vacía que no voltea nada muestra su mensaje', () => {
      const { game } = setup();
      const before = game.board();
      game.click(NO_FLIPS);
      expect(game.message()).toEqual({ key: 'invalidMove' });
      expect(game.board()).toEqual(before);
      expect(game.turn()).toBe('user');
    });

    it('CA-13 caso 7: una jugada legal muestra fila y columna (base 1) y volteos, voltea y pasa el turno', () => {
      const { game } = setup();
      game.click(LEGAL);
      expect(game.message()).toEqual({ key: 'userMove', params: { row: 3, col: 4, count: 1 } });
      expect(game.board()[2][3]).toBe('user');
      expect(game.board()[2][4]).toBe('user');
      expect(game.turn()).toBe('computer');
    });

    it('CA-13 caso 7: informa la cantidad de volteos cuando hay más de uno', () => {
      const { game } = setup({ factory: fixedBoard(['.ccu']) });
      game.click({ row: 0, col: 0 });
      expect(game.message()).toEqual({ key: 'userMove', params: { row: 1, col: 1, count: 2 } });
      expect(game.board()).toEqual(boardFrom(['uuuu']));
    });
  });

  describe('Skip Turn', () => {
    it('CA-14 en el turno del usuario cede el turno aunque tenga jugadas legales', () => {
      const { game } = setup();
      expect(legalMoves(game.board(), 'user').length).toBeGreaterThan(0);
      game.skipTurn();
      expect(game.turn()).toBe('computer');
      expect(game.message().key).toBe('computerMove');
    });

    it('CA-14 con la computadora pensando muestra que es su turno', () => {
      const { game } = setup();
      game.click(LEGAL);
      game.skipTurn();
      expect(game.message()).toEqual({ key: 'skipNotYourTurn' });
      expect(game.turn()).toBe('computer');
    });

    it('CA-14 con la partida terminada pide iniciar una partida nueva', () => {
      const { game } = setup();
      game.setRows(2);
      game.setCols(2);
      game.skipTurn();
      expect(game.message()).toEqual({ key: 'skipNoGame' });
      expect(game.turn()).toBe('over');
    });

    it('CA-16 retorna de inmediato: sin espera inicial, con parpadeo, y el servicio sigue aceptando acciones', () => {
      const { game, scheduler } = setup();
      const before = game.board();
      game.skipTurn();
      expect(scheduler.now).toBe(0);
      expect(game.turn()).toBe('computer');
      expect(game.message().key).toBe('computerMove');
      expect(game.flash()).not.toBeNull();
      expect(game.board()).toEqual(before);
      // sigue aceptando acciones durante el parpadeo
      game.setLevel('easy');
      expect(game.level()).toBe('easy');
      scheduler.advance(1799);
      expect(game.board()).toEqual(before);
      scheduler.advance(1);
      expect(game.turn()).toBe('user');
      expect(game.board()).not.toEqual(before);
    });

    it('CA-16 New Game durante el parpadeo de un Skip Turn funciona y cancela la jugada', () => {
      const { game, scheduler } = setup();
      game.skipTurn();
      scheduler.advance(700);
      game.newGame();
      expect(game.turn()).toBe('user');
      expect(game.message()).toEqual({ key: 'begin' });
      scheduler.advance(10000);
      expect(game.board()).toEqual(createBoard(6, 10));
    });
  });

  describe('turno de la computadora', () => {
    it('CA-15 espera 1000 ms (azar 0) y luego muestra su jugada', () => {
      const { game, scheduler } = setup({ random: 0 });
      game.click(LEGAL);
      scheduler.advance(999);
      expect(game.message().key).toBe('userMove');
      expect(game.flash()).toBeNull();
      scheduler.advance(1);
      expect(game.message().key).toBe('computerMove');
      expect(game.flash()).not.toBeNull();
    });

    it('CA-15 espera 2499 ms con el azar en su extremo superior', () => {
      const { game, scheduler } = setup({ random: 0.9999 });
      game.click(LEGAL);
      scheduler.advance(2498);
      expect(game.message().key).toBe('userMove');
      scheduler.advance(1);
      expect(game.message().key).toBe('computerMove');
    });

    it('CA-15 parpadea 600/400/600/200 ms y luego voltea y devuelve el turno', () => {
      const { game, scheduler } = setup({ random: 0 });
      game.click(LEGAL);
      scheduler.advance(1000); // llega la jugada: empieza el parpadeo
      const { params } = game.message();
      const target = { row: params!['row'] - 1, col: params!['col'] - 1 };
      const stateAt = (ms: number) => {
        scheduler.advance(ms);
        return game.flash();
      };
      expect(game.flash()).toEqual(target); // 0-600 encendida
      expect(stateAt(599)).toEqual(target);
      expect(stateAt(1)).toBeNull(); // 600-1000 apagada
      expect(stateAt(399)).toBeNull();
      expect(stateAt(1)).toEqual(target); // 1000-1600 encendida
      expect(stateAt(599)).toEqual(target);
      expect(stateAt(1)).toBeNull(); // 1600-1800 apagada
      expect(game.board()[target.row][target.col]).toBeNull(); // aún no se voltea
      expect(stateAt(199)).toBeNull();
      expect(game.board()[target.row][target.col]).toBeNull();
      expect(game.turn()).toBe('computer');
      scheduler.advance(1); // 1800: voltea
      expect(game.board()[target.row][target.col]).toBe('computer');
      expect(game.turn()).toBe('user');
      expect(game.flash()).toBeNull();
    });

    it('CA-17 si la computadora no puede mover pero el usuario sí, lo avisa y vuelve el usuario', () => {
      const { game, scheduler } = setup({ factory: fixedBoard(['.cu', '.cu']) });
      game.click({ row: 0, col: 0 });
      scheduler.advance(1000);
      expect(game.message()).toEqual({ key: 'computerCantMove' });
      expect(game.turn()).toBe('user');
      expect(game.flash()).toBeNull();
      expect(game.board()).toEqual(boardFrom(['uuu', '.cu']));
    });

    it('CA-17 si el usuario queda sin jugadas tras la de la computadora, se avisa y el turno no pasa solo', () => {
      const { game, scheduler } = setup({ factory: fixedBoard(['.uc', '.uc']) });
      expect(game.message()).toEqual({ key: 'mustSkip' }); // ya al iniciar el usuario no puede mover
      game.skipTurn();
      scheduler.advance(1800);
      expect(game.board()).toEqual(boardFrom(['ccc', '.uc']));
      expect(game.turn()).toBe('user');
      expect(game.message()).toEqual({ key: 'mustSkip' });
      scheduler.advance(100000);
      expect(game.turn()).toBe('user');
      expect(game.board()).toEqual(boardFrom(['ccc', '.uc']));
    });

    it('CA-18 el fin de partida se muestra al cabo de la espera, no justo tras la jugada del usuario', () => {
      const { game, scheduler } = setup({ factory: fixedBoard(['.cu']) });
      game.click({ row: 0, col: 0 });
      expect(game.board()).toEqual(boardFrom(['uuu']));
      scheduler.advance(999);
      expect(game.turn()).toBe('computer');
      expect(game.message().key).toBe('userMove');
      scheduler.advance(1);
      expect(game.turn()).toBe('over');
      expect(game.message()).toEqual({ key: 'endUserWins', params: { user: 3, comp: 0 } });
    });

    it('CA-18 gana la computadora, con las cantidades de cada lado', () => {
      const { game, scheduler } = setup({ factory: fixedBoard(['.uc']) });
      game.skipTurn();
      scheduler.advance(1800);
      expect(game.board()).toEqual(boardFrom(['ccc']));
      expect(game.turn()).toBe('over');
      expect(game.message()).toEqual({ key: 'endComputerWins', params: { comp: 3, user: 0 } });
    });

    it('CA-18 empate al iniciar un tablero de 2x2', () => {
      const { game } = setup();
      game.setRows(2);
      game.setCols(2);
      expect(game.turn()).toBe('over');
      expect(game.message()).toEqual({ key: 'endTie', params: { count: 2 } });
    });
  });

  describe('cancelación de la jugada pendiente', () => {
    // Instantes (ms desde el clic del usuario, con espera de 1000) en los que se reinicia:
    // durante la espera y en cada paso del parpadeo.
    const moments = [500, 1000, 1600, 2000, 2600, 2799];
    const reset: Record<string, (g: GameService) => void> = {
      'New Game': (g) => g.newGame(),
      'cambio de filas': (g) => g.setRows(4),
      'cambio de columnas': (g) => g.setCols(4),
    };

    for (const ignoreClear of [false, true]) {
      for (const [name, action] of Object.entries(reset)) {
        it(`CA-19 ${name} cancela la jugada (clearTimeout ${ignoreClear ? 'inoperante' : 'normal'})`, () => {
          for (const at of moments) {
            const { game, scheduler } = setup({ random: 0, ignoreClear });
            game.click(LEGAL);
            scheduler.advance(at);
            action(game);
            const fresh = game.board();
            const rows = game.rows();
            const cols = game.cols();
            expect(fresh).toEqual(createBoard(rows, cols));
            scheduler.advance(10000);
            expect(game.board()).toEqual(createBoard(rows, cols));
            expect(game.turn()).toBe('user');
            expect(game.flash()).toBeNull();
          }
        });
      }
    }

    it('CA-19 tras cancelar, el mensaje es el del reinicio y no el de la jugada cancelada', () => {
      const { game, scheduler } = setup();
      game.click(LEGAL);
      scheduler.advance(1200);
      game.newGame();
      expect(scheduler.pending).toBe(0); // los temporizadores cancelados se liberan
      scheduler.advance(10000);
      expect(game.message()).toEqual({ key: 'begin' });
    });
  });

  describe('resaltado', () => {
    it('CA-20 se resalta solo la casilla vacía que es jugada legal del usuario', () => {
      const { game } = setup();
      game.pointerAt(LEGAL);
      expect(game.highlight()).toEqual(LEGAL);
      game.pointerAt(OCCUPIED);
      expect(game.highlight()).toBeNull();
      game.pointerAt(NO_FLIPS);
      expect(game.highlight()).toBeNull();
    });

    it('CA-20 desaparece al cambiar de casilla y al salir del tablero', () => {
      const { game } = setup();
      game.pointerAt(LEGAL);
      game.pointerAt({ row: 1, col: 4 });
      expect(game.highlight()).toEqual({ row: 1, col: 4 });
      game.pointerAt(NO_FLIPS);
      expect(game.highlight()).toBeNull();
      game.pointerAt(LEGAL);
      game.pointerAt(null); // el cursor sale del tablero
      expect(game.highlight()).toBeNull();
    });

    it('CA-20 no hay resaltado fuera del turno del usuario', () => {
      const { game } = setup();
      game.pointerAt({ row: 1, col: 4 });
      expect(game.highlight()).toEqual({ row: 1, col: 4 });
      game.skipTurn();
      expect(game.highlight()).toBeNull();
      game.pointerAt({ row: 3, col: 6 });
      expect(game.highlight()).toBeNull();
    });

    it('CA-20 no hay resaltado con la partida terminada', () => {
      const { game } = setup();
      game.setRows(2);
      game.setCols(2);
      game.pointerAt({ row: 0, col: 0 });
      expect(game.highlight()).toBeNull();
    });
  });

  describe('dificultad', () => {
    // Computadora: (0,0) voltea 2 y (2,0) voltea 1. Medium elige (0,0); Easy con azar 0.99, (2,0).
    const board = ['.uuc.', '.....', '.uc..'];

    it('CA-21 cambiar la dificultad no reinicia la partida', () => {
      const { game } = setup();
      game.click(LEGAL);
      const before = game.board();
      game.setLevel('easy');
      expect(game.level()).toBe('easy');
      expect(game.board()).toEqual(before);
      expect(game.turn()).toBe('computer');
      expect(game.message().key).toBe('userMove');
    });

    it('CA-21 se aplica desde la siguiente jugada de la computadora', () => {
      const medium = setup({ factory: fixedBoard(board), random: 0.99 });
      medium.game.skipTurn();
      expect(medium.game.message()).toEqual({
        key: 'computerMove',
        params: { row: 1, col: 1, count: 2 },
      });

      const easy = setup({ factory: fixedBoard(board), random: 0.99 });
      easy.game.setLevel('easy' as Level);
      easy.game.skipTurn();
      expect(easy.game.message()).toEqual({
        key: 'computerMove',
        params: { row: 3, col: 1, count: 1 },
      });
    });
  });

  describe('inicio y reinicios', () => {
    it('CA-22 New Game muestra las instrucciones, reinicia y conserva tamaño y dificultad', () => {
      const { game } = setup();
      game.setLevel('easy');
      game.setRows(8);
      game.click({ row: 3, col: 3 }); // jugada legal en el tablero de 8x10
      game.newGame();
      expect(game.message()).toEqual({ key: 'begin' });
      expect(game.board()).toEqual(createBoard(8, 10));
      expect(game.level()).toBe('easy');
      expect(game.rows()).toBe(8);
      expect(game.turn()).toBe('user');
    });

    it('CA-22 cambiar filas o columnas reinicia y muestra el mensaje de nuevo tamaño', () => {
      const { game } = setup();
      game.setRows(8);
      expect(game.message()).toEqual({ key: 'newBoard', params: { rows: 8, cols: 10 } });
      expect(game.board()).toEqual(createBoard(8, 10));
      game.setCols(12);
      expect(game.message()).toEqual({ key: 'newBoard', params: { rows: 8, cols: 12 } });
      expect(game.board()).toEqual(createBoard(8, 12));
      expect(game.turn()).toBe('user');
    });

    it('CA-22 un tablero de 2x2 arranca terminado y su resultado reemplaza al mensaje', () => {
      const { game } = setup();
      game.setRows(2);
      expect(game.message().key).toBe('newBoard');
      expect(game.turn()).toBe('user');
      game.setCols(2);
      expect(game.turn()).toBe('over');
      expect(game.message().key).toBe('endTie');
    });
  });

  describe('partidas completas simuladas', () => {
    const sizes: [number, number][] = [
      [4, 4],
      [6, 6],
      [8, 8],
      [4, 10],
    ];

    for (const level of ['easy', 'medium'] as Level[]) {
      for (const [rows, cols] of sizes) {
        it(`CA-23 ${rows}x${cols} en ${level}: jugadas legales, el usuario mueve primero y la partida termina`, () => {
          for (let seed = 1; seed <= 6; seed++) {
            const { game, scheduler } = setup({ randomFn: seeded(seed * 97 + rows * 7 + cols) });
            game.setRows(rows);
            game.setCols(cols);
            game.setLevel(level);
            expect(game.turn()).toBe('user'); // el usuario siempre mueve primero

            let lastChecked: unknown = null;
            let steps = 0;
            while (game.turn() !== 'over') {
              expect(steps++).toBeLessThan(20000);
              if (game.turn() === 'user') {
                const moves = legalMoves(game.board(), 'user');
                if (moves.length === 0) {
                  game.skipTurn();
                } else {
                  game.click({ row: moves[0].row, col: moves[0].col });
                }
              } else {
                const message = game.message();
                if (message.key === 'computerMove' && message !== lastChecked) {
                  lastChecked = message;
                  const p = message.params!;
                  const legal = legalMoves(game.board(), 'computer');
                  expect(
                    legal.some(
                      (m) =>
                        m.row === p['row'] - 1 && m.col === p['col'] - 1 && m.flips === p['count'],
                    ),
                  ).toBe(true); // la computadora solo juega jugadas legales
                }
                scheduler.advance(100);
              }
            }
            const { computer, user } = countPieces(game.board());
            const message = game.message();
            expect(['endComputerWins', 'endUserWins', 'endTie']).toContain(message.key);
            if (message.key === 'endTie') {
              expect(computer).toBe(user);
              expect(message.params).toEqual({ count: computer });
            } else if (message.key === 'endUserWins') {
              expect(message.params).toEqual({ user, comp: computer });
              expect(user).toBeGreaterThan(computer);
            } else {
              expect(message.params).toEqual({ comp: computer, user });
              expect(computer).toBeGreaterThan(user);
            }
          }
        });
      }
    }
  });
});
