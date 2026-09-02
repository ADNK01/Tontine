/**
 * Controle du risque : approuve ou rejette un signal.
 * Chaque decision porte une raison en francais clair.
 */
import { config } from './config.js';
import type { RiskDecision, StrategySignal } from './types.js';

export function checkRisk(signal: StrategySignal, quantity: number = config.quantity): RiskDecision {
  if (signal.action === 'HOLD') {
    return { approved: false, action: 'HOLD', reason: 'Aucun signal a valider : le bot reste hors marche.', quantity: 0 };
  }
  if (!(quantity > 0)) {
    return { approved: false, action: 'SKIP', reason: `Quantite invalide (${quantity}) : elle doit etre strictement positive.`, quantity };
  }
  if (quantity > config.maxPosition) {
    return {
      approved: false,
      action: 'SKIP',
      reason: `Quantite ${quantity} superieure a la position maximale autorisee ${config.maxPosition} : ordre ignore.`,
      quantity,
    };
  }
  return {
    approved: true,
    action: signal.action,
    reason: `Risque valide : quantite ${quantity} <= position max ${config.maxPosition}.`,
    quantity,
  };
}
