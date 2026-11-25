/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ALLOWED_SIZES, LEVELS } from '../domain/board';
import { Level } from '../domain/types';
import { GameService } from '../game/game.service';

/** Dificultad, filas, columnas y los botones New Game y Skip Turn. */
@Component({
  selector: 'app-controls',
  imports: [TranslocoPipe],
  template: `
    <div class="controls">
      <select id="level" [attr.aria-label]="'ui.level' | transloco" (change)="onLevel($event)">
        @for (level of levels; track level) {
          <option [value]="level" [selected]="level === game.level()">
            {{ 'ui.' + level | transloco }}
          </option>
        }
      </select>
      <label for="rows">{{ 'ui.rows' | transloco }}</label>
      <select id="rows" (change)="onRows($event)">
        @for (size of sizes; track size) {
          <option [value]="size" [selected]="size === game.rows()">{{ size }}</option>
        }
      </select>
      <label for="cols">{{ 'ui.columns' | transloco }}</label>
      <select id="cols" (change)="onCols($event)">
        @for (size of sizes; track size) {
          <option [value]="size" [selected]="size === game.cols()">{{ size }}</option>
        }
      </select>
      <button type="button" class="new-game" (click)="game.newGame()">
        {{ 'ui.newGame' | transloco }}
      </button>
      <button type="button" class="skip-turn" (click)="game.skipTurn()">
        {{ 'ui.skipTurn' | transloco }}
      </button>
    </div>
  `,
  styles: `
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px 14px;
      padding: 5px 10px;
      font: 14px sans-serif;
    }
  `,
})
export class ControlsComponent {
  protected readonly game = inject(GameService);
  protected readonly sizes = ALLOWED_SIZES;
  protected readonly levels = LEVELS;

  protected onLevel(event: Event): void {
    this.game.setLevel((event.target as HTMLSelectElement).value as Level);
  }

  protected onRows(event: Event): void {
    this.game.setRows(Number((event.target as HTMLSelectElement).value));
  }

  protected onCols(event: Event): void {
    this.game.setCols(Number((event.target as HTMLSelectElement).value));
  }
}
