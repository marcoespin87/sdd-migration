/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { computeLayout, hitTest } from './layout';

describe('layout', () => {
  // 700x500 con 6 filas x 10 columnas (valores calculados a mano con las fórmulas del spec).
  const standard = () => computeLayout(700, 500, 6, 10);

  it('CA-10 proporciones: 700x500 con 6x10', () => {
    expect(standard()).toEqual({
      gridLine: 1,
      gridStep: 67,
      innerBorder: 4,
      symbolSize: 58,
      leftMargin: 14,
      topMargin: 48,
      cornerRadius: 43,
      tooNarrowColumns: null,
      tooShortRows: null,
    });
  });

  it('CA-10 proporciones: 300x200 con 2x2 (casillas cuadradas y centradas)', () => {
    expect(computeLayout(300, 200, 2, 2)).toEqual({
      gridLine: 1,
      gridStep: 89,
      innerBorder: 6,
      symbolSize: 76,
      leftMargin: 60,
      topMargin: 10,
      cornerRadius: 57,
      tooNarrowColumns: null,
      tooShortRows: null,
    });
  });

  it('CA-10 proporciones: aplica los mínimos de línea (1 px), borde interior (2 px) y ficha (10 px)', () => {
    const layout = computeLayout(100, 100, 24, 24);
    expect(layout.gridLine).toBe(1);
    expect(layout.innerBorder).toBe(2);
    expect(layout.symbolSize).toBe(10);
    expect(layout.gridStep).toBe(15);
    expect(layout.leftMargin).toBe(10);
    expect(layout.topMargin).toBe(10);
  });

  it('CA-11 hit-test: solo cuenta el clic dentro de la ficha dibujada', () => {
    // Celda (0,0): la ficha va de x=19 a 77 y de y=53 a 111 (ambos inclusive).
    expect(hitTest(standard(), 6, 10, 19, 53)).toEqual({ row: 0, col: 0 });
    expect(hitTest(standard(), 6, 10, 77, 111)).toEqual({ row: 0, col: 0 });
    expect(hitTest(standard(), 6, 10, 48, 82)).toEqual({ row: 0, col: 0 });
    expect(hitTest(standard(), 6, 10, 622, 388)).toEqual({ row: 5, col: 9 });
  });

  it('CA-11 hit-test: el borde interior, las líneas y el exterior no son casilla', () => {
    expect(hitTest(standard(), 6, 10, 18, 82)).toBeNull(); // borde interior izquierdo
    expect(hitTest(standard(), 6, 10, 78, 82)).toBeNull(); // borde interior derecho
    expect(hitTest(standard(), 6, 10, 48, 52)).toBeNull(); // borde interior superior
    expect(hitTest(standard(), 6, 10, 14, 82)).toBeNull(); // línea de cuadrícula
    expect(hitTest(standard(), 6, 10, 5, 5)).toBeNull(); // fuera del tablero
    expect(hitTest(standard(), 6, 10, 690, 82)).toBeNull(); // pasada la última columna
    expect(hitTest(standard(), 6, 10, 48, 460)).toBeNull(); // pasada la última fila
  });

  it('CA-12 espacio insuficiente: informa columnas y filas que no caben y calcula igual el mínimo', () => {
    const tiny = computeLayout(100, 100, 24, 24);
    expect(tiny.tooNarrowColumns).toBe(24);
    expect(tiny.tooShortRows).toBe(24);
    expect(computeLayout(120, 1000, 2, 24).tooNarrowColumns).toBe(24);
    expect(computeLayout(120, 1000, 2, 24).tooShortRows).toBeNull();
    expect(computeLayout(1000, 60, 24, 2).tooShortRows).toBe(24);
    expect(computeLayout(1000, 60, 24, 2).tooNarrowColumns).toBeNull();
  });

  it('CA-12 espacio insuficiente: con espacio suficiente no informa nada', () => {
    expect(standard().tooNarrowColumns).toBeNull();
    expect(standard().tooShortRows).toBeNull();
  });
});
