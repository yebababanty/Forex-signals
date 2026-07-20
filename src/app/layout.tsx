import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForexSignals - Pro Trading Signals",
  description: "AI-powered forex, commodities & indices signals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-white min-h-screen">
        <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-900 z-50">
          <Link href="/" className="text-emerald-400 font-bold text-lg">
            📈 ForexSignals
          </Link>
          <div className="flex gap-4 text-sm text-slate-400">
            <Link href="/" className="hover:text-white">Dashboard</Link>
            <Link href="/stats" className="hover:text-white">📊 Stats</Link>
            <Link href="/scan" className="hover:text-white">🔄 Scan</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
