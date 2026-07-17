import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PriceChart from "@/components/PriceChart";

export const dynamic = "force-dynamic";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const signal = await db.signal.findUnique({ where: { id } });

  if (!signal) notFound();

  const reasoning = signal.biasReasoning as any;
  const analysis = signal.analysis as any;
  const isBuy = signal.direction === "BUY";

  // Extract S/R levels for chart
  const supportLevels = analysis?.srZones
    ?.filter((z: any) => z.type === "support")
    ?.map((z: any) => z.price)
    ?.slice(0, 3) || [];

  const resistanceLevels = analysis?.srZones
    ?.filter((z: any) => z.type === "resistance")
    ?.map((z: any) => z.price)
    ?.slice(0, 3) || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 flex-wrap">
          {signal.display}
          <span className={`badge text-base ${isBuy ? "badge-buy" : "badge-sell"}`}>
            {isBuy ? "▲" : "▼"} {signal.direction}
          </span>
        </h1>
        <p className="text-slate-400 mt-1">{signal.timeframe} timeframe</p>
      </div>

      {/* CHART */}
      <PriceChart
        pair={signal.pair}
        timeframe={signal.timeframe}
        entry={signal.entryPrice}
        stopLoss={signal.stopLoss}
        takeProfit1={signal.takeProfit1}
        takeProfit2={signal.takeProfit2}
        takeProfit3={signal.takeProfit3}
        supportLevels={supportLevels}
        resistanceLevels={resistanceLevels}
      />

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Signal Confidence</div>
            <div className={`text-lg font-bold mt-1 ${signal.bias === "BULLISH" ? "text-emerald-400" : "text-red-400"}`}>
              {signal.bias}
            </div>
          </div>
          <div className={`text-4xl font-bold ${signal.confidence >= 80 ? "text-emerald-400" : signal.confidence >= 65 ? "text-yellow-400" : "text-red-400"}`}>
            {signal.confidence}%
          </div>
        </div>
        <div className="mt-3 bg-slate-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${signal.confidence >= 80 ? "bg-emerald-400" : signal.confidence >= 65 ? "bg-yellow-400" : "bg-red-400"}`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">📊 Trade Levels</h2>
        <div className="flex items-center gap-1 mb-4">
          <div className="bg-red-500/30 h-8 rounded-l-lg flex items-center justify-center text-xs font-semibold text-red-300 px-2 flex-1">
            Risk: {signal.riskPips}p
          </div>
          <div className="bg-emerald-500/30 h-8 rounded-r-lg flex items-center justify-center text-xs font-semibold text-emerald-300 px-2" style={{ flex: signal.riskRewardRatio }}>
            Reward: {signal.rewardPips}p
          </div>
        </div>

        <div className="space-y-2">
          <LevelRow label="🔵 Entry" value={signal.entryPrice} color="text-blue-400" />
          <LevelRow label="🔴 Stop Loss" value={signal.stopLoss} color="text-red-400" />
          <div className="border-t border-slate-700 my-2" />
          <LevelRow label="🟢 TP 1 (1:1)" value={signal.takeProfit1} color="text-emerald-400" />
          <LevelRow label="🟢 TP 2 (1:2)" value={signal.takeProfit2} color="text-emerald-400" />
          <LevelRow label="🟢 TP 3 (1:3)" value={signal.takeProfit3} color="text-emerald-400" />
        </div>

        <div className="mt-4 text-center bg-slate-700 rounded-lg p-2">
          <span className="text-sm text-slate-400">Risk/Reward: </span>
          <span className="font-bold text-emerald-400">1:{signal.riskRewardRatio}</span>
        </div>
      </div>

      {reasoning && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">🧠 Trade Bias & Reasoning</h2>

          <div className="bg-slate-900 rounded-lg p-4 mb-4 border-l-4 border-yellow-400">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <p className="text-slate-200 leading-relaxed">{reasoning.primary}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Market Context</div>
            <p className="text-sm text-slate-300">{reasoning.marketContext}</p>
          </div>

          {reasoning.supporting?.length > 0 && (
            <Section title="✅ Supporting Factors" color="text-emerald-400" items={reasoning.supporting} bulletColor="text-emerald-500" />
          )}

          {reasoning.conflicting?.length > 0 && (
            <Section title="⚠️ Conflicting Factors" color="text-yellow-400" items={reasoning.conflicting} bulletColor="text-yellow-500" />
          )}

          {reasoning.riskFactors?.length > 0 && (
            <Section title="🛡️ Risk Factors" color="text-red-400" items={reasoning.riskFactors} bulletColor="text-red-500" />
          )}
        </div>
      )}

      {reasoning?.strategy && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">⚡ Strategy Checklist</h2>
          <div className="space-y-3">
            <StratCheck label="1. Trend Direction" detail={reasoning.strategy.trendAlignment} passed={true} />
            <StratCheck label="2. Price Action" detail={reasoning.strategy.priceActionConfirmation} passed={true} />
            <StratCheck label="3. S/R Zone" detail={reasoning.strategy.keyLevelAction} passed={reasoning.strategy.keyLevelAction !== "No strong key level interaction"} />
          </div>
        </div>
      )}

      {analysis?.indicators && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">📈 Indicators</h2>
          <div className="grid grid-cols-2 gap-3">
            <IndicatorBox label="RSI (14)" value={analysis.indicators.rsi} />
            <IndicatorBox label="ATR" value={`${analysis.indicators.atrPips}p`} />
            {analysis.trend && (
              <>
                <IndicatorBox label="Trend Strength" value={`${analysis.trend.strength}%`} />
                <IndicatorBox label="HTF Bias" value={analysis.trend.higherTFBias} />
              </>
            )}
          </div>
        </div>
      )}

      <div className="card border-yellow-500/20 bg-yellow-500/5">
        <div className="flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-yellow-400">Risk Disclaimer</h3>
            <p className="text-sm text-slate-400 mt-1">
              This is an automated analysis tool, not financial advice. Always do your own research and use proper risk management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LevelRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function Section({ title, color, items, bulletColor }: { title: string; color: string; items: string[]; bulletColor: string }) {
  return (
    <div className="mb-4">
      <h3 className={`text-sm font-semibold ${color} mb-2`}>{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <span className={`${bulletColor} mt-0.5`}>›</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StratCheck({ label, detail, passed }: { label: string; detail: string; passed: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${passed ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-yellow-500/5 border border-yellow-500/10"}`}>
      <span className="text-lg">{passed ? "✅" : "⚠️"}</span>
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-sm text-slate-400 mt-0.5">{detail}</div>
      </div>
    </div>
  );
}

function IndicatorBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 rounded-lg p-3">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
