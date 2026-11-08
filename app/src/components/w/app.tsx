"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Workspace } from "@/lib/types";
import { readiness } from "@/lib/pipeline";
import { personName } from "@/lib/people";
import { Btn, Ring } from "@/components/ui";
import { WsCtx } from "./ctx";
import { EvidenceDrawer } from "./evidence";
import { Overview } from "./overview";
import { Connect } from "./connect";
import { Ledger } from "./ledger";
import { Interview } from "./interview";
import { Review } from "./review";
import { Handover } from "./handover";
import { Audit } from "./audit";

const TABS = [
  { id: "overview", label: "Overview", step: "" },
  { id: "connect", label: "Connect", step: "1" },
  { id: "ledger", label: "Reconstruct & verify", step: "2" },
  { id: "interview", label: "Gap Interview", step: "3" },
  { id: "review", label: "Review & approve", step: "4" },
  { id: "handover", label: "Handover", step: "5" },
  { id: "audit", label: "Audit log", step: "" },
];

export function WorkspaceApp() {
  const router = useRouter();
  const sp = useSearchParams();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [ai, setAi] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ ids: string[]; claim?: string } | null>(null);
  const [actorMode, setActorMode] = useState<"admin" | "leaver" | "approver">("admin");
  const tab = sp.get("tab") ?? "overview";

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d) => {
        setWs(d.ws);
        setAi(!!d.ai);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const go = useCallback((t: string) => router.push(`/w?tab=${t}`, { scroll: true }), [router]);

  const approverName = useMemo(() => {
    if (!ws) return "Approver";
    const f = ws.people.find((p) => /faculty|coordinator|manager/i.test(p.title));
    return f?.name ?? "Approver";
  }, [ws]);
  const actor = ws ? (actorMode === "leaver" ? personName(ws, ws.leaverId) || "Departing member" : actorMode === "approver" ? approverName : "Admin") : "Admin";

  const act = useCallback(
    async (type: string, payload: Record<string, unknown> = {}, label?: string) => {
      setBusy(label ?? type);
      setError(null);
      try {
        const r = await fetch("/api/workspace/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, actor, ...payload }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Something went wrong");
        if (d.ws) setWs(d.ws);
        if (typeof d.ai === "boolean") setAi(d.ai);
        if (label) {
          setToast(label.replace(/…$/, "") + " ✓");
          setTimeout(() => setToast(null), 2200);
        }
        return d;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [actor],
  );

  async function create(mode: "demo" | "blank") {
    setBusy(mode === "demo" ? "Loading the Project Orion demo…" : "Creating workspace…");
    setError(null);
    try {
      const r = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, name: "My project" }) });
      const d = await r.json();
      if (!r.ok || !d.ws) throw new Error(d.error || "Could not create workspace");
      setWs(d.ws);
      setAi(!!d.ai);
      router.push(`/w?tab=${mode === "demo" ? "overview" : "connect"}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!loaded)
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
        <div className="skeleton h-24" />
        <div className="skeleton h-10" />
        <div className="grid gap-4 md:grid-cols-3"><div className="skeleton h-64 md:col-span-2" /><div className="skeleton h-64" /></div>
      </div>
    );
  if (!ws)
    return (
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="rise label text-amberd">New handover</div>
        <h1 className="rise rise-1 font-display text-[52px] leading-[1.02] sm:text-[64px]">Open a case file.</h1>
        <p className="rise rise-2 mt-3 max-w-2xl text-lg text-ink2">Each visitor gets a private workspace, kept in a secure cookie. No sign-up, nothing shared until you approve it.</p>
        {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="mt-8 grid gap-5 md:grid-cols-[1.25fr_1fr]">
          <button disabled={!!busy} onClick={() => create("demo")} className="rise rise-3 slab group relative overflow-hidden p-7 text-left transition hover:-translate-y-0.5 disabled:opacity-70">
            <div className="pointer-events-none absolute -right-6 -top-10 font-display text-[160px] leading-none text-white/[0.05]">Orion</div>
            <div className="label text-amber">Recommended for judges · 2 minutes</div>
            <div className="font-display mt-2 text-4xl">Open the Project Orion demo</div>
            <p className="mt-2 max-w-md text-white/70">A synthetic student-club event app: 11 sources across chat, GitHub, docs, meetings, the task board, plus finance and HR files. Priya leaves on 30 Nov; Arjun takes over. Already reconstructed and ready to explore.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber px-5 py-2.5 font-semibold text-ink">
              {busy && busy.includes("Orion") ? "Loading the case file…" : "Open demo"} <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>
          <button disabled={!!busy} onClick={() => create("blank")} className="rise rise-4 sheet sheet-hover p-7 text-left disabled:opacity-60">
            <div className="label text-mute">Bring your own data</div>
            <div className="font-display mt-2 text-4xl">Start an empty workspace</div>
            <p className="mt-2 text-ink2">Upload Slack or Discord exports, Markdown docs, meeting transcripts (.vtt) and task CSVs, or connect a public GitHub repo.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-rule px-5 py-2.5 font-medium">Start empty →</div>
          </button>
        </div>
      </div>
    );

  const steps = [
    { done: ws.sources.length > 0, label: "Connect sources", tab: "connect" },
    { done: ws.claims.length > 0, label: "Reconstruct & verify", tab: "ledger" },
    { done: ws.gaps.some((g) => g.status === "answered"), label: "Answer the Gap Interview", tab: "interview" },
    { done: ws.versions.length > 0, label: "Review & approve a version", tab: "review" },
    { done: ws.shares.length > 0, label: "Share role-based handovers", tab: "handover" },
  ];
  const next = steps.find((s) => !s.done);
  const ready = readiness(ws);

  return (
    <WsCtx.Provider value={{ ws, ai, busy, actor, act, openEvidence: (ids, claim) => setDrawer({ ids, claim }), go }}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="label flex flex-wrap items-center gap-2 text-amberd">
              Case file · knowledge handover
              {ws.demo ? <span className="rounded-full border border-rule bg-card px-2 py-0.5 text-[9.5px] text-mute">synthetic demo data</span> : null}
            </div>
            <h1 className="font-display mt-1 text-[44px] leading-none sm:text-[52px]">{ws.project.name}</h1>
            <div className="mt-2 text-sm text-ink2">
              {ws.leaverId ? (
                <>
                  <b>{personName(ws, ws.leaverId)}</b> hands over
                  {ws.lastDay ? <> · last day <span className="font-mono">{new Date(ws.lastDay).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></> : null}
                  {ws.recipients.length ? <> · to {ws.recipients.map((r) => personName(ws, r.personId)).join(", ")}</> : null}
                </>
              ) : (
                "Set who is leaving in Connect → Handover setup"
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Ring value={ready} size={62} label="Readiness" />
            <div>
              <div className="label mb-1 text-mute">Acting as</div>
              <div className="flex rounded-full border border-rule bg-card p-0.5 text-[13px]">
                {(
                  [
                    ["admin", "Admin"],
                    ["leaver", `${(personName(ws, ws.leaverId) || "Leaver").split(" ")[0]} · leaver`],
                    ["approver", `${approverName.replace(/^Dr\.\s*/, "Dr. ").split(" ").slice(0, 2).join(" ")} · approver`],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} onClick={() => setActorMode(k)} className={`rounded-full px-3 py-1 transition ${actorMode === k ? "bg-ink text-paper shadow-sm" : "text-ink2 hover:text-ink"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-6 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 rounded-full border border-rule bg-card/80 p-1 shadow-sm backdrop-blur">
            {TABS.map((t) => {
              const st = t.step ? steps[Number(t.step) - 1] : null;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${active ? "bg-ink text-paper shadow" : "text-ink2 hover:bg-paper2/70 hover:text-ink"}`}
                >
                  {t.step ? (
                    <span className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-bold ${st?.done ? "bg-emerald-600 text-white" : active ? "bg-amber text-ink" : "bg-paper2 text-ink2"}`}>{st?.done ? "✓" : t.step}</span>
                  ) : null}
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="track mx-3 mt-2"><i style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }} /></div>
        </nav>

        {next && tab !== next.tab ? (
          <div className="rise mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ink px-5 py-3 text-sm text-paper shadow-[0_16px_30px_-20px_rgba(18,22,29,.8)]">
            <span className="flex items-center gap-2">
              <span className="pulse-dot h-2 w-2 rounded-full bg-amber" />
              <b className="text-amber">Next step</b> {next.label}
            </span>
            <Btn kind="amber" onClick={() => go(next.tab)}>
              Go →
            </Btn>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        ) : null}

        <div key={tab} className="rise mt-5">
          {tab === "overview" && <Overview steps={steps} />}
          {tab === "connect" && <Connect />}
          {tab === "ledger" && <Ledger />}
          {tab === "interview" && <Interview />}
          {tab === "review" && <Review />}
          {tab === "handover" && <Handover />}
          {tab === "audit" && <Audit onReset={async () => { await fetch("/api/workspace", { method: "DELETE" }); setWs(null); router.push("/w"); }} />}
        </div>
      </div>
      {drawer ? <EvidenceDrawer ws={ws} ids={drawer.ids} claim={drawer.claim} onClose={() => setDrawer(null)} /> : null}
      {busy ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-xl">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber border-t-transparent" /> {busy}
        </div>
      ) : null}
      {toast && !busy ? <div className="rise fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-700 px-4 py-2 text-sm text-white shadow-xl">{toast}</div> : null}
    </WsCtx.Provider>
  );
}
