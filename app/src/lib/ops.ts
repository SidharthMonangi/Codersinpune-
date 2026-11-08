import type {
  Claim,
  ClaimType,
  CompiledClaim,
  CompiledHandover,
  EvidenceUnit,
  Gap,
  PlanItem,
  RoleDef,
  SealedItem,
  Workspace,
} from "./types";
import { toEvidence, type IngestOptions, type ParsedSource, parseFile } from "./ingest";
import { resolvePerson, personName, mentionedPeople } from "./people";
import { assignTrust, detectGaps, extractRules, isHistorical, readiness, resolve, verifyRules } from "./pipeline";
import { demoBase, demoFile, DEMO_MANIFEST } from "./demo";
import { suggestSensitivity } from "./redact";
import { overlap, sha256, tokens, uid } from "./util";
import { aiAvailable, extractAI, verifyAI } from "./ai";

export function log(ws: Workspace, actor: string, action: string, detail = "") {
  ws.audit.unshift({ at: new Date().toISOString(), actor, action, detail });
  ws.audit = ws.audit.slice(0, 300);
}

export function addSource(ws: Workspace, parsed: ParsedSource, opts: IngestOptions, actor = "admin") {
  if (!parsed.units.length) throw new Error(`${parsed.title}: no readable content found`);
  const { source, units } = toEvidence(parsed, opts);
  for (const u of units) u.author = resolvePerson(ws, u.author);
  ws.sources.push(source);
  ws.evidence.push(...units);
  log(ws, actor, "Connected source", `${source.title} · ${units.length} items · ${source.redactions} redactions · visible to: ${opts.acl.join(", ")}`);
  return source;
}

export function removeSource(ws: Workspace, sourceId: string, actor = "admin") {
  const s = ws.sources.find((x) => x.id === sourceId);
  if (!s) return;
  const ids = new Set(ws.evidence.filter((e) => e.sourceId === sourceId).map((e) => e.id));
  ws.sources = ws.sources.filter((x) => x.id !== sourceId);
  ws.evidence = ws.evidence.filter((e) => e.sourceId !== sourceId);
  ws.claims = ws.claims
    .map((c) => ({ ...c, evidence: c.evidence.filter((e) => !ids.has(e.evidenceId)) }))
    .filter((c) => c.evidence.length || c.origin === "human");
  log(ws, actor, "Removed source", s.title);
}

export async function runPipeline(ws: Workspace, opts: { useAI: boolean; actor?: string }) {
  const evMap = new Map(ws.evidence.map((u) => [u.id, u]));
  const kinds = new Map(ws.sources.map((s) => [s.id, s.kind]));
  const keepHuman = ws.claims.filter((c) => c.origin === "human");
  const prevStatus = new Map(ws.claims.map((c) => [c.text, c]));
  const units = ws.evidence.filter((u) => kinds.get(u.sourceId) !== "attestation");

  let claims: Claim[];
  let mode: "ai" | "rules" = "rules";
  let note: string | undefined;
  if (opts.useAI && aiAvailable()) {
    try {
      claims = await extractAI(ws, units);
      mode = "ai";
    } catch (e) {
      note = `AI extraction failed (${(e as Error).message}); fell back to rule-based extraction.`;
      claims = extractRules(ws, units);
    }
  } else {
    if (opts.useAI) note = "No AI key configured on the server; used rule-based extraction.";
    claims = extractRules(ws, units);
  }

  claims = resolve(claims, evMap);
  if (mode === "ai") {
    try {
      await verifyAI(claims, evMap);
      assignTrust(claims, evMap, kinds);
    } catch (e) {
      note = `AI verification failed (${(e as Error).message}); used lexical verification.`;
      verifyRules(claims, evMap, kinds);
    }
  } else verifyRules(claims, evMap, kinds);

  // drop claims nothing supports: never shown as fact
  const dropped = claims.filter((c) => c.trust === "unsupported").length;
  claims = claims.filter((c) => c.trust !== "unsupported");
  // carry over review decisions for identical claims
  for (const c of claims) {
    const p = prevStatus.get(c.text);
    if (p && p.status !== "pending") {
      c.status = p.status;
      c.reviewNote = p.reviewNote;
    }
  }
  ws.claims = [...claims, ...keepHuman];
  ws.gaps = detectGaps(ws);
  ws.engine = { mode, model: mode === "ai" ? process.env.GEMINI_MODEL || "gemini-2.5-flash" : undefined, lastRunAt: new Date().toISOString(), note };
  log(
    ws,
    opts.actor ?? "Baton",
    "Reconstructed project state",
    `${ws.claims.length} claims (${mode === "ai" ? "AI" : "rule-based"} extraction), ${dropped} unsupported dropped, ${ws.gaps.length} gaps`,
  );
}

