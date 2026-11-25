/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import en from '../../../public/i18n/en.json';
import es from '../../../public/i18n/es.json';
import { DEFAULT_LANGUAGE, LANGUAGES } from './languages';

describe('languages', () => {
  it('CA-31 la aplicación siempre abre en inglés, el idioma base', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('CA-31 se ofrecen inglés y español, nombrados con claves del catálogo', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'es']);
    expect(LANGUAGES.map((l) => l.label)).toEqual(['ui.langEn', 'ui.langEs']);
    for (const catalog of [en, es]) {
      expect(catalog.ui.langEn).toBe('English');
      expect(catalog.ui.langEs).toBe('Español');
    }
  });
});
