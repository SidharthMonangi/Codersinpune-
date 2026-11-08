// Lightweight topic classifier so claims and evidence can be grouped into "areas"
// (used for the Sole-Knower Index and for grouping in the handover).
const AREAS: { area: string; re: RegExp }[] = [
  { area: "Payments", re: /\b(payment|razorpay|stripe|refund|webhook|upi|charge|kyc)/i },
  { area: "Auth & SSO", re: /\b(sso|login|auth|certificate|saml)/i },
  { area: "CI & deploys", re: /\b(deploy|ci\b|github actions|runner|pipeline|release)/i },
  { area: "Database", re: /\b(database|postgres|supabase|firebase|mongodb|migration|schema|seed)/i },
  { area: "Notifications", re: /\b(notification|onesignal|reminder|email service)/i },
  { area: "Check-in", re: /\b(check-?in|qr|nfc|scanner|wristband)/i },
  { area: "Sponsors & finance", re: /\b(sponsor|nimbus|budget|instalment|invoice|amount|usage report)/i },
  { area: "Accounts & domains", re: /\b(domain|registrar|vercel|account|ownership|admin access)/i },
  { area: "Frontend & design", re: /\b(ui\b|layout|design|poster|tailwind|frontend|mobile|image|cloudinary)/i },
  { area: "Event logistics", re: /\b(fest|auditorium|registration cap|capacity|code freeze|volunteer)/i },
];

export function classifyArea(text: string, hint?: string): string {
  const t = `${hint ?? ""} ${text}`;
  for (const a of AREAS) if (a.re.test(t)) return a.area;
  return "General";
}
