/**
 * Applique le "Ready Window" : apres un signal, les suivants sont ignores pendant
 * `Filter_Ready_Window` bougies. Un retournement produit ainsi UNE fleche, pas une grappe.
 */
import { config } from './config.js';
import { evaluateAt } from './strategy.js';
import type { Candle, StrategySignal } from './types.js';

export interface SequencedSignal {
  index: number;
  /** Toujours un signal actionnable : les HOLD sont filtres en amont. */
  signal: StrategySignal & { action: 'BUY' | 'SELL' };
}

/** Nombre de bougies ecoulees depuis la cloture de la derniere bougie HTF. */
function barsSinceLastHtfClose(candles: Candle[], htf: Candle[], i: number): number | null {
  const barTime = (candles[i] as Candle).openTime;
  let lastClose: number | null = null;
  for (const h of htf) {
    if (h.openTime <= barTime) lastClose = h.openTime;
    else break;
  }
  if (lastClose === null) return null;
  const step = (candles[1] as Candle).openTime - (candles[0] as Candle).openTime;
  if (!(step > 0)) return null;
  // La bougie HTF ouverte a lastClose se termine `htfFactor` bougies plus tard.
  const htfCloseTime = lastClose + config.enigma.htfFactor * step;
  return Math.round((barTime - htfCloseTime) / step);
}

export function collectSignals(candles: Candle[], htf: Candle[] | undefined, from: number, to: number): SequencedSignal[] {
  const out: SequencedSignal[] = [];
  let lastIndex = -Infinity;
  for (let i = from; i <= to; i++) {
    const signal = evaluateAt(candles, i, { htf });
    if (!signal || signal.action === 'HOLD') continue;
    const actionable = signal as StrategySignal & { action: 'BUY' | 'SELL' };

    // Mode "armed" : le signal n'est admis que dans les N bougies qui suivent la
    // cloture d'une bougie HTF — lecture litterale de "FILTER-FIRST ARCHITECTURE".
    if (config.enigma.readyMode === 'armed' && htf && htf.length > 0) {
      const barsSinceHtfClose = barsSinceLastHtfClose(candles, htf, i);
      if (barsSinceHtfClose === null || barsSinceHtfClose > config.enigma.filterReadyWindow) continue;
    }
    // "Min_Bars_Between" : espacement minimal entre deux signaux. Le code source
    // montre que c'est ce parametre, et non Filter_Ready_Window, qui evite les grappes.
    if (i - lastIndex < config.enigma.minBarsBetween) continue;

    lastIndex = i;
    out.push({ index: i, signal: actionable });
  }
  return out;
}
