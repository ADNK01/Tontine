/**
 * Point unique de configuration.
 * Tout se surcharge par variables d'environnement (voir .env.example),
 * mais les valeurs par defaut sont sures et 100% paper.
 */
import type { Interval } from './types.js';

const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : d;
};
const bool = (v: string | undefined, d: boolean): boolean =>
  v === undefined || v === '' ? d : ['1', 'true', 'yes', 'oui'].includes(v.toLowerCase());

export const config = {
  // --- Marche ---
  symbol: process.env.SYMBOL ?? 'BTCUSDT',
  interval: (process.env.INTERVAL ?? '5m') as Interval,
  candleLimit: num(process.env.CANDLE_LIMIT, 500),
  klinesBaseUrl: process.env.KLINES_BASE_URL ?? 'https://api.binance.com',
  httpTimeoutMs: num(process.env.HTTP_TIMEOUT_MS, 15000),
  /** Repli sur le snapshot de bougies REELLES si l'API publique est injoignable. */
  allowCacheFallback: bool(process.env.ALLOW_CACHE_FALLBACK, true),

  // --- Strategie ---
  fastPeriod: num(process.env.FAST_MA, 9),
  slowPeriod: num(process.env.SLOW_MA, 21),
  /** MA longue servant a qualifier le regime de marche d'un setup. */
  regimePeriod: num(process.env.REGIME_MA, 50),

  // --- Risque ---
  quantity: num(process.env.QUANTITY, 0.01),
  maxPosition: num(process.env.MAX_POSITION, 0.05),

  // --- Replay ---
  /** Nombre de bougies apres l'entree pour mesurer le resultat du setup. */
  horizon: num(process.env.REPLAY_HORIZON, 12),

  // --- Memoire ---
  /** Nombre de pertes reelles sur un meme setup avant que la memoire ne bloque. */
  memoryMinLosses: num(process.env.MEMORY_MIN_LOSSES, 2),
  /** Taux de reussite en dessous duquel un setup connu est considere comme mauvais. */
  memoryMaxWinRate: num(process.env.MEMORY_MAX_WIN_RATE, 0.5),

  // --- Garde-fous ---
  /** Verrou global : seule la valeur 'paper' est acceptee par le module d'execution. */
  tradingMode: (process.env.TRADING_MODE ?? 'paper').toLowerCase(),
} as const;

export const paths = {
  ledger: 'data/ledger.csv',
  learnings: 'data/learnings.md',
  cacheDir: 'data/cache',
} as const;
