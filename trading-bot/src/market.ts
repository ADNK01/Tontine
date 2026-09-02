/**
 * Acces aux donnees de marche.
 *
 * Regle non negociable : uniquement des bougies REELLES.
 * 1. Source par defaut : endpoint public Binance /api/v3/klines (aucune cle API).
 * 2. Repli : snapshot de bougies reelles archive dans data/cache/ (jamais de bougies generees).
 * Si les deux echouent, on echoue bruyamment plutot que d'inventer des donnees.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config, paths } from './config.js';
import { log } from './logger.js';
import type { Candle, CandleSet, Interval } from './types.js';

interface CacheFile {
  provenance: { source: string; captured_at: string; count: number; note: string };
  candles: Candle[];
}

async function fetchFromHttp(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
  const url = `${config.klinesBaseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(config.httpTimeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} sur ${config.klinesBaseUrl}`);
  const raw = (await res.json()) as unknown[];
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Reponse klines vide');
  return raw.map((k) => {
    const row = k as [number, string, string, string, string, string];
    return {
      openTime: row[0],
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    };
  });
}

async function loadFromCache(symbol: string, interval: Interval): Promise<{ candles: Candle[]; label: string }> {
  const file = path.join(paths.cacheDir, `${symbol}-${interval}.json`);
  if (!existsSync(file)) throw new Error(`Aucun snapshot reel en cache pour ${symbol} ${interval} (${file})`);
  const parsed = JSON.parse(await readFile(file, 'utf8')) as CacheFile;
  const first = parsed.candles[0];
  const last = parsed.candles[parsed.candles.length - 1];
  if (!first || !last) throw new Error(`Snapshot ${file} vide`);
  const label =
    `${parsed.provenance.source} | ${parsed.candles.length} bougies reelles | ` +
    `${new Date(first.openTime).toISOString()} -> ${new Date(last.openTime).toISOString()}`;
  return { candles: parsed.candles, label };
}

/** Recupere les bougies les plus recentes disponibles, en annoncant clairement la source. */
export async function getCandles(
  symbol: string = config.symbol,
  interval: Interval = config.interval,
  limit: number = config.candleLimit,
): Promise<CandleSet> {
  try {
    const candles = await fetchFromHttp(symbol, interval, limit);
    const label = `${config.klinesBaseUrl}/api/v3/klines (temps reel, ${candles.length} bougies)`;
    log.step('MARCHE', `Source : ${label}`);
    return { candles, source: 'live-http', sourceLabel: label };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`Endpoint public injoignable : ${msg}`);
    if (!config.allowCacheFallback) {
      throw new Error(
        "Donnees de marche indisponibles et ALLOW_CACHE_FALLBACK=false. Aucune donnee n'est inventee : arret.",
      );
    }
    const { candles, label } = await loadFromCache(symbol, interval);
    log.warn(`Repli sur un snapshot de bougies REELLES archive : ${label}`);
    log.warn("Ce n'est pas du temps reel. Les resultats decrivent la fenetre du snapshot, pas le marche actuel.");
    return { candles: candles.slice(-limit), source: 'cached-snapshot', sourceLabel: `snapshot archive — ${label}` };
  }
}

/** La derniere bougie renvoyee par l'API est en cours de formation : on ne l'utilise jamais pour decider. */
export function closedCandles(candles: Candle[]): Candle[] {
  return candles.slice(0, -1);
}
