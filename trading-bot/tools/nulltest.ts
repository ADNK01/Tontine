/**
 * Test nul : les entrees de la strategie valent-elles mieux que le hasard ?
 *
 * On rejoue exactement les memes regles de sortie (SL a 3 x ATR depuis l'extreme
 * de la bougie, TP a 1R, stop prioritaire, 50 bougies max) sur des bougies tirees
 * au hasard, avec la meme repartition achats/ventes et le meme nombre d'entrees.
 * Si le hasard obtient la meme esperance, l'avantage vient des SORTIES, pas des
 * ENTREES, et la strategie n'apporte rien.
 */
import { getCandles, closedCandles } from './../src/market.js';
import { wyckoffSignals } from './../src/wyckoff.js';
import { config } from './../src/config.js';
import type { Candle } from './../src/types.js';

const MAX_HOLD = 50;
const TRIALS = 400;
const set = await getCandles();
const c = closedCandles(set.candles);
const n = c.length;
const w = config.wyckoff;

function atrAt(i: number): number {
  const p = w.atrPeriod;
  if (i < p) return 0;
  let sum = 0;
  for (let k = i - p + 1; k <= i; k++) {
    const cur = c[k] as Candle, prev = c[k - 1] as Candle;
    sum += Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
  }
  return sum / p;
}

/** Rejoue une entree a l'index donne et renvoie son resultat en R. */
function playTrade(idx: number, side: 'BUY' | 'SELL'): number {
  const bar = c[idx] as Candle;
  const a = atrAt(idx);
  if (a <= 0) return 0;
  const entry = bar.close;
  const sl = side === 'BUY' ? bar.low - a * w.slAtrMulti : bar.high + a * w.slAtrMulti;
  const risk = Math.abs(entry - sl);
  if (risk <= 0) return 0;
  const tp = side === 'BUY' ? entry + risk : entry - risk;
  for (let k = idx + 1; k <= Math.min(n - 1, idx + MAX_HOLD); k++) {
    const b = c[k] as Candle;
    if (side === 'BUY' ? b.low <= sl : b.high >= sl) return -1;
    if (side === 'BUY' ? b.high >= tp : b.low <= tp) return 1;
  }
  const last = c[Math.min(n - 1, idx + MAX_HOLD)] as Candle;
  return ((last.close - entry) * (side === 'BUY' ? 1 : -1)) / risk;
}

const sigs = wyckoffSignals(c);
const strategieR = sigs.reduce((s, x) => s + playTrade(x.index, x.side), 0);
const nBuy = sigs.filter((s) => s.side === 'BUY').length;
const total = sigs.length;
if (total === 0) { console.log(JSON.stringify({ actif: config.symbol, signaux: 0 })); process.exit(0); }

const first = Math.max(w.atrPeriod + 2, 60);
const last = n - MAX_HOLD - 2;
const results: number[] = [];
for (let t = 0; t < TRIALS; t++) {
  let sum = 0;
  for (let k = 0; k < total; k++) {
    const idx = first + Math.floor(Math.random() * (last - first));
    sum += playTrade(idx, k < nBuy ? 'BUY' : 'SELL');
  }
  results.push(sum / total);
}
results.sort((a, b) => a - b);
const moy = results.reduce((a, b) => a + b, 0) / TRIALS;
const strat = strategieR / total;
const meilleurQue = results.filter((r) => r < strat).length / TRIALS;

console.log(JSON.stringify({
  actif: config.symbol,
  signaux: total,
  esperanceStrategie: Math.round(strat * 1000) / 1000,
  esperanceHasard: Math.round(moy * 1000) / 1000,
  hasardP05: Math.round((results[Math.floor(TRIALS * 0.05)] ?? 0) * 1000) / 1000,
  hasardP95: Math.round((results[Math.floor(TRIALS * 0.95)] ?? 0) * 1000) / 1000,
  percentile: Math.round(meilleurQue * 1000) / 10,
}));
