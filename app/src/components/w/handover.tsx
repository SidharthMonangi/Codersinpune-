"use client";
import { useEffect, useState } from "react";
import type { CompiledHandover } from "@/lib/types";
import { personName } from "@/lib/people";
import { Btn, Card, Empty, Help } from "@/components/ui";
import { HandoverView } from "@/components/handover-view";
import { useWs } from "./ctx";

export function Handover() {
  const { ws, act, busy, go } = useWs();
  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");
  const [pv, setPv] = useState<Record<string, CompiledHandover>>({});
  const [acks, setAcks] = useState<{ token: string; acks: { claimId: string }[] }[]>([]);
  const [origin, setOrigin] = useState("");
  const v = ws.versions[0];

  useEffect(() => {
    setOrigin(window.location.origin);
    if (ws.recipients[0] && !left) setLeft(`${ws.recipients[0].personId}|${ws.recipients[0].roleId}`);
    if (ws.recipients[1] && !right) setRight(`${ws.recipients[1].personId}|${ws.recipients[1].roleId}`);
    if (ws.shares.length) act("acks").then((d) => d?.acks && setAcks(d.acks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.shares.length]);

  async function preview(key: string) {
    if (!key || pv[key + v?.n]) return;
    const [recipientId, roleId] = key.split("|");
    const d = await act("preview", { recipientId, roleId });
    if (d?.preview) setPv((p) => ({ ...p, [key + v.n]: d.preview }));
  }
  useEffect(() => {
    if (v) {
      preview(left);
      preview(right);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, v?.n]);

  if (!v)
    return (
      <Empty title="Approve a version first">
        Handovers are only built from an approved version. <Btn kind="ghost" onClick={() => go("review")}>Go to Review</Btn>
      </Empty>
    );

  const opts = ws.recipients.map((r) => ({ key: `${r.personId}|${r.roleId}`, label: `${personName(ws, r.personId)} · ${ws.roles.find((x) => x.id === r.roleId)?.label}` }));

  return (
    <div className="space-y-4">
      <Help>
        Each recipient gets their own handover, built on the server from approved version <b>v{v.n}</b> (<span className="font-mono">{v.hash}</span>) using only the sources their role can open. A claim is shown only if
        (a) the reader can open at least one of its sources, (b) those sources alone still support it, and (c) its sensitivity is within the reader&apos;s clearance. Otherwise it appears as a 🔒 sealed placeholder, or is withheld entirely if it is restricted.
      </Help>
      <Card>
        <h2 className="font-bold">Share links</h2>
        <div className="mt-2 divide-y divide-slate-100">
          {ws.recipients.map((r) => {
            const shares = ws.shares.filter((s) => s.recipientId === r.personId && s.roleId === r.roleId);
            const latest = shares[0];
            const ack = latest ? acks.find((a) => a.token === latest.token)?.acks ?? [] : [];
            return (
              <div key={r.personId + r.roleId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="text-sm">
                  <b>{personName(ws, r.personId)}</b> <span className="text-slate-500">as {ws.roles.find((x) => x.id === r.roleId)?.label}</span>
                  {latest ? (
                    <div className="mt-0.5 text-xs text-slate-500">
                      v{latest.versionN} shared {new Date(latest.createdAt).toLocaleString("en-IN")} · {ack.some((a) => a.claimId === "__all__") ? "✓ receipt acknowledged" : "not yet acknowledged"} · {ack.filter((a) => a.claimId !== "__all__").length} critical items acknowledged
                      {latest.versionN < v.n ? <span className="ml-1 font-semibold text-amberd">(older version: share again)</span> : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {latest ? (
                    <>
                      <a href={`/h/${latest.token}`} target="_blank" rel="noreferrer" className="rounded-md bg-ink px-3 py-1.5 text-sm text-white hover:bg-slate-800">
                        Open their handover ↗
                      </a>
                      <Btn onClick={() => navigator.clipboard?.writeText(`${origin}/h/${latest.token}`)}>Copy link</Btn>
                    </>
                  ) : null}
                  <Btn kind={latest ? "ghost" : "amber"} disabled={!!busy} onClick={() => act("share", { recipientId: r.personId, roleId: r.roleId }, "Building handover…")}>
                    {latest ? "Re-share latest version" : "Create handover link"}
                  </Btn>
                </div>
              </div>
            );
          })}
          {!ws.recipients.length ? <p className="py-2 text-sm text-slate-500">Add recipients in Connect → Handover setup.</p> : null}
        </div>
        <p className="mt-2 text-xs text-slate-500">Links are unguessable 28-character tokens. The recipient page is rendered on the server from the already-filtered handover, so sealed content never reaches their browser.</p>
      </Card>

      {opts.length >= 1 ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">Compare what each role sees</h2>
            <select value={left} onChange={(e) => setLeft(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              {opts.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-slate-400">vs</span>
            <select value={right} onChange={(e) => setRight(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              <option value="">(none)</option>
              {opts.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`mt-3 grid gap-4 ${right ? "lg:grid-cols-2" : ""}`}>
            {[left, right].filter(Boolean).map((k) => (
              <div key={k} className="max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {pv[k + v.n] ? <HandoverView h={pv[k + v.n]} compact /> : <div className="p-6 text-center text-sm text-slate-500">Building preview…</div>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
