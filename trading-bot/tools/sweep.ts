/**
 * Outil de balayage de parametres, reproductible.
 *
 * Exemple :
 *   SYMBOL=BTCUSDT INTERVAL=1d W_RSI_SWING_BARS=8 \
 *   W_USE_ER_QUALITY=false W_USE_CUSUM=false TARGET=1 npx tsx tools/sweep.ts
 *
 * Balayage : RSI_Swing_Bars bas, sans Kaufman ER ni CUSUM.
 * Sortie simulee bougie par bougie : SL ou TP1 (1R), stop prioritaire si les deux
 * sont touches dans la meme bougie. Duree de vie max : 50 bougies.
 */
import { getCandles, closedCandles } from '../src/market.js';
import { wyckoffSignals } from '../src/wyckoff.js';
import { config } from '../src/config.js';
import type { Candle } from '../src/types.js';

const MAX_HOLD = 50;

/**
 * Modele de couts, en pourcentage du PRIX (pas du risque).
 *   COST_ROUNDTRIP_PCT : spread + commission, aller-retour. Ex. 0.05 pour 0.05%.
 *   COST_DAILY_PCT     : financement/swap preleve par bougie de detention.
 * Le stop de cette strategie vaut 15 a 23% du prix : un spread pese donc tres peu,
 * mais le financement s'accumule avec la duree de detention et pese davantage.
 */
const COST_RT = Number(process.env.COST_ROUNDTRIP_PCT ?? '0') / 100;
const COST_DAY = Number(process.env.COST_DAILY_PCT ?? '0') / 100;
const set = await getCandles();
const c = closedCandles(set.candles);

const sigs = wyckoffSignals(c);
let wins = 0, losses = 0, open = 0, totalR = 0;
let buy = 0, sell = 0, real = 0;
let coutTotalR = 0, barresTotal = 0;

for (const s of sigs) {
  if (s.side === 'BUY') buy++; else sell++;
  if (!s.reason.includes('laisse passer')) real++;

  const risk = Math.abs(s.entry - s.sl);
  const which = process.env.TARGET ?? '1';
  const tp = which === '3' ? s.tp3 : which === '2' ? s.tp2 : s.tp1;
  const rr = which === '3' ? 2.618 : which === '2' ? 1.618 : 1.0;
  let done = false;
  let barres = MAX_HOLD;
  for (let k = s.index + 1; k <= Math.min(c.length - 1, s.index + MAX_HOLD); k++) {
    const b = c[k] as Candle;
    const slHit = s.side === 'BUY' ? b.low <= s.sl : b.high >= s.sl;
    const tpHit = s.side === 'BUY' ? b.high >= tp : b.low <= tp;
    if (slHit) { losses++; totalR -= 1; done = true; barres = k - s.index; break; }
    if (tpHit) { wins++; totalR += rr; done = true; barres = k - s.index; break; }
  }
  if (!done) {
    const last = c[Math.min(c.length - 1, s.index + MAX_HOLD)] as Candle;
    const r = ((last.close - s.entry) * (s.side === 'BUY' ? 1 : -1)) / risk;
    totalR += r;
    open++;
  }

  // Couts convertis en R : un pourcentage du PRIX vaut prix/risque fois plus en R.
  const cout = ((COST_RT + COST_DAY * barres) * s.entry) / risk;
  coutTotalR += cout;
  totalR -= cout;
  barresTotal += barres;
}

const decided = wins + losses;
console.log(JSON.stringify({
  swing: config.wyckoff.rsiSwingBars,
  cible: process.env.TARGET ?? '1',
  interval: config.interval,
  signaux: sigs.length,
  vraieDiv: real,
  achats: buy,
  ventes: sell,
  gagnants: wins,
  perdants: losses,
  nonClotures: open,
  tauxReussite: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0,
  totalR: Math.round(totalR * 100) / 100,
  barresMoy: sigs.length > 0 ? Math.round((barresTotal / sigs.length) * 10) / 10 : 0,
  coutR: Math.round(coutTotalR * 1000) / 1000,
}));
