/**
 * Telechargeur d'historique long, a lancer SUR VOTRE MACHINE.
 *
 * L'environnement ou ce projet a ete developpe ne peut joindre aucune source de
 * donnees de marche (refus de politique reseau). Votre machine, elle, le peut.
 * Ce script pagine l'endpoint public Binance /api/v3/klines pour constituer
 * plusieurs annees de bougies reelles, au format attendu par le bot.
 *
 * Aucune cle d'API n'est necessaire : l'endpoint est public.
 *
 * Usage :
 *   npx tsx tools/fetch-history.ts BTCUSDT 1d 6
 *   npx tsx tools/fetch-history.ts ETHUSDT 4h 3
 *                                  ^symbole ^interval ^annees
 *
 * Ecrit data/cache/<SYMBOLE>-<interval>.json, que `npm run replay:raw`,
 * `tools/sweep.ts` et `tools/nulltest.ts` utilisent automatiquement.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import type { Candle } from '../src/types.js';

const BASE = process.env.KLINES_BASE_URL ?? 'https://api.binance.com';
const MAX_PER_CALL = 1000;

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
  '1h': 3_600_000, '2h': 7_200_000, '4h': 14_400_000,
  '6h': 21_600_000, '12h': 43_200_000, '1d': 86_400_000, '1w': 604_800_000,
};

const symbol = (process.argv[2] ?? 'BTCUSDT').toUpperCase();
const interval = process.argv[3] ?? '1d';
const years = Number(process.argv[4] ?? 5);

const step = INTERVAL_MS[interval];
if (!step) {
  console.error(`Interval inconnu : "${interval}". Valeurs possibles : ${Object.keys(INTERVAL_MS).join(', ')}`);
  process.exit(1);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function fetchPage(startTime: number): Promise<Candle[]> {
  const url = `${BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=${MAX_PER_CALL}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} sur ${BASE}`);
  const raw = (await res.json()) as unknown[];
  return raw.map((k) => {
    const row = k as [number, string, string, string, string, string];
    return {
      openTime: row[0],
      open: Number(row[1]), high: Number(row[2]),
      low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]),
    };
  });
}

async function main(): Promise<void> {
  const now = Date.now();
  const from = now - years * 365 * 86_400_000;
  console.log(`Telechargement ${symbol} ${interval} sur ~${years} an(s), depuis ${new Date(from).toISOString().slice(0, 10)}`);
  console.log(`Source : ${BASE}/api/v3/klines (public, sans cle)`);

  const all: Candle[] = [];
  let cursor = from;
  let pages = 0;

  while (cursor < now) {
    let page: Candle[];
    try {
      page = await fetchPage(cursor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (all.length === 0) {
        console.error(`\nECHEC des le premier appel : ${msg}`);
        console.error('\nCauses possibles :');
        console.error('  - Binance bloque dans votre pays ou par votre reseau.');
        console.error('    Essayez : KLINES_BASE_URL=https://data-api.binance.vision npx tsx tools/fetch-history.ts ...');
        console.error('  - Pas de connexion sortante.');
        console.error('\nAucune donnee n\'a ete inventee : le fichier de cache n\'est pas ecrit.');
        process.exit(1);
      }
      console.error(`Interruption apres ${all.length} bougies : ${msg}. On conserve ce qui a ete recupere.`);
      break;
    }

    if (page.length === 0) break;
    all.push(...page);
    pages++;
    const last = page[page.length - 1] as Candle;
    cursor = last.openTime + step;
    process.stdout.write(`\r  ${all.length} bougies (${pages} appels), jusqu'au ${new Date(last.openTime).toISOString().slice(0, 10)}   `);
    if (page.length < MAX_PER_CALL) break;
    await sleep(250);   // courtoisie envers l'endpoint public
  }
  console.log('');

  // Deduplication et tri : une pagination peut se chevaucher aux bornes.
  const seen = new Map<number, Candle>();
  for (const c of all) seen.set(c.openTime, c);
  const candles = [...seen.values()].sort((a, b) => a.openTime - b.openTime);

  if (candles.length === 0) {
    console.error('Aucune bougie recuperee. Rien n\'est ecrit.');
    process.exit(1);
  }

  const first = candles[0] as Candle;
  const last = candles[candles.length - 1] as Candle;
  const out = {
    provenance: {
      source: `${BASE}/api/v3/klines (donnees de marche reelles, endpoint public)`,
      symbol, interval,
      captured_at: new Date().toISOString(),
      count: candles.length,
      note: 'Bougies REELLES telechargees par tools/fetch-history.ts. Aucune bougie generee.',
    },
    candles,
  };

  await mkdir('data/cache', { recursive: true });
  const file = `data/cache/${symbol}-${interval}.json`;
  await writeFile(file, JSON.stringify(out, null, 1), 'utf8');

  console.log(`\nEcrit : ${file}`);
  console.log(`  ${candles.length} bougies reelles`);
  console.log(`  ${new Date(first.openTime).toISOString().slice(0, 10)} -> ${new Date(last.openTime).toISOString().slice(0, 10)}`);
  console.log(`\nUtilisation :`);
  console.log(`  SYMBOL=${symbol} INTERVAL=${interval} npm run replay:raw`);
  console.log(`  SYMBOL=${symbol} INTERVAL=${interval} W_RSI_SWING_BARS=8 W_USE_ER_QUALITY=false W_USE_CUSUM=false npx tsx tools/sweep.ts`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
