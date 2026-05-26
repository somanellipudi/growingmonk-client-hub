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
  distanceKm: number | null;
};

// Maps niche → Places API includedTypes (New API)
const NICHE_TYPES: Record<string, string[]> = {
  salon: ["hair_salon", "beauty_salon", "nail_salon"],
  restaurant: ["restaurant", "cafe"],
  clinic: ["doctor", "dentist", "medical_clinic", "physiotherapist"],
  coach: [],
  ecommerce: ["store", "shopping_mall"],
  local_service: [],
  franchise: [],
  other: [],
};

// Human-readable label used in text search fallback
const NICHE_LABEL: Record<string, string> = {
  salon: "salon",
  restaurant: "restaurant",
  clinic: "clinic",
  coach: "coaching",
  ecommerce: "store",
  local_service: "service",
  franchise: "franchise",
  other: "business",
};

type PlaceResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getPlaceLocation(placeId: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "location",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json() as { location?: { latitude?: number; longitude?: number } };
  if (!data.location?.latitude || !data.location?.longitude) return null;
  return { lat: data.location.latitude, lng: data.location.longitude };
}

async function textSearchLocation(query: string, apiKey: string): Promise<{ lat: number; lng: number; placeId: string } | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.location",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json() as { places?: Array<{ id?: string; location?: { latitude?: number; longitude?: number } }> };
  const place = data.places?.[0];
  if (!place?.location?.latitude || !place?.location?.longitude) return null;
  return { lat: place.location.latitude, lng: place.location.longitude, placeId: place.id ?? "" };
}

async function nearbySearch(lat: number, lng: number, types: string[], apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 15,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 5000 },
      },
      rankPreference: "DISTANCE",
    }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { places?: PlaceResult[] };
  return data.places ?? [];
}

async function textSearch(query: string, lat: number, lng: number, apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 15,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 5000 },
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { places?: PlaceResult[] };
  return data.places ?? [];
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!env.googleMapsApiKey) return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 503 });

  const apiKey = env.googleMapsApiKey;

  // Resolve client location: prefer GBP place ID, fallback to name+city search
  let clientLocation: { lat: number; lng: number } | null = null;
  let clientPlaceId = client.gbpPlaceId ?? "";

  if (clientPlaceId) {
    clientLocation = await getPlaceLocation(clientPlaceId, apiKey);
  }
  if (!clientLocation) {
    const found = await textSearchLocation(`${client.name} ${client.city}`, apiKey);
    if (found) {
      clientLocation = { lat: found.lat, lng: found.lng };
      if (!clientPlaceId) clientPlaceId = found.placeId;
    }
  }

  // Determine search label — use nicheSubtype first (most specific)
  const nicheLabel = client.nicheSubtype || NICHE_LABEL[client.niche] || client.niche;
  const searchQuery = `${nicheLabel} in ${client.city}`;
  const types = NICHE_TYPES[client.niche] ?? [];

  let places: PlaceResult[] = [];

  if (clientLocation) {
    // Prefer nearby search (location-anchored, distance-sorted)
    if (types.length > 0) {
      places = await nearbySearch(clientLocation.lat, clientLocation.lng, types, apiKey);
    }
    // Fallback or supplement with text search if types list gave too few results
    if (places.length < 5) {
      const text = await textSearch(searchQuery, clientLocation.lat, clientLocation.lng, apiKey);
      const existing = new Set(places.map((p) => p.id));
      places = [...places, ...text.filter((p) => !existing.has(p.id))];
    }
  } else {
    // No location — plain text search
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 15 }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json() as { places?: PlaceResult[] };
      places = data.places ?? [];
    }
  }

  const clientNameLower = client.name.toLowerCase();
  const existingPlaceIds = new Set([
    ...(client.competitors ?? []).map((c) => c.placeId),
    ...(clientPlaceId ? [clientPlaceId] : []),
  ]);

  const suggestions: CompetitorSuggestion[] = places
    .filter((p) => {
      const name = (p.displayName?.text ?? "").toLowerCase();
      return p.id && !existingPlaceIds.has(p.id) && !name.includes(clientNameLower);
    })
    .slice(0, 10)
    .map((p) => {
      const distanceKm =
        clientLocation && p.location
          ? Math.round(haversineKm(clientLocation.lat, clientLocation.lng, p.location.latitude, p.location.longitude) * 10) / 10
          : null;
      return {
        placeId: p.id!,
        name: p.displayName?.text ?? "Unknown",
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? null,
        address: p.formattedAddress ?? "",
        distanceKm,
      };
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  return NextResponse.json({ suggestions, query: searchQuery });
}
