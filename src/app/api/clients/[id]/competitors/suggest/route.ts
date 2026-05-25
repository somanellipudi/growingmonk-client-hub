import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CompetitorSuggestion = {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string;
};

const NICHE_QUERY: Record<string, string> = {
  salon: "salon",
  restaurant: "restaurant",
  clinic: "clinic",
  coach: "coaching",
  ecommerce: "store",
  local_service: "service",
  franchise: "franchise",
  other: "business",
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!env.googleMapsApiKey) return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 503 });

  const nicheQuery = client.nicheSubtype || NICHE_QUERY[client.niche] || client.niche;
  const query = `${nicheQuery} in ${client.city}`;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": env.googleMapsApiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 10 }),
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ error: "Places API error" }, { status: 502 });

  const data = await res.json() as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  const clientNameLower = client.name.toLowerCase();
  const existingPlaceIds = new Set((client.competitors ?? []).map((c) => c.placeId));

  const suggestions: CompetitorSuggestion[] = (data.places ?? [])
    .filter((p) => {
      const name = p.displayName?.text?.toLowerCase() ?? "";
      return p.id && !existingPlaceIds.has(p.id) && !name.includes(clientNameLower);
    })
    .slice(0, 8)
    .map((p) => ({
      placeId: p.id!,
      name: p.displayName?.text ?? "Unknown",
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
      address: p.formattedAddress ?? "",
    }));

  return NextResponse.json({ suggestions, query });
}
