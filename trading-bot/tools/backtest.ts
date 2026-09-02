/**
 * Backtest complet en UNE commande, sans variables d'environnement.
 * Fonctionne identiquement sous Windows, macOS et Linux.
 *
 *   npx tsx tools/backtest.ts BTCUSDT 1d 6
 *                             ^symbole ^interval ^annees
 *
 * Enchaine : telechargement de l'historique s'il manque, balayage de
 * RSI_Swing_Bars, puis test nul contre des entrees aleatoires.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const symbol = (process.argv[2] ?? 'BTCUSDT').toUpperCase();
const interval = process.argv[3] ?? '1d';
const years = process.argv[4] ?? '6';
const SWINGS = ['5', '8', '12'];

const baseEnv = {
  ...process.env,
  SYMBOL: symbol,
  INTERVAL: interval,
  STRATEGY: 'wyckoff',
  W_USE_ER_QUALITY: 'false',
  W_USE_CUSUM: 'false',
  ALLOW_CACHE_FALLBACK: 'true',
  // Sans cela, le chargeur ne garderait que les CANDLE_LIMIT dernieres bougies
  // (500 par defaut) et l'historique telecharge serait tronque en silence.
  CANDLE_LIMIT: '1000000',
};

function run(script: string, env: NodeJS.ProcessEnv, show = false): string {
  const r = spawnSync('npx', ['tsx', script], {
    env, shell: true, encoding: 'utf8', stdio: show ? 'inherit' : 'pipe',
  });
  return show ? '' : `${r.stdout ?? ''}`;
}

function lastJson(out: string): Record<string, number | string> | null {
  const line = out.trim().split('\n').reverse().find((l) => l.trim().startsWith('{'));
  if (!line) return null;
  try { return JSON.parse(line) as Record<string, number | string>; } catch { return null; }
}

const cache = `data/cache/${symbol}-${interval}.json`;
console.log(`\n=== BACKTEST ${symbol} ${interval} ===\n`);

/**
 * Etendue en annees d'un cache existant. Le depot est livre avec des snapshots
 * courts : sans cette verification, une demande de 6 ans serait silencieusement
 * servie par 17 mois de donnees deja presentes.
 */
function cacheSpanYears(file: string): number {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { candles?: { openTime: number }[] };
    const cs = parsed.candles ?? [];
    if (cs.length < 2) return 0;
    const first = cs[0]?.openTime ?? 0;
    const last = cs[cs.length - 1]?.openTime ?? 0;
    return (last - first) / (365 * 86_400_000);
  } catch { return 0; }
}

const span = existsSync(cache) ? cacheSpanYears(cache) : 0;
const suffisant = span >= Number(years) * 0.9;

if (existsSync(cache) && !suffisant) {
  console.log(`Historique present mais trop court : ${span.toFixed(1)} an(s) pour ${years} demande(s).`);
  console.log('Retelechargement...\n');
}

if (!existsSync(cache) || !suffisant) {
  if (!existsSync(cache)) console.log(`Historique absent, telechargement de ~${years} an(s)...\n`);
  const r = spawnSync('npx', ['tsx', 'tools/fetch-history.ts', symbol, interval, years],
    { shell: true, stdio: 'inherit', env: process.env });
  if (r.status !== 0 || !existsSync(cache)) {
    console.error('\nTelechargement impossible : voir le message ci-dessus. Rien ne peut etre teste.');
    process.exit(1);
  }
  console.log('');
} else {
  console.log(`Historique deja present : ${cache} (${span.toFixed(1)} an(s))\n`);
}

console.log('--- Balayage de RSI_Swing_Bars (sans ER ni CUSUM, cible 1R) ---');
console.log('swing | signaux | vraieDiv | achats | ventes | W/L  | resolus | reussite | total R');
console.log('------|---------|----------|--------|--------|------|---------|----------|--------');
for (const sw of SWINGS) {
  const d = lastJson(run('tools/sweep.ts', { ...baseEnv, W_RSI_SWING_BARS: sw }));
  if (!d) { console.log(`${sw.padStart(5)} | (echec)`); continue; }
  const w = Number(d['gagnants']), l = Number(d['perdants']);
  console.log(
    `${sw.padStart(5)} | ${String(d['signaux']).padStart(7)} | ${String(d['vraieDiv']).padStart(8)} | ` +
    `${String(d['achats']).padStart(6)} | ${String(d['ventes']).padStart(6)} | ${`${w}/${l}`.padEnd(4)} | ` +
    `${String(w + l).padStart(7)} | ${String(d['tauxReussite']).padStart(7)}% | ${Number(d['totalR']) >= 0 ? '+' : ''}${d['totalR']}`,
  );
}

console.log('\n--- Test nul : les entrees valent-elles mieux que le hasard ? ---');
console.log('swing | strategie | hasard moy | hasard 5%-95%      | percentile');
console.log('------|-----------|------------|--------------------|-----------');
for (const sw of SWINGS) {
  const d = lastJson(run('tools/nulltest.ts', { ...baseEnv, W_RSI_SWING_BARS: sw }));
  if (!d) { console.log(`${sw.padStart(5)} | (echec)`); continue; }
  const f = (v: unknown): string => { const n = Number(v); return `${n >= 0 ? '+' : ''}${n.toFixed(3)}`; };
  console.log(
    `${sw.padStart(5)} | ${f(d['esperanceStrategie']).padStart(9)} | ${f(d['esperanceHasard']).padStart(10)} | ` +
    `${f(d['hasardP05'])} .. ${f(d['hasardP95'])} | ${String(d['percentile']).padStart(6)}e`,
  );
}

console.log(`
--- Comment lire ---
  vraieDiv   : signaux issus d'une VRAIE divergence. Le reste vient d'une branche
               degradee du code qui ne produit que des achats.
  resolus    : trades reellement clotures (TP ou SL). En dessous de 30, rien n'est
               concluant, quel que soit le total R.
  percentile : place de la strategie dans 400 tirages d'entrees aleatoires soumises
               aux MEMES regles de sortie. Au-dela de 95e, les entrees apportent
               quelque chose. Autour de 50e, elles ne valent pas mieux que le hasard.

  Ni frais, ni spread, ni slippage ne sont modelises : les resultats sont optimistes.
`);
