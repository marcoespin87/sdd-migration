/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../../public/i18n/en.json';
import { createBoard } from '../domain/board';
import { GameService } from '../game/game.service';
import { FakeScheduler } from '../game/test-utils';
import { BOARD_FACTORY, BoardFactory, RANDOM, SCHEDULER } from '../game/tokens';

/**
 * Configura el banco de pruebas de la interfaz: reloj simulado, azar fijo, tablero configurable y el
 * catalogo en ingles real (public/i18n/en.json), el mismo que usa la aplicacion.
 */
export function configureUi(options: { factory?: BoardFactory; random?: number } = {}) {
  TestBed.resetTestingModule();
  const scheduler = new FakeScheduler();
  const fixed = options.random ?? 0;
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { en },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
    providers: [
      { provide: SCHEDULER, useValue: scheduler },
      { provide: RANDOM, useValue: () => fixed },
      { provide: BOARD_FACTORY, useValue: options.factory ?? createBoard },
    ],
  });
  return { scheduler, game: TestBed.inject(GameService) };
}

/** Sustituto de ResizeObserver para jsdom: `trigger` fija el tamano del elemento y avisa al observador. */
export class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  private target: HTMLElement | null = null;

  constructor(private readonly callback: () => void) {
    StubResizeObserver.instances.push(this);
  }

  get observing(): boolean {
    return this.target !== null;
  }

  observe(element: HTMLElement): void {
    this.target = element;
  }

  disconnect(): void {
    this.target = null;
  }

  static reset(): void {
    StubResizeObserver.instances = [];
  }

  static trigger(width: number, height: number): void {
    for (const observer of StubResizeObserver.instances) {
      if (observer.target) {
        Object.defineProperty(observer.target, 'clientWidth', { value: width, configurable: true });
        Object.defineProperty(observer.target, 'clientHeight', {
          value: height,
          configurable: true,
        });
      }
      observer.callback();
    }
  }
}
