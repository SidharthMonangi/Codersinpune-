import { NextResponse } from "next/server";
import { ackShare, getShare } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const share = await getShare(token);
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const claimId = String(body.claimId || "");
  if (!share.compiled.claims.some((c) => c.id === claimId) && claimId !== "__all__") return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  const acks = await ackShare(token, claimId, String(body.note || "").slice(0, 500));
  return NextResponse.json({ acks });
}
