/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { BoardLayout } from '../domain/layout';
import { GameMessage } from '../game/messages';

/** Clave del catalogo de textos y sus parametros. */
export interface TextRef {
  readonly key: string;
  readonly params: Readonly<Record<string, number>>;
}

// Esqueleto (CA-24, CA-27): comportamiento por implementar.
export function toText(_message: GameMessage): TextRef {
  throw new Error('no implementado');
}

export function windowWarning(_layout: BoardLayout): TextRef | null {
  throw new Error('no implementado');
}

export function lineText(_message: GameMessage, _warning: TextRef | null): TextRef {
  throw new Error('no implementado');
}
