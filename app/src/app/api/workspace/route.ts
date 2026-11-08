import { NextResponse } from "next/server";
import { buildDemo, log } from "@/lib/ops";
import { emptyWorkspace } from "@/lib/demo";
import { createWorkspace } from "@/lib/store";
import { clearSession, currentWorkspace, setSession } from "@/lib/session";
import { aiAvailable } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const cur = await currentWorkspace().catch(() => null);
  if (!cur) return NextResponse.json({ ws: null, ai: aiAvailable() });
  return NextResponse.json({ ws: cur.ws, ai: aiAvailable() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ws = body.mode === "demo" ? await buildDemo() : emptyWorkspace();
  if (body.mode !== "demo") {
    ws.project.name = String(body.name || "My project").slice(0, 80);
    log(ws, "admin", "Created workspace", ws.project.name);
  }
  const { id, secret } = await createWorkspace(ws);
  await setSession(id, secret);
  return NextResponse.json({ ws, ai: aiAvailable() });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
