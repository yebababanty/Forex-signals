import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Forex Signal App",
  description: "AI-powered forex signals with full trade analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="fixed top-0 left-0 right-0 bg-slate-800 border-b border-slate-700 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
            <Link href="/dashboard" className="text-lg font-bold text-emerald-400">
              📈 ForexSignals
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-300 hover:text-white">Dashboard</Link>
              <Link href="/signals" className="text-slate-300 hover:text-white">Signals</Link>
              <Link href="/analysis/EURUSD" className="text-slate-300 hover:text-white">Analysis</Link>
            </div>
          </div>
        </nav>
        <main className="pt-20 pb-8 max-w-6xl mx-auto px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
