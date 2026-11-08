// AI path with a stubbed Gemini endpoint: checks the guard-rails around model output, not the model itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDemo, runPipeline, approve, compile } from "../src/lib/ops";

function stubGemini(handler: (body: any) => unknown) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    if (String(url).includes("generativelanguage.googleapis.com")) {
      const body = JSON.parse(init.body);
      const out = handler(JSON.parse(body.contents[0].parts[0].text));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }), { status: 200 });
    }
    return real(url, init);
  }) as typeof fetch;
  return () => (globalThis.fetch = real);
}

test("AI claims must cite real evidence; invented ids are dropped; verifier scores drive trust", async () => {
  process.env.GEMINI_API_KEY = "test";
  const ws = await buildDemo();
  const restore = stubGemini((input) => {
    if (input.evidence) {
      const leads = input.evidence.find((e: any) => /1,20,000/.test(e.text));
      return {
        claims: [
          { type: "decision", text: "Backend moved from Firebase to Supabase", evidence_ids: [input.evidence[2].id], has_rationale: true },
          { type: "risk", text: "Invented claim with a fake citation", evidence_ids: ["ev_doesnotexist"] },
          ...(leads ? [{ type: "dependency", text: "Nimbus Labs sponsorship of Rs 1,20,000 is paid in two instalments", evidence_ids: [leads.id] }] : []),
        ],
      };
    }
    return { results: input.pairs.map((p: any) => ({ pair: p.pair, label: "supports", score: 0.9 })) };
  });
  try {
    await runPipeline(ws, { useAI: true });
  } finally {
    restore();
    delete process.env.GEMINI_API_KEY;
  }
  assert.equal(ws.engine.mode, "ai");
  assert.ok(!ws.claims.some((c) => c.text.includes("Invented claim")), "claim with fake citation must be dropped");
  assert.ok(ws.claims.some((c) => c.origin === "ai"));
  await approve(ws, "Dr. Anjali Kulkarni");
  const vol = JSON.stringify(compile(ws, 1, "p_rohan", "volunteer"));
  assert.equal(vol.includes("1,20,000"), false, "AI-written claim from the leads channel leaked to volunteer");
});

test("AI failure falls back to the rule engine and says so", async () => {
  process.env.GEMINI_API_KEY = "test";
  const ws = await buildDemo();
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;
  try {
    await runPipeline(ws, { useAI: true });
  } finally {
    globalThis.fetch = real;
    delete process.env.GEMINI_API_KEY;
  }
  assert.equal(ws.engine.mode, "rules");
  assert.match(ws.engine.note ?? "", /rate limit/i);
  assert.ok(ws.claims.length > 20);
});
