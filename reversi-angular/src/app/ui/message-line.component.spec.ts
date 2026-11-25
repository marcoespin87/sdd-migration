/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { TestBed } from '@angular/core/testing';
import { MessageLineComponent } from './message-line.component';
import { configureUi } from './test-utils';

async function render(text: { key: string; params: Record<string, number> }) {
  configureUi();
  const fixture = TestBed.createComponent(MessageLineComponent);
  fixture.componentRef.setInput('text', text);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('message-line', () => {
  it('CA-24 muestra el texto del catálogo en inglés, con sus dobles espacios', async () => {
    const fixture = await render({ key: 'credits', params: {} });
    const line = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(line.getAttribute('role')).toBe('status');
    expect(line.textContent).toBe(
      'Reversi or Othello.  Copyright (c) 2004 by Keith Fenske.  GNU Public License.',
    );
  });

  it('CA-24 sustituye los parámetros y elige la forma plural', async () => {
    const fixture = await render({ key: 'userMove.other', params: { row: 3, col: 4, count: 2 } });
    const line = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(line.textContent).toBe('Your move is row 3 and column 4 with 2 reverses.');
    fixture.componentRef.setInput('text', {
      key: 'computerMove.one',
      params: { row: 1, col: 2, count: 1 },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(line.textContent).toBe(
      "Computer's move is row 1 and column 2 with one reversed position.",
    );
  });
});
