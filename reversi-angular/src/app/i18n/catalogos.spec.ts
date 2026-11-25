/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../../public/i18n/en.json';
import es from '../../../public/i18n/es.json';
import { GameMessage } from '../game/messages';
import { toText } from '../ui/message-text';

/** Aplana un catalogo a { 'ruta.de.la.clave': texto }. */
function flat(catalog: object, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(catalog)) {
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flat(value, `${prefix}${key}.`));
    } else {
      result[`${prefix}${key}`] = String(value);
    }
  }
  return result;
}

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

// Catalogo en español aprobado en el plan (tabla "Catálogo de textos") más las claves de la Fase 4.
const ES_APROBADO = {
  ui: {
    level: 'Dificultad',
    easy: 'Fácil',
    medium: 'Medio',
    rows: 'Filas: ',
    columns: 'Columnas: ',
    newGame: 'Nueva partida',
    skipTurn: 'Saltar turno',
    language: 'Idioma',
    langEn: 'English',
    langEs: 'Español',
  },
  credits: 'Reversi u Othello.  Copyright (c) 2004 de Keith Fenske.  Licencia Pública GNU.',
  begin: 'Haz clic en la casilla que elijas.  Tú juegas con las fichas oscuras.',
  mustSkip: 'No puedes mover; pulsa el botón «Saltar turno».',
  skipNotYourTurn: '¡Pero es el turno de la computadora!',
  skipNoGame: 'Debes iniciar una partida nueva antes de saltar tu turno.',
  gameFinished: 'La partida terminó.  Debes iniciar una partida nueva para volver a mover.',
  notYourTurn: 'Lo siento, no es tu turno.  La computadora está pensando.',
  clickPosition: 'Haz clic en una casilla del tablero.',
  occupied: 'Lo siento, esa casilla ya fue elegida.',
  invalidMove: 'Elige una casilla vacía que voltee al menos una ficha de la computadora.',
  userMove: {
    one: 'Tu jugada es la fila {{row}} y la columna {{col}}, con una ficha volteada.',
    other: 'Tu jugada es la fila {{row}} y la columna {{col}}, con {{count}} fichas volteadas.',
  },
  computerMove: {
    one: 'La jugada de la computadora es la fila {{row}} y la columna {{col}}, con una ficha volteada.',
    other:
      'La jugada de la computadora es la fila {{row}} y la columna {{col}}, con {{count}} fichas volteadas.',
  },
  newBoard: 'El nuevo tablero tiene {{rows}} filas por {{cols}} columnas.',
  tooNarrow: 'La ventana es demasiado angosta para mostrar {{cols}} columnas.',
  tooShort: 'La ventana es demasiado baja para mostrar {{rows}} filas.',
  computerCantMove: 'La computadora no puede mover, así que es tu turno otra vez.',
  endComputerWins:
    'Nadie puede mover.  Gana la computadora, {{comp}} casillas contra tus {{user}}.',
  endUserWins: 'Nadie puede mover.  Ganas con {{user}} casillas contra {{comp}} de la computadora.',
  endTie: 'Nadie puede mover.  Empate: ambos tenemos {{count}} casillas.',
};

function translator() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { en, es },
        translocoConfig: { availableLangs: ['en', 'es'], defaultLang: 'en' },
        preloadLangs: true,
      }),
    ],
  });
  const service = TestBed.inject(TranslocoService);
  return (lang: 'en' | 'es', message: GameMessage) => {
    const text = toText(message);
    return service.translate(text.key, { ...text.params }, lang);
  };
}

