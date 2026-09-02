/**
 * Strategie "Enigma Cipher S" — reconstruction.
 *
 * ATTENTION : cette implementation est une RECONSTRUCTION a partir des noms et
 * valeurs des parametres de l'indicateur MT4 (captures d'ecran). Le code source
 * du .ex4 n'est pas disponible : la logique interne exacte est inconnue.
 * Les fleches de cet indicateur et les signaux de ce module PEUVENT DIFFERER.
 * A verifier en comparant signal par signal sur le meme graphique.
 *
 * Lecture retenue — un retournement apres balayage :
 *   1. CONTEXTE   : sur les `Momentum_Bars` bougies precedentes, la pression
 *                   moyenne montre un controle net du camp oppose.
 *   2. PROFONDEUR : la bougie de signal casse l'extreme du contexte (balayage
 *                   de liquidite) d'au moins `Min_Context_Depth` x ATR.
 *   3. PRESSION   : elle referme a l'oppose (>= Bull_Reversal_Min pour un achat).
 *   4. QUALITE    : corps >= `Min_Body_Efficiency` du range, range >= `Min_Range_ATR` x ATR.
 *   5. HTF        : la pression de l'unite superieure valide le sens.
 *   6. CONFIRM.   : optionnelle, cloture dans le sens sur les N bougies suivantes.
 *   SL/TP         : SL a `SL_ATR_Multi` x ATR, TP a 1R / 2R / 3R.
 */
import { config } from './config.js';
import { atr, averagePressure, bodyEfficiency, pressure } from './indicators.js';
import type { Candle, StrategySignal } from './types.js';

export interface EnigmaContext {
  /** Bougies de l'unite de temps superieure, alignees en temps (openTime croissant). */
  htf?: Candle[];
}

/** Pression de la derniere bougie HTF entierement cloturee avant `time`. */
function htfPressureAt(htf: Candle[] | undefined, time: number): { pressure: number; bodyAtr: number } | null {
  if (!htf || htf.length === 0) return null;
  let idx = -1;
  for (let k = 0; k < htf.length; k++) {
    const c = htf[k] as Candle;
    if (c.openTime <= time) idx = k;
    else break;
  }
  // On exige une bougie HTF DEJA CLOTUREE : on recule d'une bougie.
  idx -= 1;
  if (idx < config.atrPeriod) return null;
  const c = htf[idx] as Candle;
  const a = atr(htf, config.atrPeriod, idx);
  return { pressure: pressure(c), bodyAtr: a && a > 0 ? Math.abs(c.close - c.open) / a : 0 };
}

export function evaluateEnigmaAt(candles: Candle[], i: number, ctx: EnigmaContext = {}): StrategySignal | null {
  const e = config.enigma;
  const warmup = Math.max(config.atrPeriod, e.momentumBars) + 1;
  if (i < warmup) return null;

  const bar = candles[i] as Candle;
  const a = atr(candles, config.atrPeriod, i);
  if (a === null || a <= 0) return null;

  const range = bar.high - bar.low;
  const p = pressure(bar);
  const bodyEff = bodyEfficiency(bar);
  const neutral = (reason: string): StrategySignal => ({
    action: 'HOLD', reason, price: bar.close, time: bar.openTime,
    fastMA: p, slowMA: bodyEff,
    setupKey: `${config.symbol}|ENIGMA|NO_SETUP`,
    atr: a,
  });

  // --- Filtres de qualite de la bougie de signal ---
  if (range < e.minRangeAtr * a) {
    return neutral(`Range ${range.toFixed(2)} < ${e.minRangeAtr} x ATR (${(e.minRangeAtr * a).toFixed(2)}) : bougie trop petite.`);
  }
  if (bodyEff < e.minBodyEfficiency) {
    return neutral(`Efficacite du corps ${bodyEff.toFixed(2)} < ${e.minBodyEfficiency} : bougie indecise.`);
  }

  // --- Contexte : les Momentum_Bars bougies precedant le signal ---
  const from = i - e.momentumBars;
  const to = i - 1;
  const ctxPressure = averagePressure(candles, from, to);
  const window = candles.slice(Math.max(0, from), to + 1);
  const ctxLow = Math.min(...window.map((c) => c.low));
  const ctxHigh = Math.max(...window.map((c) => c.high));

  // --- Setup haussier : contexte vendeur, balayage du bas, cloture haute ---
  if (p >= e.bullReversalMin && ctxPressure <= e.bearContextMax) {
    const depth = contextDepth(ctxPressure, ctxLow - bar.low, a);
    if (e.useContextDepth && depth < e.minContextDepth) {
      return neutral(`Setup haussier rejete : ${depthLabel()} ${depth.toFixed(3)} < ${e.minContextDepth}.`);
    }
    const htf = htfPressureAt(ctx.htf, bar.openTime);
    const htfVerdict = checkHtf(htf, 'BUY');
    if (htfVerdict) return neutral(`Setup haussier rejete : ${htfVerdict}`);
    if (e.requireConfirmation) {
      const conf = confirms(candles, i, 'BUY', e.confirmationBars);
      if (conf === null) return null; // pas encore assez de bougies pour confirmer
      if (!conf) return neutral(`Setup haussier rejete : pas de confirmation sur ${e.confirmationBars} bougie(s).`);
    }
    const sl = bar.close - e.slAtrMulti * a;
    const risk = bar.close - sl;
    return {
      action: 'BUY',
      price: bar.close, time: bar.openTime, fastMA: p, slowMA: ctxPressure,
      setupKey: `${config.symbol}|ENIGMA|BULL_REVERSAL`,
      reason:
        `Retournement haussier : contexte vendeur (pression moyenne ${ctxPressure.toFixed(2)} sur ${e.momentumBars} bougies), ` +
        `${depthLabel()} ${depth.toFixed(2)}, cloture a ${(p * 100).toFixed(0)}% du range, ` +
        `corps ${(bodyEff * 100).toFixed(0)}%${e.useHtf && htf ? `, pression H1 ${htf.pressure.toFixed(2)}` : ''}.`,
      atr: a, sl, tp1: bar.close + e.tp1RR * risk, tp2: bar.close + e.tp2RR * risk, tp3: bar.close + e.tp3RR * risk,
    };
  }

  // --- Setup baissier : contexte acheteur, balayage du haut, cloture basse ---
  if (p <= e.bearReversalMax && ctxPressure >= e.bullContextMin) {
    const depth = contextDepth(ctxPressure, bar.high - ctxHigh, a);
    if (e.useContextDepth && depth < e.minContextDepth) {
      return neutral(`Setup baissier rejete : ${depthLabel()} ${depth.toFixed(3)} < ${e.minContextDepth}.`);
    }
    const htf = htfPressureAt(ctx.htf, bar.openTime);
    const htfVerdict = checkHtf(htf, 'SELL');
    if (htfVerdict) return neutral(`Setup baissier rejete : ${htfVerdict}`);
    if (e.requireConfirmation) {
      const conf = confirms(candles, i, 'SELL', e.confirmationBars);
      if (conf === null) return null;
      if (!conf) return neutral(`Setup baissier rejete : pas de confirmation sur ${e.confirmationBars} bougie(s).`);
    }
    const sl = bar.close + e.slAtrMulti * a;
    const risk = sl - bar.close;
    return {
      action: 'SELL',
      price: bar.close, time: bar.openTime, fastMA: p, slowMA: ctxPressure,
      setupKey: `${config.symbol}|ENIGMA|BEAR_REVERSAL`,
      reason:
        `Retournement baissier : contexte acheteur (pression moyenne ${ctxPressure.toFixed(2)} sur ${e.momentumBars} bougies), ` +
        `${depthLabel()} ${depth.toFixed(2)}, cloture a ${(p * 100).toFixed(0)}% du range, ` +
        `corps ${(bodyEff * 100).toFixed(0)}%${e.useHtf && htf ? `, pression H1 ${htf.pressure.toFixed(2)}` : ''}.`,
      atr: a, sl, tp1: bar.close - e.tp1RR * risk, tp2: bar.close - e.tp2RR * risk, tp3: bar.close - e.tp3RR * risk,
    };
  }

  return neutral(
    `Pas de setup : pression ${p.toFixed(2)}, contexte ${ctxPressure.toFixed(2)} ` +
      `(seuils achat ${e.bullReversalMin}/${e.bearContextMax}, vente ${e.bearReversalMax}/${e.bullContextMin}).`,
  );
}

