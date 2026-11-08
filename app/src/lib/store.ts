import "server-only";
import type { CompiledHandover, Workspace } from "./types";
import { secret as mkSecret } from "./util";

// Persistence via Supabase RPC functions only. Tables have RLS with no policies, so the public key
// can do nothing except call these functions, which check the workspace secret (stored as a SHA-256 hash).
// Recipients can only ever read compiled (already permission-filtered) handovers by share token.
const URL = process.env.SUPABASE_URL || "https://bryadtwtmzbmbabhdxkd.supabase.co";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_hcUTeUozHBUYmMnD4RwwCA_Oho8Dsgz";
const USE_MEMORY = process.env.BATON_STORE === "memory";

type Mem = { ws: Map<string, { secret: string; doc: Workspace }>; shares: Map<string, { wsId: string; compiled: CompiledHandover; acks: Ack[]; created_at: string }> };
const g = globalThis as unknown as { __batonMem?: Mem };
const mem: Mem = (g.__batonMem ??= { ws: new Map(), shares: new Map() });

export interface Ack { claimId: string; note?: string; at: string }

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Storage error (${fn}: ${r.status}) ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export async function createWorkspace(doc: Workspace): Promise<{ id: string; secret: string }> {
  const secret = mkSecret(40);
  if (USE_MEMORY) {
    const id = crypto.randomUUID();
    mem.ws.set(id, { secret, doc });
    return { id, secret };
  }
  const id = await rpc<string>("ws_create", { p_secret: secret, p_doc: doc });
  return { id, secret };
}

export async function loadWorkspace(id: string, secret: string): Promise<Workspace | null> {
  if (USE_MEMORY) {
    const w = mem.ws.get(id);
    return w && w.secret === secret ? structuredClone(w.doc) : null;
  }
  return rpc<Workspace | null>("ws_get", { p_id: id, p_secret: secret });
}

export async function saveWorkspace(id: string, secret: string, doc: Workspace): Promise<void> {
  if (USE_MEMORY) {
    const w = mem.ws.get(id);
    if (!w || w.secret !== secret) throw new Error("Workspace not found");
    w.doc = structuredClone(doc);
    return;
  }
  const ok = await rpc<boolean>("ws_save", { p_id: id, p_secret: secret, p_doc: doc });
  if (!ok) throw new Error("Workspace not found");
}

export async function putShare(id: string, secret: string, token: string, compiled: CompiledHandover): Promise<void> {
  if (USE_MEMORY) {
    mem.shares.set(token, { wsId: id, compiled, acks: [], created_at: new Date().toISOString() });
    return;
  }
  const ok = await rpc<boolean>("share_put", { p_id: id, p_secret: secret, p_token: token, p_compiled: compiled });
  if (!ok) throw new Error("Workspace not found");
}

export async function getShare(token: string): Promise<{ compiled: CompiledHandover; acks: Ack[]; created_at: string } | null> {
  if (!/^[A-Za-z0-9]{20,64}$/.test(token)) return null;
  if (USE_MEMORY) return mem.shares.get(token) ?? null;
  return rpc("share_get", { p_token: token });
}

export async function listShareAcks(id: string, secret: string): Promise<{ token: string; acks: Ack[] }[]> {
  if (USE_MEMORY) return [...mem.shares.entries()].filter(([, s]) => s.wsId === id).map(([token, s]) => ({ token, acks: s.acks }));
  return rpc("share_list", { p_id: id, p_secret: secret });
}

export async function ackShare(token: string, claimId: string, note: string): Promise<Ack[]> {
  if (USE_MEMORY) {
    const s = mem.shares.get(token);
    if (!s) throw new Error("Not found");
    s.acks = [...s.acks.filter((a) => a.claimId !== claimId), { claimId, note, at: new Date().toISOString() }];
    return s.acks;
  }
  return rpc("share_ack", { p_token: token, p_claim: claimId, p_note: note });
}
