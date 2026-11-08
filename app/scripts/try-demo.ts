import { buildDemo, approve, compile } from "../src/lib/ops";
import { readiness } from "../src/lib/pipeline";
(async () => {
  const ws = await buildDemo();
  console.log("sources", ws.sources.length, "evidence", ws.evidence.length, "redactions", ws.sources.reduce((s, x) => s + x.redactions, 0));
  for (const c of ws.claims) console.log(`[${c.type}|${c.trust}|${c.area}${c.supersededBy ? "|SUPERSEDED" : ""}${c.conflictWith?.length ? "|CONFLICT" : ""}${c.owner ? "|own:" + c.owner : ""}${c.due ? "|due:" + c.due : ""}] ${c.text}  (${c.evidence.length}ev)`);
  console.log("\nGAPS", ws.gaps.length);
  for (const g of ws.gaps) console.log(`  ${g.risk} ${g.kind} [${g.area}] ${g.question.slice(0, 150)}`);
  console.log("readiness", readiness(ws));
  await approve(ws, "Dr. Anjali Kulkarni");
  for (const [p, r] of [["p_arjun", "tech_lead"], ["p_rohan", "volunteer"], ["p_kulkarni", "faculty"]]) {
    const h = compile(ws, 1, p, r);
    const blob = JSON.stringify(h);
    console.log(`\n${r}: visible ${h.claims.length}, sealed ${h.sealed.length}, hidden ${h.hiddenCount}, unknowns ${h.unknowns.length}, people ${h.people.map((x) => x.name).join(", ")}`);
    console.log("  leak checks:", ["120000", "1,20,000", "medical", "98220", "Orion#Fest2026", "KYC"].map((s) => `${s}:${blob.includes(s)}`).join(" "));
    console.log("  plan", JSON.stringify(h.plan).slice(0, 600));
  }
})();
