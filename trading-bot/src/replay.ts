/**
 * Replay honnete sur bougies reelles.
 *
 *  - replay:raw    : la strategie brute, sans memoire. C'est la reference.
 *  - replay:memory : meme strategie, mais chaque setup est confronte a la memoire.
 *
 * Sortie de position :
 *  - strategie avec stop (Enigma) : simulation barre par barre jusqu'au SL ou au TP,
 *    SL prioritaire si les deux sont touches dans la meme bougie (hypothese prudente) ;
 *  - strategie sans stop (MA) : sortie a horizon fixe.
 *
 * Aucune bougie generee, aucun echec force, aucune perte semee a la main.
 */
import { config } from './config.js';
import { log } from './logger.js';
import { getCandles, getHtfCandles, closedCandles } from './market.js';
import { collectSignals } from './sequence.js';
import { checkRisk } from './risk.js';
import { aggregate } from './indicators.js';
import { appendLearning, appendLedgerRow, readLedger, readLearnings } from './memory.js';
import { evaluateMemory } from './adaptiveFilter.js';
import { sizePosition } from './sizing.js';
import type { Candle, ReplaySkip, ReplaySummary, ReplayTrade, StrategySignal } from './types.js';

const iso = (t: number): string => new Date(t).toISOString().replace('T', ' ').slice(0, 16);

/** Vraies bougies HTF si une source dediee existe, sinon agregation des bougies courantes. */
export async function resolveHtf(candles: Candle[]): Promise<Candle[] | undefined> {
  if (config.strategy !== 'enigma' || !config.enigma.useHtf) return undefined;
  const set = await getHtfCandles();
  if (set) {
    const c = closedCandles(set.candles);
    log.step('HTF', `Source dediee : ${set.sourceLabel} (${c.length} bougies cloturees).`);
    return c;
  }
  const agg = aggregate(candles, config.enigma.htfFactor);
  log.step('HTF', `Pas de source ${config.htfInterval} dediee : agregation ${config.enigma.htfFactor} x ${config.interval} (${agg.length} bougies).`);
  return agg;
}

interface ExitResult {
  exit: number;
  exitKind: ReplayTrade['exitKind'];
  barsHeld: number;
}

/** Simule la vie de la position bougie par bougie, sans lookahead intra-bougie. */
function simulateExit(candles: Candle[], entryIndex: number, signal: StrategySignal): ExitResult | null {
  const maxHold = config.horizon;
  const last = Math.min(candles.length - 1, entryIndex + maxHold);

  if (signal.sl === undefined) {
    if (entryIndex + maxHold >= candles.length) return null;
    return { exit: (candles[entryIndex + maxHold] as Candle).close, exitKind: 'HORIZON', barsHeld: maxHold };
  }

  const targetRR = config.strategy === 'wyckoff' ? config.wyckoff.targetRR : config.enigma.targetRR;
  const target = targetRR === 3 ? signal.tp3 : targetRR === 2 ? signal.tp2 : signal.tp1;
  const isBuy = signal.action === 'BUY';

  for (let k = entryIndex + 1; k <= last; k++) {
    const c = candles[k] as Candle;
    const slHit = isBuy ? c.low <= signal.sl : c.high >= signal.sl;
    const tpHit = target !== undefined && (isBuy ? c.high >= target : c.low <= target);
    // Hypothese prudente : si les deux sont touches dans la meme bougie, on compte le stop.
    if (slHit) return { exit: signal.sl, exitKind: 'SL', barsHeld: k - entryIndex };
    if (tpHit && target !== undefined) return { exit: target, exitKind: 'TP', barsHeld: k - entryIndex };
  }
  if (last <= entryIndex) return null;
  if (entryIndex + maxHold >= candles.length) return null; // position encore ouverte a la fin des donnees
  return { exit: (candles[last] as Candle).close, exitKind: 'TIMEOUT', barsHeld: last - entryIndex };
}

