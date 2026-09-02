/**
 * Replay honnete sur bougies reelles.
 *
 *  - replay:raw    : la strategie brute, sans memoire. C'est la reference.
 *  - replay:memory : meme strategie, mais chaque setup est confronte a la memoire
 *                    (ledger + learnings) avant d'etre pris.
 *
 * Aucune bougie generee, aucun echec force, aucune perte semee a la main.
 * Le resultat est celui des donnees reelles, quel qu'il soit.
 */
import { config } from './config.js';
import { log } from './logger.js';
import { getCandles, closedCandles } from './market.js';
import { evaluateAt } from './strategy.js';
import { checkRisk } from './risk.js';
import { appendLearning, appendLedgerRow, readLedger, readLearnings } from './memory.js';
import { evaluateMemory } from './adaptiveFilter.js';
import type { Candle, ReplaySkip, ReplaySummary, ReplayTrade } from './types.js';

const iso = (t: number): string => new Date(t).toISOString().replace('T', ' ').slice(0, 16);

function summarize(mode: 'raw' | 'memory', source: string, trades: ReplayTrade[], skipped: number, totalSetups: number): ReplaySummary {
  const wins = trades.filter((t) => t.outcome === 'WIN').length;
  const losses = trades.filter((t) => t.outcome === 'LOSS').length;
  const flats = trades.filter((t) => t.outcome === 'FLAT').length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const decided = wins + losses;

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
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
  };
}

