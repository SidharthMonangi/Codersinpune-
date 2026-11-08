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
  const acked = useMemo(() => new Set(acks.map((a) => a.claimId)), [acks]);
  const critical = h.claims.filter((c) => c.critical);
  const sealedByArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of h.sealed) m.set(`${s.area}|${s.requestFrom}`, (m.get(`${s.area}|${s.requestFrom}`) ?? 0) + 1);
    return [...m.entries()].map(([k, n]) => ({ area: k.split("|")[0], from: k.split("|")[1], n }));
  }, [h.sealed]);
  const byId = new Map(h.claims.map((c) => [c.id, c]));

  const Claim = ({ c }: { c: CompiledClaim }) => (
    <div className={`rounded-lg border border-slate-200 border-l-4 bg-white px-3 py-2 ${TRUST[c.trust].bar} ${c.superseded ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <TypeLabel type={c.type} />
        <TrustBadge trust={c.trust} />
        {c.superseded ? <span className="rounded-full bg-amberl px-2 py-0.5 text-[10.5px] font-bold text-amberd">SUPERSEDED · outdated</span> : null}
        {c.critical ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold text-red-700">CRITICAL</span> : null}
        {onAck && c.critical ? (
          acked.has(c.id) ? (
            <span className="ml-auto text-xs font-semibold text-green-700">✓ Acknowledged</span>
          ) : (
            <button onClick={() => onAck(c.id)} className="ml-auto rounded-md border border-green-300 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-50">
              Acknowledge
            </button>
          )
        ) : null}
      </div>
      <div className={`mt-1 text-sm ${c.superseded ? "line-through decoration-slate-300" : ""}`}>{c.text}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-600">
        {c.citations.map((ct) => (
          <button
            key={ct.evidenceId}
            onClick={() => setOpenCite(openCite === c.id + ct.evidenceId ? null : c.id + ct.evidenceId)}
            className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] hover:border-amber hover:bg-amberl"
          >
            {ct.locator}
          </button>
        ))}
        {c.owner ? <span className="ml-2">Owner: <b>{c.owner}</b></span> : null}
        {c.ownerLeaving ? <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700">owner is leaving: confirm a new owner</span> : null}
        {c.due ? <span className="ml-2">Due: <b>{fmtDate(c.due)}</b></span> : null}
      </div>
      {c.citations.filter((ct) => openCite === c.id + ct.evidenceId).map((ct) => (
        <div key={ct.evidenceId} className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-ink2">
          <div className="font-semibold">{ct.source} · {ct.locator}</div>
          <div className="mt-0.5 whitespace-pre-wrap">“{ct.excerpt}”</div>
        </div>
      ))}
    </div>
  );

  const Plan = ({ title, items }: { title: string; items: PlanItem[] }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="font-bold">{title}</div>
      {items.length ? (
        <ul className="mt-1 space-y-1.5 text-sm">
          {items.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 h-3 w-3 flex-none rounded-sm border border-slate-400" />
              <span>
                {p.text}
                {p.due ? <span className="text-xs text-slate-500"> · due {fmtDate(p.due)}</span> : null}
                {p.claimId && byId.get(p.claimId) ? <span className="ml-1"><TrustBadge trust={byId.get(p.claimId)!.trust} /></span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Nothing here for your role.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-ink p-5 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-amber">Handover · {h.project}</div>
        <div className="mt-1 text-2xl font-extrabold">
          For {h.recipient.name} <span className="font-normal text-slate-300">as {h.recipient.role}</span>
        </div>
        <div className="mt-1 text-sm text-slate-300">
          From {h.leaver}
          {h.lastDay ? ` (last day ${fmtDate(h.lastDay)})` : ""} · version v{h.version.n} <span className="font-mono">{h.version.hash}</span> approved by {h.version.approvedBy} on {fmtDate(h.version.at)}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-white/10 px-2 py-1">{h.claims.filter((c) => !c.superseded).length} items you can see</span>
          <span className="rounded-md bg-white/10 px-2 py-1">{critical.length} critical</span>
          <span className="rounded-md bg-white/10 px-2 py-1">🔒 {h.sealed.length} sealed{h.hiddenCount ? ` + ${h.hiddenCount} withheld` : ""}</span>
          <span className="rounded-md bg-white/10 px-2 py-1">{h.unknowns.length} known unknowns</span>
          <span className="rounded-md bg-white/10 px-2 py-1">Readiness {h.readiness}/100</span>
        </div>
        {onAck ? (
          <div className="mt-3 text-sm">
            {acked.has("__all__") ? (
              <span className="font-semibold text-green-300">✓ You acknowledged receipt of this handover</span>
            ) : (
              <Btn kind="amber" onClick={() => onAck("__all__", "receipt")}>
                Acknowledge receipt of this handover
              </Btn>
            )}
            <span className="ml-2 text-slate-300">
              {critical.filter((c) => acked.has(c.id)).length}/{critical.length} critical items acknowledged
            </span>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <nav className="sticky top-14 z-20 -mx-1 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white/95 p-1.5 text-xs backdrop-blur">
          {[["plan", "Plan"], ["people", "People"], ...CLAIM_TYPES.filter((t) => h.claims.some((c) => c.type === t.id && !c.superseded)).map((t) => [t.id, t.plural]), ["unknowns", "Unknowns"], ["sealed", "Sealed"]].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-md px-2 py-1 text-ink2 hover:bg-amberl hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      ) : null}

      <section id="plan" className="scroll-mt-28">
        <h2 className="mb-2 text-lg font-bold">Your continuation plan</h2>
        <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
          <Plan title="Day 1" items={h.plan.day1} />
          <Plan title="Week 1" items={h.plan.week1} />
          <Plan title="Month 1" items={h.plan.month1} />
        </div>
      </section>

      {h.people.length ? (
        <section id="people" className="scroll-mt-28">
          <h2 className="mb-2 text-lg font-bold">People to talk to</h2>
          <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {h.people.map((p) => (
              <div key={p.name} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">{p.title}</div>
                <div className="mt-1 text-xs">About: {p.about.join(", ")}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {CLAIM_TYPES.map((t) => {
        const cl = h.claims.filter((c) => c.type === t.id && (showSup || !c.superseded));
        if (!cl.length) return null;
        return (
          <section key={t.id} id={t.id} className="scroll-mt-28">
            <h2 className="mb-2 text-lg font-bold">
              {t.plural} <span className="text-sm font-normal text-slate-500">({cl.length})</span>
            </h2>
            <div className="space-y-2">
              {cl.map((c) => (
                <Claim key={c.id} c={c} />
              ))}
            </div>
          </section>
        );
      })}
      {h.claims.some((c) => c.superseded) ? (
        <button className="text-sm text-ink2 underline" onClick={() => setShowSup(!showSup)}>
          {showSup ? "Hide" : "Show"} outdated (superseded) records
        </button>
      ) : null}

      <section id="unknowns" className="scroll-mt-28">
        <h2 className="mb-2 text-lg font-bold">What is still unknown</h2>
        <p className="mb-2 text-sm text-slate-600">These are questions Baton could not answer from the sources and the departing member could not or did not answer. They are listed so they don&apos;t get lost; Baton doesn&apos;t guess.</p>
        {h.unknowns.length ? (
          <ul className="space-y-1.5">
            {h.unknowns.map((u, i) => (
              <li key={i} className="rounded-lg border border-red-200 border-l-4 border-l-red-600 bg-white px-3 py-2 text-sm">
                <TrustBadge trust="unsupported" /> <span className="ml-1 text-xs text-slate-500">{u.area}</span>
                <div className="mt-1">{u.question}</div>
                {u.routedTo ? <div className="text-xs text-slate-600">Routed to <b>{u.routedTo}</b></div> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No open unknowns in your view.</p>
        )}
      </section>

      <section id="sealed" className="scroll-mt-28">
        <h2 className="mb-2 text-lg font-bold">Sealed for your role</h2>
        {sealedByArea.length || h.hiddenCount ? (
          <div className="space-y-1.5">
            {sealedByArea.map((s) => (
              <div key={s.area + s.from} className="sealed-bg rounded-lg border border-slate-300 border-l-4 border-l-slate-500 px-3 py-2 text-sm">
                <TrustBadge trust="sealed" /> <b className="ml-1">{s.n}</b> item{s.n > 1 ? "s" : ""} about <b>{s.area}</b> are outside your access. Ask the <b>{s.from}</b> if you need them.
              </div>
            ))}
            {h.hiddenCount ? <div className="text-xs text-slate-500">{h.hiddenCount} restricted item(s) were withheld entirely (above your clearance).</div> : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nothing is sealed for your role.</p>
        )}
        <p className="mt-2 text-xs text-slate-500">Sealed items are removed on the server before this page is sent: their text and sources are not in this page at all.</p>
      </section>
    </div>
  );
}
