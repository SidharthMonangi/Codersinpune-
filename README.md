# Baton: hand over the work, not just the files

**Live demo:** https://baton-handover-sigma.vercel.app (no sign-up; click **Try the live demo**)
**Team:** leisure (solo: Sidharth Monangi) · CodersInPune: Knowledge Handover Challenge, Round 2

When someone leaves a project, the documents stay but the reasoning leaves with them: why decisions were made, what is half-done, who to call, where the risk sits.
Baton rebuilds that from **authorised sources** and turns it into a **reviewed, role-specific handover** in which every statement links to its evidence.

## The 2-minute judge walkthrough

1. Open the live demo and choose **Open the Project Orion demo**. This is a synthetic student-club project: Priya (tech lead) leaves on 30 Nov and Arjun takes over.
2. **Reconstruct & verify:** click any grey citation chip to see the exact source item, with shared words highlighted. Open **Conflicts** to see reversed decisions (MongoDB → Postgres, OneSignal → email) and unresolved disagreements (fest date 14 vs 15 Dec, registration cap 800 vs 1000).
3. **Gap Interview:** switch *Acting as* to **Priya Nair (leaver)** and answer a question. The answer becomes **ATTESTED** evidence and the Readiness Score goes up.
4. **Review & approve:** switch to **Dr. Anjali Kulkarni (approver)**, accept or edit claims, then approve. The version is hashed and frozen.
5. **Handover:** compare **Arjun (Tech Lead)** with **Rohan (Volunteer)** side by side. Rohan sees 🔒 sealed placeholders instead of finance, HR and leads-channel content. Create the links and open one to see the recipient's view: a Day 1 / Week 1 / Month 1 plan, people to talk to, known unknowns, and acknowledgements.

You can also bring your own data: start an empty workspace and upload a Slack or Discord export, Markdown docs, `.vtt` transcripts or a Trello/Jira CSV, or connect any public GitHub repo. Sample files are linked on the Connect tab.

## What makes it different from a summariser

| | |
|---|---|
| **Evidence Ledger** | The handover is made of small typed claims (decision, ownership, risk, dependency, blocker, next action, contact, open question). Each points to exact evidence items and carries a trust state: Verified, Inferred, Conflicting, Attested or Sealed. Claims that no source supports are dropped. |
| **Gap Interview** | Baton detects what the sources *can't* explain: decisions without a reason, work without an owner, contradictions, risks without mitigation, and areas where the leaver is the **sole knower**. It asks the leaver a short list of questions ranked by risk. |
| **Sealed Claims** | Each reader's handover is rebuilt on the server from only the sources that reader can open, and re-verified on that subset. Restricted items appear as a lock with no content, or are withheld entirely. |
| **Team knowledge radar** | The Sole-Knower Index is computed for *every* member while the work happens, so you can see knowledge risk before anyone resigns. |

## Architecture

```
Sources ─► Parsers (Slack/Discord/GitHub/MD/VTT/CSV) ─► Redaction gate (secrets, phone, Aadhaar, PAN, cards)
        ─► Evidence units {text, author, time, locator, ACL, sensitivity, area}
        ─► Extraction (Gemini JSON-schema output, or rule engine) ─► Resolver (merge, supersede, conflicts)
        ─► Verifier (separate per-link check) ─► Trust states ─► Gap engine + Sole-Knower Index + Readiness
        ─► Gap Interview (attested evidence) ─► Review (accept/edit/reject, hashed versions, audit log)
        ─► Per-reader compile (visibility rule + sealed claims) ─► Share link ─► Recipient view + acknowledgements
```

**Visibility rule** (`app/src/lib/ops.ts → visibility`): reader *r* sees claim *c* only if (a) *r* can open at least one supporting source, (b) those sources alone still support *c*, and (c) *c*'s text is within *r*'s clearance. Otherwise the claim is sealed, or withheld if it is restricted.

**Storage** (Supabase Postgres): the tables have Row-Level Security with **no policies**, so the public key can only call `SECURITY DEFINER` functions. Those functions check a per-workspace secret (stored as a SHA-256 hash) or a 28-character share token. Recipients can only read already-filtered handovers.

**Scores**
- `SKI(area) = Σ w(e)·[author(e)=leaver] / Σ w(e)`, with a recency weight `w = e^(−age/90 days)`
- `gap risk = base(kind) × (0.6 + 0.4·SKI(area)) × urgency`
- `Readiness = 100 × (0.7 × risk-weighted share of gaps answered or routed + 0.3 × share of claims reviewed)`

## Tech stack

Next.js 15 (App Router, TypeScript), Tailwind CSS 4, Supabase Postgres (RLS + RPC functions), Google Gemini API (free tier, hybrid with the rule engine: "✦ Re-run with Gemini AI" on the Overview tab), Vercel (Mumbai region), Node test runner + tsx, GitHub Actions.

## Run locally

```bash
cd app
npm install
npm test          # leakage, redaction and engine tests on the Orion answer key
npm run dev       # http://localhost:3000
```

Optional environment variables:
- `GEMINI_API_KEY`: enables hybrid AI extraction and AI verification. Without it, the rule engine is used and labelled as such.
- `GEMINI_MODEL`: optional; defaults to `gemini-flash-latest`, falling back to flash-lite models when rate-limited.
- `GITHUB_TOKEN`: raises GitHub API rate limits for the repo connector.
- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`: storage. `BATON_STORE=memory` keeps everything in memory for offline development.

## Tests

`app/tests/leakage.test.ts` runs against the planted ground truth in `app/data/orion/answer-key.json`:
- No confidential marker (sponsorship amount, welfare note, staging password, phone number) reaches a role without clearance, and cleared roles still see them.
- Secrets and PII are redacted before storage.
- Planted decisions, reversals and conflicts are detected.
- Unowned work and sole-knower areas become Gap Interview questions.
- Attested answers inherit the strictest access of the evidence they answer.
- Every shared claim carries at least one citation the reader can open.

## Honest limitations

- Baton can only rebuild what was recorded somewhere, or what someone attests to. It flags missing knowledge instead of guessing.
- The rule engine (used when no AI key is configured) is precise on clear statements but misses implicit ones. The AI engine paraphrases better but is limited by the free-tier rate.
- Access lists for uploaded exports are set by the uploader. Live connectors would mirror source permissions automatically (Round 3).

## Disclosure

Built during the official Round 2 window (8–11 Nov 2026), with AI coding assistance (Claude) as permitted by the rules. All demo data is synthetic. The open-source libraries used are listed in `app/package.json`. The Round 1 plan is in `round1/`.