/* ---------------- Gap Interview ---------------- */

export function answerGap(
  ws: Workspace,
  gapId: string,
  action: "answer" | "dont_know" | "skip" | "reassign" | "reopen",
  payload: { answer?: string; to?: string },
  actor: string,
) {
  const g = ws.gaps.find((x) => x.id === gapId);
  if (!g) throw new Error("Gap not found");
  const now = new Date().toISOString();
  if (action === "reopen") {
    g.status = "open";
    ws.claims = ws.claims.filter((c) => !(c.origin === "human" && c.evidence.some((e) => e.evidenceId === `att_${g.id}`)));
    ws.evidence = ws.evidence.filter((e) => e.id !== `att_${g.id}`);
    log(ws, actor, "Reopened gap", g.question.slice(0, 80));
    return;
  }
  if (action === "dont_know" || action === "skip") {
    g.status = action === "skip" ? "skipped" : "dont_know";
    g.answeredBy = actor;
    g.answeredAt = now;
    log(ws, actor, action === "skip" ? "Skipped gap" : "Marked gap as unknown", g.question.slice(0, 80));
    return;
  }
  if (action === "reassign") {
    g.status = "reassigned";
    g.reassignedTo = payload.to;
    g.answeredBy = actor;
    g.answeredAt = now;
    log(ws, actor, "Routed gap", `${g.question.slice(0, 60)} → ${payload.to}`);
    return;
  }
  const answer = (payload.answer ?? "").trim();
  if (answer.length < 3) throw new Error("Please write an answer");
  g.status = "answered";
  g.answer = answer;
  g.answeredBy = actor;
  g.answeredAt = now;

  // The answer becomes attested evidence. It inherits the MOST restrictive access of the evidence it answers about.
  const linked = g.evidenceIds.map((id) => ws.evidence.find((e) => e.id === id)).filter((e): e is EvidenceUnit => !!e);
  const strictest = linked.sort((a, b) => a.acl.length - b.acl.length || b.sensitivity - a.sensitivity)[0];
  let src = ws.sources.find((s) => s.kind === "attestation");
  if (!src) {
    src = { id: uid("src_"), kind: "attestation", title: "Gap Interview answers", uri: "", acl: ["core", "leads"], sensitivity: 1, addedAt: now, units: 0, redactions: 0 };
    ws.sources.push(src);
  }
  ws.evidence = ws.evidence.filter((e) => e.id !== `att_${g.id}`);
  const unit: EvidenceUnit = {
    id: `att_${g.id}`,
    sourceId: src.id,
    text: answer,
    author: ws.leaverId ?? actor,
    ts: now,
    locator: `Gap Interview · ${g.area}`,
    uri: "",
    acl: strictest?.acl ?? ["core", "leads"],
    sensitivity: Math.max(strictest?.sensitivity ?? 1, suggestSensitivity(answer, 0)) as EvidenceUnit["sensitivity"],
    area: g.area,
  };
  ws.evidence.push(unit);
  src.units = ws.evidence.filter((e) => e.sourceId === src!.id).length;

  const target = ws.claims.find((c) => c.id === g.claimIds[0]);
  const typeFor: Record<Gap["kind"], ClaimType> = {
    conflict: target?.type ?? "decision",
    no_rationale: "decision",
    no_owner: "ownership",
    unmitigated_risk: "next_action",
    unanswered_question: target?.type === "open_question" ? "next_action" : target?.type ?? "next_action",
    sole_knower: "next_action",
  };
  const prefix: Record<Gap["kind"], string> = {
    conflict: "Resolved",
    no_rationale: "Why",
    no_owner: "Owner",
    unmitigated_risk: "Mitigation",
    unanswered_question: "Answer",
    sole_knower: "Undocumented know-how",
  };
  const owner = mentionedPeople(ws.people, answer).find((p) => p.id !== ws.leaverId)?.id;
  ws.claims = ws.claims.filter((c) => !(c.origin === "human" && c.evidence.some((e) => e.evidenceId === unit.id)));
  ws.claims.push({
    id: uid("cl_"),
    type: typeFor[g.kind],
    text: `${prefix[g.kind]} (${g.area}): ${answer}`,
    owner: g.kind === "no_owner" ? owner : undefined,
    area: g.area,
    evidence: [{ evidenceId: unit.id, relation: "supports", score: 1 }, ...(target ? target.evidence.slice(0, 2) : [])],
    trust: "attested",
    confidence: 1,
    origin: "human",
    sensitivity: unit.sensitivity,
    status: "accepted",
  });
  if (g.kind === "no_owner" && target && owner) target.owner = owner;
  if (g.kind === "no_rationale" && target) target.rationale = true;
  log(ws, actor, "Answered gap (attested)", g.question.slice(0, 80));
}

