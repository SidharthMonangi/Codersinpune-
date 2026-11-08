// Leakage and correctness tests on the synthetic Project Orion dataset (answer key: data/orion/answer-key.json).
// A failing leakage test fails the build: no confidential item may reach a role that is not cleared for it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { approve, answerGap, buildDemo, compile } from "../src/lib/ops";
import { redact } from "../src/lib/redact";
import { parseFile } from "../src/lib/ingest";

const key = JSON.parse(readFileSync(new URL("../data/orion/answer-key.json", import.meta.url), "utf8"));

async function approved() {
  const ws = await buildDemo();
  await approve(ws, "Dr. Anjali Kulkarni");
  return ws;
}

test("confidential items never reach roles without clearance", async () => {
  const ws = await approved();
  for (const item of key.confidential) {
    for (const role of item.mustNotReach) {
      const rec = ws.recipients.find((r) => r.roleId === role) ?? { personId: "p_arjun", roleId: role };
      const blob = JSON.stringify(compile(ws, 1, rec.personId, role));
      assert.equal(blob.includes(item.marker), false, `"${item.marker}" leaked to ${role}`);
    }
  }
});

test("cleared roles still see confidential items they are allowed to see", async () => {
  const ws = await approved();
  const faculty = JSON.stringify(compile(ws, 1, "p_kulkarni", "faculty"));
  assert.ok(faculty.includes("120000"), "faculty should see the sponsorship amount");
  assert.ok(faculty.includes("medical"), "faculty should see the welfare note");
});

test("secrets and PII are redacted before storage", async () => {
  const ws = await buildDemo();
  const all = JSON.stringify(ws.evidence);
  for (const s of key.secrets) assert.equal(all.includes(s), false, `secret ${s} stored unredacted`);
  assert.match(redact("call me on +91 98220 41376").text, /REDACTED:phone/);
  assert.match(redact("token ghp_abcdefghijklmnopqrstuvwxyz0123456789AB").text, /REDACTED:github-token/);
});

test("planted decisions, reversals and conflicts are detected", async () => {
  const ws = await buildDemo();
  const text = (c: { text: string }) => c.text.toLowerCase();
  for (const d of key.decisions) assert.ok(ws.claims.some((c) => c.type === "decision" && text(c).includes(d.toLowerCase())), `missing decision: ${d}`);
  for (const s of key.superseded) assert.ok(ws.claims.some((c) => c.supersededBy && text(c).includes(s.toLowerCase())), `not superseded: ${s}`);
  for (const pair of key.conflicts) {
    const a = ws.claims.find((c) => text(c).includes(pair[0].toLowerCase()));
    const b = ws.claims.find((c) => text(c).includes(pair[1].toLowerCase()));
    assert.ok(a && b && (a.conflictWith?.includes(b.id) || b.conflictWith?.includes(a.id)), `conflict not detected: ${pair.join(" vs ")}`);
  }
});

test("unowned work and sole-knower areas become Gap Interview questions", async () => {
  const ws = await buildDemo();
  const qs = ws.gaps.map((g) => g.question.toLowerCase()).join("\n");
  for (const g of key.gaps) assert.ok(qs.includes(g.toLowerCase()), `gap not raised: ${g}`);
});

test("attested answers inherit the strictest access of what they answer", async () => {
  const ws = await buildDemo();
  const g = ws.gaps.find((x) => x.status === "open")!;
  answerGap(ws, g.id, "answer", { answer: "Test answer from the leaver" }, "Priya Nair");
  const att = ws.evidence.find((e) => e.id === `att_${g.id}`)!;
  const linked = g.evidenceIds.map((id) => ws.evidence.find((e) => e.id === id)!).filter(Boolean);
  const minGroups = Math.min(...linked.map((e) => e.acl.length));
  assert.ok(att.acl.length <= minGroups);
  assert.ok(ws.claims.some((c) => c.trust === "attested"));
});

test("parsers reject unsupported files with a clear message", () => {
  assert.throws(() => parseFile("photo.png", "x"), /unsupported file type/);
  assert.throws(() => parseFile("broken.json", "{oops"), /not valid JSON/);
});

test("every shared claim carries at least one citation the reader can open", async () => {
  const ws = await approved();
  for (const r of ws.recipients) {
    const h = compile(ws, 1, r.personId, r.roleId);
    for (const c of h.claims) assert.ok(c.citations.length > 0, `claim without citation: ${c.text}`);
  }
});
