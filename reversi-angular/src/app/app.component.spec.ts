/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createBoard } from './domain/board';
import en from '../../public/i18n/en.json';
import { COLORS } from './ui/colors';
import { App } from './app.component';
import { StubResizeObserver, configureUi, pseudoCatalog } from './ui/test-utils';

async function settle(fixture: ComponentFixture<unknown>) {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function render(options: Parameters<typeof configureUi>[0] = {}) {
  const { game, scheduler } = configureUi(options);
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

/** Todo el texto visible de la pantalla y el de sus atributos accesibles. */
function visibleTexts(root: HTMLElement): string[] {
  const texts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) {
      texts.push(text);
    }
  }
  for (const element of root.querySelectorAll('*')) {
    for (const attribute of ['aria-label', 'title', 'alt', 'placeholder']) {
      const value = element.getAttribute(attribute);
      if (value) {
        texts.push(value.trim());
      }
    }
  }
  return texts;
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

  it('CA-30 sin texto literal: con un catálogo sintético, todo texto visible y todo atributo sale del catálogo', async () => {
    const { root, resize } = await render({ langs: { qa: pseudoCatalog(en) }, defaultLang: 'qa' });
    await resize(700, 500);
    const texts = visibleTexts(root);
    expect(texts.length).toBeGreaterThan(20); // controles, etiquetas, opciones, mensaje y atributos
    const literals = texts.filter((t) => !/^(\d+|\[\[[\w.]+\]\])$/.test(t));
    expect(literals).toEqual([]);
    expect(texts).toContain('[[credits]]');
    expect(texts).toContain('[[ui.newGame]]');
    expect(texts).toContain('[[ui.level]]');
    expect(texts).toContain('[[ui.langEn]]'); // el selector de idioma también sale del catálogo
    expect(texts).toContain('[[ui.langEs]]');
    expect(texts).toContain('[[ui.language]]'); // aria-label del selector de idioma
    expect(document.title).toBe('[[ui.title]]'); // el título de la pestaña también sale del catálogo

    // otro estado de mensaje: el aviso de ventana también sale del catálogo
    await resize(100, 100);
    const warning = visibleTexts(root);
    expect(warning).toContain('[[tooShort]]');
    expect(warning.filter((t) => !/^(\d+|\[\[[\w.]+\]\])$/.test(t))).toEqual([]);
  });

  it('CA-31 la aplicación abre en inglés y el atributo lang del documento lo refleja', async () => {
    const { line } = await render();
    expect(line()).toBe(CREDITS);
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Reversi or Othello');
  });

  it('CA-31 cambiar de idioma traduce al instante el último mensaje sin alterar la partida en curso', async () => {
    const { fixture, game, scheduler, root, line } = await render();
    game.setLevel('easy');
    game.click({ row: 2, col: 3 }); // jugada legal: la computadora queda pensando
    await settle(fixture);
    const board = game.board();
    expect(line()).toBe('Your move is row 3 and column 4 with one reversed position.');

    const lang = root.querySelector('select#lang') as HTMLSelectElement;
    lang.value = 'es';
    lang.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(line()).toBe('Tu jugada es la fila 3 y la columna 4, con una ficha volteada.');
    expect(document.documentElement.lang).toBe('es');
    expect(document.title).toBe('Reversi u Othello'); // el título de la pestaña también se traduce
    // la partida sigue exactamente igual
    expect(game.board()).toBe(board);
    expect(game.turn()).toBe('computer');
    expect(game.level()).toBe('easy');

    // la jugada pendiente de la computadora no se cancela y se muestra ya en español
    scheduler.advance(1000);
    await settle(fixture);
    expect(line().startsWith('La jugada de la computadora es la fila')).toBe(true);
    scheduler.advance(1800);
    await settle(fixture);
    expect(game.turn()).toBe('user');

    lang.value = 'en';
    lang.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(line().startsWith("Computer's move is row")).toBe(true);
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Reversi or Othello');
  });

  it('CA-24 la pantalla tiene el fondo rosa del juego', async () => {
    const { root } = await render();
    expect((root.querySelector('main.app') as HTMLElement).style.backgroundColor).toBe(
      COLORS.background,
    );
  });

  it('CA-27 no se avisa mientras falte alguna de las dos medidas del contenedor', async () => {
    const { resize, line } = await render();
    await resize(700, 0);
    expect(line()).toBe(CREDITS);
    await resize(0, 500);
    expect(line()).toBe(CREDITS);
    await resize(100, 100);
    expect(line()).toBe('The window is too short to display 6 rows.');
  });

  it('CA-27 antes de medir el contenedor (0x0) no se muestra ningún aviso', async () => {
    const { line } = await render();
    expect(line()).toBe(CREDITS);
  });

  it('CA-29 el selector de dificultad y el de columnas responden durante el parpadeo', async () => {
    const { resize, click, game, scheduler, fixture, root, cells } = await render();
    await resize(700, 500);
    click('button.skip-turn');
    await settle(fixture);
    expect(game.turn()).toBe('computer');

    // la dificultad cambia sin cancelar la jugada pendiente
    const level = root.querySelector('select#level') as HTMLSelectElement;
    level.value = 'easy';
    level.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(game.level()).toBe('easy');
    expect(game.turn()).toBe('computer');
    scheduler.advance(1800);
    expect(game.turn()).toBe('user');

    // las columnas reinician la partida, también en pleno parpadeo
    click('button.skip-turn');
    const cols = root.querySelector('select#cols') as HTMLSelectElement;
    cols.value = '8';
    cols.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(game.cols()).toBe(8);
    expect(cells()).toBe(48);
    expect(game.turn()).toBe('user');
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
