import { NextResponse } from "next/server";
import { getClient, getAllCompetitorSnapshots } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshots = await getAllCompetitorSnapshots(params.id);

  // Return current state (latest snapshot per competitor) + trend data
  const competitors = client.competitors ?? [];
  const competitorData = competitors.map((comp) => {
    const history = snapshots
      .filter((s) => s.competitorId === comp.id)
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    const latest = history[history.length - 1];
    const previous = history[history.length - 8]; // ~7 days ago
    return {
      competitor: comp,
      count: latest?.count ?? null,
      rating: latest?.rating ?? null,
      delta7d: latest && previous ? latest.count - previous.count : null,
      history: history.map((s) => ({ date: s.snapshotDate, count: s.count, rating: s.rating })),
    };
  });

  return NextResponse.json({ competitorData, clientCount: client.gbpPlaceReviewCount ?? null, clientRating: client.gbpPlaceRating ?? null });
}
