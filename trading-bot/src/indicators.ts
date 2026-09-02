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

/**
 * Agrege des bougies en bougies d'unite superieure (ex. 4 x M15 -> H1).
 *
 * Le regroupement se fait sur l'HORLOGE, pas sur la position dans le tableau :
 * une bougie H1 commence a une heure ronde, quelle que soit la bougie ou demarrent
 * les donnees. Grouper par index decalerait les bornes H1 selon la fenetre chargee,
 * et donnerait des pressions HTF differentes pour la meme bougie de signal.
 *
 * Seules les bougies HTF COMPLETES sont renvoyees : une H1 partielle en debut ou en
 * fin de fenetre serait une fausse lecture.
 */
export function aggregate(candles: Candle[], factor: number): Candle[] {
  if (candles.length < 2 || factor < 2) return [];
  // Pas de temps deduit des donnees elles-memes : le plus petit ecart observe.
  let step = Infinity;
  for (let i = 1; i < candles.length; i++) {
    const d = (candles[i] as Candle).openTime - (candles[i - 1] as Candle).openTime;
    if (d > 0 && d < step) step = d;
  }
  if (!Number.isFinite(step)) return [];
  const bucketMs = step * factor;

  const buckets = new Map<number, Candle[]>();
  for (const c of candles) {
    const key = Math.floor(c.openTime / bucketMs) * bucketMs;
    buckets.set(key, [...(buckets.get(key) ?? []), c]);
  }

  return [...buckets.entries()]
    .filter(([, slice]) => slice.length === factor)
    .sort((a, b) => a[0] - b[0])
    .map(([key, slice]) => ({
      openTime: key,
      open: (slice[0] as Candle).open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: (slice[slice.length - 1] as Candle).close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    }));
}
