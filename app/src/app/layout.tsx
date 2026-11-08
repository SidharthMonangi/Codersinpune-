import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Baton: the handover that doesn't drop",
  description: "Turn scattered project activity into an evidence-linked, permission-aware handover.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-rule/80 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <Logo className="h-7 w-7 transition-transform duration-300 group-hover:-rotate-12" />
              <span className="font-display text-[26px] leading-none">Baton</span>
              <span className="label hidden rounded-full border border-rule px-2 py-0.5 text-[9.5px] text-mute sm:inline">Round 2 · live build</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-ink2">
              <Link href="/#how" className="hidden hover:text-ink sm:inline">How it works</Link>
              <Link href="/#trust" className="hidden hover:text-ink md:inline">Trust model</Link>
              <Link href="/w" className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 font-medium text-paper shadow-sm transition hover:bg-black">
                Open workspace <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t border-rule">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-mute">
            <span className="flex items-center gap-2"><Logo className="h-4 w-4" /> Baton · Team leisure (Sidharth Monangi)</span>
            <span className="label">CodersInPune · Knowledge Handover Challenge · demo data is synthetic</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
