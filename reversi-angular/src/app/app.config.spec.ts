/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TRANSLOCO_CONFIG, TranslocoService } from '@jsverse/transloco';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/es.json';
import { appConfig } from './app.config';

/** Monta la configuracion REAL de la aplicacion; solo el servidor HTTP es simulado. */
function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [...appConfig.providers, provideHttpClientTesting()],
  });
  return {
    http: TestBed.inject(HttpTestingController),
    transloco: TestBed.inject(TranslocoService),
    config: TestBed.inject(TRANSLOCO_CONFIG),
  };
}

describe('appConfig', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('CA-31 la configuración real siempre abre en inglés y ofrece inglés y español', () => {
    const { config, transloco } = setup();
    expect(config.defaultLang).toBe('en');
    expect([...(config.availableLangs as string[])]).toEqual(['en', 'es']);
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('CA-31 la configuración real redibuja los textos al cambiar de idioma', () => {
    const { config } = setup();
    expect(config.reRenderOnLangChange).toBe(true);
  });

  it('CA-30 el cargador real pide cada catálogo en i18n/<idioma>.json, relativo a <base href>', () => {
    const { http, transloco } = setup();
    let loaded: unknown;
    transloco.load('en').subscribe((translation) => (loaded = translation));
    const request = http.expectOne('i18n/en.json');
    expect(request.request.method).toBe('GET');
    request.flush(en);
    expect(loaded).toEqual(en);

    transloco.load('es').subscribe();
    http.expectOne('i18n/es.json').flush(es);
    expect(transloco.translate('ui.newGame', {}, 'es')).toBe('Nueva partida');
    expect(transloco.translate('ui.newGame', {}, 'en')).toBe('New Game');
  });

  it('CA-31 al elegir español se pide el catálogo en español y el texto cambia al cargarlo', () => {
    const { http, transloco } = setup();
    const titles: string[] = [];
    transloco.selectTranslate('ui.title').subscribe((title) => titles.push(title));
    http.expectOne('i18n/en.json').flush(en);
    transloco.setActiveLang('es');
    http.expectOne('i18n/es.json').flush(es);
    expect(transloco.getActiveLang()).toBe('es');
    expect(titles).toEqual(['Reversi or Othello', 'Reversi u Othello']);
  });
});
