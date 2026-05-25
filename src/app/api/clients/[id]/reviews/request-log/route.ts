import { NextResponse } from "next/server";
import { listReviewRequests } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const logs = await listReviewRequests(params.id);
  return NextResponse.json({ logs });
}
