import type { Client, GBPInsights, GBPReview } from "@/types";
import { googleAccessToken } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { saveGoogleBusinessConnection } from "@/lib/server/repositories";
import { pullPlaceData } from "./placeApi";

export type GBPData = {
  reviews: GBPReview[];
  insights: GBPInsights | null;
  placeRating?: number;
  placeReviewCount?: number;
};

export async function pullGBPData(client: Client): Promise<GBPData> {
  if (!client.gbpAccountId || !client.gbpLocationId) {
    // Fallback: pull basic data from Google Places API using Place ID only
    if (client.gbpPlaceId && env.googleMapsApiKey) {
      const place = await pullPlaceData(client.gbpPlaceId, env.googleMapsApiKey);
      if (place) {
        console.log(`Places API: ${place.reviews.length} reviews, rating=${place.rating}, total=${place.reviewCount}`);
        // Persist rating/count to client record so the dashboard shows it immediately
        saveGoogleBusinessConnection(client.id, {
          placeId: client.gbpPlaceId,
          placeRating: place.rating ?? undefined,
          placeReviewCount: place.reviewCount ?? undefined,
        }).catch((err) => console.error("Failed to persist place data:", err));
        return {
          reviews: place.reviews,
          insights: null,
          placeRating: place.rating ?? undefined,
          placeReviewCount: place.reviewCount ?? undefined,
        };
      }
    }
    return { reviews: [], insights: null };
  }

  const accessToken = await resolveAccessToken(client);
  const { gbpAccountId: accountId, gbpLocationId: locationId } = client;

  const reviewsRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reviews?pageSize=10&orderBy=updateTime+desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let reviews: GBPReview[] = [];
  if (reviewsRes.ok) {
    const reviewsData = await reviewsRes.json() as { reviews?: GBPReviewApi[] };
    reviews = (reviewsData.reviews ?? []).map((review) => ({
      reviewId: review.reviewId,
      starRating: starRatingToNumber(review.starRating),
      comment: review.comment ?? "",
      createTime: review.createTime,
      reviewerDisplayName: review.reviewer?.displayName ?? "Anonymous",
      reviewerPhotoUrl: review.reviewer?.profilePhotoUrl,
      reviewReply: review.reviewReply
        ? { comment: review.reviewReply.comment, updateTime: review.reviewReply.updateTime }
        : undefined
    }));
  }

  let insights: GBPInsights | null = null;
  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const insightsRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reportInsights`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        locationNames: [`${accountId}/${locationId}`],
        basicRequest: {
          metricRequests: [
            { metric: "QUERIES_INDIRECT" },
            { metric: "QUERIES_DIRECT" },
            { metric: "VIEWS_MAPS" },
            { metric: "VIEWS_SEARCH" },
            { metric: "ACTIONS_PHONE" },
            { metric: "ACTIONS_WEBSITE" },
            { metric: "ACTIONS_DRIVING_DIRECTIONS" }
          ],
          timeRange: { startTime, endTime }
        }
      })
    });

    if (insightsRes.ok) {
      const insightsData = await insightsRes.json() as { locationMetrics?: Array<{ metricValues?: Array<{ metric: string; totalValue?: { value?: number } }> }> };
      const metricValues = insightsData.locationMetrics?.[0]?.metricValues ?? [];
      const getMetric = (name: string) => Number(metricValues.find((m) => m.metric === name)?.totalValue?.value ?? 0);
      insights = {
        queriesIndirect: getMetric("QUERIES_INDIRECT"),
        queriesDirect: getMetric("QUERIES_DIRECT"),
        viewsMaps: getMetric("VIEWS_MAPS"),
        viewsSearch: getMetric("VIEWS_SEARCH"),
        actionsPhone: getMetric("ACTIONS_PHONE"),
        actionsWebsite: getMetric("ACTIONS_WEBSITE"),
        actionsDirections: getMetric("ACTIONS_DRIVING_DIRECTIONS")
      };
    }
  } catch (error) {
    console.error("GBP insights pull failed (non-blocking):", error);
  }

  return {
    reviews,
    insights,
    placeRating: client.gbpPlaceRating,
    placeReviewCount: client.gbpPlaceReviewCount,
  };
}

export async function postReviewReply(
  client: Client,
  reviewId: string,
  comment: string
): Promise<void> {
  if (!client.gbpAccountId || !client.gbpLocationId) {
    throw new Error("Client does not have a GBP Account ID and Location ID configured.");
  }
  const accessToken = await resolveAccessToken(client);
  const url = `https://mybusiness.googleapis.com/v4/${client.gbpAccountId}/${client.gbpLocationId}/reviews/${encodeURIComponent(reviewId)}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to post reply: ${res.status} ${body.slice(0, 200)}`);
  }
}

export async function testGBPConnection(accountId: string, locationId: string, refreshToken?: string) {
  const accessToken = await getTokenFromRefreshToken(refreshToken);
  const locationRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/${locationId}?readMask=title,name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!locationRes.ok) throw new Error(`GBP location test failed: ${locationRes.status}`);
  const location = await locationRes.json() as { title?: string; name?: string };

  const reviewsRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reviews?pageSize=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const reviewCount = reviewsRes.ok
    ? ((await reviewsRes.json() as { reviews?: unknown[] }).reviews ?? []).length
    : 0;

  return { locationName: location.title || location.name || locationId, reviewCount };
}

async function resolveAccessToken(client: Client): Promise<string> {
  // Use cached access token if it hasn't expired (with 1-minute buffer)
  if (client.gbpAccessToken && client.gbpTokenExpiry && Date.now() < client.gbpTokenExpiry - 60_000) {
    return client.gbpAccessToken;
  }

  // Refresh using stored OAuth refresh token
  if (client.googleOAuthRefreshToken) {
    const { accessToken, tokenExpiry } = await refreshOAuthToken(client.googleOAuthRefreshToken);
    // Store the refreshed token for subsequent calls (fire-and-forget, non-blocking)
    saveGoogleBusinessConnection(client.id, { accessToken, tokenExpiry }).catch((err) =>
      console.error("Failed to persist refreshed GBP access token:", err)
    );
    return accessToken;
  }

  // Fall back to service account credentials (ADC)
  return googleAccessToken(["https://www.googleapis.com/auth/business.manage"]);
}

async function getTokenFromRefreshToken(refreshToken?: string): Promise<string> {
  if (refreshToken) {
    const { accessToken } = await refreshOAuthToken(refreshToken);
    return accessToken;
  }
  return googleAccessToken(["https://www.googleapis.com/auth/business.manage"]);
}

async function refreshOAuthToken(refreshToken: string): Promise<{ accessToken: string; tokenExpiry: number | undefined }> {
  if (!env.googleOAuthClientId || !env.googleOAuthClientSecret) {
    throw new Error("Google OAuth client is not configured.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) throw new Error(`Google token refresh failed: ${response.status}`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Google token refresh did not return an access token.");
  const tokenExpiry = payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined;
  return { accessToken: payload.access_token, tokenExpiry };
}

function starRatingToNumber(rating: string): 1 | 2 | 3 | 4 | 5 {
  const map: Record<string, 1 | 2 | 3 | 4 | 5> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[rating] ?? 3;
}

type GBPReviewApi = {
  reviewId: string;
  starRating: string;
  comment?: string;
  createTime: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  reviewReply?: { comment: string; updateTime: string };
};
