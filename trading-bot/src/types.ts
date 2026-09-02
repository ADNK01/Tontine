/** Types partages par tous les modules du bot. */

export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** D'ou viennent les bougies utilisees pour la decision courante. */
export interface CandleSet {
  candles: Candle[];
  source: 'live-http' | 'cached-snapshot';
  sourceLabel: string;
}

export type Action = 'BUY' | 'SELL' | 'HOLD' | 'SKIP';

export interface StrategySignal {
  action: Extract<Action, 'BUY' | 'SELL' | 'HOLD'>;
  reason: string;
  price: number;
  time: number;
  fastMA: number;
  slowMA: number;
  /** Cle de setup : sert de clef d'apprentissage pour la memoire. */
  setupKey: string;
  /** ATR au moment du signal, si la strategie en calcule un. */
  atr?: number;
  /** Stop loss et objectifs, si la strategie les definit. */
  sl?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
}

export interface RiskDecision {
  approved: boolean;
  action: Action;
  reason: string;
  quantity: number;
}

export interface PaperOrder {
  time: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  mode: 'paper';
}

export type Outcome = 'WIN' | 'LOSS' | 'FLAT' | 'SKIPPED' | 'OPEN';

export interface LedgerRow {
  timestamp: string;
  symbol: string;
  action: Action;
  price: number;
  quantity: number;
  reason: string;
  mode: string;
  outcome: Outcome;
  pnl: number;
}

/** Un setup detecte pendant un replay, avec son resultat reel apres N bougies. */
export interface ReplayTrade {
  index: number;
  time: number;
  symbol: string;
  action: Extract<Action, 'BUY' | 'SELL'>;
  setupKey: string;
  entry: number;
  exit: number;
  pnl: number;
  pnlPct: number;
  outcome: Extract<Outcome, 'WIN' | 'LOSS' | 'FLAT'>;
  reason: string;
  /** Comment la position s'est terminee. */
  exitKind: 'TP' | 'SL' | 'TIMEOUT' | 'HORIZON';
  /** Resultat exprime en multiple du risque initial (R). */
  rMultiple: number;
  lots: number;
}

export interface ReplaySkip {
  index: number;
  time: number;
  symbol: string;
  action: Extract<Action, 'BUY' | 'SELL'>;
  setupKey: string;
  price: number;
  reason: string;
  /** Ce que le setup aurait rapporte s'il n'avait pas ete filtre (mesure honnete du filtre). */
  avoidedPnl: number;
  avoidedR: number;
}

export interface ReplaySummary {
  mode: 'raw' | 'memory';
  symbol: string;
  interval: Interval;
  source: string;
  totalSetups: number;
  taken: number;
  skipped: number;
  wins: number;
  losses: number;
  flats: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  best: number;
  worst: number;
  maxDrawdown: number;
  /** Resultat cumule en multiples du risque : comparable entre capitaux. */
  totalR: number;
}
