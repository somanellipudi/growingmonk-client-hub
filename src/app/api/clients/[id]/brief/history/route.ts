import { NextResponse } from "next/server";
import { listBriefHistory } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const briefs = await listBriefHistory(params.id, 8);
  return NextResponse.json({ briefs });
}
