import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type GbpAccount = {
  accountId: string;
  accountName: string;
  type: string;
};

export type GbpLocation = {
  accountId: string;
  locationId: string;
  title: string;
  address: string;
  placeId: string;
  phone: string;
  websiteUri: string;
  rating: number | null;
  reviewCount: number | null;
};

export type GbpDiscoverResult = {
  accounts: GbpAccount[];
  locations: GbpLocation[];
};

async function getAccessToken(refreshToken: string): Promise<string> {
  const oauth2 = new google.auth.OAuth2(
    env.googleOAuthClientId,
    env.googleOAuthClientSecret,
    env.googleOAuthRedirectUri
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error("Could not refresh Google access token.");
  return token;
}

async function gbpGet<T>(url: string, accessToken: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { refreshToken?: string };
  const refreshToken = (body.refreshToken ?? "").trim();
  if (!refreshToken) {
    return NextResponse.json({ error: "Refresh token required." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(refreshToken);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not refresh token: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 401 }
    );
  }

  // ── Fetch all accounts ────────────────────────────────────────────────────
  const accountsData = await gbpGet<{
    accounts?: Array<{ name: string; accountName?: string; type?: string }>;
  }>("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", accessToken);

  const rawAccounts = accountsData?.accounts ?? [];
  const accounts: GbpAccount[] = rawAccounts.map((a) => ({
    accountId: a.name,
    accountName: a.accountName ?? a.name,
    type: a.type ?? "LOCATION_GROUP",
  }));

  // ── Fetch all locations across all accounts (parallel) ────────────────────
  const locations: GbpLocation[] = [];
  await Promise.all(
    rawAccounts.map(async (account) => {
      const locData = await gbpGet<{
        locations?: Array<{
          name: string;
          title?: string;
          storefrontAddress?: { addressLines?: string[]; locality?: string; regionCode?: string };
          metadata?: { placeId?: string; mapsUri?: string; newReviewUri?: string };
          phoneNumbers?: { primaryPhone?: string };
          websiteUri?: string;
        }>;
      }>(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,metadata,phoneNumbers,websiteUri`,
        accessToken
      );

      for (const loc of locData?.locations ?? []) {
        const addrParts = [
          ...(loc.storefrontAddress?.addressLines ?? []),
          loc.storefrontAddress?.locality,
          loc.storefrontAddress?.regionCode,
        ].filter(Boolean);

        const placeId = loc.metadata?.placeId ?? "";

        // Fetch rating from Places API if we have a Place ID and Maps key
        let rating: number | null = null;
        let reviewCount: number | null = null;
        if (placeId && env.googleMapsApiKey) {
          const placeRes = await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
            {
              headers: {
                "X-Goog-Api-Key": env.googleMapsApiKey,
                "X-Goog-FieldMask": "rating,userRatingCount",
              },
            }
          ).catch(() => null);
          if (placeRes?.ok) {
            const placeData = await placeRes.json() as { rating?: number; userRatingCount?: number };
            rating = placeData.rating ?? null;
            reviewCount = placeData.userRatingCount ?? null;
          }
        }

        locations.push({
          accountId: account.name,
          locationId: loc.name,
          title: loc.title ?? loc.name,
          address: addrParts.join(", "),
          placeId,
          phone: loc.phoneNumbers?.primaryPhone ?? "",
          websiteUri: loc.websiteUri ?? "",
          rating,
          reviewCount,
        });
      }
    })
  );

  const result: GbpDiscoverResult = { accounts, locations };
  return NextResponse.json(result);
}
