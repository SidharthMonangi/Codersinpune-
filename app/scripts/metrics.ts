import { buildDemo, approve, compile } from "../src/lib/ops";
import { readFileSync } from "node:fs";
(async () => {
  const key = JSON.parse(readFileSync("data/orion/answer-key.json", "utf8"));
  const t0 = Date.now();
  const ws = await buildDemo();
  const ms = Date.now() - t0;
  const by = (f: (c: any) => boolean) => ws.claims.filter(f).length;
  const low = (s: string) => s.toLowerCase();
  const dec = key.decisions.filter((d: string) => ws.claims.some((c) => c.type === "decision" && low(c.text).includes(d))).length;
  const sup = key.superseded.filter((d: string) => ws.claims.some((c) => c.supersededBy && low(c.text).includes(d))).length;
  const qs = ws.gaps.map((g) => low(g.question)).join("\n");
  const gaps = key.gaps.filter((g: string) => qs.includes(g)).length;
  await approve(ws, "x");
  const views = ws.recipients.map((r) => { const h = compile(ws, 1, r.personId, r.roleId); return `${r.roleId}: visible ${h.claims.length}, sealed ${h.sealed.length}, withheld ${h.hiddenCount}`; });
  let leaks = 0, checks = 0;
  for (const item of key.confidential) for (const role of item.mustNotReach) { checks++; const rec = ws.recipients.find((r) => r.roleId === role) ?? { personId: "p_arjun" }; if (JSON.stringify(compile(ws, 1, rec.personId, role)).includes(item.marker)) leaks++; }
  console.log(JSON.stringify({ ms, sources: ws.sources.length, evidence: ws.evidence.length, redactions: ws.sources.reduce((s, x) => s + x.redactions, 0), claims: ws.claims.length, active: by((c) => !c.supersededBy), superseded: by((c) => !!c.supersededBy), verified: by((c) => c.trust === "verified"), inferred: by((c) => c.trust === "inferred"), conflicting: by((c) => c.trust === "conflicting"), gaps: ws.gaps.length, dec: `${dec}/${key.decisions.length}`, sup: `${sup}/${key.superseded.length}`, gapsHit: `${gaps}/${key.gaps.length}`, leaks: `${leaks}/${checks}`, views }, null, 1));
})();
