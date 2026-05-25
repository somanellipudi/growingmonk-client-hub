import { NextResponse } from "next/server";
import { getCurrentBrief } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const brief = await getCurrentBrief(params.id);
  if (!brief) return NextResponse.json({ error: "No weekly brief exists." }, { status: 404 });
  return NextResponse.json({ brief });
}
