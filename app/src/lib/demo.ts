import type { Person, RoleDef, Sensitivity, Workspace } from "./types";
import { DEMO_FILES } from "./demo-files.generated";

export const DEFAULT_ROLES: RoleDef[] = [
  { id: "tech_lead", label: "Tech Lead", groups: ["all", "core", "leads"], clearance: 2 },
  { id: "developer", label: "Developer", groups: ["all", "core"], clearance: 1 },
  { id: "volunteer", label: "Volunteer", groups: ["all"], clearance: 1 },
  { id: "treasurer", label: "Treasurer", groups: ["all", "leads", "finance"], clearance: 2 },
  { id: "faculty", label: "Faculty Coordinator", groups: ["all", "core", "leads", "finance", "faculty"], clearance: 3 },
];

export const DEFAULT_GROUPS = [
  { id: "all", label: "Everyone in the club", owner: "Workspace admin" },
  { id: "core", label: "Core developers", owner: "Tech Lead" },
  { id: "leads", label: "Leads channel", owner: "Faculty Coordinator" },
  { id: "finance", label: "Finance", owner: "Treasurer" },
  { id: "faculty", label: "Faculty only", owner: "Faculty Coordinator" },
];

const PEOPLE: Person[] = [
  { id: "p_priya", name: "Priya Nair", aliases: ["priya-nair", "priya"], title: "Tech Lead (leaving 30 Nov)" },
  { id: "p_arjun", name: "Arjun Mehta", aliases: ["arjun-mehta"], title: "Developer → incoming Tech Lead" },
  { id: "p_kabir", name: "Kabir Shah", aliases: ["kabir-shah"], title: "Backend developer" },
  { id: "p_sneha", name: "Sneha Patil", aliases: ["sneha-patil"], title: "Design & frontend" },
  { id: "p_rohan", name: "Rohan Desai", aliases: ["rohan-desai"], title: "First-year volunteer" },
  { id: "p_kulkarni", name: "Dr. Anjali Kulkarni", aliases: ["anjali kulkarni", "kulkarni"], title: "Faculty Coordinator" },
  { id: "p_meera", name: "Meera Iyer", aliases: ["meera-iyer"], title: "Treasurer" },
  { id: "p_deshpande", name: "Mr. Deshpande", aliases: ["deshpande"], title: "College IT cell (external)" },
  { id: "p_farah", name: "Farah", aliases: [], title: "Nimbus Labs dev relations (sponsor)" },
];

/** Each demo file with the access list and sensitivity an admin would set on upload. */
export const DEMO_MANIFEST: { file: string; acl: string[]; sensitivity: Sensitivity; uri: string }[] = [
  { file: "slack-general.json", acl: ["all"], sensitivity: 1, uri: "slack://codecraft/general" },
  { file: "slack-backend.json", acl: ["core", "leads"], sensitivity: 1, uri: "slack://codecraft/backend" },
  { file: "slack-leads.json", acl: ["leads"], sensitivity: 2, uri: "slack://codecraft/leads" },
  { file: "github-export.json", acl: ["core", "leads"], sensitivity: 1, uri: "https://github.com/codecraft-sahyadri/orion" },
  { file: "design.md", acl: ["all"], sensitivity: 1, uri: "drive://orion/design.md" },
  { file: "README.md", acl: ["all"], sensitivity: 0, uri: "https://github.com/codecraft-sahyadri/orion#readme" },
  { file: "sync-2026-08-21.vtt", acl: ["core", "leads"], sensitivity: 1, uri: "meet://orion/sync-2026-08-21" },
  { file: "sync-2026-10-30.vtt", acl: ["core", "leads"], sensitivity: 1, uri: "meet://orion/sync-2026-10-30" },
  { file: "tasks.csv", acl: ["all"], sensitivity: 1, uri: "trello://orion" },
  { file: "budget.csv", acl: ["finance"], sensitivity: 2, uri: "drive://orion/budget.csv" },
  { file: "hr-note.md", acl: ["faculty"], sensitivity: 3, uri: "drive://orion/hr-note.md" },
];

export function demoFile(name: string): string {
  return DEMO_FILES[name];
}

export function emptyWorkspace(): Workspace {
  return {
    schema: 1,
    project: { name: "Untitled project", description: "" },
    people: [],
    roles: structuredClone(DEFAULT_ROLES),
    groups: structuredClone(DEFAULT_GROUPS),
    leaverId: null,
    lastDay: null,
    recipients: [],
    sources: [],
    evidence: [],
    claims: [],
    gaps: [],
    versions: [],
    shares: [],
    audit: [],
    engine: { mode: "rules" },
    demo: false,
  };
}

export function demoBase(): Workspace {
  const ws = emptyWorkspace();
  ws.demo = true;
  ws.project = {
    name: "Project Orion",
    description: "Event app (registrations, payments, check-in) for Orion Fest, run by the CodeCraft student club. Synthetic demo data.",
  };
  ws.people = structuredClone(PEOPLE);
  ws.leaverId = "p_priya";
  ws.lastDay = "2026-11-30";
  ws.recipients = [
    { personId: "p_arjun", roleId: "tech_lead" },
    { personId: "p_rohan", roleId: "volunteer" },
    { personId: "p_kulkarni", roleId: "faculty" },
  ];
  return ws;
}
