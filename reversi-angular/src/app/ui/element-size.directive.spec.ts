/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElementSizeDirective } from './element-size.directive';
import { StubResizeObserver } from './test-utils';

@Component({
  imports: [ElementSizeDirective],
  template: `<div appElementSize #area="appElementSize"></div>
    <span id="out">{{ area.size().width }}x{{ area.size().height }}</span>`,
})
class HostComponent {}

describe('element-size', () => {
  beforeEach(() => {
    StubResizeObserver.reset();
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const out = (fixture: { nativeElement: HTMLElement }) =>
    (fixture.nativeElement.querySelector('#out') as HTMLElement).textContent;

  it('CA-27 mide el contenedor al iniciar y cada vez que cambia de tamaño', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(out(fixture)).toBe('0x0');

    StubResizeObserver.trigger(300, 200);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(out(fixture)).toBe('300x200');

    StubResizeObserver.trigger(500, 100);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(out(fixture)).toBe('500x100');
  });

  it('CA-27 deja de observar al destruirse el componente', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(StubResizeObserver.instances.length).toBe(1);
    expect(StubResizeObserver.instances[0].observing).toBe(true);
    fixture.destroy();
    expect(StubResizeObserver.instances[0].observing).toBe(false);
  });
});
