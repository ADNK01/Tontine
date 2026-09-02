/**
 * Strategie "SDC Exhaust / Sdv_Wyckoff" — TRANSCRIPTION du code source MQL4.
 *
 * Contrairement au module enigma.ts, il n'y a ici AUCUNE devinette : la logique
 * est traduite ligne a ligne de `Enigma_Wyckoff_Pro_V3.mq4` (en-tete interne
 * `Sdv_Wyckoff.mq4`, "SDC EXHAUST 3.02 QUANTUM ENGINE", version 3.03).
 *
 * Pipeline, avec les valeurs PAR DEFAUT du fichier source :
 *   1. DIVERGENCE (ancre)  — Quantum (energie cinetique, delta d'ordres, velocite
 *      RSI) et/ou Hidden (RSI). Seuls filtres actifs par defaut.
 *   2. ATTENTE AVANT       — jusqu'a Filter_Ready_Window bougies plus recentes,
 *      on cherche le motif d'epuisement dans le sens de la divergence.
 *   3. DECLENCHEUR         — serie de plus-bas (ou plus-hauts) consecutifs, puis
 *      cloture de retour au-dela du milieu de la serie.
 *   4. ESPACEMENT          — Min_Bars_Between bougies entre deux signaux.
 *   Les filtres SDC, Squeeze, Ratio, CCI, RSI, ADX, HTF, EMA, Volume, Session,
 *   Spread sont a `false` par defaut dans la source : ils ne sont pas transcrits.
 *
 * ECARTS CONNUS, a garder en tete avant de comparer aux fleches :
 *  - `Volume[]` vaut le volume de TICKS chez MetaTrader, alors que les donnees
 *    publiques utilisees ici portent un volume d'echange reel. Les mesures
 *    d'energie et de delta en dependent directement.
 *  - Les prix du broker (CFD BTCUSD) different de ceux d'une place au comptant.
 */
import { config } from './config.js';
import type { Candle } from './types.js';

/** Vue a l'indexation MetaTrader : 0 = bougie en cours, 1 = derniere cloturee. */
class MtSeries {
  constructor(private readonly c: Candle[]) {}
  get bars(): number { return this.c.length; }
  private at(i: number): Candle { return this.c[this.c.length - 1 - i] as Candle; }
  open(i: number): number { return this.at(i).open; }
  high(i: number): number { return this.at(i).high; }
  low(i: number): number { return this.at(i).low; }
  close(i: number): number { return this.at(i).close; }
  volume(i: number): number { return this.at(i).volume; }
  time(i: number): number { return this.at(i).openTime; }
  /** Index chronologique correspondant a un shift MetaTrader. */
  toChrono(i: number): number { return this.c.length - 1 - i; }
  valid(i: number): boolean { return i >= 0 && i < this.c.length; }
}

/** ATR de MetaTrader 4 : moyenne SIMPLE des true ranges (cf. ATR.mq4). */
function mtAtr(s: MtSeries, period: number, shift: number): number {
  if (!s.valid(shift + period)) return 0;
  let sum = 0;
  for (let k = shift; k < shift + period; k++) {
    const prevClose = s.close(k + 1);
    sum += Math.max(s.high(k) - s.low(k), Math.abs(s.high(k) - prevClose), Math.abs(s.low(k) - prevClose));
  }
  return sum / period;
}

