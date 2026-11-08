"use client";
import { fmtDateTime } from "@/lib/util";
import { useMemo } from "react";
import { soleKnower } from "@/lib/pipeline";
import { Btn, Card, Help, TrustBadge } from "@/components/ui";
import { useWs } from "./ctx";
import type { Trust } from "@/lib/types";

export function Overview({ steps }: { steps: { done: boolean; label: string; tab: string }[] }) {
  const { ws, go, ai } = useWs();
  const byTrust = (t: Trust) => ws.claims.filter((c) => c.trust === t && !c.supersededBy).length;
  const open = ws.gaps.filter((g) => g.status === "open").length;
  const active = ws.claims.filter((c) => !c.supersededBy).length;

  // "Captured while work happens": Sole-Knower Index for EVERY member, not just the leaver.
  const radar = useMemo(() => {
    const people = ws.people.filter((p) => ws.evidence.some((e) => e.author === p.id));
    const rows = people.map((p) => {
      const s = soleKnower(ws, p.id);
      const risky = Object.entries(s).filter(([, v]) => v.ski >= 0.5 && v.units >= 3);
      return { p, s, risky };
    });
    const areas = [...new Set(ws.evidence.map((e) => e.area))].filter((a) => a !== "General").sort();
    return { rows: rows.sort((a, b) => (b.p.id === ws.leaverId ? 1 : 0) - (a.p.id === ws.leaverId ? 1 : 0) || b.risky.length - a.risky.length), areas };
  }, [ws]);
  const atRisk = radar.rows.find((r) => r.p.id === ws.leaverId)?.risky.length ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="min-w-0 space-y-5 lg:col-span-2">
        {ws.demo ? (
          <Help>
            <div className="font-display text-xl text-ink">Welcome, judge.</div>
            This is <b>Project Orion</b>, a synthetic student-club project. <b>Priya</b> (tech lead) leaves on 30 Nov and <b>Arjun</b> takes over. Baton has already read 11 sources and rebuilt the project state. Try this:{" "}
            <b>①</b> click any evidence tag to see its exact source · <b>②</b> act as Priya and answer a Gap Interview question · <b>③</b> act as Dr. Kulkarni and approve ·{" "}
            <b>④</b> compare Arjun&apos;s and Rohan&apos;s dossiers side by side.
          </Help>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n={ws.sources.length} label="sources" sub={`${ws.sources.reduce((s, x) => s + x.redactions, 0)} secrets/PII redacted`} onClick={() => go("connect")} />
          <Stat n={ws.evidence.length} label="evidence items" sub="each with an access list" onClick={() => go("connect")} />
          <Stat n={active} label="claims" sub={`${ws.claims.filter((c) => c.supersededBy).length} superseded`} onClick={() => go("ledger")} />
          <Stat n={open} label="open gaps" sub={`${ws.gaps.length - open} handled`} hot={open > 0} onClick={() => go("interview")} />
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label text-mute">Trust composition</div>
              <div className="font-display text-2xl">How much of this can you rely on?</div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {(["verified", "inferred", "conflicting", "attested"] as Trust[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <TrustBadge trust={t} /> <b className="font-mono">{byTrust(t)}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-paper2">
            {(
              [
                ["verified", "#2f9e66"],
                ["attested", "#8b5cf6"],
                ["inferred", "#4a78d6"],
                ["conflicting", "#ea7a34"],
              ] as [Trust, string][]
            ).map(([t, c]) => (
              <div key={t} style={{ width: `${active ? (100 * byTrust(t)) / active : 0}%`, background: c }} className="h-full transition-all duration-700" title={`${t}: ${byTrust(t)}`} />
            ))}
          </div>
          <div className="mt-3 text-xs text-mute">
            Engine: {ws.engine.mode === "ai" ? `AI extraction (${ws.engine.model}) + independent AI verifier` : "rule-based extraction + lexical verifier (deterministic, no AI quota needed)"}
            {ws.engine.lastRunAt ? ` · last run ${fmtDateTime(ws.engine.lastRunAt)}` : ""}
            {!ai ? " · AI engine not configured on this server" : ""}
            {ws.engine.note ? <div className="text-amberd">{ws.engine.note}</div> : null}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="label text-mute">Captured while the work happens</div>
              <h2 className="font-display text-[28px] leading-tight">Team knowledge radar</h2>
            </div>
            {atRisk ? (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                {atRisk} area{atRisk > 1 ? "s" : ""} would lose their main knower when Priya leaves
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink2">Sole-Knower Index: the share of recent activity in an area that came from one person. Hot cells show where the project would lose knowledge if that person left <i>today</i>, before anyone resigns.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-separate border-spacing-[3px] text-xs">
              <thead>
                <tr>
                  <th className="pr-2 text-left font-medium text-mute" />
                  {radar.areas.map((a) => (
                    <th key={a} className="px-0.5 pb-1 text-left font-medium text-mute" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 96 }}>
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {radar.rows.map(({ p, s }) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap pr-3">
                      <span className="font-medium">{p.name}</span>
                      {p.id === ws.leaverId ? <span className="label ml-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[9px] text-amber">leaving</span> : null}
                    </td>
                    {radar.areas.map((a) => {
                      const v = s[a];
                      const k = v?.ski ?? 0;
                      const bg = !v || !k ? "#f3ede1" : `rgba(234, 88, 12, ${0.12 + k * 0.78})`;
                      return (
                        <td key={a}>
                          <div title={v ? `${p.name}: ${Math.round(k * 100)}% of ${v.units} items in ${a}` : ""} className="grid h-8 min-w-8 place-items-center rounded-md font-mono text-[11px] transition hover:scale-110" style={{ background: bg, color: k > 0.55 ? "#fff" : "#3a4150" }}>
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

      <div className="min-w-0 space-y-5">
        <Card>
          <div className="label text-mute">The relay</div>
          <h2 className="font-display text-[26px]">Handover progress</h2>
          <ol className="mt-3 space-y-1">
            {steps.map((s, i) => (
              <li key={s.label}>
                <button onClick={() => go(s.tab)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-paper2/60">
                  <span className={`grid h-7 w-7 flex-none place-items-center rounded-full font-mono text-[11px] font-bold ${s.done ? "bg-emerald-600 text-white" : "border-2 border-rule text-ink2"}`}>{s.done ? "✓" : i + 1}</span>
                  <span className={s.done ? "text-mute" : "font-medium"}>{s.label}</span>
                  <span className="ml-auto text-mute">→</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <div className="label text-red-700">Only the leaver can answer these</div>
          <h2 className="font-display text-[26px]">Highest-risk gaps</h2>
          <ul className="mt-3 space-y-3">
            {ws.gaps.filter((g) => g.status === "open").slice(0, 4).map((g) => (
              <li key={g.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-red-50 font-mono text-[11px] font-bold text-red-700 ring-1 ring-red-100">{Math.round(g.risk * 100)}</span>
                <span className="leading-snug">{g.question.length > 115 ? g.question.slice(0, 114) + "…" : g.question}</span>
              </li>
            ))}
            {!open ? <li className="text-sm text-mute">All gaps handled.</li> : null}
          </ul>
          <Btn className="mt-4 w-full" kind="primary" onClick={() => go("interview")}>
            Open the Gap Interview →
          </Btn>
        </Card>
      </div>
    </div>
  );
}

function Stat({ n, label, sub, hot, onClick }: { n: number; label: string; sub?: string; hot?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="sheet sheet-hover p-4 text-left">
      <div className={`font-display text-[44px] leading-none ${hot ? "text-ember" : "text-ink"}`}>{n}</div>
      <div className="label mt-1.5 text-ink2">{label}</div>
      {sub ? <div className="mt-0.5 text-[11.5px] text-mute">{sub}</div> : null}
    </button>
  );
}
