export interface OHLCV {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SRZone {
  price: number;
  strength: number;
  type: "support" | "resistance";
  touches: number;
}

export interface TrendResult {
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: number;
  ema20: number;
  ema50: number;
  ema200: number;
  alignment: string;
  higherTFBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  marketStructure: string;
}

export interface PriceActionSignal {
  pattern: string;
  direction: "BULLISH" | "BEARISH";
  reliability: number;
  description: string;
  candle: OHLCV;
  atKeyLevel: boolean;
  nearestLevel?: SRZone;
}

export interface AnalysisResult {
  pair: string;
  timeframe: string;
  trend: TrendResult;
  srZones: SRZone[];
  priceAction: PriceActionSignal[];
  currentPrice: number;
  indicators: {
    rsi: number;
    atr: number;
    atrPips: number;
  };
}

export interface BiasReasoning {
  primary: string;
  supporting: string[];
  conflicting: string[];
  marketContext: string;
  riskFactors: string[];
  strategy: {
    trendAlignment: string;
    keyLevelAction: string;
    priceActionConfirmation: string;
  };
}

export interface TradeSetup {
  pair: string;
  display: string;
  direction: "BUY" | "SELL";
  bias: "BULLISH" | "BEARISH";
  confidence: number;
  timeframe: string;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskPips: number;
  rewardPips: number;
  riskReward: number;
  biasReasoning: BiasReasoning;
  analysis: AnalysisResult;
}
