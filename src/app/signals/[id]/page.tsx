"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface StrategyCheck { pass: boolean; detail: string; }
interface Signal {
  id: string; pair: string; direction: string; timeframe: string; confidence: number;
  entry: number; stopLoss: number; tp1: number; tp2: number; tp3: number;
  riskReward: string; bias: string; marketContext: string;
  supportingFactors: string[] | string; riskFactors: string[] | string;
  strategyChecklist: Record<string, StrategyCheck> | string;
  outcome?: string; pipsGained?: number | null; createdAt: string;
}

function getSpec(symbol: string) {
  if (symbol === "XAU/USD") return { pipSize: 0.1, decimals: 2, pipLabel: "pts" };
  if (symbol === "XAG/USD") return { pipSize: 0.01, decimals: 3, pipLabel: "pts" };
  if (symbol === "USOIL")   return { pipSize: 0.01, decimals: 2, pipLabel: "cts" };
  if (symbol === "NAS100")  return { pipSize: 1, decimals: 1, pipLabel: "pts" };
  if (symbol === "US30")    return { pipSize: 1, decimals: 1, pipLabel: "pts" };
  if (symbol.includes("JPY")) return { pipSize: 0.01, decimals: 3, pipLabel: "pips" };
  return { pipSize: 0.0001, decimals: 5, pipLabel: "pips" };
}

function getTVSymbol(pair: string) {
  const map: Record<string, string> = {
    "EUR/USD": "FX:EURUSD",
    "GBP/USD": "FX:GBPUSD",
    "USD/JPY": "FX:USDJPY",
    "GBP/JPY": "FX:GBPJPY",
    "AUD/USD": "FX:AUDUSD",
    "USD/CAD": "FX:USDCAD",
    "USD/CHF": "FX:USDCHF",
    "NZD/USD": "FX:NZDUSD",
    "XAU/USD": "OANDA:XAUUSD",
    "XAG/USD": "OANDA:XAGUSD",
    "USOIL": "TVC:USOIL",
    "NAS100": "OANDA:NAS100USD",
    "US30": "OANDA:US30USD",
  };
  return map[pair] || pair.replace("/", "");
}

function getTVInterval(tf: string) {
  const map: Record<string, string> = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D" };
  return map[tf] || "60";
}

