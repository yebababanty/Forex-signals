"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface StrategyCheck {
  pass: boolean;
  detail: string;
}

interface Signal {
  id: string;
  pair: string;
  direction: string;
  timeframe: string;
  confidence: number;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: string;
  bias: string;
  marketContext: string;
  supportingFactors: string[] | string;
  riskFactors: string[] | string;
  strategyChecklist: Record<string, StrategyCheck> | string;
  chartImageUrl?: string;
  createdAt: string;
}

export default function SignalDetailPage() {
  const params = useParams();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSignal() {
      try {
        const res = await fetch(`/api/signals/${params.id}`);
        if (!res.ok) throw new Error("Signal not found");
        const data = await res.json();
        setSignal(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchSignal();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400"></div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || "Signal not found"}</p>
        <Link href="/" className="text-emerald-400 underline">← Back to Dashboard</Link>
      </div>
    );
  }

  // Parse JSON fields safely
  const supportingFactors: string[] = typeof signal.supportingFactors === "string"
    ? JSON.parse(signal.supportingFactors)
    : Array.isArray(signal.supportingFactors)
      ? signal.supportingFactors
      : [];

  const riskFactors: string[] = typeof signal.riskFactors === "string"
    ? JSON.parse(signal.riskFactors)
    : Array.isArray(signal.riskFactors)
      ? signal.riskFactors
      : [];

  const checklist: Record<string, StrategyCheck> = typeof signal.strategyChecklist === "string"
    ? JSON.parse(signal.strategyChecklist)
    : (signal.strategyChecklist as Record<string, StrategyCheck>) || {};

  const isJPY = signal.pair.includes("JPY");
  const pipMult = isJPY ? 100 : 10000;
  const riskPips = Math.abs(signal.entry - signal.stopLoss) * pipMult;
  const rewardPips = Math.abs(signal.tp2 - signal.entry) * pipMult;
  const isBuy = signal.direction === "BUY";

  const checklistLabels: Record<string, string> = {
    trendDirection: "1. Trend Direction",
    priceAction: "2. Price Action",
    keyLevel: "3. Key Level",
    emaAlignment: "4. EMA Alignment",
    rsiCondition: "5. RSI Condition",
    riskReward: "6. Risk/Reward Ratio",
    atrVolatility: "7. ATR Volatility",
  };

  const passedCount = Object.values(checklist).filter((c) => c?.pass).length;
  const totalChecks = Object.keys(checklist).length || 7;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <Link href="/" className="text-emerald-400 font-bold text-lg">📈 ForexSignals</Link>
        <div className="flex gap-4 text-sm text-slate-400">
          <Link href="/" className="hover:text-white">Dashboard</Link>
          <Link href="/signals" className="hover:text-white">Signals</Link>
          <Link href="/analysis" className="hover:text-white">Analysis</Link>
          <Link href="/scan" className="hover:text-white">🔄 Scan</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{signal.pair}</h1>
            <span className={`px-3 py-1 rounded text-sm font-bold ${isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {isBuy ? "▲" : "▼"} {signal.direction}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">{signal.timeframe} timeframe</p>
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
                 style={{ width: `${(riskPips / (riskPips + rewardPips)) * 100}%`, minWidth: "60px" }}>
              Risk: {riskPips.toFixed(1)}p
            </div>
            <div className="bg-emerald-500/80 text-white text-xs font-semibold py-2 px-3 text-center flex-1">
              Reward: {rewardPips.toFixed(1)}p
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Entry</span><span className="font-mono text-emerald-400">{signal.entry.toFixed(5)}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-red-400"></span>Stop Loss</span><span className="font-mono text-red-400">{signal.stopLoss.toFixed(5)}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>TP 1 (1:1)</span><span className="font-mono">{signal.tp1.toFixed(5)}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>TP 2 (1:2)</span><span className="font-mono">{signal.tp2.toFixed(5)}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>TP 3 (1:3)</span><span className="font-mono">{signal.tp3.toFixed(5)}</span></div>
          </div>

          <div className="mt-4 bg-slate-700/50 rounded-lg py-2 text-center text-sm">
            Risk/Reward: <span className="text-emerald-400 font-bold">{signal.riskReward}</span>
          </div>
        </div>

        {/* Bias & Reasoning */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">🧠 Trade Bias & Reasoning</h3>
          <div className="border-l-2 border-emerald-400 pl-4 mb-4">
            <p className="text-sm text-slate-300 leading-relaxed">💡 {signal.bias}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Market Context</p>
            <p className="text-sm text-slate-300">{signal.marketContext}</p>
          </div>

          {supportingFactors.length > 0 && (
            <div className="mb-4">
              <p className="text-emerald-400 font-semibold text-sm mb-2">✅ Supporting Factors</p>
              <ul className="space-y-1">
                {supportingFactors.map((f, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-slate-500">›</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {riskFactors.length > 0 && (
            <div>
              <p className="text-red-400 font-semibold text-sm mb-2">🚨 Risk Factors</p>
              <ul className="space-y-1">
                {riskFactors.map((f, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-slate-500">›</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Strategy Checklist */}
        {Object.keys(checklist).length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4">⚡ Strategy Checklist</h3>
            <div className="space-y-4">
              {Object.entries(checklist).map(([key, check]) => (
                <div key={key} className="flex items-start gap-3">
                  <span className="mt-0.5">{check?.pass ? "✅" : "❌"}</span>
                  <div>
                    <p className="font-semibold text-sm">{checklistLabels[key] || key}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{check?.detail || ""}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Checks Passed</span>
                <span className="text-emerald-400 font-bold">{passedCount}/{totalChecks}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${(passedCount / totalChecks) * 100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Final Verdict */}
        <div className="bg-slate-800 rounded-lg p-4 border border-emerald-500/20">
          <h3 className="text-lg font-bold mb-2">🎯 Final Verdict</h3>
          <div className={`text-2xl font-bold ${signal.confidence >= 80 ? "text-emerald-400" : signal.confidence >= 65 ? "text-yellow-400" : "text-red-400"}`}>
            {signal.confidence >= 80 ? "STRONG" : signal.confidence >= 65 ? "MODERATE" : "WEAK"} {signal.direction}
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {signal.confidence >= 80
              ? "High probability setup. All major criteria met."
              : signal.confidence >= 65
                ? "Decent setup with some caveats. Consider reduced size."
                : "Weak setup. Consider skipping."}
          </p>
        </div>

        <div className="text-center text-xs text-slate-500 pb-8">
          Signal generated: {new Date(signal.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
