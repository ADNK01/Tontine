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
  /** Unite de temps du filtre superieur, chargee separement quand elle est disponible. */
  htfInterval: (process.env.HTF_INTERVAL ?? '1h') as Interval,
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
    /**
     * "Filter_Ready_Window" / "Ready Window: 5 bars" du tableau de bord :
     * nombre de bougies pendant lesquelles aucun nouveau signal n'est emis apres
     * un signal. Sans lui, un meme retournement declenche une grappe de signaux
     * consecutifs alors que l'indicateur ne dessine qu'une fleche.
     */
    filterReadyWindow: num(process.env.FILTER_READY_WINDOW, 5),
    /**
     * Lecture de "Filter_Ready_Window" :
     *  cooldown : delai de recharge apres un signal (une fleche par retournement)
     *  armed    : le signal n'est admis que dans les N bougies suivant la cloture
     *             d'une bougie HTF ("FILTER-FIRST ARCHITECTURE")
     */
    readyMode: (process.env.READY_MODE ?? 'cooldown') as 'cooldown' | 'armed',
    useContextDepth: bool(process.env.USE_CONTEXT_DEPTH, true),
    /**
     * Interpretation de Min_Context_Depth. La section de l'indicateur s'appelle
     * "CONTEXT CLARITY", ce qui plaide pour "clarity" : le contexte doit etre
     * assez tranche, c'est-a-dire assez loin du neutre (0.5).
     *  clarity : |pression du contexte - 0.5| >= seuil
     *  sweep   : la bougie de signal casse l'extreme du contexte de seuil x ATR
     */
    contextDepthMode: (process.env.CONTEXT_DEPTH_MODE ?? 'clarity') as 'clarity' | 'sweep',
    minContextDepth: num(process.env.MIN_CONTEXT_DEPTH, 0.05),
    useHtf: bool(process.env.USE_HTF, true),
    /** Nombre de bougies de l'unite courante formant une bougie HTF (M15 -> H1 = 4). */
    htfFactor: num(process.env.HTF_FACTOR, 4),
    htfMinPressure: num(process.env.HTF_MIN_PRESSURE, 0.6),
    /**
     * Interpretation du filtre HTF — indeterminee tant qu'on n'a pas plusieurs fleches.
     *  aligned    : la H1 doit pousser DANS le sens du trade (pression >= seuil pour un achat)
     *  contrarian : la H1 doit pousser CONTRE (on fade l'extreme H1) — compatible avec la fleche connue
     *  clear      : la H1 doit seulement avoir une direction NETTE, dans un sens ou l'autre
     *  off        : filtre desactive
     */
    htfMode: (process.env.HTF_MODE ?? 'contrarian') as 'aligned' | 'contrarian' | 'clear' | 'off',
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
  /** Decalage du serveur MT4 par rapport a UTC, pour comparer les horodatages aux fleches. */
  serverUtcOffsetHours: num(process.env.SERVER_UTC_OFFSET, 3),

  /** Verrou global : seule la valeur 'paper' est acceptee par le module d'execution. */
  tradingMode: (process.env.TRADING_MODE ?? 'paper').toLowerCase(),
} as const;

export const paths = {
  ledger: 'data/ledger.csv',
  learnings: 'data/learnings.md',
  cacheDir: 'data/cache',
} as const;
