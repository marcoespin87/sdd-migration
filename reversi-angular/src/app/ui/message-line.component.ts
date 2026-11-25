/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, input } from '@angular/core';
import { TextRef } from './message-text';

// Esqueleto (CA-24): la linea de mensaje esta por implementar.
@Component({ selector: 'app-message-line', template: '' })
export class MessageLineComponent {
  readonly text = input.required<TextRef>();
}
