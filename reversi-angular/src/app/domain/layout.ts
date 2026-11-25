/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Position } from './types';

/** Pixeles vacios alrededor del tablero. */
const CANVAS_BORDER = 10;

export interface BoardLayout {
  /** Grosor de las lineas de la cuadricula (2 % del paso, minimo 1 px). */
  readonly gridLine: number;
  /** Paso de una casilla: ficha, bordes interiores y una linea de cuadricula. */
  readonly gridStep: number;
  /** Borde interior de cada casilla (7 % del paso, minimo 2 px). */
  readonly innerBorder: number;
  /** Tamano de la ficha (minimo 10 px). */
  readonly symbolSize: number;
  readonly leftMargin: number;
  readonly topMargin: number;
  /** Radio de las esquinas redondeadas de la ficha (65 % del paso). */
  readonly cornerRadius: number;
  /** Columnas que no caben en el ancho disponible, o null si caben. */
  readonly tooNarrowColumns: number | null;
  /** Filas que no caben en el alto disponible, o null si caben. */
  readonly tooShortRows: number | null;
}

/** Division entera con truncamiento hacia cero, como en Java. */
function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

/**
 * Calcula el layout del tablero con las mismas formulas del legacy (aritmetica entera): casillas
 * cuadradas, tablero centrado, proporciones y minimos. Si no cabe, informa las columnas o filas que
 * no caben y calcula igualmente el tamano minimo.
 */
export function computeLayout(
  width: number,
  height: number,
  rows: number,
  cols: number,
): BoardLayout {
  const boardWidth = Math.max(width - 2 * CANVAS_BORDER, 0);
  const boardHeight = Math.max(height - 2 * CANVAS_BORDER, 0);

  // Primera estimacion del paso, para el grosor de linea.
  let step = Math.min(div(boardWidth, cols), div(boardHeight, rows));
  const gridLine = Math.max(Math.trunc(step * 0.02), 1);

  // Segunda estimacion, descontando una linea.
  step = Math.min(div(boardWidth - gridLine, cols), div(boardHeight - gridLine, rows));
  const innerBorder = Math.max(Math.trunc(step * 0.07), 2);
  const symbolSize = Math.max(step - gridLine - 2 * innerBorder, 10);
  step = symbolSize + 2 * innerBorder + gridLine;

  // Margenes para centrar el tablero.
  let horizontal = div(boardWidth - gridLine - cols * step, 2);
  let tooNarrowColumns: number | null = null;
  if (horizontal < 0) {
    tooNarrowColumns = cols;
    horizontal = 0;
  }
  let vertical = div(boardHeight - gridLine - rows * step, 2);
  let tooShortRows: number | null = null;
  if (vertical < 0) {
    tooShortRows = rows;
    vertical = 0;
  }

  return {
    gridLine,
    gridStep: step,
    innerBorder,
    symbolSize,
    leftMargin: CANVAS_BORDER + horizontal,
    topMargin: CANVAS_BORDER + vertical,
    cornerRadius: Math.trunc(step * 0.65),
    tooNarrowColumns,
    tooShortRows,
  };
}

/**
 * Casilla bajo un punto (x, y) del tablero, o null si el punto no cae dentro de la ficha dibujada:
 * el borde interior, las lineas de la cuadricula y el exterior no cuentan.
 */
export function hitTest(
  layout: BoardLayout,
  rows: number,
  cols: number,
  x: number,
  y: number,
): Position | null {
  const px = x - layout.leftMargin - layout.gridLine;
  const col = div(px, layout.gridStep);
  const colExtra = px % layout.gridStep;
  const py = y - layout.topMargin - layout.gridLine;
  const row = div(py, layout.gridStep);
  const rowExtra = py % layout.gridStep;
  const limit = layout.innerBorder + layout.symbolSize;

  if (
    col < 0 ||
    col >= cols ||
    colExtra < layout.innerBorder ||
    colExtra > limit ||
    row < 0 ||
    row >= rows ||
    rowExtra < layout.innerBorder ||
    rowExtra > limit
  ) {
    return null;
  }
  return { row, col };
}
