import type { Claim, ClaimType, EvidenceUnit, Gap, GapKind, Workspace } from "./types";
import { jaccard, overlap, tokens, uid } from "./util";
import { mentionedPeople, personName } from "./people";
import { classifyArea } from "./areas";

/* ------------------------------------------------------------------ */
/* 1. Rule-based extraction (works with no API key; labelled honestly) */
/* ------------------------------------------------------------------ */

const P: Record<Exclude<ClaimType, "open_question">, RegExp> = {
  decision:
    /\b(decision:|decided|we chose|chose|we are moving|moving the|switch(ed|ing)? .{0,25}\bto\b|migrat(e|ing) to|plan is final|instead of|we will use|we are dropping|go(ing)? with|will get read-only|everything goes to|we are on|replaces|confirmed for|cap is|limit is|releases are)\b/i,
  risk: /\b(risk|expires?|will break|might|could create|run out|pauses|double charge|duplicate|not migrated|personal (email|card)|cannot accept|goes to sleep|hit the quota)\b/i,
  blocker: /\b(blocked|blocker|deploys? fail(ed|ing|s)?|deploy failed|crashed|exhausted|keep hitting|recurring|is failing|failing test|test .{0,20} is failing)\b/i,
  dependency: /\b(depends on|unless|need(s)? the|waiting (on|for)|requires|must be renewed|without .{0,20} we cannot|must finish before|before (she|he|priya|they) leaves?)\b/i,
  next_action: /\b(action item|next step|need to|needs? to|has to|should|must|todo|please make sure|will send|i'll start|need to decide|do not|don't assign)\b/i,
  ownership: /\b(owns?|owner of|is responsible|assigned to|will take over|takes over|can mentor|in the it cell handles)\b/i,
  contact: /\b(contact is|talk to|replies on|follow ups?|reach (out|him|her))\b/i,
};
const STRONG_RISK = /\b(expires?|will break|double charge|duplicate|cannot accept|goes to sleep|pauses|personal (email|card)|not migrated|run out|might run out)\b/i;
const RATIONALE = /\b(because|since|due to|so that|reason|as the|cannot pay|costs too much|takes weeks|too expensive)\b/i;
const NOT_ANSWERED = /^(i'll|i will) (write|check|get back|find)|^(not sure|no idea|don'?t know|tbd)/i;

function primaryType(s: string, ws: Workspace): ClaimType | null {
  if (P.blocker.test(s)) return "blocker";
  if (STRONG_RISK.test(s)) return "risk";
  if (P.decision.test(s)) return "decision";
  if (P.dependency.test(s)) return "dependency";
  if (P.contact.test(s)) return "contact";
  if (P.ownership.test(s) && mentionedPeople(ws.people, s).length) return "ownership";
  if (P.next_action.test(s)) return "next_action";
  if (P.risk.test(s)) return "risk";
  return null;
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z#"(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

const isFragment = (s: string) =>
  tokens(s).length < 4 || /^(this|that|it|then|yes|no|same|so|also|which)\b/i.test(s) || (/\b(it|this|that)\b/i.test(s) && tokens(s).length < 9);

const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";
export function findDate(text: string): string | undefined {
  let m = text.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})(?:\\s+(20\\d\\d))?`, "i"));
  if (m) {
    const d = new Date(`${m[2]} ${m[1]}, ${m[3] ?? "2026"} 12:00:00`);
    if (!isNaN(+d)) return d.toISOString().slice(0, 10);
  }
  return undefined;
}

function firstPersonToName(s: string, author: string): string {
  if (!author || ["document", "board", "sheet"].includes(author)) return s;
  return s
    .replace(/\bI'm\b/g, `${author} is`)
    .replace(/\bI'll\b/g, `${author} will`)
    .replace(/\bI am\b/g, `${author} is`)
    .replace(/(^|[.!?]\s+)I\b/g, `$1${author}`)
    .replace(/\bmy\b/gi, `${author}'s`);
}