function printTrades(trades: ReplayTrade[], skips: ReplaySkip[]): void {
  if (trades.length === 0 && skips.length === 0) {
    log.info('Aucun setup detecte dans la fenetre analysee.');
    return;
  }
  const head = ['#', 'DATE (UTC)', 'ACTION', 'ENTREE', 'SORTIE', 'PNL', 'PNL %', 'RESULTAT'];
  const rows: string[][] = [];
  const all = [
    ...trades.map((t) => ({ i: t.index, t })),
    ...skips.map((s) => ({ i: s.index, s })),
  ].sort((a, b) => a.i - b.i);

  let n = 0;
  for (const item of all) {
    n++;
    if ('t' in item && item.t) {
      const t = item.t;
      rows.push([
        String(n), iso(t.time), t.action, t.entry.toFixed(2), t.exit.toFixed(2),
        t.pnl.toFixed(2), `${t.pnlPct.toFixed(2)}%`, t.outcome,
      ]);
    } else if ('s' in item && item.s) {
      const s = item.s;
      rows.push([
        String(n), iso(s.time), `${s.action}->SKIP`, s.price.toFixed(2), '-', '0.00',
        `(evite ${s.avoidedPnl.toFixed(2)})`, 'SKIPPED',
      ]);
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
  console.log(`  PnL total (USDT)     : ${s.totalPnl.toFixed(2)}`);
  console.log(`  PnL moyen par trade  : ${s.avgPnl.toFixed(2)}`);
  console.log(`  Meilleur / pire      : ${s.best.toFixed(2)} / ${s.worst.toFixed(2)}`);
  console.log(`  Drawdown max         : ${s.maxDrawdown.toFixed(2)}`);
}

export async function runReplay(mode: 'raw' | 'memory'): Promise<ReplaySummary> {
  log.title(`REPLAY ${mode.toUpperCase()} — ${config.symbol} ${config.interval} — MA${config.fastPeriod}/${config.slowPeriod}`);
  const set = await getCandles();
  const candles: Candle[] = closedCandles(set.candles);
  const horizon = config.horizon;

  if (candles.length < Math.max(config.slowPeriod, config.regimePeriod) + horizon + 5) {
    log.error(`Pas assez de bougies (${candles.length}) pour un replay MA${config.slowPeriod} + horizon ${horizon}.`);
    throw new Error('Historique insuffisant');
  }
  log.step('REPLAY', `${candles.length} bougies cloturees, horizon de sortie = ${horizon} bougies (${horizon} x ${config.interval}).`);

  const ledger = mode === 'memory' ? await readLedger() : [];
  const learnings = mode === 'memory' ? await readLearnings() : '';
  if (mode === 'memory') {
    log.step('MEMOIRE', `data/ledger.csv charge : ${ledger.length} ligne(s).`);
    log.step('MEMOIRE', `data/learnings.md charge : ${learnings.split('\n').filter((l) => l.startsWith('- ')).length} lecon(s).`);
    if (ledger.length === 0) {
      log.warn("Memoire vide : lancez d'abord `npm run replay:raw` pour construire un historique reel.");
    }
  }

  const trades: ReplayTrade[] = [];
  const skips: ReplaySkip[] = [];
  /** Contrefactuel : tous les setups pris, memoire ignoree. Sert de baseline en mode memoire. */
  const baseline: ReplayTrade[] = [];
  let totalSetups = 0;

  const warmup = Math.max(config.slowPeriod, config.regimePeriod);
  for (let i = warmup; i < candles.length - horizon; i++) {
    const signal = evaluateAt(candles, i);
    if (!signal || signal.action === 'HOLD') continue;
    totalSetups++;

    const entry = signal.price;
    const exitCandle = candles[i + horizon] as Candle;
    const exit = exitCandle.close;
    const direction = signal.action === 'BUY' ? 1 : -1;
    const pnl = (exit - entry) * direction * config.quantity;
    const pnlPct = ((exit - entry) / entry) * 100 * direction;
    const outcome: ReplayTrade['outcome'] = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'FLAT';
    const trade: ReplayTrade = {
      index: i, time: signal.time, symbol: config.symbol, action: signal.action,
      setupKey: signal.setupKey, entry, exit, pnl, pnlPct, outcome, reason: signal.reason,
    };
    baseline.push(trade);

    if (mode === 'memory') {
      const verdict = evaluateMemory(signal, ledger, learnings, signal.time);
      if (verdict.blocked) {
        skips.push({
          index: i, time: signal.time, symbol: config.symbol, action: signal.action,
          setupKey: signal.setupKey, price: entry, reason: verdict.reason, avoidedPnl: pnl,
        });
        await appendLedgerRow({
          timestamp: new Date(signal.time).toISOString(),
          symbol: config.symbol, action: 'SKIP', price: entry, quantity: 0,
          reason: `${signal.setupKey} :: SKIP memoire :: ${verdict.reason}`,
          mode: 'replay:memory', outcome: 'SKIPPED', pnl: 0,
        });
        continue;
      }
    }

    const risk = checkRisk(signal);
    if (!risk.approved) {
      skips.push({
        index: i, time: signal.time, symbol: config.symbol, action: signal.action,
        setupKey: signal.setupKey, price: entry, reason: risk.reason, avoidedPnl: pnl,
      });
      continue;
    }
    trades.push(trade);
  }

  printTrades(trades, skips);
  const summary = summarize(mode, set.sourceLabel, trades, skips.length, totalSetups);
  printSummary(summary, mode === 'raw' ? 'BASELINE BRUTE (sans memoire)' : 'RESULTAT AVEC MEMOIRE');

  if (mode === 'raw') {
    await recordRawOutcomes(trades);
  } else {
    const base = summarize('raw', set.sourceLabel, baseline, 0, totalSetups);
    printSummary(base, 'MEME FENETRE, SANS FILTRE MEMOIRE (contrefactuel)');
    log.blank();
    console.log('--- DIFFERENCE APPORTEE PAR LA MEMOIRE ---');
    console.log(`  Setups filtres       : ${skips.length} / ${totalSetups}`);
    console.log(`  PnL sans memoire     : ${base.totalPnl.toFixed(2)}`);
    console.log(`  PnL avec memoire     : ${summary.totalPnl.toFixed(2)}`);
    console.log(`  Ecart                : ${(summary.totalPnl - base.totalPnl).toFixed(2)}`);
    console.log(`  Taux de reussite     : ${(base.winRate * 100).toFixed(1)}% -> ${(summary.winRate * 100).toFixed(1)}%`);
    if (skips.length === 0) {
      log.blank();
      log.warn(
        ledger.length === 0
          ? "La memoire est vide : aucun setup n'a pu etre filtre. Lancez `npm run replay:raw` d'abord."
          : "Aucune mise en garde reelle ne correspondait aux setups de cette fenetre : rien n'a ete filtre. C'est un resultat honnete, pas une erreur.",
      );
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
      timestamp: new Date(t.time).toISOString(),
      symbol: t.symbol, action: t.action, price: t.entry, quantity: config.quantity,
      reason: `${t.setupKey} :: ${t.reason} :: sortie ${t.exit.toFixed(2)} apres ${config.horizon} bougies`,
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
      const avg = list.reduce((s, t) => s + t.pnl, 0) / list.length;
      await appendLearning(
        key,
        `Sur ${list.length} occurrence(s) reelle(s) observees en replay, ce setup a perdu ${losses.length} fois pour ${wins.length} gain(s) ` +
          `(reussite ${(winRate * 100).toFixed(0)}%, PnL moyen ${avg.toFixed(2)} USDT sur ${config.horizon} bougies). ` +
          `A confirmer avant de le reprendre.`,
      );
      lessons++;
      log.step('MEMOIRE', `Lecon ecrite pour ${key} (${losses.length} perte(s) reelle(s)).`);
    }
  }
  if (lessons === 0) {
    log.step('MEMOIRE', "Aucun setup ne remplit les criteres de perte repetee : aucune lecon ecrite. Rien n'est invente.");
  }
}
