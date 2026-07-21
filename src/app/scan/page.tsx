"use client";

import { useState } from "react";
import Link from "next/link";

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [scanResult, setScanResult] = useState<{scanned:number;created:number;skipped:number;errors:string[]} | null>(null);
  const [checkResult, setCheckResult] = useState<{checked:number;updated:number;wins:number;losses:number;stillPending:number;details:Array<{pair:string;outcome:string;livePrice:number;entry:number}>} | null>(null);

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/scan-manual", { method: "POST" });
      const data = await res.json();
      setScanResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  }

  async function runCheck() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch("/api/check-outcomes", { method: "POST" });
      const data = await res.json();
      setCheckResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  }

  async function clearAll() {
    if (!confirm("Delete ALL signals? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/clear-signals", { method: "POST" });
      const data = await res.json();
      alert(`Deleted ${data.deleted} signals`);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">🔄 Scanner</h1>

      {/* Generate Signals */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">🚀 Generate New Signals</h2>
        <p className="text-sm text-slate-400 mb-4">
          Scans all 13 instruments (forex, gold, silver, oil, indices) on 1H and 4H timeframes using LIVE prices.
        </p>
        <button
          onClick={runScan}
          disabled={scanning}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
        >
          {scanning ? "⏳ Scanning..." : "🚀 Scan All Pairs Now"}
        </button>

        {scanResult && (
          <div className="mt-4 bg-slate-900 rounded p-3 text-sm">
            <p className="text-emerald-400 font-semibold mb-2">✅ Scan Complete</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-400">Scanned</p>
                <p className="text-lg font-bold text-blue-400">{scanResult.scanned}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Created</p>
                <p className="text-lg font-bold text-emerald-400">{scanResult.created}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Skipped</p>
                <p className="text-lg font-bold text-yellow-400">{scanResult.skipped}</p>
              </div>
            </div>
            {scanResult.errors?.length > 0 && (
              <div className="mt-2 text-xs text-red-400">
                {scanResult.errors.length} errors
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check Outcomes */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">🎯 Auto-Check Outcomes</h2>
        <p className="text-sm text-slate-400 mb-4">
          Compares current live prices vs Entry/SL/TP for all pending signals and auto-marks WIN/LOSS.
        </p>
        <button
          onClick={runCheck}
          disabled={checking}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
        >
          {checking ? "⏳ Checking..." : "🎯 Check All Pending Trades"}
        </button>

        {checkResult && (
          <div className="mt-4 bg-slate-900 rounded p-3 text-sm">
            <p className="text-blue-400 font-semibold mb-2">✅ Check Complete</p>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div>
                <p className="text-xs text-slate-400">Checked</p>
                <p className="text-lg font-bold text-blue-400">{checkResult.checked}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Wins</p>
                <p className="text-lg font-bold text-emerald-400">{checkResult.wins}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Losses</p>
                <p className="text-lg font-bold text-red-400">{checkResult.losses}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pending</p>
                <p className="text-lg font-bold text-yellow-400">{checkResult.stillPending}</p>
              </div>
            </div>
            {checkResult.details && checkResult.details.length > 0 && (
              <div className="border-t border-slate-700 pt-2">
                <p className="text-xs text-slate-400 mb-2">Recent updates:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {checkResult.details.map((d, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{d.pair}</span>
                      <span className={d.outcome === "WIN" ? "text-emerald-400" : "text-red-400"}>
                        {d.outcome === "WIN" ? "✅ WIN" : "❌ LOSS"} @ {d.livePrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-check info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
        💡 <strong>Tip:</strong> Auto-check runs every 6 hours via cron. You can also trigger it manually anytime.
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
        <h3 className="text-sm font-bold text-red-400 mb-2">⚠️ Danger Zone</h3>
        <button
          onClick={clearAll}
          className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 font-semibold py-2 rounded transition text-sm"
        >
          🗑️ Clear All Signals (Reset DB)
        </button>
      </div>

      <div className="text-center">
        <Link href="/" className="text-emerald-400 underline text-sm">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
