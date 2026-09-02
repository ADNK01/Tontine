/**
 * Orchestration d'un scan unique :
 * marche -> strategie -> risque -> (memoire si disponible) -> execution papier.
 */
import { config } from './config.js';
import { log } from './logger.js';
import { getCandles, closedCandles } from './market.js';
import { evaluateLatest } from './strategy.js';
import { aggregate } from './indicators.js';
import { checkRisk } from './risk.js';
import { assertPaperMode, simulatePaperOrder } from './execution.js';
import { evaluateMemory } from './adaptiveFilter.js';
import { appendLedgerRow, memoryFilesExist, readLearnings, readLedger } from './memory.js';
import type { Action } from './types.js';

export async function runScan(): Promise<Action> {
  assertPaperMode();
  const stratLabel = config.strategy === 'enigma' ? 'ENIGMA CIPHER (reconstruction)' : `MA${config.fastPeriod}/${config.slowPeriod}`;
  log.title(`SCAN — ${config.symbol} ${config.interval} — ${stratLabel} — MODE PAPIER`);
  log.step('COMPTE', `Capital ${config.accountBalance.toFixed(2)}, risque vise ${(config.riskPerTrade * 100).toFixed(1)}% par trade.`);

  const set = await getCandles();
  const candles = closedCandles(set.candles);
  const last = candles[candles.length - 1];
  if (!last) {
    log.error('Aucune bougie cloturee exploitable.');
    return 'SKIP';
  }
  log.step('MARCHE', `${candles.length} bougies cloturees. Derniere : ${new Date(last.openTime).toISOString()} cloture ${last.close}`);

  const htf = config.strategy === 'enigma' && config.enigma.useHtf ? aggregate(candles, config.enigma.htfFactor) : undefined;
  const signal = evaluateLatest(candles, { htf });
  if (!signal) {
    log.error('Pas assez de bougies pour calculer les moyennes mobiles.');
    return 'SKIP';
  }
  log.step('SIGNAL', `${signal.action} — ${signal.reason}`);
  if (signal.sl !== undefined) {
    log.step('NIVEAUX', `Entree ${signal.price.toFixed(2)} | SL ${signal.sl.toFixed(2)} (${config.enigma.slAtrMulti} x ATR ${signal.atr?.toFixed(2)}) | TP1 ${signal.tp1?.toFixed(2)} | TP2 ${signal.tp2?.toFixed(2)} | TP3 ${signal.tp3?.toFixed(2)}`);
  }

  if (signal.action === 'HOLD') {
    log.step('DECISION', 'HOLD — aucun ordre papier, aucun setup valide sur cette bougie.');
    return 'HOLD';
  }

  if (memoryFilesExist()) {
    const verdict = evaluateMemory(signal, await readLedger(), await readLearnings());
    log.step('MEMOIRE', verdict.reason);
    if (verdict.blocked) {
      log.step('DECISION', `SKIP — bloque par la memoire. ${verdict.reason}`);
      await appendLedgerRow({
        timestamp: new Date(signal.time).toISOString(),
        symbol: config.symbol, action: 'SKIP', price: signal.price, quantity: 0,
        reason: `${signal.setupKey} :: SKIP memoire :: ${verdict.reason}`,
        mode: 'scan', outcome: 'SKIPPED', pnl: 0,
      });
      return 'SKIP';
    }
  } else {
    log.step('MEMOIRE', 'Aucun fichier de memoire : le scan tourne en mode baseline brute.');
  }

  const risk = checkRisk(signal);
  log.step('RISQUE', risk.reason);
  if (!risk.approved) {
    log.step('DECISION', `${risk.action} — ${risk.reason}`);
    return risk.action;
  }

  const order = simulatePaperOrder(signal, risk);
  if (memoryFilesExist()) {
    await appendLedgerRow({
      timestamp: new Date(order.time).toISOString(),
      symbol: order.symbol, action: order.side, price: order.price, quantity: order.quantity,
      reason: `${signal.setupKey} :: ${signal.reason}`,
      mode: 'scan', outcome: 'OPEN', pnl: 0,
    });
  }
  log.step('DECISION', `${order.side} papier enregistre. Aucun ordre reel envoye.`);
  return order.side;
}
