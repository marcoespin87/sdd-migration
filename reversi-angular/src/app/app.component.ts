/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, computed, inject, viewChild } from '@angular/core';
import { GameService } from './game/game.service';
import { BoardComponent } from './ui/board.component';
import { COLORS } from './ui/colors';
import { ControlsComponent } from './ui/controls.component';
import { ElementSizeDirective } from './ui/element-size.directive';
import { MessageLineComponent } from './ui/message-line.component';
import { lineText, windowWarning } from './ui/message-text';

/** Pantalla del juego: controles, linea de mensaje y tablero, que ocupa el resto del espacio. */
@Component({
  selector: 'app-root',
  imports: [BoardComponent, ControlsComponent, ElementSizeDirective, MessageLineComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class App {
  private readonly game = inject(GameService);
  private readonly area = viewChild(ElementSizeDirective);
  private readonly board = viewChild(BoardComponent);

  protected readonly colors = COLORS;

  /**
   * Texto de la linea de mensaje. El aviso de ventana sin espacio tiene prioridad sobre el mensaje del
   * juego, pero solo una vez medido el contenedor: antes de la primera medicion (0 x 0) no se avisa.
   */
  protected readonly line = computed(() => {
    const size = this.area()?.size();
    const layout = this.board()?.layout();
    const measured = size !== undefined && size.width > 0 && size.height > 0;
    const warning = measured && layout ? windowWarning(layout) : null;
    return lineText(this.game.message(), warning);
  });
}
