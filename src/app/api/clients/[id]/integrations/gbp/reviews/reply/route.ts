import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { postReviewReply } from "@/lib/sync/gbpApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as { reviewId?: string; comment?: string };
    const { reviewId, comment } = body;

    if (!reviewId || !comment?.trim()) {
      return NextResponse.json({ error: "reviewId and comment are required." }, { status: 400 });
    }

    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    if (!client.googleOAuthRefreshToken && !client.gbpAccessToken) {
      return NextResponse.json(
        { error: "No Google OAuth connection. Connect Google Business Profile first." },
        { status: 400 }
      );
    }

    await postReviewReply(client, reviewId, comment.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post reply." },
      { status: 500 }
    );
  }
}
