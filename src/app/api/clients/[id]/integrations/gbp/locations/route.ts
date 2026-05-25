import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { listGBPLocations } from "@/lib/sync/googleBusinessOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId is required." }, { status: 400 });

  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const accessToken = client.gbpAccessToken;
  if (!accessToken) return NextResponse.json({ error: "No stored access token. Please reconnect via Google OAuth." }, { status: 400 });

  try {
    const locations = await listGBPLocations(accessToken, accountId);
    return NextResponse.json({ locations });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list locations." }, { status: 500 });
  }
}