function summarize(mode: 'raw' | 'memory', source: string, trades: ReplayTrade[], skipped: number, totalSetups: number): ReplaySummary {
  const wins = trades.filter((t) => t.outcome === 'WIN').length;
  const losses = trades.filter((t) => t.outcome === 'LOSS').length;
  const flats = trades.filter((t) => t.outcome === 'FLAT').length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const decided = wins + losses;

  let equity = 0, peak = 0, maxDrawdown = 0;
  for (const t of trades) {
    equity += t.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return {
    mode, symbol: config.symbol, interval: config.interval, source,
    totalSetups, taken: trades.length, skipped, wins, losses, flats,
    winRate: decided > 0 ? wins / decided : 0,
    totalPnl,
    avgPnl: trades.length > 0 ? totalPnl / trades.length : 0,
    best: trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0,
    worst: trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0,
    maxDrawdown,
    totalR: trades.reduce((s, t) => s + t.rMultiple, 0),
  };
}

function printTrades(trades: ReplayTrade[], skips: ReplaySkip[]): void {
  if (trades.length === 0 && skips.length === 0) {
    log.info('Aucun setup detecte dans la fenetre analysee.');
    return;
  }
  const head = ['#', 'DATE (UTC)', 'ACTION', 'ENTREE', 'SORTIE', 'SORTIE PAR', 'LOTS', 'PNL', 'R', 'RESULTAT'];
  const rows: string[][] = [];
  const all = [...trades.map((t) => ({ i: t.index, t })), ...skips.map((s) => ({ i: s.index, s }))].sort((a, b) => a.i - b.i);

  let n = 0;
  for (const item of all) {
    n++;
    if ('t' in item && item.t) {
      const t = item.t;
      rows.push([String(n), iso(t.time), t.action, t.entry.toFixed(2), t.exit.toFixed(2), t.exitKind,
        t.lots.toFixed(2), t.pnl.toFixed(2), t.rMultiple.toFixed(2), t.outcome]);
    } else if ('s' in item && item.s) {
      const s = item.s;
      rows.push([String(n), iso(s.time), `${s.action}->SKIP`, s.price.toFixed(2), '-', '-', '0.00', '0.00',
        `(evite ${s.avoidedR.toFixed(2)})`, 'SKIPPED']);
    }
  }
  const widths = head.map((h, c) => Math.max(h.length, ...rows.map((r) => (r[c] ?? '').length)));
  const line = (cells: string[]): string => cells.map((v, c) => v.padEnd(widths[c] as number)).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

function printSummary(s: ReplaySummary, title: string): void {
  log.blank();
  console.log(`--- ${title} ---`);
  console.log(`  Symbole / interval   : ${s.symbol} ${s.interval}`);
  console.log(`  Setups detectes      : ${s.totalSetups}`);
  console.log(`  Setups pris          : ${s.taken}`);
  console.log(`  Setups ignores       : ${s.skipped}`);
  console.log(`  Gagnants / perdants  : ${s.wins} / ${s.losses}${s.flats ? ` (${s.flats} nuls)` : ''}`);
  console.log(`  Taux de reussite     : ${(s.winRate * 100).toFixed(1)}%`);
  console.log(`  Resultat cumule      : ${s.totalR.toFixed(2)} R (independant du capital)`);
  console.log(`  PnL total            : ${s.totalPnl.toFixed(2)} (au lot simule)`);
  console.log(`  PnL moyen par trade  : ${s.avgPnl.toFixed(2)}`);
  console.log(`  Meilleur / pire      : ${s.best.toFixed(2)} / ${s.worst.toFixed(2)}`);
  console.log(`  Drawdown max         : ${s.maxDrawdown.toFixed(2)}`);
}

export async function runReplay(mode: 'raw' | 'memory'): Promise<ReplaySummary> {
  const stratLabel = config.strategy === 'wyckoff'
    ? `WYCKOFF transcrit (SL ${config.wyckoff.slAtrMulti} ATR depuis l extreme, cible ${config.wyckoff.targetRR}R)`
    : config.strategy === 'enigma'
      ? `ENIGMA (pression ${config.enigma.bullReversalMin}/${config.enigma.bearReversalMax}, SL ${config.enigma.slAtrMulti} ATR, cible ${config.enigma.targetRR}R)`
      : `MA${config.fastPeriod}/${config.slowPeriod}`;
  log.title(`REPLAY ${mode.toUpperCase()} — ${config.symbol} ${config.interval} — ${stratLabel}`);

  const set = await getCandles();
  const candles: Candle[] = closedCandles(set.candles);
  const htf = await resolveHtf(candles);

  const warmup = Math.max(config.slowPeriod, config.regimePeriod, config.atrPeriod + config.enigma.momentumBars + 1);
  if (candles.length < warmup + config.horizon + 5) {
    log.error(`Pas assez de bougies (${candles.length}) pour un replay avec ${warmup} bougies de chauffe.`);
    throw new Error('Historique insuffisant');
  }
  log.step('REPLAY', `${candles.length} bougies cloturees, duree de vie max d'une position : ${config.horizon} bougies.`);
  log.step('COMPTE', `Capital ${config.accountBalance.toFixed(2)}, risque vise ${(config.riskPerTrade * 100).toFixed(1)}% par trade, lot min ${config.minLot}, contrat ${config.contractSize}.`);

  const ledger = mode === 'memory' ? await readLedger() : [];
  const learnings = mode === 'memory' ? await readLearnings() : '';
  if (mode === 'memory') {
    log.step('MEMOIRE', `data/ledger.csv charge : ${ledger.length} ligne(s).`);
    log.step('MEMOIRE', `data/learnings.md charge : ${learnings.split('\n').filter((l) => l.startsWith('- ')).length} lecon(s).`);
    if (ledger.length === 0) log.warn("Memoire vide : lancez d'abord `npm run replay:raw` pour construire un historique reel.");
  }

  const trades: ReplayTrade[] = [];
  const skips: ReplaySkip[] = [];
  const baseline: ReplayTrade[] = [];
  let totalSetups = 0;
  let rejectedBySizing = 0;
  let lastSizingReason = '';

  for (const { index: i, signal } of collectSignals(candles, htf, warmup, candles.length - 2)) {
    totalSetups++;

    const exitInfo = simulateExit(candles, i, signal);
    if (!exitInfo) continue; // position qui deborde la fin des donnees : non mesurable

    const entry = signal.price;
    const direction = signal.action === 'BUY' ? 1 : -1;
    const riskDistance = signal.sl !== undefined ? Math.abs(entry - signal.sl) : 0;
    const sizing = riskDistance > 0 ? sizePosition(riskDistance) : null;
    // Pour mesurer la strategie meme quand le capital ne suit pas, on simule au lot minimum.
    const lots = sizing?.brokerLots ?? config.quantity;
    const pnl = (exitInfo.exit - entry) * direction * lots * config.contractSize;
    const rMultiple = riskDistance > 0 ? ((exitInfo.exit - entry) * direction) / riskDistance : 0;
    const outcome: ReplayTrade['outcome'] = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'FLAT';

    const trade: ReplayTrade = {
      index: i, time: signal.time, symbol: config.symbol, action: signal.action,
      setupKey: signal.setupKey, entry, exit: exitInfo.exit,
      pnl, pnlPct: ((exitInfo.exit - entry) / entry) * 100 * direction,
      outcome, reason: signal.reason, exitKind: exitInfo.exitKind, rMultiple, lots,
    };
    baseline.push(trade);

    if (mode === 'memory') {
      const verdict = evaluateMemory(signal, ledger, learnings, signal.time);
      if (verdict.blocked) {
        skips.push({ index: i, time: signal.time, symbol: config.symbol, action: signal.action,
          setupKey: signal.setupKey, price: entry, reason: verdict.reason, avoidedPnl: pnl, avoidedR: rMultiple });
        await appendLedgerRow({
          timestamp: new Date(signal.time).toISOString(), symbol: config.symbol, action: 'SKIP',
          price: entry, quantity: 0, reason: `${signal.setupKey} :: SKIP memoire :: ${verdict.reason}`,
          mode: 'replay:memory', outcome: 'SKIPPED', pnl: 0,
        });
        continue;
      }
    }

    const risk = checkRisk(signal);
    if (!risk.approved) {
      rejectedBySizing++;
      lastSizingReason = risk.reason;
      skips.push({ index: i, time: signal.time, symbol: config.symbol, action: signal.action,
        setupKey: signal.setupKey, price: entry, reason: risk.reason, avoidedPnl: pnl, avoidedR: rMultiple });
      continue;
    }
    trades.push(trade);
  }

  printTrades(trades, skips);
  const summary = summarize(mode, set.sourceLabel, trades, skips.length, totalSetups);
  printSummary(summary, mode === 'raw' ? 'BASELINE BRUTE (sans memoire)' : 'RESULTAT AVEC MEMOIRE');

  if (rejectedBySizing > 0) {
    log.blank();
    log.warn(`${rejectedBySizing} setup(s) sur ${totalSetups} rejete(s) par le dimensionnement : le capital ne permet pas de les prendre.`);
    log.warn(lastSizingReason);
    const base = summarize('raw', set.sourceLabel, baseline, 0, totalSetups);
    printSummary(base, 'CE QU AURAIT DONNE LA STRATEGIE AU LOT MINIMUM (mesure de qualite, pas une recommandation)');
  }

  if (mode === 'raw') {
    await recordRawOutcomes(trades.length > 0 ? trades : baseline);
  } else {
    const base = summarize('raw', set.sourceLabel, baseline, 0, totalSetups);
    log.blank();
    console.log('--- DIFFERENCE APPORTEE PAR LA MEMOIRE ---');
    console.log(`  Setups filtres       : ${skips.length} / ${totalSetups}`);
    console.log(`  Resultat sans memoire: ${base.totalR.toFixed(2)} R`);
    console.log(`  Resultat avec memoire: ${summary.totalR.toFixed(2)} R`);
    console.log(`  Ecart                : ${(summary.totalR - base.totalR).toFixed(2)} R`);
    console.log(`  Taux de reussite     : ${(base.winRate * 100).toFixed(1)}% -> ${(summary.winRate * 100).toFixed(1)}%`);
    if (skips.filter((s) => s.reason.includes('Memoire')).length === 0) {
      log.blank();
      log.warn(ledger.length === 0
        ? "La memoire est vide : aucun setup n'a pu etre filtre. Lancez `npm run replay:raw` d'abord."
        : "Aucune mise en garde reelle ne correspondait aux setups de cette fenetre : rien n'a ete filtre par la memoire.");
    }
  }

  log.blank();
  log.info(`Source des donnees : ${set.sourceLabel}`);
  log.info('Aucun ordre reel n a ete envoye. Mode papier uniquement.');
  return summary;
}

/** Ecrit dans la memoire ce que le replay brut a REELLEMENT observe. */
async function recordRawOutcomes(trades: ReplayTrade[]): Promise<void> {
  if (trades.length === 0) return;
  for (const t of trades) {
    await appendLedgerRow({
      timestamp: new Date(t.time).toISOString(), symbol: t.symbol, action: t.action,
      price: t.entry, quantity: t.lots,
      reason: `${t.setupKey} :: ${t.reason} :: sortie ${t.exit.toFixed(2)} par ${t.exitKind} (${t.rMultiple.toFixed(2)} R)`,
      mode: 'replay:raw', outcome: t.outcome, pnl: t.pnl,
    });
  }
  log.blank();
  log.step('MEMOIRE', `${trades.length} resultat(s) reel(s) ajoutes a data/ledger.csv.`);

  const bySetup = new Map<string, ReplayTrade[]>();
  for (const t of trades) bySetup.set(t.setupKey, [...(bySetup.get(t.setupKey) ?? []), t]);

  let lessons = 0;
  for (const [key, list] of bySetup) {
    const losses = list.filter((t) => t.outcome === 'LOSS');
    const wins = list.filter((t) => t.outcome === 'WIN');
    const decided = losses.length + wins.length;
    const winRate = decided > 0 ? wins.length / decided : 0;
    if (losses.length >= config.memoryMinLosses && winRate < config.memoryMaxWinRate) {
      const avgR = list.reduce((s, t) => s + t.rMultiple, 0) / list.length;
      await appendLearning(key,
        `Sur ${list.length} occurrence(s) reelle(s) observees en replay, ce setup a perdu ${losses.length} fois pour ${wins.length} gain(s) ` +
        `(reussite ${(winRate * 100).toFixed(0)}%, ${avgR.toFixed(2)} R en moyenne). A confirmer avant de le reprendre.`);
      lessons++;
      log.step('MEMOIRE', `Lecon ecrite pour ${key} (${losses.length} perte(s) reelle(s)).`);
    }
  }
  if (lessons === 0) log.step('MEMOIRE', "Aucun setup ne remplit les criteres de perte repetee : aucune lecon ecrite. Rien n'est invente.");
}
