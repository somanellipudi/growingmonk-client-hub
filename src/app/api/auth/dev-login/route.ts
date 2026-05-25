import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { getSession } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || env.allowlistEmails[0] || "").trim().toLowerCase();
  const session = await getSession(email);

  if (!session.authenticated) {
    return NextResponse.json({ error: session.accessDeniedReason }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: true, user: session.user });
  response.cookies.set("gm_hub_user_email", email, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete("gm_hub_user_email");
  return response;
}
