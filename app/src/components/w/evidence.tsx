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
          className={`etag font-mono ${l.relation === "contradicts" ? "contra" : ""}`}
        >
          {u!.locator.length > 34 ? u!.locator.slice(0, 33) + "…" : u!.locator}
        </button>
      ))}
      {items.length > max ? (
        <button onClick={() => openEvidence(ids.map((i) => i.evidenceId), claimText)} className="etag font-mono">
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
          <mark key={i} className="rounded-sm bg-amber/35 px-0.5 text-ink">
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
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-[2px]" onClick={onClose}>
      <aside className="drawer-in h-full w-full max-w-xl overflow-y-auto border-l border-rule bg-paper p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="label text-amberd">Evidence · {units.length} item{units.length > 1 ? "s" : ""}</div>
            {claim ? <div className="font-display mt-1 text-[26px] leading-tight">“{claim}”</div> : null}
            <div className="mt-2 text-xs text-mute">Words shared with the claim are highlighted, so you can check the claim against its source yourself.</div>
          </div>
          <button onClick={onClose} className="rounded-full px-2.5 py-1 text-mute hover:bg-paper2" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {units.map((u, i) => {
            const s = ws.sources.find((x) => x.id === u.sourceId);
            return (
              <div key={u.id} className={`sheet rise rise-${Math.min(i + 1, 5)} p-4`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mute">
                  <span className="font-semibold text-ink">{s?.title}</span>
                  <span className="etag">{u.locator}</span>
                  <span>{personName(ws, u.author) || u.author}</span>
                  <span>· {+new Date(u.ts) < 86400000 ? "undated" : fmtDate(u.ts)}</span>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed">
                  <Highlight text={u.text} claim={claim} />
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-paper2 px-2 py-0.5">Visible to: {u.acl.map((g) => ws.groups.find((x) => x.id === g)?.label ?? g).join(", ")}</span>
                  <span className="rounded-full bg-paper2 px-2 py-0.5">{SENSITIVITY_LABEL[u.sensitivity]}</span>
                  <span className="rounded-full bg-paper2 px-2 py-0.5">{u.area}</span>
                  {u.uri && /^https?:/.test(u.uri) ? (
                    <a href={u.uri} target="_blank" rel="noreferrer" className="rounded-full bg-paper2 px-2 py-0.5 text-blue-700 underline">
                      Open original ↗
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
