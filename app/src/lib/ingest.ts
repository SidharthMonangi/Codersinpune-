import type { EvidenceUnit, Sensitivity, Source, SourceKind } from "./types";
import { redact, suggestSensitivity } from "./redact";
import { classifyArea } from "./areas";
import { shortDate, uid } from "./util";

export interface RawUnit {
  text: string;
  author: string;
  ts: string;
  locator: string;
  uri?: string;
  areaHint?: string;
}

export interface ParsedSource {
  kind: SourceKind;
  title: string;
  units: RawUnit[];
}

export interface IngestOptions {
  acl: string[];
  sensitivity: Sensitivity;
  uri?: string;
}

const tsFromEpoch = (s: string | number) => new Date(Number(s) * 1000).toISOString();

export function parseFile(name: string, content: string): ParsedSource {
  const lower = name.toLowerCase();
  const base = name.replace(/\.[^.]+$/, "");
  if (lower.endsWith(".json")) {
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      throw new Error(`${name}: not valid JSON`);
    }
    if (Array.isArray(data)) return parseSlack(base, data);
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (Array.isArray(o.messages)) return parseDiscord(base, o);
      if (Array.isArray(o.issues) || Array.isArray(o.commits)) return parseGitHubExport(o);
    }
    throw new Error(`${name}: unrecognised JSON (expected a Slack export, Discord export or GitHub export)`);
  }
  if (lower.endsWith(".vtt")) return parseVtt(base, content);
  if (lower.endsWith(".csv")) return parseCsv(base, content);
  if (/\.(md|markdown|txt)$/.test(lower)) return parseDoc(name, content);
  throw new Error(`${name}: unsupported file type. Use .json (Slack/Discord/GitHub export), .md, .txt, .vtt or .csv`);
}

function parseSlack(channel: string, msgs: unknown[]): ParsedSource {
  const units: RawUnit[] = [];
  for (const m of msgs as Record<string, any>[]) {
    const text = String(m.text ?? "").trim();
    if (!text || m.subtype === "channel_join") continue;
    const author = m.user_profile?.real_name ?? m.user_name ?? m.user ?? "Unknown";
    const ts = m.ts ? tsFromEpoch(m.ts) : new Date().toISOString();
    units.push({ text, author, ts, locator: `#${channel} · ${shortDate(ts)}` });
  }
  return { kind: "chat", title: `Chat: #${channel}`, units };
}

function parseDiscord(channel: string, o: Record<string, any>): ParsedSource {
  const name = o.channel?.name ?? channel;
  const units: RawUnit[] = [];
  for (const m of o.messages as Record<string, any>[]) {
    const text = String(m.content ?? "").trim();
    if (!text) continue;
    const ts = m.timestamp ?? new Date().toISOString();
    units.push({ text, author: m.author?.nickname ?? m.author?.name ?? "Unknown", ts, locator: `#${name} · ${shortDate(ts)}` });
  }
  return { kind: "chat", title: `Chat: #${name}`, units };
}

export function parseGitHubExport(o: Record<string, any>): ParsedSource {
  const repo = String(o.repo ?? "repository");
  const units: RawUnit[] = [];
  for (const i of (o.issues ?? []) as Record<string, any>[]) {
    const isPr = !!i.pull_request;
    const state = isPr ? (i.pull_request.merged_at ? "merged" : i.state === "open" ? "open" : "closed") : i.state;
    const labels = (i.labels ?? []).map((l: any) => l.name).join(", ");
    const assignee = i.assignee?.login ? ` Assigned to ${i.assignee.login}.` : "";
    const text = `${isPr ? "PR" : "Issue"} #${i.number} (${state}): ${i.title}. ${String(i.body ?? "").slice(0, 600)}${assignee}`.trim();
    units.push({
      text,
      author: i.user?.login ?? "unknown",
      ts: i.created_at,
      locator: `${isPr ? "PR" : "Issue"} #${i.number}`,
      uri: i.html_url ?? `https://github.com/${repo}/${isPr ? "pull" : "issues"}/${i.number}`,
      areaHint: labels,
    });
    for (const c of (i.comments_list ?? []) as Record<string, any>[]) {
      units.push({ text: `Comment on #${i.number}: ${c.body}`, author: c.user?.login ?? "unknown", ts: c.created_at, locator: `#${i.number} comment`, uri: c.html_url, areaHint: labels });
    }
  }
  for (const c of (o.commits ?? []) as Record<string, any>[]) {
    const msg = String(c.commit?.message ?? "").split("\n")[0];
    units.push({
      text: `Commit ${String(c.sha).slice(0, 7)}: ${msg}`,
      author: c.commit?.author?.name ?? c.author?.login ?? "unknown",
      ts: c.commit?.author?.date ?? new Date().toISOString(),
      locator: `commit ${String(c.sha).slice(0, 7)}`,
      uri: c.html_url ?? `https://github.com/${repo}/commit/${c.sha}`,
    });
  }
  return { kind: "github", title: `GitHub: ${repo}`, units };
}

