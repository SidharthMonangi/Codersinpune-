"use client";
import type { Workspace } from "@/lib/types";
import { SENSITIVITY_LABEL } from "@/lib/types";
import { fmtDate, tokens } from "@/lib/util";
import { personName } from "@/lib/people";
import { useWs } from "./ctx";

export function Cites({ ids, claimText, max = 4 }: { ids: { evidenceId: string; relation: string; score: number }[]; claimText?: string; max?: number }) {
  const { ws, openEvidence } = useWs();
  const items = ids.map((l) => ({ l, u: ws.evidence.find((e) => e.id === l.evidenceId) })).filter((x) => x.u);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.slice(0, max).map(({ l, u }) => (
        <button
          key={l.evidenceId}
          onClick={() => openEvidence(ids.map((i) => i.evidenceId), claimText)}
          title={`${l.relation} · verifier score ${l.score}`}
          className={`rounded border px-1.5 py-0.5 font-mono text-[10.5px] hover:border-amber hover:bg-amberl ${l.relation === "contradicts" ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-300 bg-slate-50 text-slate-700"}`}
        >
          {u!.locator.length > 34 ? u!.locator.slice(0, 33) + "…" : u!.locator}
        </button>
      ))}
      {items.length > max ? (
        <button onClick={() => openEvidence(ids.map((i) => i.evidenceId), claimText)} className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[10.5px]">
          +{items.length - max}
        </button>
      ) : null}
    </span>
  );
}

export function Highlight({ text, claim }: { text: string; claim?: string }) {
  if (!claim) return <>{text}</>;
  const ct = new Set(tokens(claim));
  return (
    <>
      {text.split(/(\s+)/).map((w, i) => {
        const t = w.toLowerCase().replace(/[^a-z0-9#]/g, "");
        return ct.has(t) ? (
          <mark key={i} className="rounded bg-amber-200/70 px-0.5">
            {w}
          </mark>
        ) : (
          <span key={i}>{w}</span>
        );
      })}
    </>
  );
}

export function EvidenceDrawer({ ws, ids, claim, onClose }: { ws: Workspace; ids: string[]; claim?: string; onClose: () => void }) {
  const units = ids.map((id) => ws.evidence.find((e) => e.id === id)).filter(Boolean) as Workspace["evidence"];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amberd">Evidence</div>
            {claim ? <div className="mt-1 text-sm font-semibold">“{claim}”</div> : null}
            <div className="mt-1 text-xs text-slate-500">Words shared with the claim are highlighted, so you can check the claim against its source yourself.</div>
          </div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {units.map((u) => {
            const s = ws.sources.find((x) => x.id === u.sourceId);
            return (
              <div key={u.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                  <span className="font-semibold text-ink">{s?.title}</span>
                  <span className="font-mono">{u.locator}</span>
                  <span>· {personName(ws, u.author) || u.author}</span>
                  <span>· {+new Date(u.ts) < 86400000 ? "undated" : fmtDate(u.ts)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  <Highlight text={u.text} claim={claim} />
                </p>
                <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">Visible to: {u.acl.map((g) => ws.groups.find((x) => x.id === g)?.label ?? g).join(", ")}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">Sensitivity: {SENSITIVITY_LABEL[u.sensitivity]}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">Area: {u.area}</span>
                  {u.uri && /^https?:/.test(u.uri) ? (
                    <a href={u.uri} target="_blank" rel="noreferrer" className="rounded bg-slate-100 px-1.5 py-0.5 text-blue-700 underline">
                      Open original
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
