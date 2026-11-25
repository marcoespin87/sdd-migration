/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, computed, input } from '@angular/core';
import { BoardLayout, computeLayout } from '../domain/layout';

// Esqueleto (CA-25 a CA-27): el pintado y el mouse estan por implementar.
@Component({ selector: 'app-board', template: '' })
export class BoardComponent {
  readonly width = input(0);
  readonly height = input(0);
  readonly layout = computed<BoardLayout>(() => computeLayout(1, 1, 1, 1));
}
