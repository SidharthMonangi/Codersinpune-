"use client";
import { useState } from "react";
import type { CompiledHandover } from "@/lib/types";
import { HandoverView, type Ack } from "@/components/handover-view";

export function RecipientClient({ token, h, initialAcks }: { token: string; h: CompiledHandover; initialAcks: Ack[] }) {
  const [acks, setAcks] = useState<Ack[]>(initialAcks);
  const [err, setErr] = useState<string | null>(null);
  async function onAck(claimId: string, note?: string) {
    setErr(null);
    const r = await fetch(`/api/share/${token}/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId, note }) });
    const d = await r.json();
    if (!r.ok) setErr(d.error || "Could not save");
    else setAcks(d.acks);
  }
  return (
    <>
      {err ? <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}
      <HandoverView h={h} acks={acks} onAck={onAck} />
    </>
  );
}