export function extractRules(ws: Workspace, units: EvidenceUnit[]): Claim[] {
  const claims: Claim[] = [];
  const bySource = new Map<string, EvidenceUnit[]>();
  for (const u of units) bySource.set(u.sourceId, [...(bySource.get(u.sourceId) ?? []), u]);

  for (const u of units) {
    const authorName = personName(ws, u.author);
    const siblings = bySource.get(u.sourceId) ?? [];
    const idx = siblings.indexOf(u);

    // Task-board rows are structured: map status directly.
    if (/^Task "/.test(u.text)) {
      const status = (u.text.match(/ is ([^,.]+)/)?.[1] ?? "").toLowerCase();
      if (/done|complete|closed/.test(status)) continue;
      const owner = u.text.match(/assigned to ([^,.]+)/)?.[1];
      const ownerP = owner ? mentionedPeople(ws.people, owner)[0] : undefined;
      const title = u.text.match(/^Task "([^"]+)"/)?.[1] ?? u.text;
      claims.push(mk(/blocked/.test(status) ? "blocker" : "next_action", `${title}${/blocked/.test(status) ? " (blocked)" : ""}`, u, {
        owner: ownerP?.id,
        due: findDate(u.text),
      }));
      continue;
    }
    // Closed / merged GitHub items are history: they can carry decisions, not open work.
    const historical = /^(PR|Issue) #\d+ \((closed|merged)\)/.test(u.text);

    type Seg = { type: ClaimType | null; text: string; raw: string };
    const segs: Seg[] = [];
    for (const raw of sentences(u.text)) {
      let t: ClaimType | null;
      if (/\?\s*$/.test(raw)) {
        const next = siblings.slice(idx + 1, idx + 3).find((n) => n.author !== u.author);
        const answered =
          !!next && Math.abs(+new Date(next.ts) - +new Date(u.ts)) < 6 * 3600000 && !NOT_ANSWERED.test(next.text);
        t = answered ? null : "open_question";
      } else t = primaryType(raw, ws);
      if (historical && t && t !== "decision") t = null;
      const last = segs[segs.length - 1];
      if (t === "open_question" && last && last.type === null) {
        last.text += " " + raw;
        last.raw += " " + raw;
        last.type = t;
        continue;
      }
      if (last && t !== "open_question" && last.type !== "open_question" && (t === null || isFragment(raw) || last.type === null)) {
        last.text += " " + raw;
        last.raw += " " + raw;
        last.type ??= t;
      } else segs.push({ type: t, text: raw, raw });
    }
    const seen = new Set<ClaimType>();
    let first = true;
    for (const sg of segs) {
      if (!sg.type || seen.has(sg.type)) continue;
      seen.add(sg.type);
      const t = sg.type;
      const title = u.text.match(/^(?:PR|Issue) #\d+ \([^)]*\): ([^.]+)\./)?.[1];
      const ctx = !first && /^(PR|Issue) #\d+/.test(u.locator) ? `${u.locator}${title ? ` (${title})` : ""}: ` : "";
      first = false;
      const text = ctx + firstPersonToName(sg.text, authorName).replace(/^(Heads up|Reminder|Update|Note|Decision):\s*/i, "");
      const people = mentionedPeople(ws.people, sg.raw);
      let owner: string | undefined;
      if (t === "ownership" || t === "contact") owner = people[0]?.id;
      if (t === "next_action") owner = people[0]?.id ?? (/\b(i'll|i will|will send|i'll start)\b/i.test(sg.raw) && u.author.startsWith("p_") ? u.author : undefined);
      claims.push(
        mk(t, text, u, {
          owner,
          due: findDate(sg.raw),
          rationale: t === "decision" ? RATIONALE.test(u.text) : undefined,
        }),
      );
    }
  }
  return claims;

  function mk(type: ClaimType, text: string, u: EvidenceUnit, extra: Partial<Claim>): Claim {
    const a = classifyArea(text);
    return {
      id: uid("cl_"),
      type,
      text: (() => { const t = text.replace(/\s+/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); })(),
      area: a !== "General" ? a : u.area,
      evidence: [{ evidenceId: u.id, relation: "supports", score: 0 }],
      trust: "inferred",
      confidence: 0.5,
      origin: "rules",
      sensitivity: u.sensitivity,
      status: "pending",
      ...extra,
    };
  }
}

/* ------------------------------------------------------------------ */
/* 2. Resolver: merge duplicates, detect supersession and conflicts     */
/* ------------------------------------------------------------------ */

