import { notFound } from "next/navigation";
import { getShare } from "@/lib/store";
import { RecipientClient } from "./client";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <RecipientClient token={token} h={share.compiled} initialAcks={share.acks ?? []} />
    </div>
  );
}
