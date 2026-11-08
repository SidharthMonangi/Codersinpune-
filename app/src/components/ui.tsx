"use client";
import type { ClaimType, Trust } from "@/lib/types";
import { CLAIM_TYPES } from "@/lib/types";

export const TRUST: Record<Trust | "sealed", { label: string; cls: string; bar: string; help: string }> = {
  verified: { label: "VERIFIED", cls: "bg-green-100 text-green-800", bar: "border-l-green-600", help: "Checked against its sources: supported by 2+ sources or an authoritative one (repo, doc, board)." },
  inferred: { label: "INFERRED", cls: "bg-blue-100 text-blue-800", bar: "border-l-blue-600", help: "Supported by a single informal source (e.g. one chat message). Treat as likely, not confirmed." },
  conflicting: { label: "CONFLICTING", cls: "bg-orange-100 text-orange-800", bar: "border-l-orange-600", help: "Sources disagree, or this was later reversed. Check the newest source." },
  unsupported: { label: "UNSUPPORTED / GAP", cls: "bg-red-100 text-red-800", bar: "border-l-red-600", help: "No source supports this. Never shown as fact." },
  attested: { label: "ATTESTED", cls: "bg-violet-100 text-violet-800", bar: "border-l-violet-600", help: "Stated by a named person in the Gap Interview, with a date." },
  sealed: { label: "🔒 SEALED", cls: "bg-slate-200 text-slate-700", bar: "border-l-slate-500", help: "Exists, but its sources are outside this reader's access." },
};

export function TrustBadge({ trust, extra }: { trust: Trust | "sealed"; extra?: string }) {
  const t = TRUST[trust];
  return (
    <span title={t.help} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide ${t.cls}`}>
      {t.label}
      {extra ? <span className="ml-1 font-semibold opacity-80">· {extra}</span> : null}
    </span>
  );
}

export function TypeLabel({ type }: { type: ClaimType }) {
  return <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">{CLAIM_TYPES.find((t) => t.id === type)?.label}</span>;
}

export function Btn({
  children,
  onClick,
  kind = "default",
  disabled,
  title,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "default" | "primary" | "amber" | "ghost" | "danger" | "success";
  disabled?: boolean;
  title?: string;
  className?: string;
  type?: "button" | "submit";
}) {
  const k = {
    default: "border border-slate-300 bg-white text-ink hover:bg-slate-50",
    primary: "bg-ink text-white hover:bg-slate-800",
    amber: "bg-amber text-ink hover:bg-amber-400 font-semibold",
    ghost: "text-ink2 hover:bg-slate-100",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    success: "border border-green-200 bg-white text-green-700 hover:bg-green-50",
  }[kind];
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${k} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>;
}

export function Meter({ value, label }: { value: number; label?: string }) {
  const color = value >= 75 ? "bg-green-500" : value >= 45 ? "bg-amber" : "bg-red-500";
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span className="font-bold text-ink">{value}/100</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{children}</div>
    </div>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-amber-200 bg-amberl/60 px-3 py-2 text-sm text-ink2">{children}</div>;
}
