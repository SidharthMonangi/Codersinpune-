// Core domain model for Baton. Everything a handover contains is derived from EvidenceUnits.

export type Sensitivity = 0 | 1 | 2 | 3; // public, internal, confidential, restricted
export const SENSITIVITY_LABEL = ["Public", "Internal", "Confidential", "Restricted"] as const;

export type SourceKind = "chat" | "github" | "doc" | "transcript" | "tasks" | "attestation";

export interface Person {
  id: string;
  name: string;
  aliases: string[]; // handles / logins that map to this person
  title: string;
}

export interface RoleDef {
  id: string;
  label: string;
  groups: string[]; // access groups this role belongs to
  clearance: Sensitivity;
}

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  uri: string;
  acl: string[]; // groups allowed to read
  sensitivity: Sensitivity;
  addedAt: string;
  units: number;
  redactions: number;
}

export interface EvidenceUnit {
  id: string;
  sourceId: string;
  text: string; // already redacted
  author: string; // person id or raw name
  ts: string; // ISO
  locator: string; // e.g. "#backend · 20 Aug", "PR #142", "12:41"
  uri: string;
  acl: string[];
  sensitivity: Sensitivity;
  area: string;
}

export type ClaimType =
  | "decision"
  | "ownership"
  | "open_question"
  | "risk"
  | "dependency"
  | "blocker"
  | "next_action"
  | "contact";

export const CLAIM_TYPES: { id: ClaimType; label: string; plural: string }[] = [
  { id: "decision", label: "Decision", plural: "Decisions" },
  { id: "risk", label: "Risk", plural: "Risks" },
  { id: "blocker", label: "Blocker / recurring problem", plural: "Blockers & recurring problems" },
  { id: "dependency", label: "Dependency", plural: "Dependencies" },
  { id: "next_action", label: "Next action", plural: "Next actions" },
  { id: "ownership", label: "Ownership", plural: "Ownership" },
  { id: "open_question", label: "Open question", plural: "Open questions" },
  { id: "contact", label: "Contact", plural: "Contacts" },
];

export type Trust = "verified" | "inferred" | "conflicting" | "unsupported" | "attested";

export interface EvidenceLink {
  evidenceId: string;
  relation: "supports" | "contradicts";
  score: number; // verifier score 0..1
}

export interface Claim {
  id: string;
  type: ClaimType;
  text: string;
  owner?: string; // person id
  due?: string; // ISO date
  area: string;
  evidence: EvidenceLink[];
  trust: Trust;
  confidence: number;
  origin: "ai" | "rules" | "human";
  sensitivity: Sensitivity;
  supersededBy?: string;
  conflictWith?: string[];
  status: "pending" | "accepted" | "edited" | "rejected";
  reviewNote?: string;
  rationale?: boolean; // decision has a recorded reason
}

export type GapKind =
  | "no_rationale"
  | "no_owner"
  | "conflict"
  | "unmitigated_risk"
  | "sole_knower"
  | "unanswered_question";

export interface Gap {
  id: string;
  kind: GapKind;
  area: string;
  question: string;
  why: string;
  risk: number; // 0..1
  sole: number; // sole-knower index of area 0..1
  claimIds: string[];
  evidenceIds: string[];
  status: "open" | "answered" | "dont_know" | "skipped" | "reassigned";
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  reassignedTo?: string;
}

export interface AuditEvent {
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface Version {
  id: string;
  n: number;
  hash: string;
  approvedBy: string;
  at: string;
  claimCount: number;
  readiness: number;
  claims: Claim[];
  gaps: Gap[];
}

export interface Recipient {
  personId: string;
  roleId: string;
}

export interface ShareRef {
  token: string;
  recipientId: string;
  roleId: string;
  versionN: number;
  createdAt: string;
}

export interface Workspace {
  schema: 1;
  project: { name: string; description: string };
  people: Person[];
  roles: RoleDef[];
  groups: { id: string; label: string; owner: string }[];
  leaverId: string | null;
  lastDay: string | null;
  recipients: Recipient[];
  sources: Source[];
  evidence: EvidenceUnit[];
  claims: Claim[];
  gaps: Gap[];
  versions: Version[];
  shares: ShareRef[];
  audit: AuditEvent[];
  engine: { mode: "ai" | "rules"; model?: string; lastRunAt?: string; note?: string };
  demo: boolean;
}

// What a recipient receives. Built server-side; never contains sealed content.
export interface CompiledClaim {
  id: string;
  type: ClaimType;
  text: string;
  trust: Trust;
  owner?: string;
  due?: string;
  area: string;
  critical: boolean;
  superseded?: boolean;
  ownerLeaving?: boolean;
  citations: { evidenceId: string; locator: string; source: string; excerpt: string; uri: string; relation: string }[];
}

export interface SealedItem {
  type: ClaimType;
  area: string;
  requestFrom: string;
  hidden: boolean; // restricted beyond clearance: show only as a count
}

export interface CompiledHandover {
  project: string;
  recipient: { name: string; role: string };
  leaver: string;
  lastDay: string | null;
  version: { n: number; hash: string; approvedBy: string; at: string };
  readiness: number;
  claims: CompiledClaim[];
  sealed: SealedItem[];
  hiddenCount: number;
  unknowns: { question: string; area: string; routedTo?: string }[];
  people: { name: string; title: string; about: string[] }[];
  plan: { day1: PlanItem[]; week1: PlanItem[]; month1: PlanItem[] };
  generatedAt: string;
}

export interface PlanItem {
  text: string;
  claimId?: string;
  due?: string;
}
