"use client";
import { useMemo, useState } from "react";
import { CLAIM_TYPES, type Claim, type ClaimType, type Trust } from "@/lib/types";
import { personName } from "@/lib/people";
import { fmtDate } from "@/lib/util";
import { Btn, Card, Empty, TrustBadge, TypeLabel, TRUST } from "@/components/ui";
import { Cites } from "./evidence";
import { useWs } from "./ctx";

export function ClaimCard({ c, children }: { c: Claim; children?: React.ReactNode }) {
  const { ws } = useWs();
  const sup = c.supersededBy ? ws.claims.find((x) => x.id === c.supersededBy) : null;
  return (
    <div className={`slip ${c.status === "rejected" ? "opacity-45" : ""}`} style={{ ["--slip" as string]: TRUST[c.trust].slip }}>
      <div className="flex flex-wrap items-center gap-2">
        <TypeLabel type={c.type} />
        <TrustBadge trust={c.trust} extra={c.trust === "attested" ? "Gap Interview" : c.evidence.length > 1 ? `${c.evidence.length} items` : undefined} />
        {c.supersededBy ? <span className="stamp" style={{ color: "#b45309" }}>Superseded</span> : null}
        <span className="label text-[9.5px] text-mute/70">{c.origin === "ai" ? "AI-extracted" : c.origin === "rules" ? "rule-extracted" : "human"}</span>
        {c.status !== "pending" ? (
          <span className={`label ml-auto rounded-full px-2 py-0.5 text-[9.5px] ${c.status === "rejected" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{c.status}</span>
        ) : null}
      </div>
      <div className={`mt-1.5 text-[15px] leading-snug ${c.supersededBy ? "text-mute line-through decoration-mute/40" : ""}`}>{c.text}</div>
      {sup ? <div className="mt-1.5 text-xs text-amberd">↳ Replaced by: “{sup.text.slice(0, 120)}”</div> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink2">
        <Cites ids={c.evidence} claimText={c.text} />
        {c.owner ? <span>Owner <b>{personName(ws, c.owner)}</b></span> : null}
        {c.due ? <span className="font-mono">due {fmtDate(c.due)}</span> : null}
        <span className="rounded-full bg-paper2 px-2 py-0.5 text-[11px]">{c.area}</span>
        {c.reviewNote ? <span className="italic text-mute">Note: {c.reviewNote}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function Ledger() {
  const { ws, go } = useWs();
  const [view, setView] = useState<"claims" | "timeline" | "owners" | "conflicts">("claims");
  const [type, setType] = useState<ClaimType | "all">("all");
  const [trust, setTrust] = useState<Trust | "all">("all");
  const [q, setQ] = useState("");
  const [showSup, setShowSup] = useState(false);

  const list = useMemo(
    () =>
      ws.claims.filter(
        (c) =>
          (type === "all" || c.type === type) &&
          (trust === "all" || c.trust === trust) &&
          (showSup || !c.supersededBy) &&
          (!q || c.text.toLowerCase().includes(q.toLowerCase()) || c.area.toLowerCase().includes(q.toLowerCase())),
      ),
    [ws.claims, type, trust, q, showSup],
  );

  if (!ws.claims.length)
    return (
      <Empty title="No claims yet">
        Connect sources, then press <b>Reconstruct project state</b>. <Btn kind="ghost" onClick={() => go("connect")}>Go to Connect</Btn>
      </Empty>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(["claims", "timeline", "owners", "conflicts"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full px-3.5 py-1.5 text-sm transition ${view === v ? "bg-ink text-paper shadow-sm" : "bg-card text-ink2 ring-1 ring-rule hover:ring-[#cbbd9f]"}`}>
            {{ claims: "Evidence ledger", timeline: "Decision timeline", owners: "Ownership & areas", conflicts: `Conflicts (${ws.claims.filter((c) => c.conflictWith?.length).length})` }[v]}
          </button>
        ))}
        <span className="ml-auto text-xs text-mute">Each claim links to the exact items it came from. Click a chip to see the source.</span>
      </div>

      {view === "claims" && (
        <div className="mt-3 grid gap-4 lg:grid-cols-4">
          <Card className="h-fit space-y-3 lg:sticky lg:top-20">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search claims…" className="field" />
            <div>
              <div className="text-xs font-semibold uppercase text-mute">Type</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Chip on={type === "all"} onClick={() => setType("all")}>All ({ws.claims.filter((c) => showSup || !c.supersededBy).length})</Chip>
                {CLAIM_TYPES.map((t) => {
                  const n = ws.claims.filter((c) => c.type === t.id && (showSup || !c.supersededBy)).length;
                  return n ? (
                    <Chip key={t.id} on={type === t.id} onClick={() => setType(t.id)}>
                      {t.plural} ({n})
                    </Chip>
                  ) : null;
                })}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-mute">Trust</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Chip on={trust === "all"} onClick={() => setTrust("all")}>All</Chip>
                {(["verified", "inferred", "conflicting", "attested"] as Trust[]).map((t) => (
                  <Chip key={t} on={trust === t} onClick={() => setTrust(t)}>
                    {TRUST[t].label}
                  </Chip>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showSup} onChange={(e) => setShowSup(e.target.checked)} /> Show superseded claims
            </label>
          </Card>
          <div className="space-y-2 lg:col-span-3">
            {list.length === 0 ? <Empty title="No claims match these filters" /> : list.map((c) => <ClaimCard key={c.id} c={c} />)}
          </div>
        </div>
      )}
      {view === "timeline" && <Timeline />}
      {view === "owners" && <Owners />}
      {view === "conflicts" && <Conflicts />}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-2.5 py-0.5 text-xs transition ${on ? "bg-ink text-paper" : "bg-paper2/80 text-ink2 hover:bg-paper2"}`}>
      {children}
    </button>
  );
}

function claimDate(ws: ReturnType<typeof useWs>["ws"], c: Claim) {
  const ts = c.evidence.map((e) => +new Date(ws.evidence.find((u) => u.id === e.evidenceId)?.ts ?? 0)).filter((t) => t > 86400000);
  return ts.length ? Math.min(...ts) : 0;
}

function Timeline() {
  const { ws } = useWs();
  const items = ws.claims
    .filter((c) => c.type === "decision" || (c.type === "blocker" && /Recurring/.test(c.text)) || c.trust === "attested")
    .map((c) => ({ c, t: claimDate(ws, c) }))
    .sort((a, b) => a.t - b.t);
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-ink2">How the project got here: decisions in order, including the ones that were later reversed. Undated documents are shown first.</p>
      <ol className="relative ml-3 border-l-2 border-rule">
        {items.map(({ c, t }) => (
          <li key={c.id} className="mb-3 ml-5">
            <span className={`absolute -left-[7px] mt-3 h-3 w-3 rounded-full ${c.supersededBy ? "bg-slate-300" : c.trust === "attested" ? "bg-violet-500" : "bg-amber"}`} />
            <div className="mb-1 text-xs font-semibold text-mute">{t ? fmtDate(new Date(t).toISOString()) : "Undated document"}</div>
            <ClaimCard c={c} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Owners() {
  const { ws } = useWs();
  const active = ws.claims.filter((c) => !c.supersededBy && c.status !== "rejected");
  const owners = new Map<string, Claim[]>();
  for (const c of active) if (c.owner) owners.set(c.owner, [...(owners.get(c.owner) ?? []), c]);
  const unowned = active.filter((c) => !c.owner && (c.type === "next_action" || c.type === "blocker"));
  const areas = [...new Set(active.map((c) => c.area))].sort();
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="font-display text-[22px] leading-tight">Who owns what</h3>
        <div className="mt-2 space-y-3">
          {[...owners.entries()].map(([pid, cl]) => (
            <div key={pid}>
              <div className="text-sm font-semibold">
                {personName(ws, pid)} <span className="font-normal text-mute">· {ws.people.find((p) => p.id === pid)?.title}</span>
                {pid === ws.leaverId ? <span className="ml-1 rounded bg-red-50 px-1 text-[10px] font-bold text-red-700">LEAVING: REASSIGN</span> : null}
              </div>
              <ul className="ml-4 list-disc text-sm text-ink2">
                {cl.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {unowned.length ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3">
            <div className="text-sm font-semibold text-red-800">Unowned work ({unowned.length})</div>
            <ul className="ml-4 list-disc text-sm text-red-900">
              {unowned.map((c) => (
                <li key={c.id}>{c.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
      <Card>
        <h3 className="font-display text-[22px] leading-tight">Areas</h3>
        <div className="mt-2 space-y-2">
          {areas.map((a) => {
            const cl = active.filter((c) => c.area === a);
            const risks = cl.filter((c) => c.type === "risk" || c.type === "blocker").length;
            return (
              <div key={a} className="flex items-center justify-between text-sm">
                <span className="font-medium">{a}</span>
                <span className="text-xs text-mute">
                  {cl.length} claims · {risks} risks/blockers · {ws.gaps.filter((g) => g.area === a && g.status === "open").length} open gaps
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Conflicts() {
  const { ws, go } = useWs();
  const seen = new Set<string>();
  const pairs: [Claim, Claim][] = [];
  for (const c of ws.claims) {
    for (const id of c.conflictWith ?? []) {
      const o = ws.claims.find((x) => x.id === id);
      const k = [c.id, id].sort().join();
      if (o && !seen.has(k)) {
        seen.add(k);
        pairs.push(claimDate(ws, c) <= claimDate(ws, o) ? [c, o] : [o, c]);
      }
    }
  }
  if (!pairs.length) return <Empty title="No contradictions detected" />;
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-ink2">Baton does not quietly pick a side. Reversed decisions are marked superseded (the newer source wins). Disagreements it can&apos;t settle become Gap Interview questions.</p>
      {pairs.map(([a, b]) => {
        const resolved = a.supersededBy === b.id || b.supersededBy === a.id;
        return (
          <Card key={a.id + b.id}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide">
              {resolved ? <span className="text-amberd">Reversed decision: newer source wins</span> : <span className="text-orange-700">Unresolved disagreement: sent to the Gap Interview</span>}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-mute">Earlier · {claimDate(ws, a) ? fmtDate(new Date(claimDate(ws, a)).toISOString()) : "undated"}</div>
                <ClaimCard c={a} />
              </div>
              <div>
                <div className="mb-1 text-xs text-mute">Later · {claimDate(ws, b) ? fmtDate(new Date(claimDate(ws, b)).toISOString()) : "undated"}</div>
                <ClaimCard c={b} />
              </div>
            </div>
            {!resolved ? (
              <Btn className="mt-2" kind="ghost" onClick={() => go("interview")}>
                Resolve in Gap Interview →
              </Btn>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