export function resolve(claims: Claim[], ev: Map<string, EvidenceUnit>): Claim[] {
  const ts = (c: Claim) => Math.max(...c.evidence.map((e) => +new Date(ev.get(e.evidenceId)?.ts ?? 0)));
  const out: Claim[] = [];
  const sorted = [...claims].sort((a, b) => ts(a) - ts(b));
  for (const c of sorted) {
    const tk = tokens(c.text);
    const dup = out.find((o) => {
      if (o.type !== c.type || o.area !== c.area) return false;
      const j = jaccard(tokens(o.text), tk);
      if (c.type === "blocker") return j >= 0.18;
      return j >= 0.42;
    });
    if (dup) {
      for (const e of dup.evidence) e.basis ??= dup.text;
      for (const e of c.evidence) if (!dup.evidence.some((x) => x.evidenceId === e.evidenceId)) dup.evidence.push({ ...e, basis: e.basis ?? c.text });
      dup.owner ??= c.owner;
      dup.due ??= c.due;
      dup.rationale = dup.rationale || c.rationale;
      dup.sensitivity = Math.max(dup.sensitivity, c.sensitivity) as Claim["sensitivity"];
      // prefer the most informative wording
      if (c.text.length > dup.text.length && c.type !== "blocker") dup.text = c.text;
      continue;
    }
    out.push({ ...c, evidence: [...c.evidence] });
  }

  // recurring problems: blockers backed by 3+ units
  for (const c of out) {
    if (c.type === "blocker" && c.evidence.length >= 3 && !/^Recurring/.test(c.text)) {
      c.text = `Recurring (${c.evidence.length} reports): ${c.text}`;
    }
  }

  // decisions about the same "slot" (database, payments, notifications...):
  // same chosen option -> merge as corroboration; different option later in time -> supersedes.
  const decisions = () => out.filter((c) => c.type === "decision" && !c.supersededBy).sort((a, b) => ts(a) - ts(b));
  const removed = new Set<string>();
  for (const a of decisions()) {
    if (removed.has(a.id)) continue;
    const ta = target(a.text);
    if (!ta) continue;
    for (const b of decisions()) {
      if (b === a || removed.has(b.id) || ts(b) < ts(a)) continue;
      const tb = target(b.text);
      if (!tb || tb.cat !== ta.cat) continue;
      if (tb.opt === ta.opt) {
        if (ts(b) - ts(a) < 45 * 86400000) {
          for (const e of a.evidence) e.basis ??= a.text;
          for (const e of b.evidence) if (!a.evidence.some((x) => x.evidenceId === e.evidenceId)) a.evidence.push({ ...e, basis: e.basis ?? b.text });
          a.rationale = a.rationale || b.rationale;
          removed.add(b.id);
        }
      } else if (!a.supersededBy) {
        a.supersededBy = b.id;
        a.conflictWith = [...new Set([...(a.conflictWith ?? []), b.id])];
        b.conflictWith = [...new Set([...(b.conflictWith ?? []), a.id])];
      }
    }
  }
  // open questions that a later decision answers ("NFC or QR?" -> "We chose QR")
  for (const q of out.filter((c) => c.type === "open_question")) {
    const qo = optionList(q.text);
    if (qo.length < 2) continue;
    const ans = out.find((d) => d.type === "decision" && ts(d) >= ts(q) && qo.some((o) => o.opt === target(d.text)?.opt));
    if (ans) removed.add(q.id);
  }
  for (let i = out.length - 1; i >= 0; i--) if (removed.has(out[i].id)) out.splice(i, 1);

  // factual conflicts: same area + same subject, different numbers or dates, close in time
  const factual = out.filter((c) => /\d/.test(c.text));
  for (let i = 0; i < factual.length; i++) {
    for (let j = i + 1; j < factual.length; j++) {
      const a = factual[i], b = factual[j];
      if (a.supersededBy === b.id || b.supersededBy === a.id) continue;
      const subj = subject(a.text);
      if (!subj || subj !== subject(b.text)) continue;
      const na = nums(a.text), nb = nums(b.text);
      if (na.length && nb.length && na.join() !== nb.join()) {
        a.conflictWith = [...new Set([...(a.conflictWith ?? []), b.id])];
        b.conflictWith = [...new Set([...(b.conflictWith ?? []), a.id])];
      }
    }
  }
  return out;
}

