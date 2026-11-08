import Link from "next/link";

const STEPS = [
  ["Connect", "Upload chat exports, docs, meeting transcripts and task boards, or connect a GitHub repo. Every source keeps its access list. Secrets and PII are redacted first."],
  ["Reconstruct", "Baton extracts small typed claims (decisions, owners, risks, dependencies, blockers, next actions, contacts), each tied to the exact items it came from."],
  ["Verify", "Each claim is checked against its sources and labelled Verified, Inferred or Conflicting. Reversed decisions are marked superseded, and unsupported claims are dropped."],
  ["Ask", "The Gap Interview: Baton finds what the sources can't explain and asks the departing person a short list of questions, ranked by risk."],
  ["Review", "A responsible person accepts, edits or rejects claims and approves a version, which is hashed and frozen. Everything is audit-logged."],
  ["Handover", "Each recipient gets a role-specific handover with a Day 1 / Week 1 / Month 1 plan. Restricted items are sealed on the server."],
];

export default function Home() {
  return (
    <div>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber">Knowledge handover · CodersInPune</div>
            <h1 className="mt-3 text-5xl font-black leading-[1.05] tracking-tight">
              Hand over the work,
              <br />
              <span className="text-amber">not just the files.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              When someone leaves a project, the reasoning leaves with them. Baton rebuilds it from authorised sources. Every claim links to its evidence, gaps get asked before the last day,
              and every reader sees only what they&apos;re allowed to see.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/w" className="rounded-lg bg-amber px-5 py-3 font-bold text-ink hover:bg-amber-400">
                Try the live demo →
              </Link>
              <a href="#how" className="rounded-lg border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">
                How it works
              </a>
            </div>
            <p className="mt-3 text-sm text-slate-400">No sign-up. The demo loads a synthetic student-club project (“Project Orion”) in about 2 seconds.</p>
          </div>
          <div className="space-y-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <Mock trust="VERIFIED" cls="bg-green-100 text-green-800" bar="border-l-green-500" type="Decision" text="Backend moved from Firebase to Supabase because the free-tier quota broke during registrations." cites={["#backend · 20 Aug", "PR #118", "sync 08-21 @ 01:10"]} />
            <Mock trust="CONFLICTING" cls="bg-orange-100 text-orange-800" bar="border-l-orange-500" type="Decision · superseded" text="Design doc says MongoDB, but everything since August targets Postgres. The doc is outdated." cites={["design.md § Architecture", "#backend · 20 Aug"]} />
            <Mock trust="ATTESTED · Priya" cls="bg-violet-100 text-violet-800" bar="border-l-violet-500" type="Risk" text="College SSO certificate expires on 14 Mar 2027. Mr. Deshpande (IT cell) renews it, and he only replies by email." cites={["Gap Interview", "PR #142"]} />
            <div className="sealed-bg rounded-lg border-l-4 border-l-slate-400 px-3 py-2 text-sm text-slate-700">
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">🔒 SEALED</span> 3 items about Sponsors &amp; finance are outside your access. Ask the Treasurer.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Evidence Ledger", "Not a summary. A ledger of small claims, each linked to exact source items and labelled with a trust state. Assumptions never look like facts."],
            ["Gap Interview", "Baton detects decisions without reasons, work without owners, contradictions, and areas only the leaver touched (the Sole-Knower Index). Then it asks."],
            ["Sealed Claims", "Each handover is rebuilt per reader from the sources they can open, and re-verified on that subset. Restricted items show as a lock, with no content."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-lg font-bold">{t}</div>
              <p className="mt-1 text-sm text-ink2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 pb-10">
        <h2 className="text-2xl font-extrabold">How it works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-amberd">STEP {i + 1}</div>
              <div className="font-bold">{t}</div>
              <p className="mt-1 text-sm text-ink2">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amberl/60 p-4 text-sm text-ink2">
          <b>Honest limits:</b> Baton can only rebuild what was recorded somewhere, or what someone attests to. Knowledge that was only ever spoken aloud and since forgotten can&apos;t be recovered:
          Baton flags those gaps instead of guessing. The verifier reduces errors but does not eliminate them, so a human must approve before anything is shared.
        </div>
      </section>
    </div>
  );
}

function Mock({ trust, cls, bar, type, text, cites }: { trust: string; cls: string; bar: string; type: string; text: string; cites: string[] }) {
  return (
    <div className={`rounded-lg border-l-4 bg-white px-3 py-2 text-ink ${bar}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{type}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{trust}</span>
      </div>
      <div className="mt-1 text-sm">{text}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {cites.map((c) => (
          <span key={c} className="rounded border border-slate-300 bg-slate-50 px-1.5 font-mono text-[10px] text-slate-700">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
