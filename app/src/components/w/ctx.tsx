"use client";
import { createContext, useContext } from "react";
import type { Workspace } from "@/lib/types";

export interface Ctx {
  ws: Workspace;
  ai: boolean;
  busy: string | null;
  actor: string;
  act: (type: string, payload?: Record<string, unknown>, label?: string) => Promise<any>;
  openEvidence: (ids: string[], claimText?: string) => void;
  go: (tab: string) => void;
}
export const WsCtx = createContext<Ctx | null>(null);
export const useWs = () => {
  const c = useContext(WsCtx);
  if (!c) throw new Error("no ctx");
  return c;
};