/**
 * Mesure de "Min_Context_Depth", selon l'interpretation retenue.
 *  clarity : a quel point le contexte est tranche (distance au neutre 0.5)
 *  sweep   : de combien la bougie de signal depasse l'extreme du contexte, en ATR
 */
export function contextDepth(ctxPressure: number, sweepDistance: number, atrValue: number): number {
  return config.enigma.contextDepthMode === 'clarity'
    ? Math.abs(ctxPressure - 0.5)
    : sweepDistance / atrValue;
}

const depthLabel = (): string =>
  config.enigma.contextDepthMode === 'clarity' ? 'nettete du contexte' : 'profondeur de balayage (x ATR)';

/**
 * Filtre HTF. Renvoie null si le setup passe, sinon le motif de rejet.
 * Le mode est configurable parce que la regle exacte de l'indicateur est inconnue :
 * la seule fleche calibree jusqu'ici (achat avec une H1 a 21% de pression) exclut
 * le mode "aligned" et reste compatible avec "contrarian" et "clear".
 */
function checkHtf(htf: { pressure: number; bodyAtr: number } | null, side: 'BUY' | 'SELL'): string | null {
  const e = config.enigma;
  if (!e.useHtf || e.htfMode === 'off') return null;
  if (!htf) return 'pas de donnee HTF cloturee disponible.';
  if (htf.bodyAtr < e.htfMinBodyAtr) return `corps HTF ${htf.bodyAtr.toFixed(2)} x ATR < ${e.htfMinBodyAtr}.`;
  const p = htf.pressure;
  const min = e.htfMinPressure;
  const max = 1 - min;
  switch (e.htfMode) {
    case 'aligned':
      return side === 'BUY'
        ? (p >= min ? null : `pression HTF ${p.toFixed(2)} < ${min} (mode aligned).`)
        : (p <= max ? null : `pression HTF ${p.toFixed(2)} > ${max.toFixed(2)} (mode aligned).`);
    case 'contrarian':
      return side === 'BUY'
        ? (p <= max ? null : `pression HTF ${p.toFixed(2)} > ${max.toFixed(2)} : la H1 ne montre pas d exces vendeur a fader (mode contrarian).`)
        : (p >= min ? null : `pression HTF ${p.toFixed(2)} < ${min} : la H1 ne montre pas d exces acheteur a fader (mode contrarian).`);
    case 'clear':
      return p >= min || p <= max ? null : `pression HTF ${p.toFixed(2)} sans direction nette (mode clear).`;
    default:
      return null;
  }
}

/** null = bougies de confirmation pas encore disponibles. */
function confirms(candles: Candle[], i: number, side: 'BUY' | 'SELL', bars: number): boolean | null {
  if (i + bars >= candles.length) return null;
  const ref = (candles[i] as Candle).close;
  for (let k = i + 1; k <= i + bars; k++) {
    const c = candles[k] as Candle;
    if (side === 'BUY' && c.close > ref) return true;
    if (side === 'SELL' && c.close < ref) return true;
  }
  return false;
}