const OPTION_CATS: { cat: string; re: RegExp; norm: (s: string) => string }[] = [
  { cat: "database", re: /\b(firebase|supabase|postgres(?:ql)?|mongodb|mysql)\b/gi, norm: (s) => (/supabase|postgres/i.test(s) ? "postgres" : s.toLowerCase()) },
  { cat: "payments", re: /\b(razorpay|stripe|paytm)\b/gi, norm: (s) => s.toLowerCase() },
  { cat: "notifications", re: /\b(onesignal|push notifications|email(?:-only)? reminders|email-only)\b/gi, norm: (s) => (/email/i.test(s) ? "email" : "onesignal") },
  { cat: "checkin", re: /\b(qr codes?|qr|nfc(?: wristbands)?)\b/gi, norm: (s) => (/qr/i.test(s) ? "qr" : "nfc") },
  { cat: "cadence", re: /\b(weekly|biweekly)\b/gi, norm: (s) => s.toLowerCase() },
  { cat: "auth", re: /\b(college sso|sso|magic links?)\b/gi, norm: (s) => (/sso/i.test(s) ? "sso" : "magic") },
];
function optionList(t: string): { cat: string; opt: string; idx: number }[] {
  const out: { cat: string; opt: string; idx: number }[] = [];
  for (const c of OPTION_CATS) for (const m of t.matchAll(c.re)) out.push({ cat: c.cat, opt: c.norm(m[0]), idx: m.index ?? 0 });
  return out.sort((a, b) => a.idx - b.idx);
}
/** The option a decision actually chose: "X instead of Y" -> X; "to/use/on/with X" -> X; else the last option named. */
function target(t: string): { cat: string; opt: string } | null {
  const opts = optionList(t);
  if (!opts.length) return null;
  const cands = opts.filter((o) => {
    const before = t.slice(Math.max(0, o.idx - 22), o.idx).toLowerCase();
    const after = t.slice(o.idx, o.idx + 40).toLowerCase();
    return /\b(to|use|using|on|with|chose|choose|goes to|switching to)\s+(the\s+|college\s+)?$/.test(before) || /^\S+(\s\S+)?\s+instead of/.test(after) || /^\S+ (code )?check-in/.test(after) || /releases are $/.test(before);
  });
  const pick = cands.length ? cands[cands.length - 1] : opts[opts.length - 1];
  return { cat: pick.cat, opt: pick.opt };
}
function nums(t: string): string[] {
  return (t.match(/\b\d[\d,]*\b/g) ?? []).map((n) => n.replace(/,/g, "")).filter((n) => !/^#/.test(n)).sort();
}
function subject(t: string): string | null {
  const l = t.toLowerCase();
  if (/registration cap|cap is \d|go to \d+ registrations/.test(l)) return "registration-cap";
  if (/\bfest\b.*\b(on|for)\b.*\b(december|\d)/.test(l) || /confirmed for/.test(l)) return "fest-date";
  return null;
}

/* ------------------------------------------------------------------ */
/* 3. Verifier (rules): lexical support check + trust assignment        */
/* ------------------------------------------------------------------ */

const AUTHORITATIVE = new Set(["github", "doc", "tasks", "attestation"]);

export function verifyRules(claims: Claim[], ev: Map<string, EvidenceUnit>, kinds: Map<string, string>): void {
  for (const c of claims) {
    for (const link of c.evidence) {
      const u = ev.get(link.evidenceId);
      const ct = tokens((link.basis ?? c.text).replace(/^Recurring \(\d+ reports\): /, ""));
      link.score = u ? Math.round(overlap(ct, tokens(u.text)) * 100) / 100 : 0;
    }
  }
  assignTrust(claims, ev, kinds);
}

export function assignTrust(claims: Claim[], ev: Map<string, EvidenceUnit>, kinds: Map<string, string>): void {
  const byId = new Map(claims.map((c) => [c.id, c]));
  for (const c of claims) {
    // a conflict is resolved when one side explicitly superseded the other; the winner is not "conflicting"
    const unresolved = (c.conflictWith ?? []).filter((id) => byId.get(id)?.supersededBy !== c.id);
    if (c.origin === "human" && c.trust === "attested") continue;
    const supports = c.evidence.filter((e) => e.relation === "supports" && e.score >= 0.5);
    const sources = new Set(supports.map((e) => ev.get(e.evidenceId)?.sourceId));
    const authoritative = supports.some((e) => AUTHORITATIVE.has(kinds.get(ev.get(e.evidenceId)?.sourceId ?? "") ?? ""));
    const explicit = /\b(decision:|decided|confirmed|plan is final)\b/i.test(c.text);
    c.confidence = supports.length ? Math.min(0.99, Math.max(...supports.map((s) => s.score)) * (0.7 + 0.1 * Math.min(3, sources.size))) : 0.1;
    // contradicting evidence that belongs to a claim this one superseded is already resolved
    const resolvedEv = new Set(claims.filter((o) => o.supersededBy === c.id).flatMap((o) => o.evidence.map((e) => e.evidenceId)));
    const openContra = c.evidence.some((e) => e.relation === "contradicts" && !resolvedEv.has(e.evidenceId));
    if (!supports.length) c.trust = "unsupported";
    else if (unresolved.length || openContra) c.trust = "conflicting";
    else if (sources.size >= 2 || authoritative || explicit) c.trust = "verified";
    else c.trust = "inferred";
    c.confidence = Math.round(c.confidence * 100) / 100;
  }
}

/* ------------------------------------------------------------------ */
/* 4. Sole-Knower Index, gaps, readiness                                */
/* ------------------------------------------------------------------ */

export function soleKnower(ws: Workspace, personId: string | null): Record<string, { ski: number; units: number }> {
  const out: Record<string, { num: number; den: number; units: number }> = {};
  if (!personId) return {};
  const now = Date.now();
  for (const u of ws.evidence) {
    if (u.area === "General" || ws.sources.find((s) => s.id === u.sourceId)?.kind === "attestation") continue;
    if (!u.author.startsWith("p_")) continue;
    const age = Math.max(0, (now - +new Date(u.ts)) / 86400000);
    const w = Math.exp(-age / 90);
    const a = (out[u.area] ??= { num: 0, den: 0, units: 0 });
    a.den += w;
    a.units++;
    if (u.author === personId) a.num += w;
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { ski: v.den ? Math.round((v.num / v.den) * 100) / 100 : 0, units: v.units }]));
}

