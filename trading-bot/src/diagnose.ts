/**
 * Diagnostic du filtre : combien de bougies tombent a chaque etage.
 * Sert a comprendre pourquoi la strategie signale peu, et quel parametre est decisif.
 */
import { getCandles, closedCandles } from './market.js';
import { evaluateAt } from './strategy.js';
import { aggregate } from './indicators.js';
import { config } from './config.js';
import { log } from './logger.js';

export async function runDiagnose(): Promise<void> {
  log.title(`DIAGNOSTIC DU FILTRE — ${config.symbol} ${config.interval} — strategie ${config.strategy}`);
  const set = await getCandles();
  const candles = closedCandles(set.candles);
  const htf = config.strategy === 'enigma' && config.enigma.useHtf ? aggregate(candles, config.enigma.htfFactor) : undefined;

  const stages = new Map<string, number>();
  const bump = (k: string): void => void stages.set(k, (stages.get(k) ?? 0) + 1);
  let buy = 0, sell = 0, analysed = 0;
  const start = Math.max(config.atrPeriod, config.enigma.momentumBars, config.slowPeriod) + 2;

  for (let i = start; i < candles.length - 1; i++) {
    const s = evaluateAt(candles, i, { htf });
    if (!s) continue;
    analysed++;
    if (s.action === 'BUY') { buy++; continue; }
    if (s.action === 'SELL') { sell++; continue; }
    const r = s.reason;
    if (r.startsWith('Range')) bump('1. Range trop petit (< Min_Range_ATR)');
    else if (r.startsWith('Efficacite')) bump('2. Corps trop faible (< Min_Body_Efficiency)');
    else if (r.startsWith('Pas de setup')) bump('3. Pression / contexte hors seuils');
    else if (r.includes('profondeur de balayage')) bump('4. Balayage trop court (< Min_Context_Depth)');
    else if (r.includes('pression HTF') || r.includes('donnee HTF')) bump('5. Filtre HTF (H1) contraire');
    else if (r.includes('corps HTF')) bump('6. Corps HTF insuffisant');
    else if (r.includes('confirmation')) bump('7. Pas de confirmation');
    else bump('8. Autre');
  }

  console.log(`Bougies analysees : ${analysed}`);
  console.log(`SIGNAUX RETENUS   : ${buy} achat(s), ${sell} vente(s)`);
  log.blank();
  console.log('--- Ou tombent les bougies (etages dans l ordre du filtre) ---');
  for (const [k, v] of [...stages].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }
  log.blank();
  log.info(`Source : ${set.sourceLabel}`);
}
