import Link from "next/link";

const STEPS: [string, string][] = [
  ["Connect", "Chat exports, docs, meeting transcripts, task boards or a GitHub repo. Every source keeps its access list. Secrets and PII are redacted first."],
  ["Reconstruct", "Baton extracts small claims (decisions, owners, risks, dependencies, blockers, next actions, contacts), each tied to the exact items it came from."],
  ["Verify", "Each claim is checked against its sources and stamped Verified, Inferred or Conflicting. Reversed decisions are superseded; unsupported claims are dropped."],
  ["Ask", "The Gap Interview: Baton finds what the sources can't explain and asks the leaver a short list of questions, ranked by risk."],
  ["Review", "A responsible person accepts, edits or rejects each claim and approves a version, which is hashed and frozen. Everything is logged."],
  ["Hand over", "Each recipient gets their own dossier: Day 1 / Week 1 / Month 1 plan, people to talk to, known unknowns. Restricted items are sealed."],
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <div className="rise label inline-flex items-center gap-2 rounded-full border border-rule bg-card/70 px-3 py-1 text-ink2">
              <span className="pulse-dot h-2 w-2 rounded-full bg-amber" /> Knowledge handover, rebuilt from evidence
            </div>
            <h1 className="rise rise-1 font-display mt-5 text-[56px] leading-[0.95] sm:text-[84px]">
              The handover
              <br />
              that doesn&apos;t <em className="bg-gradient-to-r from-amber to-ember bg-clip-text pr-2 text-transparent">drop.</em>
            </h1>
            <p className="rise rise-2 mt-6 max-w-xl text-lg leading-relaxed text-ink2">
              When someone leaves a project, the reasoning leaves with them. Baton rebuilds it from the sources you&apos;re allowed to use.
              Every claim carries its receipt, every gap gets asked before the last day, and every reader sees only what they&apos;re cleared to see.
            </p>
            <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/w" className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-paper shadow-[0_14px_30px_-14px_rgba(18,22,29,.7)] transition hover:bg-black">
                Try the live demo <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a href="#how" className="rounded-full border border-rule bg-card/70 px-5 py-3.5 text-[15px] font-medium hover:bg-card">
                See how it works
              </a>
            </div>
            <div className="rise rise-4 mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink2">
              {[
                ["6/6", "planted decisions found"],
                ["0/20", "permission leaks"],
                ["< 2 s", "to rebuild a project"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-3xl text-ink">{n}</div>
                  <div className="label text-mute">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* animated product moment */}
          <div className="rise rise-2 relative">
            <div className="absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-br from-amber/25 via-transparent to-ember/10 blur-2xl" />
            <div className="slab p-5 shadow-[0_40px_80px_-40px_rgba(18,22,29,.8)]">
              <div className="flex items-center justify-between">
                <span className="label text-amber">Live reconstruction</span>
                <span className="flex gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </span>
              </div>
              <div className="hero-loop mt-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-amber/90 text-[11px] font-bold text-ink">PN</span>
                    <b className="text-white/85">Priya Nair</b> <span className="font-mono">#backend · 20 Aug</span>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">
                    Decision: we are <span className="hl">moving the backend from Firebase to Supabase because the free tier quota broke during registrations</span>. I&apos;ll start the migration this week.
                  </p>
                </div>
                <div className="c1 relative rounded-xl bg-card p-3.5 text-ink">
                  <div className="flex items-center gap-2">
                    <span className="label text-mute">Decision</span>
                    <span className="label text-mute">· Database</span>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-snug">The backend moved from Firebase to Supabase because the free-tier quota broke during registrations.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="etag">#backend · 20 Aug</span>
                    <span className="etag">PR #118</span>
                    <span className="etag">sync 08-21 @ 01:10</span>
                  </div>
                  <span className="st stamp stamp-lg absolute -top-3 right-4 bg-card" style={{ color: "#1f7a4d" }}>
                    ✓ Verified · 3 sources
                  </span>
                </div>
                <div className="c2 relative overflow-hidden rounded-xl bg-card p-3.5 text-ink">
                  <div className="flex items-center justify-between">
                    <span className="label text-mute">Dependency · Sponsors &amp; finance</span>
                    <span className="label text-mute">viewed as: Volunteer</span>
                  </div>
                  <p className="mt-1.5 text-[15px]">Second instalment of the Nimbus Labs sponsorship depends on the usage report.</p>
                  <div className="seal redact absolute inset-0 flex items-center justify-center gap-2 text-sm">
                    <span className="stamp" style={{ color: "#f3efe6" }}>🔒 Sealed</span>
                    <span className="text-white/70">Outside your access · ask the Treasurer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y border-rule bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[1.3fr_1fr]">
          <blockquote className="font-display text-[34px] leading-[1.15] sm:text-[42px]">
            “<span className="text-amberd">42%</span> of what a person knows about their role is known only to them.”
            <div className="label mt-4 text-mute">Panopto Workplace Knowledge &amp; Productivity Report, 2018</div>
          </blockquote>
          <div className="space-y-3 text-[15px] text-ink2">
            <p>Docs record <i>what</i> was done, rarely <i>why</i>. Handover notes get written in the last week, by someone already halfway out the door, who can&apos;t see what a newcomer doesn&apos;t know.</p>
            <p>AI summarisers make this worse: they sound just as sure when they&apos;re guessing, smooth over contradictions, and mix restricted facts into text that goes to everyone.</p>
            <p className="font-medium text-ink">Baton treats a handover as evidence, not prose.</p>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="label text-amberd">Three ideas a summariser doesn&apos;t have</div>
        <h2 className="font-display mt-1 text-5xl">Receipts. Questions. Seals.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Pillar n="01" title="Evidence Ledger" text="Not a summary but a ledger of small claims. Each one links to the exact items it came from and carries a trust stamp. Assumptions never look like facts.">
            <div className="space-y-1.5">
              {["#1f7a4d", "#2453b8", "#c2410c"].map((c, i) => (
                <div key={c} className="slip !py-2" style={{ ["--slip" as string]: c, transform: `translateX(${i * 8}px)` }}>
                  <div className="h-2 w-3/4 rounded bg-paper2" />
                  <div className="mt-1.5 flex gap-1"><span className="etag !py-0 !text-[9px]">PR #142</span><span className="etag !py-0 !text-[9px]">#leads</span></div>
                </div>
              ))}
            </div>
          </Pillar>
          <Pillar n="02" title="Gap Interview" text="Baton finds what the sources can't explain: decisions without reasons, work without owners, contradictions, and areas only the leaver touched. Then it asks.">
            <div className="rounded-xl border border-rule bg-card p-3 text-[13px]">
              <div className="label text-red-700">Q1 · risk 63 · only you know this</div>
              <p className="mt-1 font-display text-lg leading-snug">Who owns migration 0009 after you leave, and is it safe to run?</p>
              <div className="mt-2 h-7 rounded-md border border-rule bg-paper/60" />
            </div>
          </Pillar>
          <Pillar n="03" title="Sealed Claims" text="Each handover is rebuilt per reader from only the sources they can open, then re-checked on that subset. Restricted items show as a seal and carry no content.">
            <div className="space-y-2 text-[13px]">
              <p>Sponsorship: second instalment depends on <span className="redact-line w-24" /> by <span className="redact-line w-14" />.</p>
              <div className="redact flex items-center gap-2 px-3 py-2 text-xs"><span className="stamp" style={{ color: "#f3efe6" }}>🔒 Sealed</span> 3 finance items · ask the Treasurer</div>
            </div>
          </Pillar>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16">
        <div className="label text-amberd">The relay</div>
        <h2 className="font-display mt-1 text-5xl">Six steps from scattered to handed over</h2>
        <div className="relative mt-10">
          <div className="absolute left-0 right-0 top-[22px] hidden h-[3px] rounded bg-gradient-to-r from-amber via-ember to-ink/80 md:block" />
          <ol className="grid gap-6 md:grid-cols-6">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative">
                <div className="relative z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-amber bg-card font-display text-xl shadow-sm">{i + 1}</div>
                <div className="mt-3 font-display text-2xl">{t}</div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="scroll-mt-20 border-y border-rule bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="label text-amberd">Trust model</div>
            <h2 className="font-display mt-1 text-5xl">Every line wears its confidence.</h2>
            <p className="mt-3 text-ink2">Only <b>Verified</b> and <b>Attested</b> claims read as plain statements. Everything else is labelled where it appears. Claims nothing supports are dropped. A human approves before anything is shared.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["#1f7a4d", "✓ Verified", "2+ sources, or an authoritative one (repo, doc, board)"],
              ["#2453b8", "Inferred", "One informal source. Likely, not confirmed"],
              ["#c2410c", "⇄ Conflicting", "Sources disagree, or the decision was reversed"],
              ["#6d3fc0", "✍ Attested", "Answered by a named person, with a date"],
              ["#b42318", "Unknown", "Listed as an open question, never guessed"],
              ["#3a4150", "🔒 Sealed", "Exists, but outside the reader's access"],
            ].map(([c, l, d]) => (
              <div key={l} className="sheet sheet-hover flex items-start gap-3 p-3.5">
                <span className="stamp" style={{ color: c }}>{l}</span>
                <span className="text-[13px] text-ink2">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="slab flex flex-wrap items-center justify-between gap-6 p-8 sm:p-10">
          <div>
            <div className="label text-amber">Two minutes, no sign-up</div>
            <div className="font-display mt-1 text-4xl sm:text-5xl">Watch a project hand itself over.</div>
            <p className="mt-2 max-w-xl text-white/70">Open Project Orion, a synthetic student-club project. Priya is leaving, Arjun is taking over, and the treasurer&apos;s numbers must stay sealed.</p>
          </div>
          <Link href="/w" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber px-7 py-4 font-semibold text-ink shadow-[0_14px_30px_-12px_rgba(245,158,11,.8)]">
            Open the demo <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-mute">
          Honest limits: Baton can only rebuild what was recorded somewhere, or what someone attests to. It flags missing knowledge instead of guessing, and a human must approve before anything is shared.
        </p>
      </section>
    </div>
  );
}

function Pillar({ n, title, text, children }: { n: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="sheet sheet-hover flex flex-col p-6">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-5xl text-amber">{n}</span>
        <span className="label text-mute">Baton</span>
      </div>
      <div className="font-display mt-2 text-3xl">{title}</div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink2">{text}</p>
      <div className="mt-5 flex-1 rounded-xl bg-paper/70 p-3">{children}</div>
    </div>
  );
}
