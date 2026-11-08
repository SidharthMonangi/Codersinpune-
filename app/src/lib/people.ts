import type { Person, Workspace } from "./types";
import { uid } from "./util";

const norm = (s: string) => s.toLowerCase().replace(/^(dr|mr|ms|mrs)\.?\s+/, "").replace(/[^a-z]/g, "");

export function findPerson(people: Person[], raw: string): Person | undefined {
  const n = norm(raw);
  if (!n) return undefined;
  return people.find((p) => [p.name, ...p.aliases].some((a) => norm(a) === n));
}

/** Resolve an author string to a person id, creating a person if needed. */
export function resolvePerson(ws: Workspace, raw: string): string {
  if (!raw || ["document", "board", "sheet", "unknown", "speaker"].includes(raw.toLowerCase())) return raw;
  const p = findPerson(ws.people, raw);
  if (p) return p.id;
  const name = raw.includes("-") && !raw.includes(" ") ? raw.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") : raw;
  const byName = findPerson(ws.people, name);
  if (byName) {
    byName.aliases.push(raw);
    return byName.id;
  }
  const np: Person = { id: uid("p_"), name, aliases: [raw], title: "Member" };
  ws.people.push(np);
  return np.id;
}

export function personName(ws: Pick<Workspace, "people">, id?: string | null): string {
  if (!id) return "";
  return ws.people.find((p) => p.id === id)?.name ?? id;
}

/** Find people mentioned by first name or full name inside a text. */
export function mentionedPeople(people: Person[], text: string): Person[] {
  const found: { p: Person; i: number }[] = [];
  for (const p of people) {
    const first = p.name.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/, "").split(" ")[0];
    const re = new RegExp(`\\b(${escapeRe(p.name)}|${escapeRe(first)})\\b`, "i");
    const m = first.length > 2 ? re.exec(text) : null;
    if (m) found.push({ p, i: m.index });
  }
  return found.sort((a, b) => a.i - b.i).map((f) => f.p);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
