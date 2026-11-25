/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

/** Claves del catalogo de textos (ver el plan de migracion). El servicio nunca produce texto. */
export type MessageKey =
  | 'credits'
  | 'begin'
  | 'mustSkip'
  | 'skipNotYourTurn'
  | 'skipNoGame'
  | 'gameFinished'
  | 'notYourTurn'
  | 'clickPosition'
  | 'occupied'
  | 'invalidMove'
  | 'userMove'
  | 'computerMove'
  | 'newBoard'
  | 'computerCantMove'
  | 'endComputerWins'
  | 'endUserWins'
  | 'endTie';

export interface GameMessage {
  readonly key: MessageKey;
  /** Parametros del texto; las cantidades que admiten plural usan `count`. */
  readonly params?: Readonly<Record<string, number>>;
}