/* ---------------- Review ---------------- */

export function reviewClaim(ws: Workspace, claimId: string, action: "accept" | "reject" | "edit" | "reset", actor: string, text?: string, note?: string) {
  const c = ws.claims.find((x) => x.id === claimId);
  if (!c) throw new Error("Claim not found");
  const before = c.text;
  if (action === "accept") c.status = "accepted";
  if (action === "reject") c.status = "rejected";
  if (action === "reset") c.status = "pending";
  if (action === "edit") {
    if (!text || text.trim().length < 3) throw new Error("Edited text is empty");
    c.text = text.trim();
    c.status = "edited";
  }
  if (note !== undefined) c.reviewNote = note;
  log(ws, actor, `Claim ${action === "edit" ? "edited" : action + "ed"}`, action === "edit" ? `"${before.slice(0, 60)}" → "${c.text.slice(0, 60)}"` : c.text.slice(0, 80));
}

export function bulkAccept(ws: Workspace, trust: Claim["trust"], actor: string) {
  let n = 0;
  for (const c of ws.claims) if (c.status === "pending" && c.trust === trust && !c.supersededBy) { c.status = "accepted"; n++; }
  log(ws, actor, "Bulk accepted", `${n} ${trust} claims`);
}

export async function approve(ws: Workspace, approver: string) {
  const claims = ws.claims.filter((c) => c.status !== "rejected");
  const pending = claims.filter((c) => c.status === "pending" && !c.supersededBy).length;
  if (!claims.length) throw new Error("Nothing to approve yet: reconstruct the project first");
  const n = (ws.versions[0]?.n ?? 0) + 1;
  const snapshot = structuredClone(claims);
  const gaps = structuredClone(ws.gaps);
  const hash = (await sha256(JSON.stringify({ snapshot, gaps }))).slice(0, 12);
  ws.versions.unshift({ id: uid("v_"), n, hash, approvedBy: approver, at: new Date().toISOString(), claimCount: snapshot.length, readiness: readiness(ws), claims: snapshot, gaps });
  ws.versions = ws.versions.slice(0, 10);
  log(ws, approver, `Approved version v${n}`, `hash ${hash} · ${snapshot.length} claims · ${pending} still unreviewed`);
  return ws.versions[0];
}

