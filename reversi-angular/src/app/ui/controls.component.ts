/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ALLOWED_SIZES, LEVELS } from '../domain/board';
import { Level } from '../domain/types';
import { GameService } from '../game/game.service';
import { LANGUAGES } from '../i18n/languages';

/** Dificultad, filas, columnas, los botones New Game y Skip Turn y el selector de idioma. */
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
      <select id="lang" [attr.aria-label]="'ui.language' | transloco" (change)="onLang($event)">
        @for (language of languages; track language.code) {
          <option [value]="language.code" [selected]="language.code === activeLang()">
            {{ language.label | transloco }}
          </option>
        }
      </select>
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
  protected readonly languages = LANGUAGES;

  private readonly transloco = inject(TranslocoService);
  protected readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  protected onLevel(event: Event): void {
    this.game.setLevel((event.target as HTMLSelectElement).value as Level);
  }

  /** Cambia el idioma de todos los textos al instante; no toca la partida. */
  protected onLang(event: Event): void {
    this.transloco.setActiveLang((event.target as HTMLSelectElement).value);
  }

  protected onRows(event: Event): void {
    this.game.setRows(Number((event.target as HTMLSelectElement).value));
  }

  protected onCols(event: Event): void {
    this.game.setCols(Number((event.target as HTMLSelectElement).value));
  }
}
