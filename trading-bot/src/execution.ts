/**
 * Execution : simulation papier uniquement.
 * Aucun endpoint d'ordre reel, aucune cle API, aucun chemin vers du live.
 * Le garde-fou ci-dessous refuse de s'executer si TRADING_MODE n'est pas 'paper'.
 */
import { config } from './config.js';
import { log } from './logger.js';
import type { PaperOrder, RiskDecision, StrategySignal } from './types.js';

export function assertPaperMode(): void {
  if (config.tradingMode !== 'paper') {
    throw new Error(
      `Garde-fou : TRADING_MODE="${config.tradingMode}". Ce projet ne supporte que le mode 'paper'. ` +
        "Aucun ordre reel ne sera jamais envoye par ce code.",
    );
  }
}

/** Simule un ordre. Rien ne quitte la machine. */
export function simulatePaperOrder(signal: StrategySignal, risk: RiskDecision): PaperOrder {
  assertPaperMode();
  if (!risk.approved || (signal.action !== 'BUY' && signal.action !== 'SELL')) {
    throw new Error('simulatePaperOrder appele sans signal approuve : bug d\'orchestration.');
  }
  const order: PaperOrder = {
    time: signal.time,
    symbol: config.symbol,
    side: signal.action,
    price: signal.price,
    quantity: risk.quantity,
    mode: 'paper',
  };
  log.step('EXECUTION', `Ordre PAPIER simule : ${order.side} ${order.quantity} ${order.symbol} @ ${order.price} (aucun ordre reel envoye)`);
  return order;
}
