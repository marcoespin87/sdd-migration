/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Directive, signal } from '@angular/core';

// Esqueleto (CA-27): la medicion con ResizeObserver esta por implementar.
@Directive({ selector: '[appElementSize]', exportAs: 'appElementSize' })
export class ElementSizeDirective {
  readonly size = signal({ width: 0, height: 0 }).asReadonly();
}
