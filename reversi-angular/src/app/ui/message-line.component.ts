/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TextRef } from './message-text';

/** Linea de mensaje: un texto del catalogo con sus parametros. */
@Component({
  selector: 'app-message-line',
  imports: [TranslocoPipe],
  template: `<p class="message" role="status">{{ text().key | transloco: text().params }}</p>`,
  styles: `
    .message {
      margin: 0;
      padding: 5px 10px;
      min-height: 1.4em;
      text-align: center;
      font: 14px sans-serif;
      white-space: pre-wrap;
    }
  `,
})
export class MessageLineComponent {
  readonly text = input.required<TextRef>();
}
