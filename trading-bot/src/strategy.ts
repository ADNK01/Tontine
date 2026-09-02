/**
 * Strategie : croisement de moyennes mobiles simples 9 / 21.
 * Ne renvoie qu'un signal ; ne connait ni le risque, ni l'execution, ni la memoire.
 * Aucun repaint : la decision d'une bougie n'utilise que des bougies deja cloturees.
 */
import { config } from './config.js';
import type { Candle, StrategySignal } from './types.js';

export function sma(values: number[], period: number, endIndex: number): number | null {
  if (endIndex + 1 < period) return null;
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) sum += values[i] as number;
  return sum / period;
}

/**
 * Evalue le signal a l'index `i` (bougie cloturee).
 * BUY  : la MA rapide passe au dessus de la MA lente entre i-1 et i.
 * SELL : la MA rapide passe en dessous entre i-1 et i.
 * HOLD : pas de croisement frais sur cette bougie.
 */
export function evaluateAt(candles: Candle[], i: number): StrategySignal | null {
  const { fastPeriod, slowPeriod } = config;
  if (i < 1) return null;
  const closes = candles.map((c) => c.close);
  const fastNow = sma(closes, fastPeriod, i);
  const slowNow = sma(closes, slowPeriod, i);
  const fastPrev = sma(closes, fastPeriod, i - 1);
  const slowPrev = sma(closes, slowPeriod, i - 1);
  if (fastNow === null || slowNow === null || fastPrev === null || slowPrev === null) return null;

  const candle = candles[i] as Candle;
  const base = { price: candle.close, time: candle.openTime, fastMA: fastNow, slowMA: slowNow };
  const spreadPct = ((fastNow - slowNow) / slowNow) * 100;

  // Contexte de tendance : un meme croisement ne vaut pas la meme chose au dessus
  // ou en dessous de la MA longue. La memoire apprend par (croisement + regime).
  const trendMA = sma(closes, config.regimePeriod, i);
  const regime = trendMA === null ? 'TREND_NA' : candle.close >= trendMA ? 'TREND_UP' : 'TREND_DOWN';

  if (fastPrev <= slowPrev && fastNow > slowNow) {
    return {
      ...base,
      action: 'BUY',
      setupKey: `${config.symbol}|MA${fastPeriod}x${slowPeriod}|CROSS_UP|${regime}`,
      reason: `Croisement haussier : MA${fastPeriod} (${fastNow.toFixed(2)}) passe au dessus de MA${slowPeriod} (${slowNow.toFixed(2)}), ecart ${spreadPct.toFixed(3)}%, regime ${regime}.`,
    };
  }
  if (fastPrev >= slowPrev && fastNow < slowNow) {
    return {
      ...base,
      action: 'SELL',
      setupKey: `${config.symbol}|MA${fastPeriod}x${slowPeriod}|CROSS_DOWN|${regime}`,
      reason: `Croisement baissier : MA${fastPeriod} (${fastNow.toFixed(2)}) passe sous MA${slowPeriod} (${slowNow.toFixed(2)}), ecart ${spreadPct.toFixed(3)}%.`,
    };
  }
  const sens = fastNow > slowNow ? 'au dessus' : 'en dessous';
  return {
    ...base,
    action: 'HOLD',
    setupKey: `${config.symbol}|MA${fastPeriod}x${slowPeriod}|NO_CROSS|${regime}`,
    reason: `Pas de croisement frais : MA${fastPeriod} deja ${sens} de MA${slowPeriod} (ecart ${spreadPct.toFixed(3)}%).`,
  };
}

/** Signal sur la derniere bougie cloturee. */
export function evaluateLatest(candles: Candle[]): StrategySignal | null {
  return evaluateAt(candles, candles.length - 1);
}