function parseVtt(base: string, content: string): ParsedSource {
  const units: RawUnit[] = [];
  const dateMatch = base.match(/(\d{4}-\d{2}-\d{2})/);
  const day = dateMatch ? new Date(dateMatch[1] + "T10:00:00+05:30").toISOString() : new Date().toISOString();
  const blocks = content.replace(/\r/g, "").split(/\n\n+/);
  for (const b of blocks) {
    const lines = b.split("\n").filter(Boolean);
    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx < 0) continue;
    const start = lines[timeIdx].split("-->")[0].trim().replace(/^00:/, "").replace(/\.\d+$/, "");
    const body = lines.slice(timeIdx + 1).join(" ");
    const v = body.match(/^<v ([^>]+)>(.*)$/);
    const m = body.match(/^([A-Z][\w. ]{1,40}):\s(.*)$/);
    const author = v ? v[1] : m ? m[1] : "Speaker";
    const text = (v ? v[2] : m ? m[2] : body).replace(/<[^>]+>/g, "").trim();
    if (text) units.push({ text, author, ts: day, locator: `${base} @ ${start}` });
  }
  return { kind: "transcript", title: `Meeting: ${base}`, units };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(base: string, content: string): ParsedSource {
  const lines = content.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { kind: "tasks", title: `Board: ${base}`, units: [] };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const cTitle = col("card", "title", "summary", "name", "item", "task");
  const cStatus = col("list", "status", "state");
  const cOwner = col("member", "assignee", "owner");
  const cDue = col("due");
  const isTasks = cStatus >= 0 || cDue >= 0;
  const units: RawUnit[] = [];
  lines.slice(1).forEach((l, idx) => {
    const r = splitCsvLine(l);
    if (isTasks && cTitle >= 0) {
      const status = cStatus >= 0 ? r[cStatus] : "";
      const owner = cOwner >= 0 ? r[cOwner] : "";
      const due = cDue >= 0 ? r[cDue] : "";
      const text = `Task "${r[cTitle]}" is ${status || "open"}${owner ? `, assigned to ${owner}` : ", with no assignee"}${due ? `, due ${due}` : ""}.`;
      units.push({ text, author: owner || "board", ts: new Date().toISOString(), locator: `${base} row ${idx + 2}`, areaHint: r.join(" ") });
    } else {
      const text = `${r[0]}: ` + header.slice(1).map((h, i) => `${h} ${r[i + 1] ?? ""}`).join("; ");
      units.push({ text, author: "sheet", ts: new Date().toISOString(), locator: `${base} row ${idx + 2}` });
    }
  });
  return { kind: isTasks ? "tasks" : "doc", title: `${isTasks ? "Board" : "Sheet"}: ${base}`, units };
}

function parseDoc(name: string, content: string): ParsedSource {
  const units: RawUnit[] = [];
  const dm = content.match(/\((January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\)/);
  // undated documents are treated as the oldest record (docs usually lag behind chat and code)
  const ts = dm ? new Date(`${dm[1]} 1, ${dm[2]}`).toISOString() : new Date(0).toISOString();
  let heading = "";
  const lines = content.replace(/\r/g, "").split("\n");
  let para: string[] = [];
  let startLine = 0;
  const flush = (lineNo: number) => {
    const text = para.join(" ").trim();
    if (text) units.push({ text, author: "document", ts, locator: `${name}${heading ? ` § ${heading}` : ""} (line ${startLine + 1})`, areaHint: heading });
    para = [];
    startLine = lineNo;
  };
  lines.forEach((l, i) => {
    const h = l.match(/^#{1,6}\s+(.*)/);
    if (h) { flush(i + 1); heading = h[1].trim(); return; }
    if (!l.trim()) { flush(i + 1); return; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) { flush(i); para.push(l.replace(/^\s*([-*]|\d+\.)\s+/, "")); flush(i + 1); return; }
    if (!para.length) startLine = i;
    para.push(l.trim());
  });
  flush(lines.length);
  return { kind: "doc", title: `Doc: ${name}`, units };
}

export function toEvidence(parsed: ParsedSource, opts: IngestOptions): { source: Source; units: EvidenceUnit[] } {
  const sourceId = uid("src_");
  let redactions = 0;
  const units: EvidenceUnit[] = parsed.units.map((u) => {
    const r = redact(u.text);
    redactions += r.count;
    return {
      id: uid("ev_"),
      sourceId,
      text: r.text,
      author: u.author,
      ts: u.ts,
      locator: u.locator,
      uri: u.uri ?? opts.uri ?? "",
      acl: opts.acl,
      sensitivity: suggestSensitivity(u.text, opts.sensitivity),
      area: classifyArea(u.text, u.areaHint),
    };
  });
  return {
    source: {
      id: sourceId,
      kind: parsed.kind,
      title: parsed.title,
      uri: opts.uri ?? "",
      acl: opts.acl,
      sensitivity: opts.sensitivity,
      addedAt: new Date().toISOString(),
      units: units.length,
      redactions,
    },
    units,
  };
}

// Live GitHub connector (public repos; optional GITHUB_TOKEN raises rate limits).
export async function fetchGitHub(repoInput: string): Promise<ParsedSource> {
  const m = repoInput.trim().replace(/\.git$/, "").match(/(?:github\.com\/)?([\w.-]+)\/([\w.-]+)\/?$/);
  if (!m) throw new Error("Enter a repository as owner/name or a github.com URL");
  const repo = `${m[1]}/${m[2]}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "baton-handover" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = async (path: string) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers, cache: "no-store" });
    if (r.status === 404) throw new Error(`Repository ${repo} not found or not public`);
    if (r.status === 403 || r.status === 429) throw new Error("GitHub's rate limit for this server has been reached. Try again in a few minutes, or upload a GitHub export (.json) instead.");
    if (r.status === 401) throw new Error("GitHub refused the request (authentication). Try again shortly, or upload a GitHub export (.json) instead.");
    if (!r.ok) throw new Error(`GitHub returned ${r.status}`);
    return r.json();
  };
  const [issues, commits] = await Promise.all([get("/issues?state=all&per_page=60&sort=updated"), get("/commits?per_page=60")]);
  return parseGitHubExport({ repo, issues, commits });
}