describe('catálogos', () => {
  it('CA-30 catálogos completos: el español tiene exactamente las mismas claves que el inglés', () => {
    const enKeys = Object.keys(flat(en)).sort();
    const esKeys = Object.keys(flat(es)).sort();
    expect(enKeys.length).toBeGreaterThan(30);
    expect(esKeys).toEqual(enKeys);
  });

  it('CA-30 catálogos completos: incluyen las claves nuevas de la Fase 4', () => {
    for (const catalog of [flat(en), flat(es)]) {
      expect(catalog['ui.level']).toBeTruthy();
      expect(catalog['ui.langEn']).toBeTruthy();
      expect(catalog['ui.langEs']).toBeTruthy();
    }
  });

  it('CA-30 catálogos completos: el español es el catálogo aprobado en el plan', () => {
    expect(es).toEqual(ES_APROBADO);
  });

  it('CA-30 catálogos completos: cada idioma se nombra en su propia lengua, igual en ambos catálogos', () => {
    for (const catalog of [flat(en), flat(es)]) {
      expect(catalog['ui.langEn']).toBe('English');
      expect(catalog['ui.langEs']).toBe('Español');
    }
  });

  it('CA-30 catálogos completos: los parámetros de cada texto son los mismos en los dos idiomas', () => {
    const enFlat = flat(en);
    const esFlat = flat(es);
    for (const key of Object.keys(enFlat)) {
      expect(placeholders(esFlat[key] ?? '')).toEqual(placeholders(enFlat[key]));
    }
  });

  it('CA-32 plurales y parámetros: exactamente 1 volteo usa la forma singular, en ambos idiomas', () => {
    const say = translator();
    const move = (count: number): GameMessage => ({
      key: 'userMove',
      params: { row: 3, col: 4, count },
    });
    expect(say('en', move(1))).toBe('Your move is row 3 and column 4 with one reversed position.');
    expect(say('es', move(1))).toBe(
      'Tu jugada es la fila 3 y la columna 4, con una ficha volteada.',
    );
  });

  it('CA-32 plurales y parámetros: cualquier otra cantidad (0, 2, 7) usa la forma plural', () => {
    const say = translator();
    for (const count of [0, 2, 7]) {
      const message: GameMessage = { key: 'userMove', params: { row: 3, col: 4, count } };
      expect(say('en', message)).toBe(`Your move is row 3 and column 4 with ${count} reverses.`);
      expect(say('es', message)).toBe(
        `Tu jugada es la fila 3 y la columna 4, con ${count} fichas volteadas.`,
      );
    }
  });

  it('CA-32 plurales y parámetros: la jugada de la computadora usa la misma regla', () => {
    const say = translator();
    const move = (count: number): GameMessage => ({
      key: 'computerMove',
      params: { row: 2, col: 6, count },
    });
    expect(say('en', move(1))).toBe(
      "Computer's move is row 2 and column 6 with one reversed position.",
    );
    expect(say('en', move(3))).toBe("Computer's move is row 2 and column 6 with 3 reverses.");
    expect(say('es', move(1))).toBe(
      'La jugada de la computadora es la fila 2 y la columna 6, con una ficha volteada.',
    );
    expect(say('es', move(3))).toBe(
      'La jugada de la computadora es la fila 2 y la columna 6, con 3 fichas volteadas.',
    );
  });

  it('CA-32 plurales y parámetros: se sustituyen filas, columnas y cantidades en los demás mensajes', () => {
    const say = translator();
    const newBoard: GameMessage = { key: 'newBoard', params: { rows: 8, cols: 12 } };
    expect(say('en', newBoard)).toBe('New game board is 8 rows by 12 columns.');
    expect(say('es', newBoard)).toBe('El nuevo tablero tiene 8 filas por 12 columnas.');

    const computerWins: GameMessage = { key: 'endComputerWins', params: { comp: 5, user: 3 } };
    expect(say('en', computerWins)).toBe(
      'Nobody can move.  Computer wins, 5 positions to your 3 positions.',
    );
    expect(say('es', computerWins)).toBe(
      'Nadie puede mover.  Gana la computadora, 5 casillas contra tus 3.',
    );

    const userWins: GameMessage = { key: 'endUserWins', params: { user: 5, comp: 3 } };
    expect(say('en', userWins)).toBe(
      "Nobody can move.  You win with 5 positions to the computer's 3 positions.",
    );
    expect(say('es', userWins)).toBe(
      'Nadie puede mover.  Ganas con 5 casillas contra 3 de la computadora.',
    );

    const tie: GameMessage = { key: 'endTie', params: { count: 4 } };
    expect(say('en', tie)).toBe('Nobody can move.  Game is tied.  We both have 4 positions.');
    expect(say('es', tie)).toBe('Nadie puede mover.  Empate: ambos tenemos 4 casillas.');
  });
});
