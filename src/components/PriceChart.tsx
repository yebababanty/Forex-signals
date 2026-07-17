"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, LineSeries } from "lightweight-charts";

interface PriceChartProps {
  pair: string;
  timeframe: string;
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  supportLevels?: number[];
  resistanceLevels?: number[];
}

export default function PriceChart({
  pair,
  timeframe,
  entry,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  supportLevels = [],
  resistanceLevels = [],
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: IChartApi | null = null;
    let candlestickSeries: ISeriesApi<"Candlestick"> | null = null;

    const setupChart = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch candles
        const res = await fetch(`/api/candles/${pair}?timeframe=${timeframe}&count=150`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        // Create chart
        chart = createChart(chartContainerRef.current!, {
          layout: {
            background: { color: "#0F172A" },
            textColor: "#94A3B8",
          },
          grid: {
            vertLines: { color: "#1E293B" },
            horzLines: { color: "#1E293B" },
          },
          width: chartContainerRef.current!.clientWidth,
          height: 400,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: "#334155",
          },
          rightPriceScale: {
            borderColor: "#334155",
          },
          crosshair: {
            mode: 1,
          },
        });

        chartRef.current = chart;

        // Add candlestick series
        candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#10B981",
          downColor: "#EF4444",
          borderVisible: false,
          wickUpColor: "#10B981",
          wickDownColor: "#EF4444",
        });

        candlestickSeries.setData(data.candles);

        // Add price lines for trade levels
        if (entry) {
          candlestickSeries.createPriceLine({
            price: entry,
            color: "#3B82F6",
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: "Entry",
          });
        }

        if (stopLoss) {
          candlestickSeries.createPriceLine({
            price: stopLoss,
            color: "#EF4444",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "SL",
          });
        }

        if (takeProfit1) {
          candlestickSeries.createPriceLine({
            price: takeProfit1,
            color: "#10B981",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP1",
          });
        }

        if (takeProfit2) {
          candlestickSeries.createPriceLine({
            price: takeProfit2,
            color: "#059669",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP2",
          });
        }

        if (takeProfit3) {
          candlestickSeries.createPriceLine({
            price: takeProfit3,
            color: "#047857",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP3",
          });
        }

        // Support levels
        supportLevels.forEach((level, i) => {
          candlestickSeries!.createPriceLine({
            price: level,
            color: "#10B981",
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: false,
            title: `S${i + 1}`,
          });
        });

        // Resistance levels
        resistanceLevels.forEach((level, i) => {
          candlestickSeries!.createPriceLine({
            price: level,
            color: "#EF4444",
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: false,
            title: `R${i + 1}`,
          });
        });

        chart.timeScale().fitContent();

        setLoading(false);

        // Handle resize
        const handleResize = () => {
          if (chart && chartContainerRef.current) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
      } catch (err: any) {
        setError(err.message || "Failed to load chart");
        setLoading(false);
      }
    };

    setupChart();

    return () => {
      if (chart) {
        chart.remove();
      }
    };
  }, [pair, timeframe, entry, stopLoss, takeProfit1, takeProfit2, takeProfit3]);

  return (
    <div className="card p-2 md:p-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="text-sm font-semibold">
          {pair.slice(0, 3)}/{pair.slice(3)} • {timeframe.toUpperCase()}
        </div>
        {loading && <div className="text-xs text-slate-400">Loading chart...</div>}
      </div>
      {error && (
        <div className="text-red-400 text-sm p-4 text-center">
          ❌ {error}
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ minHeight: "400px" }} />
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400 justify-center">
        {entry && <span>🔵 Entry</span>}
        {stopLoss && <span>🔴 SL</span>}
        {takeProfit1 && <span>🟢 TPs</span>}
        {supportLevels.length > 0 && <span>💚 Support</span>}
        {resistanceLevels.length > 0 && <span>❤️ Resistance</span>}
      </div>
    </div>
  );
}
