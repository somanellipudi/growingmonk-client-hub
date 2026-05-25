import { NextResponse } from "next/server";
import { testGBPConnection } from "@/lib/sync/gbpApi";
import { getClient } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json().catch(() => ({})) as { accountId?: string; locationId?: string };
  if (!payload.accountId || !payload.locationId) {
    return NextResponse.json({ success: false, error: "accountId and locationId are required." }, { status: 400 });
  }
  try {
    const client = await getClient(params.id);
    const result = await testGBPConnection(payload.accountId, payload.locationId, client?.googleOAuthRefreshToken);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "GBP connection failed." }, { status: 400 });
  }
}
