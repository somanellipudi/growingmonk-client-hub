import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { resetDb } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (env.appEnv === "production") {
    return NextResponse.json({ error: "Database reset is disabled in production." }, { status: 403 });
  }

  const state = await resetDb();
  return NextResponse.json({
    ok: true,
    counts: {
      users: state.users.length,
      clients: state.clients.length,
      weekly_briefs: state.weekly_briefs.length,
      activity_logs: state.activity_logs.length
    },
    updatedAt: state.meta.updatedAt
  });
}
