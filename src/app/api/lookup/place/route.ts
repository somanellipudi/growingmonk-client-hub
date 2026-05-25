import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  addressComponents?: AddressComponent[];
};

export type PlaceLookupResult = {
  name: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  placeId: string;
  address: string;
};

function extractFromUrl(url: string): { name: string; placeId: string } {
  // Embedded ChIJ place ID in Maps data param
  const embeddedId = url.match(/[!,]1s(ChIJ[A-Za-z0-9_%-]+)/);
  if (embeddedId) return { name: "", placeId: decodeURIComponent(embeddedId[1]) };

  // place_id= query param
  const paramId = url.match(/[?&]place_id=(ChIJ[^&]+)/);
  if (paramId) return { name: "", placeId: decodeURIComponent(paramId[1]) };

  // /maps/place/NAME/ path
  const namePath = url.match(/\/maps\/place\/([^/@?]+)/);
  if (namePath) {
    const name = decodeURIComponent(namePath[1].replace(/\+/g, " ")).trim();
    if (name) return { name, placeId: "" };
  }

  // Google search ?q= or &q= — share.google often lands here
  const qParam = url.match(/[?&]q=([^&]+)/);
  if (qParam) {
    const name = decodeURIComponent(qParam[1].replace(/\+/g, " ")).trim();
    if (name) return { name, placeId: "" };
  }

  // /search?... with ludocid (CID) - Maps sometimes embeds this
  const ludocid = url.match(/ludocid=(\d+)/);
  if (ludocid) {
    // CID lookup via text search isn't trivial; return empty and fall through to name search
  }

  return { name: "", placeId: "" };
}

async function resolveUrl(url: string): Promise<string> {
  try {
    // GET follows redirects more reliably than HEAD for share.google / goo.gl
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GrowingMonk/1.0)" },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

async function textSearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { places?: Array<{ id?: string }> };
  return data.places?.[0]?.id ?? "";
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetails | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,internationalPhoneNumber,nationalPhoneNumber,websiteUri,addressComponents",
      },
    }
  );
  if (!res.ok) return null;
  return (await res.json()) as PlaceDetails;
}

export async function POST(req: Request) {
  if (!env.googleMapsApiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured." }, { status: 503 });
  }

  const body = (await req.json()) as { url?: string; query?: string };
  const rawInput = ((body.url ?? body.query) ?? "").trim();
  if (!rawInput) {
    return NextResponse.json({ error: "No input provided." }, { status: 400 });
  }

  const isUrl = rawInput.startsWith("http");
  let name = "";
  let placeId = "";

  if (isUrl) {
    const needsResolve =
      rawInput.includes("goo.gl") ||
      rawInput.includes("maps.app") ||
      rawInput.includes("share.google") ||
      rawInput.includes("g.co");

    const resolvedUrl = needsResolve ? await resolveUrl(rawInput) : rawInput;
    ({ name, placeId } = extractFromUrl(resolvedUrl));

    // Fallback: if redirect landed somewhere we can't parse, try the raw URL too
    if (!name && !placeId && resolvedUrl !== rawInput) {
      ({ name, placeId } = extractFromUrl(rawInput));
    }
  } else {
    // Plain text search: "Uber Dry Visakhapatnam"
    name = rawInput;
  }

  if (!placeId && name) {
    placeId = await textSearch(name, env.googleMapsApiKey);
  }

  if (!placeId) {
    return NextResponse.json(
      {
        error:
          "Could not find a Google Business listing. Try typing the business name and city instead (e.g. \"Uber Dry Visakhapatnam\").",
      },
      { status: 404 }
    );
  }

  const details = await fetchPlaceDetails(placeId, env.googleMapsApiKey);
  if (!details) {
    return NextResponse.json(
      { error: "Found the listing but could not fetch details. Check your Maps API key." },
      { status: 502 }
    );
  }

  let city = "";
  let country = "IN";
  for (const component of details.addressComponents ?? []) {
    const types = component.types ?? [];
    if (types.includes("locality") || types.includes("administrative_area_level_2")) {
      if (!city) city = component.longText ?? "";
    }
    if (types.includes("country")) {
      country = component.shortText ?? "IN";
    }
  }

  const phone = (details.internationalPhoneNumber ?? details.nationalPhoneNumber ?? "").replace(
    /\s+/g,
    ""
  );

  const result: PlaceLookupResult = {
    name: details.displayName?.text ?? name,
    city,
    country,
    phone,
    website: details.websiteUri ?? "",
    placeId,
    address: details.formattedAddress ?? "",
  };

  return NextResponse.json({ place: result });
}
