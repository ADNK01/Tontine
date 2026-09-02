/**
 * Controle du risque : approuve ou rejette un signal.
 * Pour une strategie qui fournit un stop (Enigma), la taille de position est
 * calculee depuis le capital reel ; sinon on retombe sur la quantite fixe.
 */
import { config } from './config.js';
import { sizePosition, minimumViableBalance } from './sizing.js';
import type { RiskDecision, StrategySignal } from './types.js';

export function checkRisk(signal: StrategySignal, balance: number = config.accountBalance): RiskDecision {
  if (signal.action === 'HOLD') {
    return { approved: false, action: 'HOLD', reason: 'Aucun signal a valider : le bot reste hors marche.', quantity: 0 };
  }

  // --- Strategie avec stop : dimensionnement depuis le capital ---
  if (signal.sl !== undefined) {
    const slDistance = Math.abs(signal.price - signal.sl);
    const sizing = sizePosition(slDistance, balance);
    if (!sizing.feasible) {
      const needed = minimumViableBalance(slDistance);
      return {
        approved: false,
        action: 'SKIP',
        reason:
          `${sizing.reason} Capital necessaire pour respecter ${(config.riskPerTrade * 100).toFixed(1)}% de risque ` +
          `avec ce stop : environ ${needed.toFixed(2)}.`,
        quantity: 0,
      };
    }
    const lots = sizing.brokerLots as number;
    if (lots > config.maxPosition) {
      return {
        approved: false, action: 'SKIP', quantity: lots,
        reason: `Lot calcule ${lots.toFixed(2)} superieur a la position maximale ${config.maxPosition} : ordre ignore.`,
      };
    }
    return { approved: true, action: signal.action, quantity: lots, reason: sizing.reason };
  }

  // --- Strategie sans stop : quantite fixe ---
  const quantity = config.quantity;
  if (!(quantity > 0)) {
    return { approved: false, action: 'SKIP', reason: `Quantite invalide (${quantity}) : elle doit etre strictement positive.`, quantity };
  }
  if (quantity > config.maxPosition) {
    return {
      approved: false, action: 'SKIP', quantity,
      reason: `Quantite ${quantity} superieure a la position maximale autorisee ${config.maxPosition} : ordre ignore.`,
    };
  }
  return { approved: true, action: signal.action, quantity, reason: `Risque valide : quantite ${quantity} <= position max ${config.maxPosition}.` };
}
