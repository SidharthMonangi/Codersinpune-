"use client";
import { useState } from "react";
import { SENSITIVITY_LABEL, type Sensitivity } from "@/lib/types";
import { Btn, Card, Help } from "@/components/ui";
import { useWs } from "./ctx";

const SAMPLES = ["slack-backend.json", "github-export.json", "design.md", "sync-2026-10-30.vtt", "tasks.csv"];

export function Connect() {
  const { ws, act, busy, ai, go } = useWs();
  const [acl, setAcl] = useState<string[]>(["core", "leads"]);
  const [sens, setSens] = useState<Sensitivity>(1);
  const [repo, setRepo] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [newPerson, setNewPerson] = useState({ name: "", title: "" });
  const [useAI, setUseAI] = useState(ai);

  async function upload() {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      const content = await f.text();
      await act("addFile", { name: f.name, content, acl, sensitivity: sens }, `Ingesting ${f.name}…`);
    }
    setFiles(null);
    const input = document.getElementById("file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="min-w-0 space-y-4 lg:col-span-3">
        <Card>
          <h2 className="font-display text-[26px] leading-tight">1 · Connect authorised sources</h2>
          <p className="mt-1 text-sm text-ink2">
            Every source keeps its own access list. Baton later builds each reader&apos;s handover only from sources that reader is allowed to open. Secrets and personal data (API keys, tokens, phone numbers, Aadhaar/PAN, card numbers) are redacted <b>before</b> anything is stored or sent to a model.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-mute">Who may read this source?</div>
              <div className="mt-1 space-y-1">
                {ws.groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={acl.includes(g.id)} onChange={(e) => setAcl(e.target.checked ? [...acl, g.id] : acl.filter((x) => x !== g.id))} />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-mute">Sensitivity (minimum)</div>
              <select value={sens} onChange={(e) => setSens(Number(e.target.value) as Sensitivity)} className="mt-1 w-full field">
                {SENSITIVITY_LABEL.map((l, i) => (
                  <option key={l} value={i}>
                    {l}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-mute">Baton raises the level of individual items automatically when they mention money, contracts or health.</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-rule bg-paper/40 p-4">
            <div className="text-sm font-semibold">Upload files</div>
            <p className="text-xs text-mute">Slack export (.json, one channel), Discord export (.json), GitHub export (.json), Markdown or text docs, meeting transcripts (.vtt), task boards (.csv from Trello or Jira). Up to 400 KB per file.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input id="file-input" type="file" multiple accept=".json,.md,.markdown,.txt,.vtt,.csv" onChange={(e) => setFiles(e.target.files)} className="text-sm" />
              <Btn kind="primary" disabled={!files?.length || !acl.length || !!busy} onClick={upload}>
                Ingest
              </Btn>
            </div>
            <div className="mt-2 text-xs text-mute">
              No files handy? Download sample files:{" "}
              {SAMPLES.map((s) => (
                <a key={s} href={`/samples/${s}`} download className="mr-2 text-blue-700 underline">
                  {s}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-rule bg-paper/40 p-4">
            <div className="text-sm font-semibold">Connect a public GitHub repository</div>
            <p className="text-xs text-mute">Reads issues, pull requests and commits through the GitHub API (read-only).</p>
            <div className="mt-2 flex gap-2">
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/name or https://github.com/owner/name" className="flex-1 field" />
              <Btn kind="primary" disabled={!repo || !acl.length || !!busy} onClick={() => act("addGithub", { repo, acl, sensitivity: sens }, "Fetching from GitHub…").then((d) => d && setRepo(""))}>
                Connect
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[26px] leading-tight">Connected sources ({ws.sources.length})</h2>
          </div>
          {ws.sources.length === 0 ? <p className="mt-2 text-sm text-mute">Nothing connected yet.</p> : null}
          <div className="mt-2 divide-y divide-rule/60">
            {ws.sources.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-mute">
                    {s.units} items · {s.redactions} redacted · visible to {s.acl.map((g) => ws.groups.find((x) => x.id === g)?.label ?? g).join(", ")} · {SENSITIVITY_LABEL[s.sensitivity]}
                  </div>
                </div>
                {s.kind !== "attestation" ? (
                  <Btn kind="ghost" disabled={!!busy} onClick={() => act("removeSource", { sourceId: s.id }, "Removing source…")}>
                    Remove
                  </Btn>
                ) : (
                  <span className="text-xs text-violet-700">from Gap Interview</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-paper/60 p-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useAI} disabled={!ai} onChange={(e) => setUseAI(e.target.checked)} />
              Use AI extraction (Gemini){!ai ? " · not configured on this server" : ""}
            </label>
            <Btn
              kind="amber"
              disabled={!ws.sources.length || !!busy}
              onClick={async () => {
                const d = await act("run", { useAI }, "Reconstructing project state…");
                if (d) go("ledger");
              }}
            >
              2 · Reconstruct project state →
            </Btn>
          </div>
        </Card>
      </div>

      <div className="min-w-0 lg:col-span-2">
        <Setup newPerson={newPerson} setNewPerson={setNewPerson} />
      </div>
    </div>
  );
}

function Setup({ newPerson, setNewPerson }: { newPerson: { name: string; title: string }; setNewPerson: (p: { name: string; title: string }) => void }) {
  const { ws, act, busy } = useWs();
  const [name, setName] = useState(ws.project.name);
  return (
    <Card>
      <h2 className="font-display text-[26px] leading-tight">Handover setup</h2>
      <Help>Who is leaving, when, and who receives which kind of handover.</Help>
      <label className="mt-3 block text-sm">
        Project name
        <div className="mt-1 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 field" />
          <Btn disabled={!!busy || name === ws.project.name} onClick={() => act("setup", { name }, "Saved…")}>
            Save
          </Btn>
        </div>
      </label>
      <label className="mt-3 block text-sm">
        Departing member
        <select value={ws.leaverId ?? ""} onChange={(e) => act("setup", { leaverId: e.target.value }, "Saved…")} className="mt-1 w-full field">
          <option value="">(choose a person)</option>
          {ws.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.title}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm">
        Last day
        <input type="date" value={ws.lastDay ?? ""} onChange={(e) => act("setup", { lastDay: e.target.value }, "Saved…")} className="mt-1 w-full field" />
      </label>

      <div className="mt-4 text-sm font-semibold">Recipients and their roles</div>
      <div className="mt-1 space-y-1.5">
        {ws.recipients.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{ws.people.find((p) => p.id === r.personId)?.name}</span>
            <select
              value={r.roleId}
              onChange={(e) => act("setup", { recipients: ws.recipients.map((x, j) => (j === i ? { ...x, roleId: e.target.value } : x)) }, "Saved…")}
              className="rounded-md border border-rule px-1 py-1 text-sm"
            >
              {ws.roles.map((ro) => (
                <option key={ro.id} value={ro.id}>
                  {ro.label}
                </option>
              ))}
            </select>
            <button className="text-mute hover:text-red-600" onClick={() => act("setup", { recipients: ws.recipients.filter((_, j) => j !== i) }, "Saved…")}>
              ✕
            </button>
          </div>
        ))}
        <select
          value=""
          onChange={(e) => e.target.value && act("setup", { recipients: [...ws.recipients, { personId: e.target.value, roleId: "developer" }] }, "Saved…")}
          className="w-full rounded-md border border-dashed border-rule px-2 py-1.5 text-sm text-ink2"
        >
          <option value="">+ Add recipient…</option>
          {ws.people.filter((p) => p.id !== ws.leaverId && !ws.recipients.some((r) => r.personId === p.id)).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 text-sm font-semibold">People ({ws.people.length})</div>
      <p className="text-xs text-mute">Authors found in sources are added automatically.</p>
      <div className="mt-1 max-h-40 overflow-y-auto text-xs text-ink2">
        {ws.people.map((p) => (
          <div key={p.id}>
            {p.name} <span className="text-mute">· {p.title}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input placeholder="Name" value={newPerson.name} onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })} className="w-1/2 rounded-md border border-rule px-2 py-1 text-sm" />
        <input placeholder="Role / title" value={newPerson.title} onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })} className="w-1/2 rounded-md border border-rule px-2 py-1 text-sm" />
        <Btn disabled={!newPerson.name || !!busy} onClick={() => act("setup", { people: [newPerson] }, "Person added…").then(() => setNewPerson({ name: "", title: "" }))}>
          Add
        </Btn>
      </div>

      <div className="mt-4 text-sm font-semibold">Roles and access</div>
      <div className="mt-1 space-y-1 text-xs text-ink2">
        {ws.roles.map((r) => (
          <div key={r.id}>
            <b>{r.label}</b>: {r.groups.map((g) => ws.groups.find((x) => x.id === g)?.label ?? g).join(", ")} · clearance {SENSITIVITY_LABEL[r.clearance]}
          </div>
        ))}
      </div>
    </Card>
  );
}
