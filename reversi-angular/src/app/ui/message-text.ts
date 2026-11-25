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

/** Mensajes cuyo texto depende de la cantidad de fichas volteadas. */
const WITH_PLURAL: ReadonlySet<string> = new Set(['userMove', 'computerMove']);

/**
 * Convierte un mensaje del juego en una clave del catalogo. Con cantidad, exactamente 1 volteo usa la
 * forma `one` ("one reversed position") y cualquier otra cantidad la forma `other` ("N reverses").
 */
export function toText(message: GameMessage): TextRef {
  const params = message.params ?? {};
  if (WITH_PLURAL.has(message.key)) {
    return { key: `${message.key}.${params['count'] === 1 ? 'one' : 'other'}`, params };
  }
  return { key: message.key, params };
}

/**
 * Aviso de ventana sin espacio suficiente. Si faltan filas y columnas a la vez se informa el de
 * filas, como en el legacy, donde el segundo mensaje pisaba al primero.
 */
export function windowWarning(layout: BoardLayout): TextRef | null {
  if (layout.tooShortRows !== null) {
    return { key: 'tooShort', params: { rows: layout.tooShortRows } };
  }
  if (layout.tooNarrowColumns !== null) {
    return { key: 'tooNarrow', params: { cols: layout.tooNarrowColumns } };
  }
  return null;
}

/** Texto de la linea de mensaje: el aviso tiene prioridad; sin aviso, el ultimo mensaje del juego. */
export function lineText(message: GameMessage, warning: TextRef | null): TextRef {
  return warning ?? toText(message);
}