/** RSI de Wilder, calcule chronologiquement puis indexe a la MetaTrader. */
function buildRsi(candles: Candle[], period: number): number[] {
  const n = candles.length;
  const out = new Array<number>(n).fill(Number.NaN);
  if (n <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (candles[i] as Candle).close - (candles[i - 1] as Candle).close;
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < n; i++) {
    const d = (candles[i] as Candle).close - (candles[i - 1] as Candle).close;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface WyckoffSignal {
  /** Index chronologique de la bougie de declenchement. */
  index: number;
  time: number;
  side: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  atr: number;
  reason: string;
}

export function wyckoffSignals(candles: Candle[]): WyckoffSignal[] {
  const w = config.wyckoff;
  const s = new MtSeries(candles);
  const bars = s.bars;
  const rsiChrono = buildRsi(candles, w.divRsiPeriod);
  const rsi = (shift: number): number => {
    const idx = s.toChrono(shift);
    const v = rsiChrono[idx];
    return v === undefined || Number.isNaN(v) ? 50 : v;
  };

  // ── Cache des pivots de prix (BuildPricePivotCache) ──────────────────────
  const sw = Math.max(w.rsiSwingBars, 2);
  const pivLow = new Array<number>(bars).fill(0);
  const pivHigh = new Array<number>(bars).fill(0);
  const maxProcessableIdx = bars - sw - 2;
  for (let idx = sw; idx <= maxProcessableIdx; idx++) {
    const leftAvail = Math.min(sw, bars - 1 - idx);
    if (leftAvail < sw) continue;
    const rightAvail = Math.min(sw, idx);
    if (rightAvail < sw) continue;

    let isTrough = true;
    for (let j = 1; j <= leftAvail && isTrough; j++) if (s.low(idx + j) <= s.low(idx)) isTrough = false;
    for (let j = 1; j <= rightAvail && isTrough; j++) if (s.low(idx - j) < s.low(idx)) isTrough = false;
    if (isTrough) pivLow[idx] = s.low(idx);

    let isPeak = true;
    for (let j = 1; j <= leftAvail && isPeak; j++) if (s.high(idx + j) >= s.high(idx)) isPeak = false;
    for (let j = 1; j <= rightAvail && isPeak; j++) if (s.high(idx - j) > s.high(idx)) isPeak = false;
    if (isPeak) pivHigh[idx] = s.high(idx);
  }
  const cacheBars = maxProcessableIdx + 1;

  // ── Mesures quantiques ───────────────────────────────────────────────────
  const point = w.point;
  const pivotEnergy = (pivIdx: number, sig: number, lookback: number): number => {
    let energy = 0;
    for (let i = pivIdx; i < pivIdx + lookback && i < bars; i++) {
      if (sig === 1 && s.close(i) < s.open(i)) {
        const move = (s.open(i) - s.close(i)) / point;
        energy += s.volume(i) * move * move;
      } else if (sig === -1 && s.close(i) > s.open(i)) {
        const move = (s.close(i) - s.open(i)) / point;
        energy += s.volume(i) * move * move;
      }
    }
    return energy;
  };
  const pivotDelta = (pivIdx: number, lookback: number): number => {
    let delta = 0;
    for (let i = pivIdx; i < pivIdx + lookback && i < bars; i++) {
      const range = s.high(i) - s.low(i);
      if (range <= 0) continue;
      const vol = s.volume(i);
      delta += (vol * (s.close(i) - s.low(i))) / range - (vol * (s.high(i) - s.close(i))) / range;
    }
    return delta;
  };
  const rsiVelocity = (pivIdx: number): number => {
    if (pivIdx + 5 >= bars) return 0;
    return rsi(pivIdx) - rsi(pivIdx + 5);
  };

  // ── Divergence (CheckDivergence) ─────────────────────────────────────────
  /**
   * Renvoie la raison si la divergence est confirmee, null sinon.
   *
   * Fidele a la source : quand l'historique est insuffisant, l'original renvoie
   * TRUE ("N/A" au tableau de bord), c'est-a-dire qu'il LAISSE PASSER. Ce n'est
   * pas un oubli de transcription : le comportement est volontairement permissif
   * au bord des donnees. Consequence a connaitre — dans EvaluateBar, le sens
   * haussier est teste en premier, donc sur une fenetre trop courte tous les
   * signaux sortent en ACHAT.
   */
  const checkDivergence = (bar: number, sig: number): string | null => {
    const lkb = w.divLookback + w.rsiSwingBars + 10;
    if (bar + lkb >= bars) return 'historique insuffisant (la source laisse passer)';
    const atrV = mtAtr(s, w.atrPeriod, bar);
    if (atrV <= 0) return 'ATR indisponible (la source laisse passer)';

    let maxPiv = bar + w.divLookback;
    if (maxPiv >= cacheBars) maxPiv = cacheBars - 1;
    if (maxPiv < bar + w.divMinGap) return 'pas assez de pivots en cache (la source laisse passer)';

    const piv = sig === 1 ? pivLow : pivHigh;
    for (let p1 = bar; p1 <= maxPiv - w.divMinGap; p1++) {
      if (p1 >= cacheBars) break;
      if ((piv[p1] ?? 0) <= 0) continue;
      for (let p2 = p1 + w.divMinGap; p2 <= maxPiv; p2++) {
        if (p2 >= cacheBars) break;
        if ((piv[p2] ?? 0) <= 0) continue;

        const price1 = sig === 1 ? s.low(p1) : s.high(p1);
        const price2 = sig === 1 ? s.low(p2) : s.high(p2);
        const minDiff = atrV * w.priceMinDiffAtr;

        // Divergence quantique classique
        const priceExtends = sig === 1 ? price1 < price2 : price1 > price2;
        const priceGap = sig === 1 ? price2 - price1 : price1 - price2;
        if (w.useQuantumDiv && priceExtends && priceGap >= minDiff) {
          let confirms = 0;
          const marks: string[] = [];
          if (w.useKineticEnergy) {
            const ke1 = pivotEnergy(p1, sig, w.quantumLookback);
            const ke2 = pivotEnergy(p2, sig, w.quantumLookback);
            const ok = ke2 > 0 && ke1 / ke2 < w.keDecayThreshold;
            if (ok) confirms++;
            marks.push(`KE:${ok ? 'ok' : 'non'}`);
          }
          if (w.useOrderFlowDelta) {
            const d1 = pivotDelta(p1, w.quantumLookback);
            const d2 = pivotDelta(p2, w.quantumLookback);
            const ok = sig === 1 ? d1 > d2 : d1 < d2;
            if (ok) confirms++;
            marks.push(`Delta:${ok ? 'ok' : 'non'}`);
          }
          if (w.usePhaseVelocity) {
            const v1 = rsiVelocity(p1);
            const v2 = rsiVelocity(p2);
            const ok = sig === 1 ? v1 > v2 : v1 < v2;
            if (ok) confirms++;
            marks.push(`Vel:${ok ? 'ok' : 'non'}`);
          }
          if (confirms >= w.minQuantumConfirms) {
            return `Divergence quantique ${sig === 1 ? 'haussiere' : 'baissiere'} [${marks.join(' ')}]`;
          }
        }

        // Divergence cachee (RSI)
        const priceRetraces = sig === 1 ? price1 > price2 : price1 < price2;
        const retraceGap = sig === 1 ? price1 - price2 : price2 - price1;
        if (w.useHiddenDiv && priceRetraces && retraceGap >= minDiff) {
          const r1 = rsi(p1);
          const r2 = rsi(p2);
          const ok = sig === 1 ? r1 < r2 && r2 - r1 >= w.minOscDiff : r1 > r2 && r1 - r2 >= w.minOscDiff;
          if (ok) return `Divergence cachee ${sig === 1 ? 'haussiere' : 'baissiere'} (RSI ${r1.toFixed(1)} vs ${r2.toFixed(1)})`;
        }
      }
    }
    return null;
  };

  // ── Declencheur (DetectWyckoff) ──────────────────────────────────────────
  const detect = (bar: number): { sig: number; reason: string } | null => {
    if (bar + w.rangeLookback + 2 >= bars) return null;
    const atrV = mtAtr(s, w.atrPeriod, bar);
    if (atrV <= 0) return null;

    const runStart = bar + 1;
    let maxLook = bar + w.rangeLookback;
    if (maxLook >= bars) maxLook = bars - 1;
    if (runStart >= maxLook) return null;

    const minDepth = atrV * w.sweepAtrMin;
    const maxDepth = atrV * w.sweepAtrMax;

    // Serie baissiere : plus-bas consecutifs
    let downRun = 0;
    let idx = runStart;
    while (idx + 1 <= maxLook && s.low(idx) < s.low(idx + 1)) { downRun++; idx++; }
    let runLow = s.low(runStart);
    let runTopD = s.high(runStart);
    for (let k = runStart; k <= idx; k++) {
      if (s.low(k) < runLow) runLow = s.low(k);
      if (s.high(k) > runTopD) runTopD = s.high(k);
    }
    const downDisp = runTopD - runLow;
    if (downRun >= w.rangeMinAge && downDisp >= minDepth && downDisp <= maxDepth) {
      const midDown = runLow + downDisp * 0.5;
      if (s.close(bar) > midDown && s.close(bar) > s.open(bar)) {
        return { sig: 1, reason: `Epuisement baissier : ${downRun} plus-bas consecutifs, amplitude ${(downDisp / atrV).toFixed(2)} x ATR, cloture au-dessus du milieu` };
      }
    }

    // Serie haussiere : plus-hauts consecutifs
    let upRun = 0;
    let idx2 = runStart;
    while (idx2 + 1 <= maxLook && s.high(idx2) > s.high(idx2 + 1)) { upRun++; idx2++; }
    let runHigh = s.high(runStart);
    let runBotU = s.low(runStart);
    for (let k = runStart; k <= idx2; k++) {
      if (s.high(k) > runHigh) runHigh = s.high(k);
      if (s.low(k) < runBotU) runBotU = s.low(k);
    }
    const upDisp = runHigh - runBotU;
    if (upRun >= w.rangeMinAge && upDisp >= minDepth && upDisp <= maxDepth) {
      const midUp = runHigh - upDisp * 0.5;
      if (s.close(bar) < midUp && s.close(bar) < s.open(bar)) {
        return { sig: -1, reason: `Epuisement haussier : ${upRun} plus-hauts consecutifs, amplitude ${(upDisp / atrV).toFixed(2)} x ATR, cloture sous le milieu` };
      }
    }
    return null;
  };

  // ── Boucle principale (OnCalculate + EvaluateBar) ────────────────────────
  const lkb = Math.max(w.rangeLookback, w.ratioLen) + 5;
  const placed = new Map<number, number>();   // shift MT -> sens
  const out: WyckoffSignal[] = [];
  const divActive = w.useQuantumDiv || w.useHiddenDiv;

  const maxBar = bars - lkb - 5;
  for (let bar = maxBar; bar >= 1; bar--) {
    if (placed.has(bar)) continue;
    if (bar < 1 || bar + lkb >= bars) continue;

    // Etape 1 : divergence a l'ancre
    let divSig = 0;
    let divReason = 'divergence desactivee';
    if (divActive) {
      const bull = checkDivergence(bar, 1);
      if (bull) { divSig = 1; divReason = bull; }
      else {
        const bear = checkDivergence(bar, -1);
        if (bear) { divSig = -1; divReason = bear; }
        else continue;
      }
    }

    // Etape 2 : attente vers l'avant, jusqu'a Filter_Ready_Window bougies
    const maxW = divActive ? Math.min(w.filterReadyWindow, bar - 1) : 0;
    let foundBar = -1;
    let sig = 0;
    let trigReason = '';
    for (let k = 0; k <= Math.max(0, maxW); k++) {
      const tb = bar - k;
      if (tb < 1 || tb + lkb >= bars) continue;
      if (s.high(tb) <= 0 || s.low(tb) <= 0 || s.close(tb) <= 0 || s.high(tb) <= s.low(tb)) continue;
      const d = detect(tb);
      if (!d) continue;
      if (divActive && d.sig !== divSig) continue;
      foundBar = tb; sig = d.sig; trigReason = d.reason;
      break;
    }
    if (foundBar < 0) continue;
    if (placed.has(foundBar)) continue;

    // Espacement : le signal precedent est sur une bougie PLUS ANCIENNE
    let prevBar = -1;
    for (let b = foundBar + 1; b <= Math.min(foundBar + w.scanWindow, bars - 1); b++) {
      if (placed.has(b)) { prevBar = b; break; }
    }
    if (w.minBarsBetween > 0 && prevBar >= 0 && prevBar - foundBar < w.minBarsBetween) continue;

    // Placement du signal (PlaceSignal) : le stop part de l'extreme de la bougie
    let atrV = mtAtr(s, w.atrPeriod, foundBar);
    if (atrV <= 0) atrV = point * 100;
    const entry = s.close(foundBar);
    const sl = sig === 1 ? s.low(foundBar) - atrV * w.slAtrMulti : s.high(foundBar) + atrV * w.slAtrMulti;
    const risk = Math.abs(entry - sl);
    if (risk <= 0) continue;

    placed.set(foundBar, sig);
    out.push({
      index: s.toChrono(foundBar),
      time: s.time(foundBar),
      side: sig === 1 ? 'BUY' : 'SELL',
      entry, sl,
      tp1: sig === 1 ? entry + risk * w.tp1RR : entry - risk * w.tp1RR,
      tp2: sig === 1 ? entry + risk * w.tp2RR : entry - risk * w.tp2RR,
      tp3: sig === 1 ? entry + risk * w.tp3RR : entry - risk * w.tp3RR,
      atr: atrV,
      reason: `${trigReason}. ${divReason}.`,
    });
  }

  return out.sort((a, b) => a.index - b.index);
}
