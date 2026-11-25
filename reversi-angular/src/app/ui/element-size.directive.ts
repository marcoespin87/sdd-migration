/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { DestroyRef, Directive, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/** Mide el elemento en pixeles al iniciar y cada vez que cambia de tamano (ResizeObserver). */
@Directive({ selector: '[appElementSize]', exportAs: 'appElementSize' })
export class ElementSizeDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal({ width: 0, height: 0 });

  /** Ancho y alto actuales del elemento; (0, 0) hasta la primera medicion. */
  readonly size = this.state.asReadonly();

  constructor() {
    afterNextRender(() => {
      const measure = () =>
        this.state.set({ width: this.element.clientWidth, height: this.element.clientHeight });
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(this.element);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
    });
  }
}
