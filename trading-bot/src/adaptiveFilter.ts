/**
 * Filtre adaptatif : la seule piece qui transforme la memoire en decision.
 *
 * Avant tout BUY / SELL il repond a trois questions :
 *   1. Ce symbole a-t-il deja perdu sur un setup similaire ?
 *   2. learnings.md met-il en garde contre ce setup ?
 *   3. Ce signal repete-t-il un mauvais trade connu ?
 *
 * Il ne bloque QUE si des pertes reelles enregistrees le justifient.
 */
import { config } from './config.js';
import type { LedgerRow, StrategySignal } from './types.js';

export interface FilterVerdict {
  blocked: boolean;
  reason: string;
  priorTrades: number;
  priorLosses: number;
  priorWins: number;
  winRate: number | null;
  learningsWarns: boolean;
}

export function evaluateMemory(
  signal: StrategySignal,
  ledger: LedgerRow[],
  learnings: string,
  /** Anti-lookahead : n'utilise que les lignes anterieures au setup evalue. */
  beforeTime: number = Number.POSITIVE_INFINITY,
): FilterVerdict {
  const history = ledger.filter(
    (r) =>
      r.reason.includes(signal.setupKey) &&
      (r.outcome === 'WIN' || r.outcome === 'LOSS' || r.outcome === 'FLAT') &&
      Date.parse(r.timestamp) < beforeTime,
  );
  const priorLosses = history.filter((r) => r.outcome === 'LOSS').length;
  const priorWins = history.filter((r) => r.outcome === 'WIN').length;
  const decided = priorWins + priorLosses;
  const winRate = decided > 0 ? priorWins / decided : null;
  const learningsWarns = learnings.includes(`<!-- setup:${signal.setupKey} -->`);

  if (history.length === 0) {
    return {
      blocked: false,
      reason: `Aucun historique reel pour ${signal.setupKey} : rien a opposer a ce signal.`,
      priorTrades: 0, priorLosses: 0, priorWins: 0, winRate: null, learningsWarns,
    };
  }

  const base = { priorTrades: history.length, priorLosses, priorWins, winRate, learningsWarns };

  if (priorLosses < config.memoryMinLosses) {
    return {
      ...base,
      blocked: false,
      reason: `Historique insuffisant : ${priorLosses} perte(s) reelle(s) sur ${history.length} setup(s), seuil de blocage a ${config.memoryMinLosses}.`,
    };
  }
  if (winRate !== null && winRate >= config.memoryMaxWinRate) {
    return {
      ...base,
      blocked: false,
      reason: `Setup deja perdant ${priorLosses} fois mais taux de reussite ${(winRate * 100).toFixed(0)}% >= seuil ${(config.memoryMaxWinRate * 100).toFixed(0)}% : pas de blocage.`,
    };
  }
  if (!learningsWarns) {
    return {
      ...base,
      blocked: false,
      reason: `Pertes reperees dans le ledger mais aucune lecon correspondante dans learnings.md : pas de blocage tant que la lecon n'est pas ecrite.`,
    };
  }
  return {
    ...base,
    blocked: true,
    reason: `Memoire : ${priorLosses} perte(s) reelle(s) sur ${history.length} occurrence(s) de ${signal.setupKey} (reussite ${winRate === null ? 'n/a' : (winRate * 100).toFixed(0) + '%'}) + mise en garde presente dans learnings.md.`,
  };
}
