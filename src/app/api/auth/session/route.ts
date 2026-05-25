import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? undefined;
  const session = await getSession(email);
  return NextResponse.json({
    provider: "allowlist_cookie_phase_1",
    allowlistCollection: "users",
    ...session
  });
}
