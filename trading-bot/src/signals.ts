/**
 * Liste tous les signaux de la reconstruction sur la fenetre chargee,
 * en heure UTC ET en heure serveur MT4, pour comparaison directe avec les
 * fleches de l'indicateur sur le graphique.
 *
 * L'ecart serveur est configurable : FBS tourne en UTC+3 d'apres la fleche
 * calibree (fleche a 1788221100 = 31/08 21:05 UTC, affichee 01/09 00:05).
 */
import { config } from './config.js';
import { log } from './logger.js';
import { getCandles, closedCandles } from './market.js';
import { collectSignals } from './sequence.js';
import { resolveHtf } from './replay.js';

const fmt = (t: number): string => new Date(t).toISOString().slice(0, 16).replace('T', ' ');

export async function runSignals(): Promise<void> {
  log.title(`SIGNAUX — ${config.symbol} ${config.interval} — HTF "${config.enigma.htfMode}", contexte "${config.enigma.contextDepthMode}", ready window ${config.enigma.filterReadyWindow}`);
  const set = await getCandles();
  const candles = closedCandles(set.candles);
  const htf = await resolveHtf(candles);
  const off = config.serverUtcOffsetHours;

  const rows: string[][] = [];
  for (const { signal: s } of collectSignals(candles, htf, 30, candles.length - 1)) {
    rows.push([s.action, fmt(s.time), fmt(s.time + off * 3600_000), s.price.toFixed(2),
      s.sl?.toFixed(2) ?? '-', s.tp1?.toFixed(2) ?? '-']);
  }

  log.blank();
  if (rows.length === 0) {
    log.warn('Aucun signal sur cette fenetre avec cette interpretation du filtre HTF.');
  } else {
    const head = ['SENS', 'UTC', `SERVEUR MT4 (UTC+${off})`, 'PRIX', 'SL', 'TP1'];
    const w = head.map((h, c) => Math.max(h.length, ...rows.map((r) => (r[c] ?? '').length)));
    const line = (cells: string[]): string => cells.map((v, c) => v.padEnd(w[c] as number)).join('  ');
    console.log(line(head));
    console.log(w.map((x) => '-'.repeat(x)).join('  '));
    for (const r of rows) console.log(line(r));
  }
  log.blank();
  log.info(`${rows.length} signal(aux). Comparez ces horodatages aux fleches de votre graphique MT4.`);
  log.info('Si les fleches tombent ailleurs, changez HTF_MODE (aligned / contrarian / clear / off) et relancez.');
}
