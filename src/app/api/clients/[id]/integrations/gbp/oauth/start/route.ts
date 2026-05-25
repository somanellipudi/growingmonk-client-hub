import { NextResponse } from "next/server";
import { googleBusinessAuthUrl } from "@/lib/sync/googleBusinessOAuth";
import { getClient } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId") || client.gbpPlaceId || env.defaultGbpPlaceId;
  try {
    return NextResponse.redirect(googleBusinessAuthUrl({ clientId: client.id, placeId }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start Google OAuth." }, { status: 500 });
  }
}
