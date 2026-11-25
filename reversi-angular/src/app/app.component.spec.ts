/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createBoard } from './domain/board';
import { App } from './app.component';
import { StubResizeObserver, configureUi } from './ui/test-utils';

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function render() {
  const { game, scheduler } = configureUi();
  const fixture = TestBed.createComponent(App);
  await settle(fixture);
  const resize = async (width: number, height: number) => {
    StubResizeObserver.trigger(width, height);
    await settle(fixture);
  };
  const root = fixture.nativeElement as HTMLElement;
  const line = () => (root.querySelector('app-message-line p') as HTMLElement).textContent;
  const cells = () => root.querySelectorAll('.cell').length;
  const click = (selector: string) => (root.querySelector(selector) as HTMLElement).click();
  return { fixture, game, scheduler, resize, line, cells, click, root };
}

const CREDITS = 'Reversi or Othello.  Copyright (c) 2004 by Keith Fenske.  GNU Public License.';

describe('App', () => {
  beforeEach(() => {
    StubResizeObserver.reset();
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CA-24 compone controles, línea de mensaje y tablero, con el mensaje de créditos al abrir', async () => {
    const { root, line, resize, cells } = await render();
    expect(root.querySelector('app-controls')).not.toBeNull();
    expect(root.querySelector('app-board')).not.toBeNull();
    expect(line()).toBe(CREDITS);
    await resize(700, 500);
    expect(cells()).toBe(60);
  });

  it('CA-27 sin espacio suficiente la línea muestra el aviso de filas, que gana al de columnas', async () => {
    const { resize, line } = await render();
    await resize(100, 100);
    expect(line()).toBe('The window is too short to display 6 rows.');
  });

  it('CA-27 si solo faltan columnas muestra el aviso de columnas', async () => {
    const { resize, line } = await render();
    await resize(120, 1000);
    expect(line()).toBe('The window is too narrow to display 10 columns.');
  });

  it('CA-27 al volver el espacio el aviso desaparece y reaparece el mensaje del juego, no una línea vacía', async () => {
    const { resize, line, game, fixture } = await render();
    await resize(700, 500);
    game.click({ row: 2, col: 3 });
    await settle(fixture);
    const played = 'Your move is row 3 and column 4 with one reversed position.';
    expect(line()).toBe(played);
    await resize(100, 100);
    expect(line()).toBe('The window is too short to display 6 rows.');
    await resize(700, 500);
    expect(line()).toBe(played);
  });

  it('CA-27 antes de medir el contenedor (0x0) no se muestra ningún aviso', async () => {
    const { line } = await render();
    expect(line()).toBe(CREDITS);
  });

  it('CA-29 Skip Turn no bloquea: durante el parpadeo responden New Game, los selectores y el clic', async () => {
    const { resize, click, game, scheduler, fixture, root, cells, line } = await render();
    await resize(700, 500);
    click('button.skip-turn');
    await settle(fixture);
    expect(game.turn()).toBe('computer');
    expect(game.flash()).not.toBeNull();

    // el clic en el tablero responde con el mensaje de espera
    const board = root.querySelector('.board') as HTMLElement;
    board.dispatchEvent(new MouseEvent('click', { clientX: 230, clientY: 200, bubbles: true }));
    expect(game.message()).toEqual({ key: 'notYourTurn' });

    // los selectores responden en pleno parpadeo
    const rows = root.querySelector('select#rows') as HTMLSelectElement;
    rows.value = '4';
    rows.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(game.rows()).toBe(4);
    expect(cells()).toBe(40);
    expect(game.turn()).toBe('user');

    // New Game cancela la jugada pendiente
    click('button.skip-turn');
    scheduler.advance(700);
    click('button.new-game');
    await settle(fixture);
    expect(line()).toBe('Click the mouse on a position of your choice.  You are the dark pieces.');
    scheduler.advance(10000);
    await settle(fixture);
    expect(game.board()).toEqual(createBoard(4, 10));
    expect(game.turn()).toBe('user');
  });
});
