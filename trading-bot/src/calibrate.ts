/**
 * Calibrage : compare la reconstruction a une fleche reelle de l'indicateur.
 *
 * Usage : npm run calibrate -- 2026-08-31T21:05:00Z
 * Affiche toutes les valeurs intermediaires a cette bougie, dans le meme
 * vocabulaire que le tableau de bord de l'indicateur (pression, contexte, HTF),
 * pour voir precisement quel etage diverge.
 */
import { config } from './config.js';
import { log } from './logger.js';
import { getCandles, getHtfCandles, closedCandles } from './market.js';
import { evaluateAt } from './strategy.js';
import { aggregate, atr, averagePressure, bodyEfficiency, pressure } from './indicators.js';
import type { Candle } from './types.js';

export async function runCalibrate(isoTime: string): Promise<void> {
  const target = Date.parse(isoTime);
  if (Number.isNaN(target)) {
    log.error(`Horodatage illisible : "${isoTime}". Format attendu : 2026-08-31T21:05:00Z`);
    return;
  }
  log.title(`CALIBRAGE — ${config.symbol} ${config.interval} — bougie ${new Date(target).toISOString()}`);

  const set = await getCandles();
  const candles = closedCandles(set.candles);
  const i = candles.findIndex((c) => c.openTime === target);
  if (i < 0) {
    log.error(`Bougie introuvable dans les donnees chargees (${new Date((candles[0] as Candle).openTime).toISOString()} -> ${new Date((candles[candles.length - 1] as Candle).openTime).toISOString()}).`);
    return;
  }

  const bar = candles[i] as Candle;
  const e = config.enigma;
  const a = atr(candles, config.atrPeriod, i);
  const range = bar.high - bar.low;
  const ctxFrom = i - e.momentumBars;
  const ctxTo = i - 1;
  const window = candles.slice(Math.max(0, ctxFrom), ctxTo + 1);
  const ctxPressure = averagePressure(candles, ctxFrom, ctxTo);
  const ctxLow = Math.min(...window.map((c) => c.low));
  const ctxHigh = Math.max(...window.map((c) => c.high));

  const htfSet = e.useHtf ? await getHtfCandles() : null;
  const htf = !e.useHtf ? [] : htfSet ? closedCandles(htfSet.candles) : aggregate(candles, e.htfFactor);
  if (e.useHtf) log.step('HTF', htfSet ? `Source dediee : ${htfSet.sourceLabel}` : `Agregation ${e.htfFactor} x ${config.interval} (${htf.length} bougies).`);
  let htfIdx = -1;
  for (let k = 0; k < htf.length; k++) { if ((htf[k] as Candle).openTime <= bar.openTime) htfIdx = k; else break; }
  htfIdx -= 1;
  const htfBar = htfIdx >= 0 ? (htf[htfIdx] as Candle) : null;
  const htfAtr = htfIdx >= config.atrPeriod ? atr(htf, config.atrPeriod, htfIdx) : null;

  console.log(`Bougie      : O ${bar.open.toFixed(2)}  H ${bar.high.toFixed(2)}  L ${bar.low.toFixed(2)}  C ${bar.close.toFixed(2)}`);
  console.log(`ATR(${config.atrPeriod})     : ${a?.toFixed(2) ?? 'n/a'}`);
  log.blank();
  console.log('--- Vocabulaire du tableau de bord de l indicateur ---');
  console.log(`  Current (pression)  : ${(pressure(bar) * 100).toFixed(0)}%      seuils : achat >= ${(e.bullReversalMin * 100).toFixed(0)}%, vente <= ${(e.bearReversalMax * 100).toFixed(0)}%`);
  console.log(`  Context             : ${(ctxPressure * 100).toFixed(0)}%      seuils : achat <= ${(e.bearContextMax * 100).toFixed(0)}%, vente >= ${(e.bullContextMin * 100).toFixed(0)}%`);
  if (htfBar) {
    console.log(`  HTF derniere close  : direction ${pressure(htfBar) >= 0.5 ? 'BULL' : 'BEAR'}`);
    console.log(`     Body             : ${htfAtr ? (Math.abs(htfBar.close - htfBar.open) / htfAtr).toFixed(2) : 'n/a'}x ATR   (min ${e.htfMinBodyAtr})`);
    console.log(`     Pressure         : ${(pressure(htfBar) * 100).toFixed(0)}%      (min ${(e.htfMinPressure * 100).toFixed(0)}%)`);
    console.log(`     Bougie HTF       : ${new Date(htfBar.openTime).toISOString()}  O ${htfBar.open.toFixed(2)} H ${htfBar.high.toFixed(2)} L ${htfBar.low.toFixed(2)} C ${htfBar.close.toFixed(2)}`);
  } else {
    console.log('  HTF                 : aucune bougie superieure cloturee disponible');
  }
  log.blank();
  console.log('--- Autres etages ---');
  console.log(`  Range / ATR         : ${a ? (range / a).toFixed(2) : 'n/a'}     (min ${e.minRangeAtr})`);
  console.log(`  Efficacite du corps : ${bodyEfficiency(bar).toFixed(2)}     (min ${e.minBodyEfficiency})`);
  console.log(`  Mode context depth  : ${e.contextDepthMode}`);
  console.log(`  Nettete du contexte : ${Math.abs(ctxPressure - 0.5).toFixed(3)}          (min ${e.minContextDepth} en mode clarity)`);
  console.log(`  Balayage bas        : ${a ? ((ctxLow - bar.low) / a).toFixed(3) : 'n/a'} x ATR  (min ${e.minContextDepth} en mode sweep)`);
  console.log(`  Balayage haut       : ${a ? ((bar.high - ctxHigh) / a).toFixed(3) : 'n/a'} x ATR`);
  log.blank();

  const signal = evaluateAt(candles, i, { htf: e.useHtf ? htf : undefined });
  console.log(`>>> VERDICT DE LA RECONSTRUCTION : ${signal?.action ?? 'aucun'}`);
  console.log(`    ${signal?.reason ?? ''}`);
  if (signal?.sl !== undefined) {
    console.log(`    SL ${signal.sl.toFixed(2)} | TP1 ${signal.tp1?.toFixed(2)} | TP2 ${signal.tp2?.toFixed(2)} | TP3 ${signal.tp3?.toFixed(2)}`);
  }
  log.blank();
  log.info(`Source : ${set.sourceLabel}`);
}
