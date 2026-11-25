/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { TestBed } from '@angular/core/testing';
import { Translation, TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../../public/i18n/en.json';
import es from '../../../public/i18n/es.json';
import { createBoard } from '../domain/board';
import { GameService } from '../game/game.service';
import { FakeScheduler } from '../game/test-utils';
import { BOARD_FACTORY, BoardFactory, RANDOM, SCHEDULER } from '../game/tokens';

/** Catalogo sintetico: conserva la estructura y devuelve `[[ruta.de.la.clave]]` en cada texto. */
export function pseudoCatalog(catalog: Translation, prefix = ''): Translation {
  const result: Translation = {};
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix + key;
    result[key] =
      typeof value === 'object' && value !== null
        ? pseudoCatalog(value as Translation, path + '.')
        : `[[${path}]]`;
  }
  return result;
}

/**
 * Configura el banco de pruebas de la interfaz: reloj simulado, azar fijo, tablero configurable y los
 * catalogos reales (public/i18n/en.json y es.json), los mismos que usa la aplicacion. Con `langs` y
 * `defaultLang` se sustituyen, p. ej. por un catalogo sintetico para detectar texto literal.
 */
export function configureUi(
  options: {
    factory?: BoardFactory;
    random?: number;
    langs?: Record<string, Translation>;
    defaultLang?: string;
  } = {},
) {
  TestBed.resetTestingModule();
  const scheduler = new FakeScheduler();
  const fixed = options.random ?? 0;
  const langs = options.langs ?? { en, es };
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs,
        translocoConfig: {
          availableLangs: Object.keys(langs),
          defaultLang: options.defaultLang ?? 'en',
          reRenderOnLangChange: true, // igual que la configuracion de la aplicacion
        },
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
