import { NextResponse } from "next/server";
import { currentWorkspace } from "@/lib/session";
import { putShare, saveWorkspace, listShareAcks } from "@/lib/store";
import { addSource, answerGap, approve, bulkAccept, compile, log, removeSource, reviewClaim, runPipeline } from "@/lib/ops";
import { fetchGitHub, parseFile } from "@/lib/ingest";
import { detectGaps } from "@/lib/pipeline";
import { aiAvailable } from "@/lib/ai";
import { secret, uid } from "@/lib/util";
import type { Sensitivity, Workspace } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE = 400_000;

export async function POST(req: Request) {
  const cur = await currentWorkspace();
  if (!cur) return NextResponse.json({ error: "Your session expired. Start a new workspace." }, { status: 401 });
  const { ws } = cur;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const actor = String(body.actor || "admin").slice(0, 60);
  let extra: Record<string, unknown> = {};
  try {
    switch (body.type) {
      case "setup": {
        if (body.name) ws.project.name = String(body.name).slice(0, 80);
        if (body.description !== undefined) ws.project.description = String(body.description).slice(0, 400);
        if (Array.isArray(body.people)) {
          for (const p of body.people.slice(0, 40)) {
            const name = String(p.name || "").trim().slice(0, 60);
            if (!name) continue;
            const existing = ws.people.find((x) => x.name.toLowerCase() === name.toLowerCase());
            if (existing) existing.title = String(p.title || existing.title).slice(0, 60);
            else ws.people.push({ id: uid("p_"), name, aliases: [], title: String(p.title || "Member").slice(0, 60) });
          }
        }
        if (body.leaverId !== undefined) ws.leaverId = body.leaverId || null;
        if (body.lastDay !== undefined) ws.lastDay = body.lastDay || null;
        if (Array.isArray(body.recipients)) ws.recipients = body.recipients.filter((r: any) => ws.people.some((p) => p.id === r.personId) && ws.roles.some((x) => x.id === r.roleId));
        if (ws.claims.length) ws.gaps = detectGaps(ws);
        log(ws, actor, "Updated handover setup");
        break;
      }
      case "addFile": {
        const content = String(body.content ?? "");
        if (content.length > MAX_FILE) throw new Error("File too large for the demo (max 400 KB)");
        const acl = validAcl(ws, body.acl);
        addSource(ws, parseFile(String(body.name).slice(0, 120), content), { acl, sensitivity: sens(body.sensitivity) }, actor);
        break;
      }
      case "addGithub": {
        const parsed = await fetchGitHub(String(body.repo || ""));
        addSource(ws, parsed, { acl: validAcl(ws, body.acl), sensitivity: sens(body.sensitivity), uri: `https://github.com/${parsed.title.replace("GitHub: ", "")}` }, actor);
        break;
      }
      case "removeSource":
        removeSource(ws, String(body.sourceId), actor);
        if (ws.claims.length) ws.gaps = detectGaps(ws);
        break;
      case "run":
        if (!ws.evidence.length) throw new Error("Connect at least one source first");
        await runPipeline(ws, { useAI: !!body.useAI, actor });
        break;
      case "gap":
        answerGap(ws, String(body.gapId), body.action, { answer: body.answer ? String(body.answer).slice(0, 2000) : undefined, to: body.to ? String(body.to).slice(0, 60) : undefined }, actor);
        break;
      case "review":
        reviewClaim(ws, String(body.claimId), body.action, actor, body.text ? String(body.text).slice(0, 500) : undefined, body.note !== undefined ? String(body.note).slice(0, 300) : undefined);
        break;
      case "bulkAccept":
        bulkAccept(ws, body.trust, actor);
        break;
      case "approve":
        await approve(ws, actor);
        break;
      case "preview": {
        const v = ws.versions[0];
        if (!v) throw new Error("Approve a version first");
        extra = { preview: compile(ws, v.n, String(body.recipientId), String(body.roleId)) };
        return NextResponse.json({ ws, ai: aiAvailable(), ...extra });
      }
      case "share": {
        const v = ws.versions[0];
        if (!v) throw new Error("Approve a version before sharing");
        const recipientId = String(body.recipientId), roleId = String(body.roleId);
        const compiled = compile(ws, v.n, recipientId, roleId);
        const token = secret(28);
        await putShare(cur.id, cur.secret, token, compiled);
        ws.shares.unshift({ token, recipientId, roleId, versionN: v.n, createdAt: new Date().toISOString() });
        log(ws, actor, "Shared handover", `v${v.n} → ${compiled.recipient.name} as ${compiled.recipient.role} (${compiled.claims.length} visible, ${compiled.sealed.length} sealed, ${compiled.hiddenCount} withheld)`);
        extra = { token };
        break;
      }
      case "acks":
        return NextResponse.json({ acks: await listShareAcks(cur.id, cur.secret) });
      default:
        throw new Error("Unknown action");
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await saveWorkspace(cur.id, cur.secret, ws);
  return NextResponse.json({ ws, ai: aiAvailable(), ...extra });
}

function validAcl(ws: Workspace, acl: unknown): string[] {
  const list = Array.isArray(acl) ? acl.map(String).filter((g) => ws.groups.some((x) => x.id === g)) : [];
  return list.length ? list : ["core"];
}
function sens(v: unknown): Sensitivity {
  const n = Number(v);
  return (n >= 0 && n <= 3 ? Math.floor(n) : 1) as Sensitivity;
}
