"use client";
import { useMemo } from "react";
import { soleKnower } from "@/lib/pipeline";
import { Btn, Card, Help, TrustBadge } from "@/components/ui";
import { useWs } from "./ctx";
import type { Trust } from "@/lib/types";

export function Overview({ steps }: { steps: { done: boolean; label: string; tab: string }[] }) {
  const { ws, go, ai } = useWs();
  const byTrust = (t: Trust) => ws.claims.filter((c) => c.trust === t && !c.supersededBy).length;
  const open = ws.gaps.filter((g) => g.status === "open").length;

  // "Captured while work happens": Sole-Knower Index for EVERY member, not just the leaver.
  const radar = useMemo(() => {
    const people = ws.people.filter((p) => ws.evidence.some((e) => e.author === p.id));
    const rows = people.map((p) => {
      const s = soleKnower(ws, p.id);
      const risky = Object.entries(s).filter(([, v]) => v.ski >= 0.5 && v.units >= 3).sort((a, b) => b[1].ski - a[1].ski);
      return { p, s, risky };
    });
    const areas = [...new Set(ws.evidence.map((e) => e.area))].filter((a) => a !== "General").sort();
    return { rows: rows.sort((a, b) => b.risky.length - a.risky.length), areas };
  }, [ws]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="min-w-0 space-y-4 lg:col-span-2">
        {ws.demo ? (
          <Help>
            <b>Welcome, judge 👋</b> This is <b>Project Orion</b>, a synthetic student-club project. <b>Priya</b> (tech lead) leaves on 30 Nov and <b>Arjun</b> takes over.
            Baton has already read 11 sources and rebuilt the project state. Try: <b>①</b> click any citation chip to see the exact source, <b>②</b> answer a question in the Gap Interview as Priya,
            <b>③</b> approve a version as Dr. Kulkarni, <b>④</b> open Arjun&apos;s and Rohan&apos;s handovers side by side and compare what each can see.
          </Help>
        ) : null}
        <Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat n={ws.sources.length} label="sources connected" />
            <Stat n={ws.evidence.length} label="evidence items" sub={`${ws.sources.reduce((s, x) => s + x.redactions, 0)} secrets/PII redacted`} />
            <Stat n={ws.claims.filter((c) => !c.supersededBy).length} label="claims in the ledger" sub={`${ws.claims.filter((c) => c.supersededBy).length} superseded`} />
            <Stat n={open} label="open gaps" sub={`${ws.gaps.length - open} handled`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {(["verified", "inferred", "conflicting", "attested"] as Trust[]).map((t) => (
              <span key={t} className="flex items-center gap-1">
                <TrustBadge trust={t} /> <b>{byTrust(t)}</b>
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Engine: {ws.engine.mode === "ai" ? `AI extraction (${ws.engine.model}) + independent AI verifier` : "rule-based extraction + lexical verifier"}
            {ws.engine.lastRunAt ? ` · last run ${new Date(ws.engine.lastRunAt).toLocaleString("en-IN")}` : ""}
            {!ai ? " · AI engine not configured on this server" : ""}
            {ws.engine.note ? <div className="text-amberd">{ws.engine.note}</div> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">Team knowledge radar</h2>
            <span className="text-xs text-slate-500">Sole-Knower Index: share of recent activity in an area that came from one person</span>
          </div>
          <p className="mt-1 text-sm text-ink2">Knowledge is tracked while the work happens, not only when someone resigns. Red cells show where the project would lose knowledge if that person left today.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="py-1 pr-2 text-left font-semibold">Person</th>
                  {radar.areas.map((a) => (
                    <th key={a} className="px-1 py-1 text-center font-medium text-slate-500" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 92 }}>
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {radar.rows.map(({ p, s }) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-1 pr-2 whitespace-nowrap">
                      <span className="font-medium">{p.name}</span>
                      {p.id === ws.leaverId ? <span className="ml-1 rounded bg-amberl px-1 text-[10px] font-bold text-amberd">LEAVING</span> : null}
                    </td>
                    {radar.areas.map((a) => {
                      const v = s[a];
                      const k = v?.ski ?? 0;
                      const bg = !v ? "#fff" : k >= 0.6 ? "#fecaca" : k >= 0.35 ? "#fde68a" : k > 0 ? "#dcfce7" : "#fff";
                      return (
                        <td key={a} className="px-0.5 py-0.5 text-center">
                          <div title={v ? `${Math.round(k * 100)}% of ${v.units} items` : ""} className="rounded py-1 font-mono" style={{ background: bg }}>
                            {v && k > 0 ? Math.round(k * 100) : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <h2 className="font-bold">Handover progress</h2>
          <ol className="mt-2 space-y-2">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center justify-between gap-2 text-sm">
                <span className={s.done ? "text-slate-500 line-through" : ""}>
                  <span className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? "bg-green-100 text-green-700" : "bg-slate-100"}`}>{s.done ? "✓" : i + 1}</span>
                  {s.label}
                </span>
                <Btn kind="ghost" onClick={() => go(s.tab)}>
                  Open
                </Btn>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="font-bold">Highest-risk gaps</h2>
          <p className="text-xs text-slate-500">Questions only the leaver can answer, ranked by risk</p>
          <ul className="mt-2 space-y-2">
            {ws.gaps.filter((g) => g.status === "open").slice(0, 4).map((g) => (
              <li key={g.id} className="text-sm">
                <span className="mr-1 rounded bg-red-50 px-1 font-mono text-[11px] text-red-700">{Math.round(g.risk * 100)}</span>
                {g.question.length > 120 ? g.question.slice(0, 119) + "…" : g.question}
              </li>
            ))}
          </ul>
          <Btn className="mt-3" kind="primary" onClick={() => go("interview")}>
            Open Gap Interview
          </Btn>
        </Card>
        <Card>
          <h2 className="font-bold">How trust works here</h2>
          <ul className="mt-2 space-y-1.5 text-xs text-ink2">
            <li><TrustBadge trust="verified" /> backed by 2+ sources, or an authoritative one</li>
            <li><TrustBadge trust="inferred" /> one informal source only</li>
            <li><TrustBadge trust="conflicting" /> sources disagree, or the claim was reversed</li>
            <li><TrustBadge trust="attested" /> answered by a named person</li>
            <li><TrustBadge trust="sealed" /> exists, but outside the reader&apos;s access</li>
            <li>Claims with no supporting source are dropped, never shown as fact.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold text-amberd">{n}</div>
      <div className="text-xs text-ink2">{label}</div>
      {sub ? <div className="text-[11px] text-slate-500">{sub}</div> : null}
    </div>
  );
}
