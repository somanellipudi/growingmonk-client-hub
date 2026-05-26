import { NextResponse } from "next/server";
import { getClient, getAllCompetitorSnapshots, addCompetitor, removeCompetitor, saveCompetitorSnapshot } from "@/lib/server/repositories";

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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, placeId, note, rating, reviewCount } = await request.json() as {
      name: string;
      placeId: string;
      note?: string;
      rating?: number | null;
      reviewCount?: number | null;
    };
    if (!name || !placeId) return NextResponse.json({ error: "name and placeId required" }, { status: 400 });
    const competitors = await addCompetitor(params.id, { name, placeId, note });
    // Seed initial snapshot so data shows immediately without waiting for daily cron
    const newComp = (competitors ?? []).find((c) => c.placeId === placeId);
    if (newComp && reviewCount != null && rating != null) {
      await saveCompetitorSnapshot(params.id, newComp.id, name, reviewCount, rating);
    }
    return NextResponse.json({ competitors });
  } catch {
    return NextResponse.json({ error: "Failed to add competitor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { competitorId } = await request.json() as { competitorId: string };
    if (!competitorId) return NextResponse.json({ error: "competitorId required" }, { status: 400 });
    await removeCompetitor(params.id, competitorId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove competitor" }, { status: 500 });
  }
}
