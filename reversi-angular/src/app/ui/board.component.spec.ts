/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computeLayout } from '../domain/layout';
import { BoardComponent } from './board.component';
import { COLORS } from './colors';
import { configureUi } from './test-utils';

// 700x500 con 6x10: línea 1, paso 67, borde interior 4, ficha 58, márgenes 14 y 48, esquina 43.
// La ficha de la casilla (fila, columna) ocupa x = 19 + 67*col .. +58 e y = 53 + 67*fila .. +58.
async function render(width = 700, height = 500) {
  const { game, scheduler } = configureUi();
  const fixture = TestBed.createComponent(BoardComponent);
  fixture.componentRef.setInput('width', width);
  fixture.componentRef.setInput('height', height);
  await settle(fixture);
  return { fixture, game, scheduler };
}

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
}

const surface = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement.querySelector('.board') as HTMLElement;
const cell = (fixture: ComponentFixture<unknown>, row: number, col: number) =>
  fixture.nativeElement.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
const mouse = (type: string, x: number, y: number) =>
  new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });

describe('board', () => {
  it('CA-25 muestra filas × columnas casillas y las líneas de la cuadrícula', async () => {
    const { fixture } = await render();
    expect(fixture.nativeElement.querySelectorAll('.cell').length).toBe(60);
    expect(fixture.nativeElement.querySelectorAll('.line.vertical').length).toBe(11);
    expect(fixture.nativeElement.querySelectorAll('.line.horizontal').length).toBe(7);
    expect(surface(fixture).style.backgroundColor).toBe(COLORS.background);
    const line = fixture.nativeElement.querySelector('.line.vertical') as HTMLElement;
    expect(line.style.backgroundColor).toBe(COLORS.gridLine);
    expect(line.style.width).toBe('1px');
  });

  it('CA-25 pinta cada ficha con el color de su estado', async () => {
    const { fixture } = await render();
    // Posición inicial 6x10: computadora en (2,4) y (3,5); usuario en (2,5) y (3,4).
    expect(cell(fixture, 2, 4).style.backgroundColor).toBe(COLORS.computer);
    expect(cell(fixture, 3, 5).style.backgroundColor).toBe(COLORS.computer);
    expect(cell(fixture, 2, 5).style.backgroundColor).toBe(COLORS.user);
    expect(cell(fixture, 3, 4).style.backgroundColor).toBe(COLORS.user);
    expect(cell(fixture, 0, 0).style.backgroundColor).toBe(COLORS.background);
  });

  it('CA-25 las fichas son cuadrados de esquinas redondeadas ubicados con el layout del dominio', async () => {
    const { fixture } = await render();
    const c = cell(fixture, 2, 4);
    expect(c.style.width).toBe('58px');
    expect(c.style.height).toBe('58px');
    expect(c.style.borderRadius).toBe('43px');
    expect(c.style.left).toBe('287px'); // 14 + 1 + 4 + 4*67
    expect(c.style.top).toBe('187px'); // 48 + 1 + 4 + 2*67
  });

  it('CA-25 la casilla resaltada y la que parpadea se pintan de azul', async () => {
    const { fixture, game, scheduler } = await render();
    game.pointerAt({ row: 2, col: 3 });
    await settle(fixture);
    expect(cell(fixture, 2, 3).style.backgroundColor).toBe(COLORS.highlight);

    game.pointerAt(null);
    game.skipTurn(); // la computadora muestra su jugada y su casilla parpadea
    await settle(fixture);
    const target = game.flash()!;
    expect(cell(fixture, target.row, target.col).style.backgroundColor).toBe(COLORS.highlight);
    scheduler.advance(600);
    await settle(fixture);
    expect(cell(fixture, target.row, target.col).style.backgroundColor).toBe(COLORS.background);
  });

  it('CA-26 el movimiento del mouse sobre una ficha legal resalta esa casilla', async () => {
    const { fixture, game } = await render();
    surface(fixture).dispatchEvent(mouse('mousemove', 230, 200));
    expect(game.highlight()).toEqual({ row: 2, col: 3 });
    surface(fixture).dispatchEvent(mouse('mousemove', 297, 200)); // casilla ocupada (2,4)
    expect(game.highlight()).toBeNull();
  });

  it('CA-26 al salir el cursor del tablero desaparece el resaltado', async () => {
    const { fixture, game } = await render();
    surface(fixture).dispatchEvent(mouse('mousemove', 230, 200));
    expect(game.highlight()).not.toBeNull();
    surface(fixture).dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    expect(game.highlight()).toBeNull();
  });

  it('CA-26 un clic sobre una ficha legal juega esa casilla', async () => {
    const { fixture, game } = await render();
    surface(fixture).dispatchEvent(mouse('click', 230, 200));
    expect(game.message()).toEqual({ key: 'userMove', params: { row: 3, col: 4, count: 1 } });
    expect(game.board()[2][3]).toBe('user');
  });

  it('CA-26 un clic en el borde interior, en una línea o fuera del tablero pide hacer clic en una casilla', async () => {
    const { fixture, game } = await render();
    for (const [x, y] of [
      [218, 200], // borde interior izquierdo de la casilla (2,3)
      [14, 200], // línea de la cuadrícula
      [5, 5], // fuera del tablero
    ]) {
      surface(fixture).dispatchEvent(mouse('click', x, y));
      expect(game.message()).toEqual({ key: 'clickPosition' });
      expect(game.turn()).toBe('user');
    }
  });

  it('CA-26 las coordenadas del mouse se toman relativas al tablero, no a la página', async () => {
    const { fixture, game } = await render();
    Object.defineProperty(surface(fixture), 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 50, right: 800, bottom: 550, width: 700, height: 500 }),
    });
    surface(fixture).dispatchEvent(mouse('mousemove', 330, 250)); // equivale a (230, 200)
    expect(game.highlight()).toEqual({ row: 2, col: 3 });
  });

  it('CA-27 al cambiar el tamaño disponible el tablero se recalcula con el layout del dominio', async () => {
    const { fixture } = await render();
    const board = fixture.componentInstance as BoardComponent;
    expect(board.layout()).toEqual(computeLayout(700, 500, 6, 10));
    fixture.componentRef.setInput('width', 1500);
    fixture.componentRef.setInput('height', 1000);
    await settle(fixture);
    expect(board.layout()).toEqual(computeLayout(1500, 1000, 6, 10));
    expect(cell(fixture, 2, 4).style.width).toBe('125px');
    expect(surface(fixture).style.width).toBe('1500px');
    expect(surface(fixture).style.height).toBe('1000px');
  });

  it('CA-27 al cambiar las filas del juego el tablero cambia de cantidad de casillas', async () => {
    const { fixture, game } = await render();
    game.setRows(8);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('.cell').length).toBe(80);
    expect(fixture.nativeElement.querySelectorAll('.line.horizontal').length).toBe(9);
  });
});
