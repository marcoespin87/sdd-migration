/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

/** Idiomas de la interfaz y la clave del catalogo con el nombre de cada uno en su propia lengua. */
export const LANGUAGES = [
  { code: 'en', label: 'ui.langEn' },
  { code: 'es', label: 'ui.langEs' },
] as const;

/** Idioma con el que siempre abre la aplicacion (el idioma base del spec). */
export const DEFAULT_LANGUAGE = 'en';
