"use client";
import { Btn, Card } from "@/components/ui";
import { useWs } from "./ctx";

export function Audit({ onReset }: { onReset: () => void }) {
  const { ws } = useWs();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <h2 className="font-bold">Audit log</h2>
        <p className="text-sm text-ink2">Every connection, extraction run, answer, edit, approval and share is recorded here, with who did it and when.</p>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {ws.audit.map((a, i) => (
            <li key={i} className="py-1.5">
              <span className="font-mono text-xs text-slate-500">{new Date(a.at).toLocaleString("en-IN")}</span> · <b>{a.actor}</b> · {a.action}
              {a.detail ? <div className="text-xs text-slate-600">{a.detail}</div> : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="h-fit">
        <h2 className="font-bold">Your data</h2>
        <p className="mt-1 text-sm text-ink2">This workspace is private to your browser (secure cookie). Leaving it forgets the workspace on this device; you can start a fresh demo any time.</p>
        <Btn className="mt-3" kind="danger" onClick={onReset}>
          Leave this workspace
        </Btn>
      </Card>
    </div>
  );
}
