import { NextResponse } from "next/server";
import { listClients } from "@/lib/server/repositories";
import { syncClient } from "@/lib/sync/syncClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (process.env.APP_ENV === "production") {
    const hasSchedulerHeader = request.headers.has("x-goog-authenticated-user-email") || request.headers.has("authorization");
    if (!hasSchedulerHeader) return NextResponse.json({ error: "Unauthorized scheduler request." }, { status: 401 });
  }

  const clients = (await listClients()).filter((client) =>
    client.status === "active" && Boolean(client.metaAccessToken || client.gbpAccountId)
  );
  const results = [];
  for (const client of clients) {
    try {
      const brief = await syncClient(client.id);
      results.push({ clientId: client.id, success: true, briefId: brief.id });
    } catch (error) {
      console.error(`Weekly sync failed for ${client.id}:`, error);
      results.push({ clientId: client.id, success: false, error: error instanceof Error ? error.message : "Sync failed." });
    }
  }

  return NextResponse.json({ synced: results.filter((item) => item.success).length, total: clients.length, results });
}
