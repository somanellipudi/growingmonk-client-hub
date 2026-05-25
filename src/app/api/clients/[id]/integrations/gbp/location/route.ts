import { NextResponse } from "next/server";
import { saveGoogleBusinessConnection, getClient } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json().catch(() => ({})) as { accountId?: string; locationId?: string; locationName?: string };
  if (!payload.accountId || !payload.locationId) {
    return NextResponse.json({ error: "accountId and locationId are required." }, { status: 400 });
  }

  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const updated = await saveGoogleBusinessConnection(params.id, {
    accountId: payload.accountId,
    locationId: payload.locationId,
    locationName: payload.locationName
  });

  if (!updated) return NextResponse.json({ error: "Failed to save location." }, { status: 500 });

  const base = env.nextAuthUrl.replace(/\/$/, "");
  return NextResponse.json({
    success: true,
    redirectUrl: `${base}/clients/${params.id}?edit=1&gbpMessage=${encodeURIComponent(`Google Business connected: ${payload.locationName || payload.locationId}`)}`
  });
}
