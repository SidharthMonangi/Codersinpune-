"use client";
import type { ClaimType, Trust } from "@/lib/types";
import { CLAIM_TYPES } from "@/lib/types";

export const TRUST: Record<Trust | "sealed", { label: string; color: string; slip: string; help: string }> = {
  verified: { label: "Verified", color: "#1f7a4d", slip: "#2f9e66", help: "Checked against its sources: supported by 2+ sources or an authoritative one (repo, doc, board)." },
  inferred: { label: "Inferred", color: "#2453b8", slip: "#4a78d6", help: "Supported by a single informal source (e.g. one chat message). Likely, not confirmed." },
  conflicting: { label: "Conflicting", color: "#c2410c", slip: "#ea7a34", help: "Sources disagree, or this was later reversed. The newest source wins." },
  unsupported: { label: "Unknown", color: "#b42318", slip: "#d6453b", help: "No source supports this. It's listed as an unknown, never shown as fact." },
  attested: { label: "Attested", color: "#6d3fc0", slip: "#8b5cf6", help: "Stated by a named person in the Gap Interview, with a date." },
  sealed: { label: "Sealed", color: "#3a4150", slip: "#15191f", help: "Exists, but its sources are outside this reader's access." },
};

export function TrustBadge({ trust, extra, size = "sm" }: { trust: Trust | "sealed"; extra?: string; size?: "sm" | "lg" }) {
  const t = TRUST[trust];
  return (
    <span title={t.help} className={`stamp ${size === "lg" ? "stamp-lg" : ""}`} style={{ color: t.color }}>
      {trust === "sealed" ? "🔒 " : trust === "verified" ? "✓ " : trust === "attested" ? "✍ " : trust === "conflicting" ? "⇄ " : ""}
      {t.label}
      {extra ? <span className="font-normal opacity-75">· {extra}</span> : null}
    </span>
  );
}

export function TypeLabel({ type }: { type: ClaimType }) {
  return <span className="label text-mute">{CLAIM_TYPES.find((t) => t.id === type)?.label}</span>;
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
    default: "border border-rule bg-card text-ink hover:border-[#cbbd9f] hover:bg-white",
    primary: "bg-ink text-paper hover:bg-black shadow-sm",
    amber: "bg-gradient-to-b from-amber-400 to-amber text-ink font-semibold shadow-[0_6px_16px_-8px_rgba(234,88,12,.7)] hover:brightness-105",
    ghost: "text-ink2 hover:bg-paper2/70",
    danger: "border border-red-200 bg-card text-red-700 hover:bg-red-50",
    success: "border border-emerald-200 bg-card text-emerald-800 hover:bg-emerald-50",
  }[kind];
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 ${k} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`sheet p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3">
      {kicker ? <div className="label text-amberd">{kicker}</div> : null}
      <h2 className="font-display text-[28px] leading-tight">{title}</h2>
      {children ? <p className="mt-1 max-w-3xl text-sm text-ink2">{children}</p> : null}
    </div>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-ink2">
          <span>{label}</span>
          <span className="font-mono font-bold text-ink">{value}</span>
        </div>
      ) : null}
      <div className="track">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Ring({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "#1f7a4d" : value >= 40 ? "#f59e0b" : "#ea580c";
  return (
    <div className="flex items-center gap-3" title="Readiness = 70% risk-weighted gaps closed + 30% claims reviewed">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5dcc8" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" transform={`rotate(90 ${size / 2} ${size / 2})`} className="font-display" fontSize={size * 0.36} fill="#12161d">
          {value}
        </text>
      </svg>
      {label ? (
        <div className="leading-tight">
          <div className="label text-mute">{label}</div>
          <div className="text-xs text-ink2">{value >= 75 ? "Ready to hand over" : value >= 40 ? "Getting there" : "Knowledge at risk"}</div>
        </div>
      ) : null}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cdbf9f] bg-card/60 p-10 text-center">
      <div className="font-display text-2xl">{title}</div>
      <div className="mt-1 text-sm text-ink2">{children}</div>
    </div>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amberl to-[#fff8e8] px-4 py-3 text-sm text-ink2">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber/15 blur-xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
