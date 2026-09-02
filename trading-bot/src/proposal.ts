/**
 * Mode PROPOSITION : le bot calcule un ticket d'ordre complet et l'ecrit,
 * mais n'envoie RIEN. C'est le seul mode d'execution non-papier de ce projet.
 *
 * Pourquoi une proposition et pas un envoi direct : ce bot est un processus Node
 * local. Il ne detient aucune cle d'API de venue et n'a aucun endpoint d'ordre.
 * L'envoi eventuel est fait ailleurs (application du broker, ou session Claude
 * disposant du connecteur), apres lecture du ticket par un humain.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { log } from './logger.js';
import { getCandles, getHtfCandles, closedCandles } from './market.js';
import { evaluateLatest } from './strategy.js';
import { resolveHtf } from './replay.js';
import { sizePosition, minimumViableBalance } from './sizing.js';
import { evaluateMemory } from './adaptiveFilter.js';
import { memoryFilesExist, readLedger, readLearnings } from './memory.js';
import type { StrategySignal } from './types.js';

const PROPOSALS = 'data/proposals.jsonl';

export interface OrderTicket {
  createdAt: string;
  status: 'PROPOSE' | 'REFUSE';
  symbol: string;
  interval: string;
  side: 'BUY' | 'SELL' | null;
  size: number | null;
  notional: number | null;
  entry: number;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  riskAmount: number | null;
  riskPctOfBalance: number | null;
  balance: number;
  atr: number | null;
  dataSource: string;
  dataFreshness: string;
  reason: string;
  /** Toujours false : ce module n'envoie jamais d'ordre. */
  sent: false;
}

function printTicket(t: OrderTicket): void {
  log.blank();
  console.log('┌─ TICKET D ORDRE — PROPOSITION, RIEN N A ETE ENVOYE ─────────────────────────');
  console.log(`│ Statut        : ${t.status}`);
  console.log(`│ Marche        : ${t.symbol} ${t.interval}`);
  if (t.side) {
    console.log(`│ Sens          : ${t.side}`);
    console.log(`│ Taille        : ${t.size} (notionnel ${t.notional?.toFixed(2)} USDT)`);
    console.log(`│ Entree        : ${t.entry.toFixed(2)}`);
    console.log(`│ Stop loss     : ${t.stopLoss?.toFixed(2)}   (perte ${t.riskAmount?.toFixed(2)} USDT = ${((t.riskPctOfBalance ?? 0) * 100).toFixed(2)}% du compte)`);
    console.log(`│ TP1 / TP2 / TP3 : ${t.takeProfit1?.toFixed(2)} / ${t.takeProfit2?.toFixed(2)} / ${t.takeProfit3?.toFixed(2)}`);
  }
  console.log(`│ Capital       : ${t.balance.toFixed(2)} USDT`);
  console.log(`│ Donnees       : ${t.dataFreshness}`);
  console.log(`│ Motif         : ${t.reason}`);
  console.log('└─ Aucun ordre envoye. Pour executer : relisez le ticket et agissez vous-meme.');
}

export async function runPropose(): Promise<OrderTicket> {
  log.title(`PROPOSITION — ${config.symbol} ${config.interval} — strategie ${config.strategy}`);
  log.step('COMPTE', `Capital declare ${config.accountBalance.toFixed(2)}, risque vise ${(config.riskPerTrade * 100).toFixed(1)}% par trade.`);
  log.warn('Ce mode ne passe aucun ordre. Il produit un ticket a relire.');

  const set = await getCandles();
  const candles = closedCandles(set.candles);
  const last = candles[candles.length - 1];
  const htf = await resolveHtf(candles);
  const signal = evaluateLatest(candles, { htf });

  const ageMinutes = last ? Math.round((Date.now() - last.openTime) / 60000) : Number.NaN;
  const freshness = `${set.source === 'live-http' ? 'temps reel' : 'SNAPSHOT ARCHIVE'} — derniere bougie il y a ${ageMinutes} minutes`;
  if (set.source !== 'live-http') {
    log.warn(`Donnees non temps reel (${freshness}). Un ticket bati sur des donnees perimees ne vaut rien : rafraichissez le cache avant d'agir.`);
  }

  const base = {
    createdAt: new Date().toISOString(),
    symbol: config.symbol, interval: config.interval,
    balance: config.accountBalance,
    dataSource: set.sourceLabel, dataFreshness: freshness,
    sent: false as const,
  };

  const refuse = (reason: string, s?: StrategySignal): OrderTicket => ({
    ...base, status: 'REFUSE', side: null, size: null, notional: null,
    entry: s?.price ?? last?.close ?? 0, stopLoss: null,
    takeProfit1: null, takeProfit2: null, takeProfit3: null,
    riskAmount: null, riskPctOfBalance: null, atr: s?.atr ?? null, reason,
  });

  let ticket: OrderTicket;

  if (!signal || signal.action === 'HOLD' || signal.sl === undefined) {
    ticket = refuse(signal ? signal.reason : 'Pas assez de bougies pour evaluer la strategie.', signal ?? undefined);
  } else {
    const slDistance = Math.abs(signal.price - signal.sl);
    const sizing = sizePosition(slDistance);

    if (!sizing.feasible) {
      ticket = refuse(
        `${sizing.reason} Capital minimum pour ce stop a ${(config.riskPerTrade * 100).toFixed(1)}% de risque : ` +
          `${minimumViableBalance(slDistance).toFixed(2)}.`,
        signal,
      );
    } else if (memoryFilesExist() && evaluateMemory(signal, await readLedger(), await readLearnings()).blocked) {
      const verdict = evaluateMemory(signal, await readLedger(), await readLearnings());
      ticket = refuse(`Bloque par la memoire. ${verdict.reason}`, signal);
    } else {
      const size = sizing.brokerLots as number;
      ticket = {
        ...base, status: 'PROPOSE', side: signal.action,
        size, notional: size * signal.price * config.contractSize,
        entry: signal.price, stopLoss: signal.sl,
        takeProfit1: signal.tp1 ?? null, takeProfit2: signal.tp2 ?? null, takeProfit3: signal.tp3 ?? null,
        riskAmount: sizing.riskAtBrokerLots, riskPctOfBalance: sizing.actualRiskFraction,
        atr: signal.atr ?? null, reason: signal.reason,
      };
    }
  }

  printTicket(ticket);
  await mkdir(path.dirname(PROPOSALS), { recursive: true });
  await appendFile(PROPOSALS, JSON.stringify(ticket) + '\n', 'utf8');
  log.info(`Ticket archive dans ${PROPOSALS}.`);
  return ticket;
}
