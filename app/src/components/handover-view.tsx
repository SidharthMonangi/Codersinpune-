"use client";
import { useMemo, useState } from "react";
import { CLAIM_TYPES, type CompiledClaim, type CompiledHandover, type PlanItem } from "@/lib/types";
import { fmtDate } from "@/lib/util";
import { TrustBadge, TypeLabel, TRUST, Btn } from "@/components/ui";

export interface Ack {
  claimId: string;
  note?: string;
  at: string;
}

const initials = (n: string) => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function HandoverView({
  h,
  acks = [],
  onAck,
  compact = false,
}: {
  h: CompiledHandover;
  acks?: Ack[];
  onAck?: (claimId: string, note?: string) => Promise<void>;
  compact?: boolean;
}) {
  const [openCite, setOpenCite] = useState<string | null>(null);
  const [showSup, setShowSup] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const acked = useMemo(() => new Set(acks.map((a) => a.claimId)), [acks]);
  const critical = h.claims.filter((c) => c.critical);
  const sealedByArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of h.sealed) m.set(`${s.area}|${s.requestFrom}`, (m.get(`${s.area}|${s.requestFrom}`) ?? 0) + 1);
    return [...m.entries()].map(([k, n]) => ({ area: k.split("|")[0], from: k.split("|")[1], n }));
  }, [h.sealed]);
  const byId = new Map(h.claims.map((c) => [c.id, c]));
  const visibleCount = h.claims.filter((c) => !c.superseded).length;

  const Claim = ({ c }: { c: CompiledClaim }) => (
    <div className={`slip ${c.superseded ? "opacity-60" : ""}`} style={{ ["--slip" as string]: TRUST[c.trust].slip }}>
      <div className="flex flex-wrap items-center gap-2">
        <TypeLabel type={c.type} />
        <TrustBadge trust={c.trust} />
        {c.superseded ? <span className="stamp" style={{ color: "#b45309" }}>Outdated</span> : null}
        {c.critical ? <span className="label rounded-full bg-red-600 px-2 py-0.5 text-[9.5px] text-white">Critical</span> : null}
        {onAck && c.critical ? (
          acked.has(c.id) ? (
            <span className="ml-auto text-xs font-semibold text-emerald-700">✓ Acknowledged</span>
          ) : (
            <button onClick={() => onAck(c.id)} className="ml-auto rounded-full border border-emerald-300 bg-emerald-50/50 px-3 py-0.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100">
              Acknowledge
            </button>
          )
        ) : null}
      </div>
      <div className={`mt-1.5 text-[15px] leading-snug ${c.superseded ? "line-through decoration-mute/40" : ""}`}>{c.text}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink2">
        {c.citations.map((ct) => (
          <button key={ct.evidenceId} onClick={() => setOpenCite(openCite === c.id + ct.evidenceId ? null : c.id + ct.evidenceId)} className="etag">
            {ct.locator}
          </button>
        ))}
        {c.owner ? <span className="ml-1">Owner <b>{c.owner}</b></span> : null}
        {c.ownerLeaving ? <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-red-200">owner is leaving: confirm a new owner</span> : null}
        {c.due ? <span className="ml-1 font-mono">due {fmtDate(c.due)}</span> : null}
      </div>
      {c.citations.filter((ct) => openCite === c.id + ct.evidenceId).map((ct) => (
        <div key={ct.evidenceId} className="drawer-in mt-2 rounded-lg border border-rule bg-paper/60 p-3 text-[13px] text-ink2">
          <div className="label text-mute">{ct.source} · {ct.locator}</div>
          <div className="mt-1 font-display text-[17px] leading-snug text-ink">“{ct.excerpt}”</div>
        </div>
      ))}
    </div>
  );

  const Plan = ({ title, sub, items }: { title: string; sub: string; items: PlanItem[] }) => (
    <div className="sheet relative overflow-hidden p-4">
      <div className="absolute -right-3 -top-3 font-display text-[70px] leading-none text-paper2">{title.split(" ")[1]}</div>
      <div className="relative">
        <div className="label text-amberd">{sub}</div>
        <div className="font-display text-3xl">{title}</div>
        {items.length ? (
          <ul className="mt-3 space-y-2.5 text-[14px]">
            {items.map((p, i) => {
              const k = title + i;
              const on = done.has(k);
              return (
                <li key={i} className="flex gap-2.5">
                  <button
                    aria-label="Mark done"
                    onClick={() => setDone((d) => { const n = new Set(d); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                    className={`mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-md border-2 text-[11px] font-bold transition ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#c8baa0] bg-card hover:border-amber"}`}
                  >
                    {on ? "✓" : ""}
                  </button>
                  <span className={on ? "text-mute line-through" : ""}>
                    {p.text}
                    {p.due ? <span className="font-mono text-[11px] text-mute"> · due {fmtDate(p.due)}</span> : null}
                    {p.claimId && byId.get(p.claimId) ? <span className="ml-1.5 inline-block align-middle"><TrustBadge trust={byId.get(p.claimId)!.trust} /></span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mute">Nothing here for your role.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* cover sheet */}
      <div className="slab relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 font-display text-[220px] leading-none text-white/[0.04]">{initials(h.recipient.name)}</div>
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="label text-amber">Handover dossier · {h.project}</div>
            <h1 className="font-display mt-2 text-[44px] leading-[1.02] sm:text-[56px]">
              For {h.recipient.name}
              <br />
              <em className="text-white/60">as {h.recipient.role}</em>
            </h1>
            <div className="mt-3 text-sm text-white/65">
              Handed over by <b className="text-white/90">{h.leaver}</b>
              {h.lastDay ? <> · last day {fmtDate(h.lastDay)}</> : null}
            </div>
          </div>
          <div className="stamp-in stamp stamp-lg mt-2 bg-[#141920]" style={{ color: "#f5b544" }}>
            Approved v{h.version.n} · {h.version.approvedBy}
            <span className="font-normal opacity-70">#{h.version.hash}</span>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            [visibleCount, "items you can see"],
            [critical.length, "critical"],
            [h.sealed.length + h.hiddenCount, "sealed for your role"],
            [h.unknowns.length, "known unknowns"],
            [`${h.readiness}`, "readiness / 100"],
          ].map(([n, l]) => (
            <div key={String(l)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="font-display text-3xl">{n}</div>
              <div className="label text-white/50">{l}</div>
            </div>
          ))}
        </div>
        {onAck ? (
          <div className="relative mt-5 flex flex-wrap items-center gap-3 text-sm">
            {acked.has("__all__") ? (
              <span className="stamp" style={{ color: "#6ee7b7" }}>✓ Receipt acknowledged</span>
            ) : (
              <Btn kind="amber" onClick={() => onAck("__all__", "receipt")}>
                Acknowledge receipt of this handover
              </Btn>
            )}
            <span className="text-white/60">
              {critical.filter((c) => acked.has(c.id)).length}/{critical.length} critical items acknowledged
            </span>
            <span className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full bg-gradient-to-r from-amber to-ember transition-all" style={{ width: `${critical.length ? (100 * critical.filter((c) => acked.has(c.id)).length) / critical.length : 0}%` }} />
            </span>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <nav className="sticky top-16 z-20 flex gap-1 overflow-x-auto rounded-full border border-rule bg-card/90 p-1.5 text-xs shadow-sm backdrop-blur">
          {[["plan", "Plan"], ["people", "People"], ...CLAIM_TYPES.filter((t) => h.claims.some((c) => c.type === t.id && !c.superseded)).map((t) => [t.id, t.plural]), ["unknowns", "Unknowns"], ["sealed", "Sealed"]].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3 py-1 text-ink2 transition hover:bg-amberl hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      ) : null}

      <section id="plan" className="scroll-mt-32">
        <div className="label text-amberd">What to do, in order</div>
        <h2 className="font-display text-4xl">Your continuation plan</h2>
        <div className={`mt-4 grid gap-4 ${compact ? "" : "md:grid-cols-3"}`}>
          <Plan title="Day 1" sub="Get oriented" items={h.plan.day1} />
          <Plan title="Week 1" sub="Unblock the work" items={h.plan.week1} />
          <Plan title="Month 1" sub="Remove the risks" items={h.plan.month1} />
        </div>
      </section>

      {h.people.length ? (
        <section id="people" className="scroll-mt-32">
          <div className="label text-amberd">Who knows what</div>
          <h2 className="font-display text-4xl">People to talk to</h2>
          <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {h.people.map((p, i) => (
              <div key={p.name} className="sheet sheet-hover flex items-start gap-3 p-3.5">
                <div className="grid h-11 w-11 flex-none place-items-center rounded-full font-display text-lg text-ink" style={{ background: ["#fde68a", "#fed7aa", "#d9f99d", "#bae6fd", "#ddd6fe", "#fecdd3"][i % 6] }}>
                  {initials(p.name)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-mute">{p.title}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.about.map((a) => (
                      <span key={a} className="rounded-full bg-paper2 px-2 py-0.5 text-[11px] text-ink2">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {CLAIM_TYPES.map((t) => {
        const cl = h.claims.filter((c) => c.type === t.id && (showSup || !c.superseded));
        if (!cl.length) return null;
        return (
          <section key={t.id} id={t.id} className="scroll-mt-32">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-4xl">{t.plural}</h2>
              <span className="font-mono text-sm text-mute">{cl.length}</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {cl.map((c) => (
                <Claim key={c.id} c={c} />
              ))}
            </div>
          </section>
        );
      })}
      {h.claims.some((c) => c.superseded) ? (
        <button className="text-sm text-ink2 underline decoration-dotted underline-offset-4" onClick={() => setShowSup(!showSup)}>
          {showSup ? "Hide" : "Show"} outdated (superseded) records
        </button>
      ) : null}

      <section id="unknowns" className="scroll-mt-32">
        <div className="label text-amberd">Honest gaps</div>
        <h2 className="font-display text-4xl">What is still unknown</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink2">Questions Baton couldn&apos;t answer from the sources, and that the departing member couldn&apos;t or didn&apos;t answer. They&apos;re listed so they don&apos;t get lost. Baton doesn&apos;t guess.</p>
        {h.unknowns.length ? (
          <div className={`mt-4 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
            {h.unknowns.map((u, i) => (
              <div key={i} className="slip" style={{ ["--slip" as string]: TRUST.unsupported.slip }}>
                <div className="flex items-center gap-2">
                  <TrustBadge trust="unsupported" /> <span className="label text-mute">{u.area}</span>
                </div>
                <div className="mt-1.5 text-[14.5px]">{u.question}</div>
                {u.routedTo ? <div className="mt-1 text-xs text-ink2">Routed to <b>{u.routedTo}</b></div> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-mute">No open unknowns in your view.</p>
        )}
      </section>

      <section id="sealed" className="scroll-mt-32">
        <div className="label text-amberd">Permission-aware by construction</div>
        <h2 className="font-display text-4xl">Sealed for your role</h2>
        {sealedByArea.length || h.hiddenCount ? (
          <div className="mt-4 space-y-2.5">
            {sealedByArea.map((s) => (
              <div key={s.area + s.from} className="redact flex flex-wrap items-center gap-3 px-4 py-3.5 text-sm">
                <span className="stamp" style={{ color: "#f3efe6" }}>🔒 Sealed</span>
                <span>
                  <b>{s.n}</b> item{s.n > 1 ? "s" : ""} about <b>{s.area}</b> {s.n > 1 ? "are" : "is"} outside your access.
                </span>
                <span className="ml-auto text-white/60">Ask the {s.from}</span>
              </div>
            ))}
            {h.hiddenCount ? (
              <div className="redact px-4 py-2.5 text-xs text-white/70">
                {h.hiddenCount} restricted item{h.hiddenCount > 1 ? "s were" : " was"} withheld entirely (above your clearance). Not even the topic is shown.
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-mute">Nothing is sealed for your role.</p>
        )}
        <p className="mt-3 text-xs text-mute">Sealed items are removed on the server before this page is sent: their text and sources are not in this page at all.</p>
      </section>
    </div>
  );
}
