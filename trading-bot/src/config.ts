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
  interval: (process.env.INTERVAL ?? '15m') as Interval,
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

  // --- Strategie active ---
  strategy: (process.env.STRATEGY ?? 'enigma') as 'ma' | 'enigma',
  atrPeriod: num(process.env.ATR_PERIOD, 14),

  /** Parametres "Enigma Cipher S", repris des captures MT4. */
  enigma: {
    momentumBars: num(process.env.MOMENTUM_BARS, 8),
    bearContextMax: num(process.env.BEAR_CONTEXT_MAX, 0.4),
    bullContextMin: num(process.env.BULL_CONTEXT_MIN, 0.6),
    bullReversalMin: num(process.env.BULL_REVERSAL_MIN, 0.72),
    bearReversalMax: num(process.env.BEAR_REVERSAL_MAX, 0.28),
    minBodyEfficiency: num(process.env.MIN_BODY_EFFICIENCY, 0.25),
    minRangeAtr: num(process.env.MIN_RANGE_ATR, 0.5),
    requireConfirmation: bool(process.env.REQUIRE_CONFIRMATION, false),
    confirmationBars: num(process.env.CONFIRMATION_BARS, 1),
    useContextDepth: bool(process.env.USE_CONTEXT_DEPTH, true),
    minContextDepth: num(process.env.MIN_CONTEXT_DEPTH, 0.05),
    useHtf: bool(process.env.USE_HTF, true),
    /** Nombre de bougies de l'unite courante formant une bougie HTF (M15 -> H1 = 4). */
    htfFactor: num(process.env.HTF_FACTOR, 4),
    htfMinPressure: num(process.env.HTF_MIN_PRESSURE, 0.6),
    htfMinBodyAtr: num(process.env.HTF_MIN_BODY_ATR, 0.0),
    slAtrMulti: num(process.env.SL_ATR_MULTI, 1.8),
    tp1RR: num(process.env.TP1_RR, 1.0),
    tp2RR: num(process.env.TP2_RR, 2.0),
    tp3RR: num(process.env.TP3_RR, 3.0),
    /** Cible utilisee pour sortir en replay : 1, 2 ou 3. */
    targetRR: num(process.env.TARGET_RR, 1),
  },

  // --- Compte et dimensionnement ---
  /** Capital du compte, en devise du compte. */
  accountBalance: num(process.env.ACCOUNT_BALANCE, 20),
  /** Risque par trade, en fraction du capital (0.01 = 1%). */
  riskPerTrade: num(process.env.RISK_PER_TRADE, 0.01),
  /** Taille d'un lot chez le broker (BTCUSD chez FBS : 1 BTC par lot). A verifier dans MT4. */
  contractSize: num(process.env.CONTRACT_SIZE, 1),
  /** Lot minimum du broker. */
  minLot: num(process.env.MIN_LOT, 0.01),
  /** Pas de lot du broker. */
  lotStep: num(process.env.LOT_STEP, 0.01),

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
