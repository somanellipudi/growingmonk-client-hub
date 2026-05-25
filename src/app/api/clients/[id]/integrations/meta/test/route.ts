import { NextResponse } from "next/server";
import { testMetaConnection } from "@/lib/sync/metaApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { accessToken?: string; adAccountId?: string; igUserId?: string };
  if (!payload.accessToken || !payload.adAccountId || !payload.igUserId) {
    return NextResponse.json({ success: false, error: "accessToken, adAccountId, and igUserId are required." }, { status: 400 });
  }
  try {
    const result = await testMetaConnection(payload.accessToken, payload.adAccountId, payload.igUserId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Meta connection failed." }, { status: 400 });
  }
}
