import { NextResponse } from "next/server";
import { getReviewCountHistory } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const snapshots = await getReviewCountHistory(params.id, 10);
  return NextResponse.json({ snapshots });
}
