import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Baton: knowledge handover you can trust",
  description: "Turn scattered project activity into an evidence-linked, permission-aware handover.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-ink">
              <Logo /> <span className="text-lg">Baton</span>
              <span className="hidden rounded-full bg-amberl px-2 py-0.5 text-[11px] font-semibold text-amberd sm:inline">Round 2 build</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink2">
              <Link href="/#how" className="hidden hover:text-ink sm:inline">How it works</Link>
              <Link href="/w" className="rounded-md bg-ink px-3 py-1.5 font-medium text-white hover:bg-slate-800">Open workspace</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          Baton · Team leisure (Sidharth Monangi) · CodersInPune Knowledge Handover Challenge · Demo data is synthetic
        </footer>
      </body>
    </html>
  );
}
