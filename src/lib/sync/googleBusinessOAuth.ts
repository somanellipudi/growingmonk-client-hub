import "server-only";

import { google } from "googleapis";
import { env } from "@/lib/server/env";
import { saveGoogleBusinessConnection } from "@/lib/server/repositories";

const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

export type GBPLocationOption = {
  accountId: string;
  locationId: string;
  title: string;
  address: string;
};

export type OAuthCompleteResult =
  | { type: "connected"; clientId: string; locationName: string }
  | { type: "picker"; clientId: string; accountId: string };

export function googleOAuthRedirectUri() {
  return env.googleOAuthRedirectUri || `${env.nextAuthUrl.replace(/\/$/, "")}/api/integrations/gbp/oauth/callback`;
}

export function googleBusinessAuthUrl({ clientId, placeId }: { clientId: string; placeId?: string }) {
  const oauth2 = googleOAuthClient();
  const state = encodeState({ clientId, placeId: placeId || env.defaultGbpPlaceId });
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GBP_SCOPE],
    state
  });
}

export async function completeGoogleBusinessOAuth({ code, state }: { code: string; state: string }): Promise<OAuthCompleteResult> {
  const decoded = decodeState(state);
  const oauth2 = googleOAuthClient();
  const { tokens } = await oauth2.getToken(code);

  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Reconnect and approve offline access, or revoke the old grant and try again.");
  }
  const accessToken = tokens.access_token;
  if (!accessToken) throw new Error("Google did not return an access token.");
  const tokenExpiry = tokens.expiry_date ?? undefined;

  const placeId = decoded.placeId || env.defaultGbpPlaceId;

  // Try Place ID matching first when a Place ID is known
  if (placeId) {
    const matchResult = await findBusinessLocationByPlaceId(accessToken, placeId).catch(() => null);
    if (matchResult) {
      const place = await fetchPlaceDetails(placeId).catch(() => null);
      await saveGoogleBusinessConnection(decoded.clientId, {
        refreshToken,
        accessToken,
        tokenExpiry,
        accountId: matchResult.accountName,
        locationId: matchResult.locationName,
        placeId,
        locationName: matchResult.title || place?.displayName || matchResult.locationName,
        placeRating: place?.rating,
        placeReviewCount: place?.userRatingCount
      });
      return {
        type: "connected",
        clientId: decoded.clientId,
        locationName: matchResult.title || place?.displayName || matchResult.locationName
      };
    }
  }

  // No Place ID or no match — list all locations
  const allLocations = await listAllGBPLocations(accessToken);

  if (allLocations.length === 0) {
    throw new Error("No Google Business Profile locations found on this account. Make sure the signed-in account has Manager or Owner access.");
  }

  if (allLocations.length === 1) {
    const loc = allLocations[0];
    await saveGoogleBusinessConnection(decoded.clientId, {
      refreshToken,
      accessToken,
      tokenExpiry,
      accountId: loc.accountId,
      locationId: loc.locationId,
      locationName: loc.title
    });
    return { type: "connected", clientId: decoded.clientId, locationName: loc.title };
  }

  // Multiple locations — save tokens so picker page can authenticate, then redirect to picker
  const firstAccountId = allLocations[0].accountId;
  await saveGoogleBusinessConnection(decoded.clientId, {
    refreshToken,
    accessToken,
    tokenExpiry
    // No accountId/locationId yet — will be set after user picks
  });
  return { type: "picker", clientId: decoded.clientId, accountId: firstAccountId };
}

export async function listGBPLocations(accessToken: string, accountId: string): Promise<GBPLocationOption[]> {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return [];
  const payload = await response.json() as { locations?: Array<{ name: string; title?: string; storefrontAddress?: { addressLines?: string[]; locality?: string } }> };
  return (payload.locations ?? []).map((loc) => ({
    accountId,
    locationId: loc.name,
    title: loc.title || loc.name,
    address: [
      ...(loc.storefrontAddress?.addressLines ?? []),
      loc.storefrontAddress?.locality
    ].filter(Boolean).join(", ")
  }));
}

function googleOAuthClient() {
  if (!env.googleOAuthClientId || !env.googleOAuthClientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required.");
  }
  return new google.auth.OAuth2(env.googleOAuthClientId, env.googleOAuthClientSecret, googleOAuthRedirectUri());
}

async function listAllGBPLocations(accessToken: string): Promise<GBPLocationOption[]> {
  const accountsResponse = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!accountsResponse.ok) throw new Error(`GBP accounts lookup failed: ${accountsResponse.status}`);
  const accountsPayload = await accountsResponse.json() as { accounts?: Array<{ name: string }> };
  const accounts = accountsPayload.accounts ?? [];

  const results: GBPLocationOption[] = [];
  for (const account of accounts) {
    const locations = await listGBPLocations(accessToken, account.name);
    results.push(...locations);
  }
  return results;
}

async function findBusinessLocationByPlaceId(accessToken: string, placeId: string) {
  const accountsResponse = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!accountsResponse.ok) throw new Error(`GBP accounts lookup failed: ${accountsResponse.status}`);
  const accountsPayload = await accountsResponse.json() as { accounts?: Array<{ name: string; accountName?: string }> };
  const accounts = accountsPayload.accounts ?? [];

  for (const account of accounts) {
    const filter = `metadata.place_id="${placeId}"`;
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,metadata,storefrontAddress&filter=${encodeURIComponent(filter)}`;
    const locationsResponse = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!locationsResponse.ok) continue;
    const locationsPayload = await locationsResponse.json() as { locations?: Array<{ name: string; title?: string; metadata?: { placeId?: string; place_id?: string } }> };
    const location = (locationsPayload.locations ?? [])[0];
    if (location) {
      return {
        accountName: account.name,
        locationName: location.name,
        title: location.title,
        metadataPlaceId: location.metadata?.placeId || location.metadata?.place_id
      };
    }
  }

  throw new Error(`No Google Business Profile location matched Place ID ${placeId}. Make sure the Google account has Manager or Owner access to the listing.`);
}

async function fetchPlaceDetails(placeId: string) {
  if (!env.googleMapsApiKey) return null;
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": env.googleMapsApiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount"
    }
  });
  if (!response.ok) return null;
  const payload = await response.json() as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
  };
  return {
    id: payload.id || placeId,
    displayName: payload.displayName?.text,
    formattedAddress: payload.formattedAddress,
    rating: payload.rating,
    userRatingCount: payload.userRatingCount
  };
}

function encodeState(state: { clientId: string; placeId: string }) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function decodeState(value: string) {
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { clientId?: string; placeId?: string };
  if (!parsed.clientId) throw new Error("OAuth state is missing client id.");
  return { clientId: parsed.clientId, placeId: parsed.placeId };
}
