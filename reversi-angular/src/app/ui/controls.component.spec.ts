/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlsComponent } from './controls.component';
import { configureUi } from './test-utils';

async function render() {
  const { game, scheduler } = configureUi();
  const fixture = TestBed.createComponent(ControlsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, game, scheduler };
}

const select = (fixture: ComponentFixture<unknown>, id: string) =>
  fixture.nativeElement.querySelector(`select#${id}`) as HTMLSelectElement;
const button = (fixture: ComponentFixture<unknown>, name: string) =>
  fixture.nativeElement.querySelector(`button.${name}`) as HTMLButtonElement;
const options = (el: HTMLSelectElement) =>
  [...el.options].map((o) => ({ value: o.value, text: (o.textContent ?? '').trim() }));

describe('controls', () => {
  it('CA-24 muestra la dificultad Easy y Medium, con Medium seleccionada', async () => {
    const { fixture } = await render();
    const level = select(fixture, 'level');
    expect(options(level)).toEqual([
      { value: 'easy', text: 'Easy' },
      { value: 'medium', text: 'Medium' },
    ]);
    expect(level.value).toBe('medium');
  });

  it('CA-24 muestra filas y columnas con los valores permitidos y sus defaults 6 y 10', async () => {
    const { fixture } = await render();
    const allowed = ['2', '4', '6', '8', '10', '12', '16', '24'];
    const rows = select(fixture, 'rows');
    const cols = select(fixture, 'cols');
    expect(options(rows).map((o) => o.value)).toEqual(allowed);
    expect(options(cols).map((o) => o.value)).toEqual(allowed);
    expect(rows.value).toBe('6');
    expect(cols.value).toBe('10');
  });

  it('CA-24 muestra los botones y las etiquetas con los textos del catálogo en inglés', async () => {
    const { fixture } = await render();
    expect((button(fixture, 'new-game').textContent ?? '').trim()).toBe('New Game');
    expect((button(fixture, 'skip-turn').textContent ?? '').trim()).toBe('Skip Turn');
    const labels = [...fixture.nativeElement.querySelectorAll('label')].map((l) =>
      ((l as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(labels.some((t) => t.startsWith('Rows:'))).toBe(true);
    expect(labels.some((t) => t.startsWith('Columns:'))).toBe(true);
  });

  it('CA-24 los selectores accionan el servicio con los valores elegidos', async () => {
    const { fixture, game } = await render();
    const rows = select(fixture, 'rows');
    rows.value = '8';
    rows.dispatchEvent(new Event('change'));
    expect(game.rows()).toBe(8);
    expect(game.message()).toEqual({ key: 'newBoard', params: { rows: 8, cols: 10 } });

    const cols = select(fixture, 'cols');
    cols.value = '12';
    cols.dispatchEvent(new Event('change'));
    expect(game.cols()).toBe(12);

    const level = select(fixture, 'level');
    level.value = 'easy';
    level.dispatchEvent(new Event('change'));
    expect(game.level()).toBe('easy');
  });

  it('CA-24 los botones New Game y Skip Turn accionan el servicio', async () => {
    const { fixture, game } = await render();
    button(fixture, 'skip-turn').click();
    expect(game.turn()).toBe('computer');
    button(fixture, 'new-game').click();
    expect(game.turn()).toBe('user');
    expect(game.message()).toEqual({ key: 'begin' });
  });
});
