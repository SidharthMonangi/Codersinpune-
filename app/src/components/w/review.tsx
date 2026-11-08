"use client";
import { useState } from "react";
import { CLAIM_TYPES, type Claim } from "@/lib/types";
import { Btn, Card, Empty, Help } from "@/components/ui";
import { ClaimCard } from "./ledger";
import { useWs } from "./ctx";

export function Review() {
  const { ws, act, busy, actor, go } = useWs();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  if (!ws.claims.length) return <Empty title="Nothing to review yet">Reconstruct the project first.</Empty>;
  const active = ws.claims.filter((c) => !c.supersededBy);
  const pending = active.filter((c) => c.status === "pending");
  const list = filter === "pending" ? pending : ws.claims;
  const v = ws.versions[0];
  const verifiedPending = pending.filter((c) => c.trust === "verified").length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="min-w-0 space-y-3 lg:col-span-2">
        <Help>
          A responsible person checks every claim before anything is shared: <b>accept</b>, <b>edit</b> (the original wording stays in the audit log) or <b>reject</b> (rejected claims are never shared).
          Then they approve a version, which is hashed and frozen. Recipients only ever see approved versions.
        </Help>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFilter("pending")} className={`rounded-full px-3 py-1 text-sm ${filter === "pending" ? "bg-ink text-white" : "bg-white ring-1 ring-slate-200"}`}>
            Needs review ({pending.length})
          </button>
          <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-sm ${filter === "all" ? "bg-ink text-white" : "bg-white ring-1 ring-slate-200"}`}>
            All claims ({ws.claims.length})
          </button>
          {verifiedPending ? (
            <Btn kind="success" className="ml-auto" disabled={!!busy} onClick={() => act("bulkAccept", { trust: "verified" }, "Accepting verified claims…")}>
              Accept all {verifiedPending} verified
            </Btn>
          ) : null}
        </div>
        {CLAIM_TYPES.map((t) => {
          const cl = list.filter((c) => c.type === t.id);
          if (!cl.length) return null;
          return (
            <div key={t.id}>
              <h3 className="mb-1.5 mt-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t.plural}</h3>
              <div className="space-y-2">
                {cl.map((c) => (
                  <ReviewItem key={c.id} c={c} />
                ))}
              </div>
            </div>
          );
        })}
        {!list.length ? <Empty title="Everything has been reviewed ✓">Approve the version on the right.</Empty> : null}
      </div>
      <div className="space-y-4">
        <Card className="lg:sticky lg:top-20">
          <h3 className="font-bold">Approve a version</h3>
          <p className="mt-1 text-sm text-ink2">
            You are acting as <b>{actor}</b>. {pending.length ? `${pending.length} claims are still unreviewed; they will be included and marked with their trust state.` : "All claims reviewed."}
          </p>
          <Btn
            className="mt-3 w-full"
            kind="amber"
            disabled={!!busy}
            onClick={async () => {
              const d = await act("approve", {}, "Approving version…");
              if (d) go("handover");
            }}
          >
            Approve as {actor} →
          </Btn>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase text-slate-500">Version history</div>
            {ws.versions.length === 0 ? <p className="text-sm text-slate-500">No approved versions yet.</p> : null}
            <ul className="mt-1 space-y-1 text-sm">
              {ws.versions.map((x, i) => {
                const prev = ws.versions[i + 1];
                const added = prev ? x.claims.filter((c) => !prev.claims.some((p) => p.text === c.text)).length : x.claimCount;
                const removed = prev ? prev.claims.filter((p) => !x.claims.some((c) => c.text === p.text)).length : 0;
                return (
                  <li key={x.id} className="rounded-md bg-slate-50 px-2 py-1.5">
                    <b>v{x.n}</b> · <span className="font-mono text-xs">{x.hash}</span> · by {x.approvedBy}
                    <div className="text-xs text-slate-500">
                      {new Date(x.at).toLocaleString("en-IN")} · {x.claimCount} claims · readiness {x.readiness} · +{added} / −{removed} vs previous
                    </div>
                  </li>
                );
              })}
            </ul>
            {v ? <p className="mt-2 text-xs text-slate-500">Changes made after approval need a new version before recipients see them.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReviewItem({ c }: { c: Claim }) {
  const { act, busy } = useWs();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.text);
  return (
    <ClaimCard c={c}>
      {editing ? (
        <div className="mt-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
          <div className="mt-1 flex gap-2">
            <Btn kind="primary" disabled={!!busy} onClick={() => act("review", { claimId: c.id, action: "edit", text }, "Saved edit…").then(() => setEditing(false))}>
              Save edit
            </Btn>
            <Btn kind="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Btn>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.status !== "accepted" ? (
            <Btn kind="success" disabled={!!busy} onClick={() => act("review", { claimId: c.id, action: "accept" })}>
              ✓ Accept
            </Btn>
          ) : null}
          <Btn disabled={!!busy} onClick={() => setEditing(true)}>
            ✎ Edit
          </Btn>
          {c.status !== "rejected" ? (
            <Btn kind="danger" disabled={!!busy} onClick={() => act("review", { claimId: c.id, action: "reject" })}>
              ✕ Reject
            </Btn>
          ) : null}
          {c.status !== "pending" ? (
            <Btn kind="ghost" disabled={!!busy} onClick={() => act("review", { claimId: c.id, action: "reset" })}>
              Undo
            </Btn>
          ) : null}
        </div>
      )}
    </ClaimCard>
  );
}
