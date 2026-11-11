# Round 2 submission: ready-to-paste answers

**Working project link:** https://baton-handover-sigma.vercel.app

**Source-code repository:** https://github.com/SidharthMonangi/Codersinpune- (branch `round2-build`)

**Updated project PDF:** upload `round2/Baton_Round2_Build.pdf` to Google Drive and set sharing to "Anyone with the link → Viewer".

## List of completed features
1. Handover workspace: private per visitor, no sign-up. Setup for the leaver, last day, recipients and roles. An "Acting as" switch covers admin, leaver and approver.
2. Source ingestion: Slack and Discord exports, GitHub exports, Markdown/TXT docs, meeting transcripts (.vtt), Trello/Jira CSVs, and a live read-only connector for public GitHub repos. Each source has an access list and a sensitivity level.
3. Redaction gate: API keys, passwords, tokens, phone numbers, Aadhaar, PAN and card numbers are removed before storage or any AI call.
4. Evidence Ledger: 8 claim types (decision, ownership, risk, dependency, blocker, next action, contact, open question), each linked to its exact source items.
5. Verifier and trust states: Verified, Inferred, Conflicting, Attested. Claims with no supporting source are dropped.
6. Decision timeline, ownership map and Conflicts view. Reversed decisions are marked superseded.
7. Gap Interview: up to 15 questions ranked by risk (Sole-Knower Index and urgency). Answers become attested evidence.
8. Review and approval: accept, edit or reject per claim; hashed, frozen versions; audit log.
9. Role-based handovers with Sealed Claims, built on the server per reader: Day 1 / Week 1 / Month 1 plan, people to talk to, known unknowns, acknowledgements, and a side-by-side role comparison.
10. Live Readiness Score and a team knowledge radar showing where each member is the only person who knows an area.
11. 10 automated tests (leakage, redaction, conflicts, gaps, AI guard-rails) running in GitHub Actions CI.

## Technology and implementation details
Next.js 15 + TypeScript (UI and API in one app), Tailwind CSS 4, Supabase Postgres (Row-Level Security with no policies; access only through secret-checked database functions), Vercel (Mumbai region), GitHub REST API connector, and a hybrid AI engine: the rule engine for coverage, plus Google Gemini (free tier) for implicit knowledge and wording, plus an independent Gemini verifier for every evidence link. It is live, uses 2 requests and about 20 s per run, and falls back to rules when the quota runs out.

Each recipient's handover is compiled on the server from the approved version. A claim is shown only if the reader can open at least one of its sources, those sources alone still support it, and its sensitivity is within the reader's clearance. Otherwise it is sealed. Demo data is a synthetic project with a planted answer key: 6/6 decisions, 3/3 reversals and 2/2 conflicts detected, and 0 leaks across 20 permission checks.

## Changes made to the original plan
- One Next.js app instead of Next.js + FastAPI + Redis: faster for a solo 72-hour build, and one deploy.
- A hybrid of the Gemini free tier and a rule engine instead of the Claude API: zero cost, and the app keeps working when the free quota runs out.
- A regex and entropy redaction gate instead of Microsoft Presidio: no separate Python service needed.
- No-sign-up workspaces and secure share links instead of OAuth: the Round 2 rules require judges to use the product without signing in. Sign-in moves to Round 3.
- The team knowledge radar was pulled forward from future scope to match the "capture while work happens" goal.

## Three major improvements for Round 3
1. **Ask Baton.** Evidence-grounded Q&A for the incoming person. Answers come only from the approved handover and the reader's permitted sources, with citations. When the evidence isn't there, it says "not in evidence" and routes the question to the owner, whose reply becomes attested knowledge.
2. **Living handover.** Live Slack/Discord and GitHub connections with incremental sync and drift detection. The handover updates while the work happens and alerts the owner when an approved version goes stale.
3. **Verified identity and mirrored permissions.** Google/GitHub sign-in for every role. Share links also require the recipient's identity. Access lists are imported automatically from GitHub collaborators and Slack channel membership and re-checked at compile time.
