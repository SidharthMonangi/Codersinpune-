"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Workspace } from "@/lib/types";
import { readiness } from "@/lib/pipeline";
import { personName } from "@/lib/people";
import { Btn, Meter } from "@/components/ui";
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

  if (!loaded) return <div className="p-10 text-center text-slate-500">Loading workspace…</div>;
  if (!ws)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Start a handover workspace</h1>
        <p className="mt-2 text-ink2">Each visitor gets a private workspace (kept in a secure cookie). No sign-up is needed.</p>
        {error ? <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button disabled={!!busy} onClick={() => create("demo")} className="rounded-xl border-2 border-amber bg-white p-5 text-left hover:bg-amberl disabled:opacity-60">
            <div className="text-xs font-bold uppercase tracking-wider text-amberd">Recommended for judges</div>
            <div className="mt-1 text-lg font-bold">Open the Project Orion demo</div>
            <p className="mt-1 text-sm text-ink2">A synthetic student-club project: 11 sources (chat, GitHub, docs, meetings, task board, finance and HR files), already reconstructed. Priya is leaving; Arjun takes over.</p>
          </button>
          <button disabled={!!busy} onClick={() => create("blank")} className="rounded-xl border border-slate-300 bg-white p-5 text-left hover:bg-slate-50 disabled:opacity-60">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Bring your own data</div>
            <div className="mt-1 text-lg font-bold">Start an empty workspace</div>
            <p className="mt-1 text-sm text-ink2">Upload Slack/Discord exports, Markdown docs, meeting transcripts (.vtt), task CSVs, or connect a public GitHub repo.</p>
          </button>
        </div>
        {busy ? <div className="mt-6 animate-pulse text-center text-sm text-ink2">{busy}</div> : null}
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
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{ws.project.name}</h1>
              {ws.demo ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Synthetic demo data</span> : null}
            </div>
            <div className="text-sm text-ink2">
              {ws.leaverId ? (
                <>
                  Handover from <b>{personName(ws, ws.leaverId)}</b>
                  {ws.lastDay ? <> · last day {new Date(ws.lastDay).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</> : null}
                  {ws.recipients.length ? <> · to {ws.recipients.map((r) => personName(ws, r.personId)).join(", ")}</> : null}
                </>
              ) : (
                "Set who is leaving in Connect → Handover setup"
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Meter value={ready} label="Handover readiness" />
            </div>
            <label className="text-xs text-slate-600">
              Acting as
              <select value={actorMode} onChange={(e) => setActorMode(e.target.value as any)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-ink">
                <option value="admin">Admin</option>
                <option value="leaver">{personName(ws, ws.leaverId) || "Departing member"} (leaver)</option>
                <option value="approver">{approverName} (approver)</option>
              </select>
            </label>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? "border-amber text-ink" : "border-transparent text-slate-500 hover:text-ink"}`}
            >
              {t.step ? <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold">{steps[Number(t.step) - 1]?.done ? "✓" : t.step}</span> : null}
              {t.label}
            </button>
          ))}
        </nav>

        {next && tab !== next.tab ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm text-white">
            <span>
              <b className="text-amber">Next step:</b> {next.label}
            </span>
            <Btn kind="amber" onClick={() => go(next.tab)}>
              Go →
            </Btn>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 flex items-start justify-between rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        ) : null}

        <div className="mt-4">
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
      {busy ? <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">{busy}</div> : null}
      {toast && !busy ? <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-green-700 px-4 py-2 text-sm text-white shadow-lg">{toast}</div> : null}
    </WsCtx.Provider>
  );
}