const BASE: Record<GapKind, number> = {
  conflict: 0.8,
  no_owner: 0.72,
  unmitigated_risk: 0.7,
  unanswered_question: 0.62,
  sole_knower: 0.66,
  no_rationale: 0.5,
};

/** A claim is "historical" when all its evidence is old and it carries no future date. */
export function isHistorical(ws: Pick<Workspace, "evidence">, c: Claim, now = Date.now()): boolean {
  if (c.origin === "human") return false;
  if (c.due) return +new Date(c.due) < now - 86400000;
  const latest = Math.max(...c.evidence.map((e) => +new Date(ws.evidence.find((u) => u.id === e.evidenceId)?.ts ?? 0)));
  return latest > 86400000 * 365 && now - latest > 60 * 86400000; // undated docs (epoch) are not "historical"
}

export function detectGaps(ws: Workspace): Gap[] {
  const ski = soleKnower(ws, ws.leaverId);
  const leaver = personName(ws, ws.leaverId) || "the departing member";
  const prev = new Map(ws.gaps.map((g) => [g.claimIds.join("|") + g.kind, g]));
  const gaps: Gap[] = [];
  const claims = ws.claims.filter((c) => c.status !== "rejected");
  const byId = new Map(claims.map((c) => [c.id, c]));
  const loc = (c: Claim) => c.evidence.map((e) => ws.evidence.find((u) => u.id === e.evidenceId)?.locator).filter(Boolean).slice(0, 2).join(", ");
  const now = Date.now();
  const urgency = (c?: Claim) => (c?.due && +new Date(c.due) - now < 45 * 86400000 ? 1 : 0.85);

  const add = (kind: GapKind, area: string, question: string, why: string, cl: Claim[]) => {
    const key = cl.map((c) => c.id).join("|") + kind;
    const s = ski[area]?.ski ?? 0;
    const risk = Math.round(BASE[kind] * (0.6 + 0.4 * s) * Math.max(...cl.map(urgency), 0.85) * 100) / 100;
    const old = prev.get(key);
    gaps.push({
      id: old?.id ?? uid("gap_"),
      kind,
      area,
      question,
      why,
      risk,
      sole: s,
      claimIds: cl.map((c) => c.id),
      evidenceIds: [...new Set(cl.flatMap((c) => c.evidence.map((e) => e.evidenceId)))],
      status: old?.status ?? "open",
      answer: old?.answer,
      answeredBy: old?.answeredBy,
      answeredAt: old?.answeredAt,
      reassignedTo: old?.reassignedTo,
    });
  };

  const seenConflict = new Set<string>();
  for (const c of claims) {
    if (c.conflictWith?.length && !c.supersededBy) {
      const others = c.conflictWith.map((id) => byId.get(id)).filter((o): o is Claim => !!o && !o.supersededBy);
      for (const o of others) {
        const k = [c.id, o.id].sort().join();
        if (seenConflict.has(k)) continue;
        seenConflict.add(k);
        add("conflict", c.area, `Two sources disagree: "${trim(o.text)}" vs "${trim(c.text)}". Which one is correct today?`, `Contradicting sources (${loc(o)} / ${loc(c)})`, [o, c]);
      }
    }
    if (c.type === "decision" && !c.rationale && !c.supersededBy) {
      add("no_rationale", c.area, `"${trim(c.text)}" Why was this decided, and what would make it worth revisiting?`, `Decision with no recorded reason (${loc(c)})`, [c]);
    }
    if ((c.type === "next_action" || c.type === "blocker") && !c.owner && !isHistorical(ws, c)) {
      add("no_owner", c.area, `Nobody is named as owner of "${trim(c.text)}". Who should own it after ${leaver} leaves, and what is its current state?`, `Unowned work (${loc(c)})`, [c]);
    }
    if (c.type === "open_question") {
      add("unanswered_question", c.area, `This question was never answered in the sources: "${trim(c.text)}"`, `Open question (${loc(c)})`, [c]);
    }
  }
  // risks with no owned next action in the same area
  for (const r of claims.filter((c) => c.type === "risk" && !c.supersededBy && !isHistorical(ws, c))) {
    const mitigated = claims.some((c) => c.area === r.area && c.type === "next_action" && c.owner);
    if (!mitigated) add("unmitigated_risk", r.area, `Risk: "${trim(r.text)}" What is the mitigation, and who will watch for it?`, `Risk with no owned mitigation (${loc(r)})`, [r]);
  }
  // areas mostly known by the leaver
  for (const [area, v] of Object.entries(ski)) {
    if (v.ski >= 0.6 && v.units >= 3) {
      const cl = claims.filter((c) => c.area === area).slice(0, 3);
      if (!cl.length) continue;
      add(
        "sole_knower",
        area,
        `You account for ${Math.round(v.ski * 100)}% of recent activity in ${area}. What does a newcomer need to know about it that isn't written down anywhere (setup steps, credentials location, people, traps)?`,
        `Sole-Knower Index ${Math.round(v.ski * 100)}% over ${v.units} items`,
        cl,
      );
    }
  }
  // one gap per claim (highest risk wins), at most 15: a leaver's time is the scarce resource
  const used = new Set<string>();
  return gaps
    .sort((a, b) => b.risk - a.risk)
    .filter((g) => {
      if (g.kind !== "sole_knower" && g.claimIds.some((id) => used.has(id))) return false;
      g.claimIds.forEach((id) => g.kind !== "sole_knower" && used.add(id));
      return true;
    })
    .slice(0, 15);
}

function trim(s: string, n = 110) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function readiness(ws: Pick<Workspace, "gaps" | "claims">): number {
  const total = ws.gaps.reduce((s, g) => s + g.risk, 0);
  const closed = ws.gaps.reduce((s, g) => s + (g.status === "answered" || g.status === "reassigned" ? g.risk : 0), 0);
  const gapPart = total ? closed / total : 1;
  const active = ws.claims.filter((c) => !c.supersededBy);
  const reviewed = active.length ? active.filter((c) => c.status !== "pending").length / active.length : 0;
  if (!ws.claims.length) return 0;
  return Math.round(100 * (0.7 * gapPart + 0.3 * reviewed));
}
