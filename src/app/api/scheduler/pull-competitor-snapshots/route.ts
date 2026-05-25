import { NextResponse } from "next/server";
import { listClients, saveCompetitorSnapshot } from "@/lib/server/repositories";
import { pullPlaceData } from "@/lib/sync/placeApi";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  if (!env.schedulerSecret) return false;
  return request.headers.get("x-scheduler-secret") === env.schedulerSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.googleMapsApiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
  }

  const clients = await listClients();
  const results: { clientId: string; clientName: string; competitor: string; ok: boolean; count?: number; error?: string }[] = [];

  for (const client of clients) {
    if (!client.competitors?.length) continue;

    for (const competitor of client.competitors) {
      if (!competitor.placeId) continue;
      try {
        const data = await pullPlaceData(competitor.placeId, env.googleMapsApiKey);
        if (!data) throw new Error("Places API returned null");
        await saveCompetitorSnapshot(
          client.id,
          competitor.id,
          competitor.name,
          data.reviewCount ?? 0,
          data.rating ?? 0
        );
        results.push({ clientId: client.id, clientName: client.name, competitor: competitor.name, ok: true, count: data.reviewCount ?? 0 });
      } catch (err) {
        results.push({ clientId: client.id, clientName: client.name, competitor: competitor.name, ok: false, error: String(err) });
      }
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const errors = results.filter((r) => !r.ok).length;
  return NextResponse.json({ summary: { total: results.length, ok: sent, errors }, results });
}
