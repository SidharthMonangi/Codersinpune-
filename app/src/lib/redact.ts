import type { Sensitivity } from "./types";

// Redaction gate: runs on every unit BEFORE any model sees text or anything is stored.
const RULES: { name: string; re: RegExp }[] = [
  { name: "secret-key", re: /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g },
  { name: "aws-key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: "google-key", re: /\bAIza[0-9A-Za-z_\-]{30,}\b/g },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/g },
  { name: "password", re: /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi },
  { name: "phone", re: /(\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g },
  { name: "aadhaar", re: /\b\d{4}\s\d{4}\s\d{4}\b/g },
  { name: "pan", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { name: "card", re: /\b(?:\d[ -]?){13,16}\b/g },
  { name: "high-entropy", re: /\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]{32,}\b/g },
];

export function redact(text: string): { text: string; count: number; kinds: string[] } {
  let out = text;
  let count = 0;
  const kinds: string[] = [];
  for (const r of RULES) {
    out = out.replace(r.re, () => {
      count++;
      if (!kinds.includes(r.name)) kinds.push(r.name);
      return `[REDACTED:${r.name}]`;
    });
  }
  return { text: out, count, kinds };
}

// Suggests a sensitivity level for a unit; the admin's source label is the floor.
const CONFIDENTIAL = /\b(rs\.?|inr|₹)\s?[\d,]{4,}|\b(salary|budget|sponsorship amount|instalment|invoice|contract|kyc|bank|merchant)\b/i;
const RESTRICTED = /\b(medical|health|disciplinary|harass|welfare|leave due to|diagnos)/i;

export function suggestSensitivity(text: string, floor: Sensitivity): Sensitivity {
  let s: Sensitivity = floor;
  if (CONFIDENTIAL.test(text) && s < 2) s = 2;
  if (RESTRICTED.test(text)) s = 3;
  return s;
}