export default function SignalDetailPage() {
  const params = useParams();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/signals/${params.id}`);
        const data = await res.json();
        setSignal(data);
        // Fetch current live price
        if (data?.pair) {
          const priceRes = await fetch(`/api/price?symbol=${encodeURIComponent(data.pair)}`);
          const priceData = await priceRes.json();
          if (priceData?.price) setLivePrice(priceData.price);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (params.id) load();

    // Refresh live price every 30 seconds
    const interval = setInterval(async () => {
      if (signal?.pair) {
        try {
          const priceRes = await fetch(`/api/price?symbol=${encodeURIComponent(signal.pair)}`);
          const priceData = await priceRes.json();
          if (priceData?.price) setLivePrice(priceData.price);
        } catch (e) { /* ignore */ }
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function markOutcome(outcome: string) {
    if (!signal || updating) return;
    setUpdating(true);
    const spec = getSpec(signal.pair);
    let pips = 0;
    if (outcome === "WIN") pips = Math.abs(signal.tp2 - signal.entry) / spec.pipSize;
    if (outcome === "LOSS") pips = -Math.abs(signal.entry - signal.stopLoss) / spec.pipSize;
    try {
      const res = await fetch(`/api/signals/${params.id}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, pipsGained: Number(pips.toFixed(1)) }),
      });
      const updated = await res.json();
      setSignal(updated);
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400"></div>
    </div>
  );
  if (!signal) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p>Signal not found</p>
      <Link href="/" className="text-emerald-400 underline">← Back</Link>
    </div>
  );

  const supportingFactors: string[] = typeof signal.supportingFactors === "string"
    ? JSON.parse(signal.supportingFactors) : (signal.supportingFactors || []);
  const riskFactors: string[] = typeof signal.riskFactors === "string"
    ? JSON.parse(signal.riskFactors) : (signal.riskFactors || []);
  const checklist: Record<string, StrategyCheck> = typeof signal.strategyChecklist === "string"
    ? JSON.parse(signal.strategyChecklist) : ((signal.strategyChecklist as Record<string, StrategyCheck>) || {});

  const spec = getSpec(signal.pair);
  const riskUnits = Math.abs(signal.entry - signal.stopLoss) / spec.pipSize;
  const rewardUnits = Math.abs(signal.tp2 - signal.entry) / spec.pipSize;
  const isBuy = signal.direction === "BUY";

  const labels: Record<string, string> = {
    trendDirection: "1. Trend Direction", priceAction: "2. Price Action",
    keyLevel: "3. Key Level", emaAlignment: "4. EMA Alignment",
    rsiCondition: "5. RSI Condition", riskReward: "6. Risk/Reward Ratio",
    atrVolatility: "7. ATR Volatility",
  };
  const passed = Object.values(checklist).filter((c) => c?.pass).length;
  const total = Object.keys(checklist).length || 7;

  // Price movement since signal
  const priceMove = livePrice ? ((livePrice - signal.entry) / spec.pipSize) : 0;
  const priceMoveInDirection = isBuy ? priceMove : -priceMove;

  const tvSymbol = getTVSymbol(signal.pair);
  const tvInterval = getTVInterval(signal.timeframe);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{signal.pair}</h1>
          <span className={`px-3 py-1 rounded text-sm font-bold ${isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {isBuy ? "▲" : "▼"} {signal.direction}
          </span>
          {signal.outcome && signal.outcome !== "PENDING" && (
            <span className={`px-3 py-1 rounded text-xs font-bold ${
              signal.outcome === "WIN" ? "bg-emerald-500 text-white" :
              signal.outcome === "LOSS" ? "bg-red-500 text-white" : "bg-slate-500 text-white"
            }`}>
              {signal.outcome} {signal.pipsGained ? `(${signal.pipsGained > 0 ? "+" : ""}${signal.pipsGained} ${spec.pipLabel})` : ""}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-sm mt-1">{signal.timeframe} timeframe</p>
      </div>

      {/* Live Price Ticker */}
      {livePrice && (
        <div className="bg-slate-800 rounded-lg p-4 border border-emerald-500/20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">🔴 Live Price</p>
              <p className="text-2xl font-bold text-white mt-1">{livePrice.toFixed(spec.decimals)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Since Signal</p>
              <p className={`text-lg font-bold ${
                priceMoveInDirection > 0 ? "text-emerald-400" :
                priceMoveInDirection < 0 ? "text-red-400" : "text-slate-400"
              }`}>
                {priceMoveInDirection > 0 ? "+" : ""}{priceMoveInDirection.toFixed(1)} {spec.pipLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TradingView Chart */}
      <div className="bg-slate-800 rounded-lg p-2">
        <p className="text-xs text-slate-400 px-2 py-2">{signal.pair} • Live Chart</p>
        <div className="rounded-lg overflow-hidden">
          <iframe
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${tvSymbol}&interval=${tvInterval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=131722&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&calendar=0`}
            width="100%"
            height="420"
            frameBorder="0"
            allowTransparency
            scrolling="no"
            style={{ display: "block" }}
          />
        </div>
        <div className="px-2 pb-2 pt-3 text-xs text-slate-400">
          💡 Reference lines below — check chart against Entry/SL/TP values
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-slate-800 rounded-lg p-4">
        <p className="text-sm text-slate-400">Signal Confidence</p>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-lg font-bold ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
            {isBuy ? "BULLISH" : "BEARISH"}
          </span>
          <span className="text-3xl font-bold text-emerald-400">{signal.confidence}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
          <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${signal.confidence}%` }}></div>
        </div>
      </div>

      {/* Trade Levels */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">📊 Trade Levels</h3>
        <div className="flex rounded-lg overflow-hidden mb-4">
          <div className="bg-red-500/80 text-white text-xs font-semibold py-2 px-3 text-center"
            style={{ width: `${(riskUnits / (riskUnits + rewardUnits)) * 100}%`, minWidth: "80px" }}>
            Risk: {riskUnits.toFixed(0)} {spec.pipLabel}
          </div>
          <div className="bg-emerald-500/80 text-white text-xs font-semibold py-2 px-3 text-center flex-1">
            Reward: {rewardUnits.toFixed(0)} {spec.pipLabel}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Entry</span><span className="font-mono text-emerald-400">{signal.entry.toFixed(spec.decimals)}</span></div>
          <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-red-400"></span>Stop Loss</span><span className="font-mono text-red-400">{signal.stopLoss.toFixed(spec.decimals)}</span></div>
          <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>TP 1 (1:1)</span><span className="font-mono">{signal.tp1.toFixed(spec.decimals)}</span></div>
          <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>TP 2 (1:2)</span><span className="font-mono">{signal.tp2.toFixed(spec.decimals)}</span></div>
          <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>TP 3 (1:3)</span><span className="font-mono">{signal.tp3.toFixed(spec.decimals)}</span></div>
        </div>
        <div className="mt-4 bg-slate-700/50 rounded-lg py-2 text-center text-sm">
          Risk/Reward: <span className="text-emerald-400 font-bold">{signal.riskReward}</span>
        </div>
      </div>

      {/* Outcome */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">🎯 Mark Outcome</h3>
        <p className="text-xs text-slate-400 mb-3">Update once the trade closes to track your win rate</p>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => markOutcome("WIN")} disabled={updating}
            className={`py-2 px-2 rounded font-semibold text-sm transition ${
              signal.outcome === "WIN" ? "bg-emerald-500 text-white" : "bg-slate-700 hover:bg-emerald-500/50"
            }`}>✅ Win</button>
          <button onClick={() => markOutcome("LOSS")} disabled={updating}
            className={`py-2 px-2 rounded font-semibold text-sm transition ${
              signal.outcome === "LOSS" ? "bg-red-500 text-white" : "bg-slate-700 hover:bg-red-500/50"
            }`}>❌ Loss</button>
          <button onClick={() => markOutcome("BREAKEVEN")} disabled={updating}
            className={`py-2 px-2 rounded font-semibold text-sm transition ${
              signal.outcome === "BREAKEVEN" ? "bg-slate-500 text-white" : "bg-slate-700 hover:bg-slate-500/50"
            }`}>➖ BE</button>
          <button onClick={() => markOutcome("PENDING")} disabled={updating}
            className={`py-2 px-2 rounded font-semibold text-sm transition ${
              !signal.outcome || signal.outcome === "PENDING" ? "bg-yellow-500 text-white" : "bg-slate-700 hover:bg-yellow-500/50"
            }`}>⏳ Pending</button>
        </div>
      </div>

      {/* Bias */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">🧠 Trade Bias & Reasoning</h3>
        <div className="border-l-2 border-emerald-400 pl-4 mb-4">
          <p className="text-sm text-slate-300">💡 {signal.bias}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-slate-500 uppercase mb-1">Market Context</p>
          <p className="text-sm text-slate-300">{signal.marketContext}</p>
        </div>
        {supportingFactors.length > 0 && (
          <div className="mb-4">
            <p className="text-emerald-400 font-semibold text-sm mb-2">✅ Supporting Factors</p>
            <ul className="space-y-1">
              {supportingFactors.map((f, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-slate-500">›</span>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {riskFactors.length > 0 && (
          <div>
            <p className="text-red-400 font-semibold text-sm mb-2">🚨 Risk Factors</p>
            <ul className="space-y-1">
              {riskFactors.map((f, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-slate-500">›</span>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Checklist */}
      {Object.keys(checklist).length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4">⚡ Strategy Checklist</h3>
          <div className="space-y-4">
            {Object.entries(checklist).map(([key, c]) => (
              <div key={key} className="flex items-start gap-3">
                <span className="mt-0.5">{c?.pass ? "✅" : "❌"}</span>
                <div>
                  <p className="font-semibold text-sm">{labels[key] || key}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c?.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex justify-between"><span className="text-sm text-slate-400">Checks Passed</span><span className="text-emerald-400 font-bold">{passed}/{total}</span></div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${(passed / total) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg p-4 border border-emerald-500/20">
        <h3 className="text-lg font-bold mb-2">🎯 Final Verdict</h3>
        <div className={`text-2xl font-bold ${signal.confidence >= 80 ? "text-emerald-400" : signal.confidence >= 65 ? "text-yellow-400" : "text-red-400"}`}>
          {signal.confidence >= 80 ? "STRONG" : signal.confidence >= 65 ? "MODERATE" : "WEAK"} {signal.direction}
        </div>
        <p className="text-sm text-slate-400 mt-2">
          {signal.confidence >= 80 ? "High probability setup. All major criteria met." : signal.confidence >= 65 ? "Decent setup — consider reduced size." : "Weak setup — consider skipping."}
        </p>
      </div>

      <div className="text-center text-xs text-slate-500 pb-8">
        Signal generated: {new Date(signal.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