/* ---------------- Compile: the permission rule ---------------- */

function canSee(role: RoleDef, u: EvidenceUnit) {
  return u.acl.some((g) => role.groups.includes(g)) && u.sensitivity <= role.clearance;
}

export function visibility(ws: Workspace, c: Claim, role: RoleDef): { visible: boolean; links: Claim["evidence"]; hiddenFully: boolean } {
  const ev = new Map(ws.evidence.map((u) => [u.id, u]));
  const links = c.evidence.filter((l) => {
    const u = ev.get(l.evidenceId);
    return u && canSee(role, u);
  });
  const supports = links.filter((l) => l.relation === "supports" && l.score >= 0.5);
  // (a) at least one visible supporting source
  let ok = supports.length > 0;
  // (b) the claim must still be supported by the visible sources alone (re-verification)
  if (ok && c.origin === "rules") {
    const text = tokens(c.text.replace(/^Recurring \(\d+ reports\): /, ""));
    const best = Math.max(...supports.map((l) => overlap(text, tokens(ev.get(l.evidenceId)!.text))));
    ok = best >= 0.5;
  }
  // (c) the claim text itself must be within clearance
  if (ok && suggestSensitivity(c.text, 0) > role.clearance) ok = false;
  const hiddenFully = !ok && c.sensitivity >= 3 && role.clearance < 3;
  return { visible: ok, links, hiddenFully };
}

