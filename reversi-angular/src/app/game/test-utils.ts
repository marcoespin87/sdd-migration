/*
 * Reversi (Angular) - port de Reversi2 (c) 2004 by Keith Fenske.
 * Distribuido bajo la GNU General Public License, version 3 o posterior.
 */

import { Scheduler } from './tokens';

interface Timer {
  readonly id: number;
  readonly at: number;
  readonly fn: () => void;
}

/**
 * Reloj simulado para pruebas: los temporizadores solo avanzan con `advance(ms)`, que ejecuta en
 * orden los que vencen (incluidos los que se agendan durante el avance).
 * Con `ignoreClear` finge un reloj cuyo clearTimeout no hace nada, para comprobar que el servicio
 * ignora por si mismo los callbacks de una partida anterior.
 */
export class FakeScheduler implements Scheduler {
  now = 0;
  private timers: Timer[] = [];
  private nextId = 1;

  constructor(private readonly options: { ignoreClear?: boolean } = {}) {}

  get pending(): number {
    return this.timers.length;
  }

  setTimeout(fn: () => void, ms: number): unknown {
    const id = this.nextId++;
    this.timers.push({ id, at: this.now + ms, fn });
    return id;
  }

  clearTimeout(handle: unknown): void {
    if (this.options.ignoreClear) {
      return;
    }
    this.timers = this.timers.filter((t) => t.id !== handle);
  }

  advance(ms: number): void {
    const target = this.now + ms;
    for (;;) {
      const due = this.timers
        .filter((t) => t.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) {
        break;
      }
      this.timers = this.timers.filter((t) => t !== due);
      this.now = due.at;
      due.fn();
    }
    this.now = target;
  }
}
