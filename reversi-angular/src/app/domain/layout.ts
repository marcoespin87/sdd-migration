/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Position } from './types';

export interface BoardLayout {
  readonly gridLine: number;
  readonly gridStep: number;
  readonly innerBorder: number;
  readonly symbolSize: number;
  readonly leftMargin: number;
  readonly topMargin: number;
  readonly cornerRadius: number;
  /** Columnas que no caben en el ancho disponible, o null si caben. */
  readonly tooNarrowColumns: number | null;
  /** Filas que no caben en el alto disponible, o null si caben. */
  readonly tooShortRows: number | null;
}

// Esqueleto (CA-10 a CA-12): comportamiento por implementar.
export function computeLayout(_width: number, _height: number, _rows: number, _cols: number): BoardLayout {
  throw new Error('no implementado');
}
export function hitTest(_layout: BoardLayout, _rows: number, _cols: number, _x: number, _y: number): Position | null {
  throw new Error('no implementado');
}
