/** Indicateurs de base, calcules sans lookahead : l'index i n'utilise que les bougies <= i. */
import type { Candle } from './types.js';

export function trueRange(candles: Candle[], i: number): number {
  const c = candles[i] as Candle;
  if (i === 0) return c.high - c.low;
  const prevClose = (candles[i - 1] as Candle).close;
  return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
}

/** ATR simple (moyenne des true ranges sur `period` bougies terminant a i). */
export function atr(candles: Candle[], period: number, i: number): number | null {
  if (i < period) return null;
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) sum += trueRange(candles, k);
  return sum / period;
}

/**
 * Pression de la bougie : ou se situe la cloture dans le range.
 * 1.0 = cloture sur le plus haut (acheteurs en controle total)
 * 0.0 = cloture sur le plus bas (vendeurs en controle total)
 */
export function pressure(c: Candle): number {
  const range = c.high - c.low;
  if (range <= 0) return 0.5;
  return (c.close - c.low) / range;
}

/** Efficacite du corps : part du range reellement parcourue par le corps. */
export function bodyEfficiency(c: Candle): number {
  const range = c.high - c.low;
  if (range <= 0) return 0;
  return Math.abs(c.close - c.open) / range;
}

/** Pression moyenne sur une fenetre de bougies [from, to] inclus. */
export function averagePressure(candles: Candle[], from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (let k = Math.max(0, from); k <= to; k++) {
    sum += pressure(candles[k] as Candle);
    n++;
  }
  return n > 0 ? sum / n : 0.5;
}

/** Agrege des bougies M15 en bougies HTF (ex. 4 x M15 -> H1). Pas de lookahead. */
export function aggregate(candles: Candle[], factor: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i + factor <= candles.length; i += factor) {
    const slice = candles.slice(i, i + factor);
    const first = slice[0] as Candle;
    const last = slice[slice.length - 1] as Candle;
    out.push({
      openTime: first.openTime,
      open: first.open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: last.close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}
