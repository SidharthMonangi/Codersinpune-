import "server-only";
import { cookies } from "next/headers";
import { loadWorkspace } from "./store";

const COOKIE = "baton_ws";

export async function getSession(): Promise<{ id: string; secret: string } | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  const [id, secret] = c.split(".");
  if (!id || !secret) return null;
  return { id, secret };
}

export async function setSession(id: string, secret: string) {
  (await cookies()).set(COOKIE, `${id}.${secret}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentWorkspace() {
  const s = await getSession();
  if (!s) return null;
  const ws = await loadWorkspace(s.id, s.secret);
  return ws ? { ...s, ws } : null;
}
