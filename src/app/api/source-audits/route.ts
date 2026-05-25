import { NextResponse } from "next/server";
import { listSourceAudits } from "@/lib/server/monkaudit-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const sourceAudits = await listSourceAudits(q);
  return NextResponse.json({ sourceAudits });
}
