"use client";
import { useState } from "react";
import type { Gap } from "@/lib/types";
import { personName } from "@/lib/people";
import { readiness } from "@/lib/pipeline";
import { Btn, Card, Empty, Help, Meter } from "@/components/ui";
import { Cites } from "./evidence";
import { useWs } from "./ctx";

const KIND: Record<Gap["kind"], string> = {
  conflict: "Sources disagree",
  no_owner: "No owner",
  unmitigated_risk: "Risk without mitigation",
  sole_knower: "Only you know this",
  no_rationale: "Decision without a reason",
  unanswered_question: "Unanswered question",
};

export function Interview() {
  const { ws, go } = useWs();
  const [showDone, setShowDone] = useState(false);
  if (!ws.claims.length) return <Empty title="Reconstruct the project first">The Gap Interview is generated from what the sources cannot explain.</Empty>;
  const open = ws.gaps.filter((g) => g.status === "open");
  const done = ws.gaps.filter((g) => g.status !== "open");
  const leaver = personName(ws, ws.leaverId) || "the departing member";
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="min-w-0 space-y-3 lg:col-span-2">
        <Help>
          <b>For {leaver}:</b> Baton found {ws.gaps.length} things the sources can&apos;t explain and ranked them by risk. Answering takes about {Math.max(5, open.length * 2)} minutes instead of writing a handover from scratch.
          Each answer is stored as <b>ATTESTED</b> evidence, with your name and the date, and it inherits the access level of the evidence it&apos;s about.
          Tip: switch <i>Acting as</i> (top right) to {leaver}.
        </Help>
        {open.map((g, i) => (
          <GapCard key={g.id} g={g} n={i + 1} />
        ))}
        {!open.length ? <Empty title="All gaps handled 🎉">Next: review and approve the handover.</Empty> : null}
        {done.length ? (
          <div>
            <button className="text-sm text-ink2 underline" onClick={() => setShowDone(!showDone)}>
              {showDone ? "Hide" : "Show"} {done.length} handled gap{done.length > 1 ? "s" : ""}
            </button>
            {showDone ? <div className="mt-2 space-y-3">{done.map((g) => <GapCard key={g.id} g={g} />)}</div> : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-4">
        <Card className="lg:sticky lg:top-20">
          <Meter value={readiness(ws)} label="Handover readiness" />
          <p className="mt-2 text-xs text-mute">
            Readiness = 70% × (risk-weighted share of gaps answered or routed) + 30% × (share of claims reviewed). Each gap&apos;s risk = base risk of its kind × (0.6 + 0.4 × Sole-Knower Index of its area) × urgency.
          </p>
          <div className="mt-3 text-sm">
            <div>Open: <b>{open.length}</b></div>
            <div>Answered: <b>{ws.gaps.filter((g) => g.status === "answered").length}</b></div>
            <div>Routed to someone else: <b>{ws.gaps.filter((g) => g.status === "reassigned").length}</b></div>
            <div>Marked unknown / skipped: <b>{ws.gaps.filter((g) => g.status === "dont_know" || g.status === "skipped").length}</b></div>
          </div>
          <p className="mt-2 text-xs text-mute">&quot;Don&apos;t know&quot; is a valid answer: it appears in the recipient&apos;s handover as an explicit unknown instead of a guess.</p>
          <Btn className="mt-3 w-full" kind="primary" onClick={() => go("review")}>
            Continue to review →
          </Btn>
        </Card>
      </div>
    </div>
  );
}

function GapCard({ g, n }: { g: Gap; n?: number }) {
  const { ws, act, busy } = useWs();
  const [answer, setAnswer] = useState(g.answer ?? "");
  const [routeTo, setRouteTo] = useState("");
  const [routing, setRouting] = useState(false);
  const claims = g.claimIds.map((id) => ws.claims.find((c) => c.id === id)).filter(Boolean);
  const evidence = claims.flatMap((c) => c!.evidence).slice(0, 6);
  return (
    <div className={`sheet relative overflow-hidden p-5 ${g.status !== "open" ? "opacity-85" : ""}`}>
      <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: `linear-gradient(${g.risk >= 0.55 ? "#ea580c, #b42318" : "#f59e0b, #ea580c"})` }} />
      <div className="flex gap-4">
        {n ? <div className="font-display w-12 flex-none text-[44px] leading-none text-amber">Q{n}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="label rounded-full bg-red-600 px-2 py-0.5 text-[9.5px] text-white">risk {Math.round(g.risk * 100)}</span>
            <span className="label rounded-full bg-paper2 px-2 py-0.5 text-[9.5px] text-ink2">{KIND[g.kind]}</span>
            <span className="text-mute">{g.area}</span>
            {g.sole >= 0.5 ? <span className="label rounded-full bg-ink px-2 py-0.5 text-[9.5px] text-amber">Sole-Knower {Math.round(g.sole * 100)}%</span> : null}
            {g.status !== "open" ? <span className="stamp ml-auto" style={{ color: g.status === "answered" ? "#6d3fc0" : "#3a4150" }}>{g.status.replace("_", " ")}</span> : null}
          </div>
          <div className="font-display mt-2 text-[22px] leading-snug">{g.question}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mute">
            <span>Why asked: {g.why}</span>
            {evidence.length ? <Cites ids={evidence} claimText={claims[0]?.text} /> : null}
          </div>
      {g.status === "open" ? (
        <div className="mt-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Type your answer: the reason, the owner, the current state, the person to contact…"
            className="w-full field"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn kind="primary" disabled={answer.trim().length < 3 || !!busy} onClick={() => act("gap", { gapId: g.id, action: "answer", answer }, "Saving attested answer…")}>
              Save answer
            </Btn>
            <Btn disabled={!!busy} onClick={() => act("gap", { gapId: g.id, action: "dont_know" }, "Marked as unknown…")}>
              Don&apos;t know
            </Btn>
            {routing ? (
              <span className="flex gap-1">
                <select value={routeTo} onChange={(e) => setRouteTo(e.target.value)} className="rounded-md border border-rule px-1 text-sm">
                  <option value="">Route to…</option>
                  {ws.people.filter((p) => p.id !== ws.leaverId).map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Btn disabled={!routeTo || !!busy} onClick={() => act("gap", { gapId: g.id, action: "reassign", to: routeTo }, "Routed…")}>
                  Route
                </Btn>
              </span>
            ) : (
              <Btn kind="ghost" onClick={() => setRouting(true)}>
                Hand to someone else
              </Btn>
            )}
            <Btn kind="ghost" disabled={!!busy} onClick={() => act("gap", { gapId: g.id, action: "skip" }, "Skipped…")}>
              Skip
            </Btn>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/70 p-3 text-sm">
          <div>
            {g.status === "answered" ? (
              <>
                <b>Answer:</b> {g.answer} <span className="text-xs text-mute">({g.answeredBy}, {g.answeredAt ? new Date(g.answeredAt).toLocaleDateString("en-IN") : ""})</span>
              </>
            ) : g.status === "reassigned" ? (
              <>Routed to <b>{g.reassignedTo}</b></>
            ) : (
              <>Marked {g.status === "skipped" ? "skipped" : "unknown"}: it will appear as an explicit unknown in the handover</>
            )}
          </div>
          <Btn kind="ghost" disabled={!!busy} onClick={() => act("gap", { gapId: g.id, action: "reopen" }, "Reopened…")}>
            Reopen
          </Btn>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
