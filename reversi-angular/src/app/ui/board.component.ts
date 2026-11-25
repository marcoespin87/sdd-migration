/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Component, computed, inject, input } from '@angular/core';
import { BoardLayout, computeLayout, hitTest } from '../domain/layout';
import { Cell, Position } from '../domain/types';
import { GameService } from '../game/game.service';
import { COLORS } from './colors';

interface CellView {
  readonly row: number;
  readonly col: number;
  readonly left: number;
  readonly top: number;
  readonly color: string;
}

function colorOf(cell: Cell): string {
  return cell === 'user' ? COLORS.user : cell === 'computer' ? COLORS.computer : COLORS.background;
}

function same(a: Position | null, row: number, col: number): boolean {
  return a !== null && a.row === row && a.col === col;
}

/**
 * Tablero: lineas de la cuadricula y una ficha por casilla, ubicadas con el layout del dominio. Traduce
 * el mouse a casillas con `hitTest` y se lo avisa al servicio de la partida. Recibe el espacio
 * disponible en pixeles; quien lo usa decide como medirlo.
 */
@Component({
  selector: 'app-board',
  template: `
    <div
      class="board"
      [style.width.px]="width()"
      [style.height.px]="height()"
      [style.background-color]="colors.background"
      (mousemove)="onMove($event)"
      (mouseleave)="onLeave()"
      (click)="onClick($event)"
    >
      @for (x of verticalLines(); track $index) {
        <div
          class="line vertical"
          [style.left.px]="x"
          [style.top.px]="layout().topMargin"
          [style.width.px]="layout().gridLine"
          [style.height.px]="linesHeight()"
          [style.background-color]="colors.gridLine"
        ></div>
      }
      @for (y of horizontalLines(); track $index) {
        <div
          class="line horizontal"
          [style.left.px]="layout().leftMargin"
          [style.top.px]="y"
          [style.width.px]="linesWidth()"
          [style.height.px]="layout().gridLine"
          [style.background-color]="colors.gridLine"
        ></div>
      }
      @for (cell of cells(); track cell.row * 100 + cell.col) {
        <div
          class="cell"
          [attr.data-row]="cell.row"
          [attr.data-col]="cell.col"
          [style.left.px]="cell.left"
          [style.top.px]="cell.top"
          [style.width.px]="layout().symbolSize"
          [style.height.px]="layout().symbolSize"
          [style.border-radius.px]="layout().cornerArc / 2"
          [style.background-color]="cell.color"
        ></div>
      }
    </div>
  `,
  styles: `
    .board {
      position: relative;
      overflow: hidden;
    }
    .line,
    .cell {
      position: absolute;
    }
  `,
})
export class BoardComponent {
  private readonly game = inject(GameService);
  protected readonly colors = COLORS;

  /** Espacio disponible, en pixeles. */
  readonly width = input(0);
  readonly height = input(0);

  private readonly rows = computed(() => this.game.board().length);
  private readonly cols = computed(() => this.game.board()[0]?.length ?? 0);

  /** Layout del tablero para el espacio disponible; `tooShortRows` y `tooNarrowColumns` avisan si no cabe. */
  readonly layout = computed<BoardLayout>(() =>
    computeLayout(this.width(), this.height(), this.rows(), this.cols()),
  );

  protected readonly verticalLines = computed(() => {
    const { leftMargin, gridStep } = this.layout();
    return Array.from({ length: this.cols() + 1 }, (_, i) => leftMargin + i * gridStep);
  });

  protected readonly horizontalLines = computed(() => {
    const { topMargin, gridStep } = this.layout();
    return Array.from({ length: this.rows() + 1 }, (_, i) => topMargin + i * gridStep);
  });

  protected readonly linesHeight = computed(
    () => this.rows() * this.layout().gridStep + this.layout().gridLine,
  );
  protected readonly linesWidth = computed(
    () => this.cols() * this.layout().gridStep + this.layout().gridLine,
  );

  protected readonly cells = computed<CellView[]>(() => {
    const board = this.game.board();
    const { leftMargin, topMargin, gridLine, innerBorder, gridStep } = this.layout();
    const highlight = this.game.highlight();
    const flash = this.game.flash();
    const views: CellView[] = [];
    board.forEach((line, row) =>
      line.forEach((cell, col) => {
        views.push({
          row,
          col,
          left: leftMargin + gridLine + innerBorder + col * gridStep,
          top: topMargin + gridLine + innerBorder + row * gridStep,
          color:
            same(highlight, row, col) || same(flash, row, col) ? COLORS.highlight : colorOf(cell),
        });
      }),
    );
    return views;
  });

  protected onMove(event: MouseEvent): void {
    this.game.pointerAt(this.cellAt(event));
  }

  protected onLeave(): void {
    this.game.pointerAt(null);
  }

  protected onClick(event: MouseEvent): void {
    this.game.click(this.cellAt(event));
  }

  /** Casilla bajo el mouse, con las coordenadas relativas al tablero y no a la pagina. */
  private cellAt(event: MouseEvent): Position | null {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return hitTest(
      this.layout(),
      this.rows(),
      this.cols(),
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }
}
