import type { Client, GoogleAdsCampaign } from "@/types";
import { env } from "@/lib/server/env";
import { googleAccessToken } from "@/lib/server/db";

const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v17";

// Strip dashes from customer ID — API needs plain digits
function normalizeCustomerId(id: string): string {
  return id.replace(/[-\s]/g, "");
}

async function resolveAccessToken(client: Client): Promise<string> {
  // Reuse the GBP OAuth refresh token — same Google account, just need adwords scope
  if (client.googleOAuthRefreshToken) {
    if (!env.googleOAuthClientId || !env.googleOAuthClientSecret) {
      throw new Error("Google OAuth client not configured.");
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.googleOAuthClientId,
        client_secret: env.googleOAuthClientSecret,
        refresh_token: client.googleOAuthRefreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
    const payload = await res.json() as { access_token?: string };
    if (!payload.access_token) throw new Error("Token refresh returned no access token.");
    return payload.access_token;
  }
  // Fall back to service account (ADC)
  return googleAccessToken(["https://www.googleapis.com/auth/adwords"]);
}

type GadsRow = {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
  };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: string;
    conversionsValue?: string;
    ctr?: string;
    averageCpc?: string;
  };
};

function mapChannelType(raw: string): string {
  const map: Record<string, string> = {
    SEARCH: "Search",
    DISPLAY: "Display",
    SHOPPING: "Shopping",
    VIDEO: "Video",
    PERFORMANCE_MAX: "Performance Max",
    SMART: "Smart",
  };
  return map[raw] ?? raw;
}

export async function pullGoogleAdsCampaigns(client: Client): Promise<GoogleAdsCampaign[]> {
  if (!client.googleAdsCustomerId) {
    throw new Error("No Google Ads Customer ID configured for this client.");
  }
  if (!env.googleAdsDeveloperToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not set.");
  }

  const customerId = normalizeCustomerId(client.googleAdsCustomerId);
  const accessToken = await resolveAccessToken(client);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": env.googleAdsDeveloperToken,
    "Content-Type": "application/json",
  };
  if (client.googleAdsManagerId) {
    headers["login-customer-id"] = normalizeCustomerId(client.googleAdsManagerId);
  }

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status IN ('ENABLED', 'PAUSED')
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `.trim();

  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Ads API error: ${res.status} ${body.slice(0, 300)}`);
  }

  const data = await res.json() as { results?: GadsRow[] };
  const rows = data.results ?? [];

  return rows
    .filter((row) => row.campaign?.id)
    .map((row): GoogleAdsCampaign => {
      const spend = Number(row.metrics?.costMicros ?? 0) / 1_000_000;
      const convValue = parseFloat(row.metrics?.conversionsValue ?? "0");
      const conversions = parseFloat(row.metrics?.conversions ?? "0");
      const roas = spend > 0 && convValue > 0 ? convValue / spend : 0;

      return {
        id: row.campaign!.id!,
        name: row.campaign?.name ?? "Unknown",
        status: row.campaign?.status ?? "",
        channelType: mapChannelType(row.campaign?.advertisingChannelType ?? ""),
        impressions: parseInt(row.metrics?.impressions ?? "0", 10),
        clicks: parseInt(row.metrics?.clicks ?? "0", 10),
        spend: parseFloat(spend.toFixed(2)),
        conversions: parseFloat(conversions.toFixed(1)),
        conversionValue: parseFloat(convValue.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
        ctr: parseFloat(parseFloat(row.metrics?.ctr ?? "0").toFixed(4)),
        avgCpc: parseFloat((Number(row.metrics?.averageCpc ?? 0) / 1_000_000).toFixed(2)),
      };
    });
}
