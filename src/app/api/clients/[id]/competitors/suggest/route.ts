import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";
import { callGeminiJSON } from "@/lib/ai/gemini";

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

async function nearbySearch(lat: number, lng: number, types: string[], apiKey: string, radiusMeters = 5000): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
      rankPreference: "DISTANCE",
    }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { places?: PlaceResult[] };
  return data.places ?? [];
}

type NicheDetection = { searchLabel: string; placesTypes: string[] };
type RelevanceFilter = { keep: string[] }; // array of placeIds to keep

async function detectNicheWithAI(client: { name: string; nicheSubtype?: string; businessGoals?: string; city: string }): Promise<NicheDetection> {
  try {
    const result = await callGeminiJSON<NicheDetection>(
      "niche_detection",
      "You are a business classification assistant. Respond with valid JSON only.",
      `Classify this business and return Google Places API types for finding nearby competitors.

Business name: ${client.name}
Subtype hint: ${client.nicheSubtype || "not specified"}
Goals: ${client.businessGoals || "not specified"}
City: ${client.city}

Return JSON:
{
  "searchLabel": "short human label for this business type — e.g. 'hair salon', 'yoga studio', 'bakery' (2-3 words max)",
  "placesTypes": ["up to 3 Google Places API (New) includedTypes values that best match — e.g. 'hair_salon', 'beauty_salon'. Use only real Places API types. Empty array if unsure."]
}`
    );
    return result;
  } catch {
    return { searchLabel: client.nicheSubtype || "business", placesTypes: [] };
  }
}

async function filterRelevantCompetitors(
  clientType: string,
  candidates: Array<{ placeId: string; name: string }>
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  try {
    const list = candidates.map((c, i) => `${i + 1}. [${c.placeId}] ${c.name}`).join("\n");
    const result = await callGeminiJSON<RelevanceFilter>(
      "niche_detection",
      "You are a business relevance classifier. Respond with valid JSON only.",
      `The client is a "${clientType}". From the list below, return only the place IDs of businesses that are DIRECT competitors — same type of business that a customer would choose instead of the client.

EXCLUDE: spas, laser clinics, skin clinics, dermatology, medical procedures, gyms, or anything a customer would NOT consider as an alternative to a "${clientType}".
INCLUDE: only businesses where the primary service directly overlaps with "${clientType}".

Businesses:
${list}

Return JSON: { "keep": ["placeId1", "placeId2", ...] }`
    );
    return new Set(result.keep ?? []);
  } catch {
    // On AI failure, keep all candidates
    return new Set(candidates.map((c) => c.placeId));
  }
}

async function suggestChainCompetitors(client: {
  name: string;
  niche: string;
  nicheSubtype?: string | null;
  city: string;
}): Promise<string[]> {
  try {
    const result = await callGeminiJSON<{ chains: string[] }>(
      "niche_detection",
      "You are a business intelligence assistant. Respond with valid JSON only.",
      `List the top 5 major competitor chains/brands for a business like "${client.name}" in ${client.city}, India.
Business type: ${client.nicheSubtype || client.niche}
Return only well-known national or regional Indian brands that customers would choose as a direct alternative. Exclude "${client.name}" itself.
Return JSON: { "chains": ["Brand 1", "Brand 2", ...] }`
    );
    return (result.chains ?? []).slice(0, 5);
  } catch {
    return [];
  }
}

async function plainTextSearch(query: string, apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { places?: PlaceResult[] };
  return data.places ?? [];
}

async function textSearch(query: string, lat: number, lng: number, apiKey: string, radiusMeters = 5000): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { places?: PlaceResult[] };
  return data.places ?? [];
}

export async function GET(
  request: Request,
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

  // Determine search label and Places types
  let nicheLabel: string;
  let types: string[];

  const mappedTypes = NICHE_TYPES[client.niche] ?? [];
  const needsAI = client.niche === "other" || (mappedTypes.length === 0 && !client.nicheSubtype);

  if (needsAI) {
    const detected = await detectNicheWithAI(client);
    nicheLabel = detected.searchLabel;
    types = detected.placesTypes;
  } else {
    nicheLabel = client.nicheSubtype || NICHE_LABEL[client.niche] || client.niche;
    types = mappedTypes;
  }

  const searchQuery = `${nicheLabel} in ${client.city}`;

  const excludeParam = new URL(request.url).searchParams.get("exclude") ?? "";
  const excludeIds = excludeParam ? excludeParam.split(",").filter(Boolean) : [];
  const isFindMore = excludeIds.length > 0;
  // Wider radius + more results for "find more" requests
  const searchRadius = isFindMore ? 15000 : 5000;

  let places: PlaceResult[] = [];

  if (clientLocation) {
    // Prefer nearby search (location-anchored, distance-sorted)
    if (types.length > 0) {
      places = await nearbySearch(clientLocation.lat, clientLocation.lng, types, apiKey, searchRadius);
    }
    // Fallback or supplement with text search if types list gave too few results
    if (places.length < 5) {
      const text = await textSearch(searchQuery, clientLocation.lat, clientLocation.lng, apiKey, searchRadius);
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

  // Supplement with AI-suggested national/regional chain competitors (found by name in city)
  const chains = await suggestChainCompetitors({ name: client.name, niche: client.niche, nicheSubtype: client.nicheSubtype, city: client.city });
  if (chains.length > 0) {
    const chainResults = await Promise.all(
      chains.map((chain) => {
        const q = `${chain} ${client.city}`;
        return clientLocation ? textSearch(q, clientLocation.lat, clientLocation.lng, apiKey) : plainTextSearch(q, apiKey);
      })
    );
    const existingIds = new Set(places.map((p) => p.id));
    for (const results of chainResults) {
      for (const p of results.slice(0, 3)) {
        if (!existingIds.has(p.id)) {
          places.push(p);
          existingIds.add(p.id);
        }
      }
    }
  }

  const clientNameLower = client.name.toLowerCase();
  const existingPlaceIds = new Set([
    ...(client.competitors ?? []).map((c) => c.placeId),
    ...(clientPlaceId ? [clientPlaceId] : []),
    ...excludeIds,
  ]);

  // First pass: basic name filter + de-dupe
  const candidates = places.filter((p) => {
    const name = (p.displayName?.text ?? "").toLowerCase();
    return p.id && !existingPlaceIds.has(p.id) && !name.includes(clientNameLower);
  });

  // Review count threshold — lower floor for "find more" to surface more options
  const clientReviews = client.gbpPlaceReviewCount ?? 0;
  const minReviews = isFindMore
    ? Math.max(20, Math.floor(clientReviews * 0.01))
    : Math.max(50, Math.floor(clientReviews * 0.03));

  const reviewFiltered = candidates.filter(
    (p) => p.userRatingCount === undefined || p.userRatingCount === null || p.userRatingCount >= minReviews
  );

  // Second pass: AI relevance filter — removes spas, clinics, etc.
  const relevantIds = await filterRelevantCompetitors(
    nicheLabel,
    reviewFiltered.slice(0, 20).map((p) => ({ placeId: p.id!, name: p.displayName?.text ?? "" }))
  );

  const suggestions: CompetitorSuggestion[] = reviewFiltered
    .filter((p) => relevantIds.has(p.id!))
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