export function compile(ws: Workspace, versionN: number, recipientId: string, roleId: string): CompiledHandover {
  const version = ws.versions.find((v) => v.n === versionN);
  if (!version) throw new Error("Approve a version before sharing");
  const role = ws.roles.find((r) => r.id === roleId);
  if (!role) throw new Error("Unknown role");
  const ev = new Map(ws.evidence.map((u) => [u.id, u]));
  const srcTitle = new Map(ws.sources.map((s) => [s.id, s.title]));
  const now = Date.now();
  const soon = (d?: string, days = 45) => !!d && +new Date(d) - now < days * 86400000;

  const visible: CompiledClaim[] = [];
  const sealed: SealedItem[] = [];
  let hiddenCount = 0;
  const visibleIds = new Set<string>();
  const vClaims = version.claims.filter((c) => c.status !== "rejected");
  for (const c of vClaims) {
    const v = visibility(ws, c, role);
    if (!v.visible) {
      if (v.hiddenFully) hiddenCount++;
      else {
        const missing = c.evidence.map((l) => ev.get(l.evidenceId)).filter((u): u is EvidenceUnit => !!u).flatMap((u) => u.acl).find((g) => !role.groups.includes(g));
        const owner = ws.groups.find((g) => g.id === missing)?.owner ?? "the workspace admin";
        sealed.push({ type: c.type, area: c.area, requestFrom: owner, hidden: false });
      }
      continue;
    }
    visibleIds.add(c.id);
    visible.push({
      id: c.id,
      type: c.type,
      text: c.text,
      trust: c.trust,
      owner: personName(ws, c.owner) || undefined,
      due: c.due,
      area: c.area,
      superseded: !!c.supersededBy,
      ownerLeaving: !!c.owner && c.owner === ws.leaverId && !c.supersededBy && ["next_action", "blocker", "ownership", "risk"].includes(c.type),
      critical: !c.supersededBy && !isHistorical(ws, c) && (["risk", "blocker", "dependency"].includes(c.type) || (c.type === "next_action" && soon(c.due, 30))),
      citations: v.links.map((l) => {
        const u = ev.get(l.evidenceId)!;
        return { evidenceId: u.id, locator: u.locator, source: srcTitle.get(u.sourceId) ?? "", excerpt: u.text.slice(0, 240), uri: u.uri, relation: l.relation };
      }),
    });
  }

  // unknowns: only gaps whose linked claims are ALL visible (a question can leak content too)
  const unknowns = version.gaps
    .filter((g) => g.status !== "answered" && g.claimIds.every((id) => visibleIds.has(id)))
    .slice(0, 12)
    .map((g) => ({ question: g.question, area: g.area, routedTo: g.reassignedTo }));

  // people to talk to
  const peopleMap = new Map<string, Set<string>>();
  for (const c of visible.filter((x) => !x.superseded)) {
    const names = new Set<string>();
    if (c.owner) names.add(c.owner);
    if (c.type === "contact" || c.type === "ownership") for (const p of mentionedPeople(ws.people, c.text)) names.add(p.name);
    for (const n of names) {
      if (n === personName(ws, ws.leaverId)) continue;
      peopleMap.set(n, (peopleMap.get(n) ?? new Set()).add(c.area));
    }
  }
  const people = [...peopleMap.entries()].map(([name, areas]) => ({
    name,
    title: ws.people.find((p) => p.name === name)?.title ?? "",
    about: [...areas],
  }));

  // continuation plan
  const hist = new Set(vClaims.filter((c) => isHistorical(ws, c)).map((c) => c.id));
  const active = visible.filter((c) => !c.superseded && !hist.has(c.id));
  const day1: PlanItem[] = [];
  const week1: PlanItem[] = [];
  const month1: PlanItem[] = [];
  const crit = active.filter((c) => c.critical);
  const dec = active.filter((c) => c.type === "decision");
  if (dec.length) day1.push({ text: `Read the ${dec.length} key decision${dec.length > 1 ? "s" : ""} and their sources (≈${Math.max(5, dec.length * 2)} min)` });
  if (crit.length) day1.push({ text: `Acknowledge the ${crit.length} critical item${crit.length > 1 ? "s" : ""} marked below` });
  for (const c of active.filter((c) => c.area === "Accounts & domains" && ["risk", "next_action", "dependency"].includes(c.type)).slice(0, 2))
    day1.push({ text: `Access: ${c.text}`, claimId: c.id, due: c.due });
  for (const c of active.filter((c) => (c.type === "blocker" || c.type === "next_action") && (soon(c.due, 21) || !c.due) && c.area !== "Accounts & domains").slice(0, 5))
    week1.push({ text: c.text, claimId: c.id, due: c.due });
  for (const c of visible.filter((c) => c.superseded).slice(0, 2)) week1.push({ text: `Update outdated record: "${c.text.slice(0, 80)}" has been superseded`, claimId: c.id });
  for (const c of active.filter((c) => (c.type === "dependency" || c.type === "risk") && c.area !== "Accounts & domains").slice(0, 6))
    month1.push({ text: c.text, claimId: c.id, due: c.due });
  if (unknowns.length) month1.push({ text: `Close the ${unknowns.length} open unknown${unknowns.length > 1 ? "s" : ""} listed in this handover` });

  return {
    project: ws.project.name,
    recipient: { name: personName(ws, recipientId), role: role.label },
    leaver: personName(ws, ws.leaverId),
    lastDay: ws.lastDay,
    version: { n: version.n, hash: version.hash, approvedBy: version.approvedBy, at: version.at },
    readiness: version.readiness,
    claims: visible,
    sealed,
    hiddenCount,
    unknowns,
    people,
    plan: { day1, week1, month1 },
    generatedAt: new Date().toISOString(),
  };
}

/* ---------------- Demo ---------------- */

export async function buildDemo(): Promise<Workspace> {
  const ws = demoBase();
  for (const m of DEMO_MANIFEST) addSource(ws, parseFile(m.file, demoFile(m.file)), { acl: m.acl, sensitivity: m.sensitivity, uri: m.uri }, "Demo loader");
  await runPipeline(ws, { useAI: false, actor: "Demo loader" });
  return ws;
}

export function summary(ws: Workspace) {
  return { readiness: readiness(ws) };
}
