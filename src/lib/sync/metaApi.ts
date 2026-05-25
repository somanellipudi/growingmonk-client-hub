import type { InstagramPost, MetaCampaign } from "@/types";

const META_API_BASE = "https://graph.facebook.com/v21.0";

type PageTokenResult = {
  token: string;
  pageId?: string;
};

// Instagram Business Account endpoints require a PAGE token, not a User token.
// Returns both the page token and the Facebook Page ID (when found via page matching).
// Accessing media via /{pageId}?fields=instagram_business_account{media{...}} avoids
// needing the instagram_basic permission — pages_read_engagement is sufficient.
async function getPageTokenForIg(userToken: string, igUserId: string): Promise<PageTokenResult> {
  // Try 1: user token directly (works when app has instagram_basic permission)
  const directProbe = await fetch(
    `${META_API_BASE}/${encodeURIComponent(igUserId)}/media?limit=1&fields=id&access_token=${encodeURIComponent(userToken)}`
  );
  if (directProbe.ok) return { token: userToken };

  // Try 2: exchange user token for page tokens, find the one linked to this IG account
  const pagesRes = await fetch(
    `${META_API_BASE}/me/accounts?fields=id,name,access_token&limit=25&access_token=${encodeURIComponent(userToken)}`
  );
  if (!pagesRes.ok) throw new Error("Could not fetch page list to get Instagram page token");

  const pages = await pagesRes.json() as { data?: Array<{ id: string; name?: string; access_token?: string }> };

  // Match by instagram_business_account field — uses pages_read_engagement, no instagram_basic needed
  let firstIgPage: { token: string; pageId: string } | null = null;
  for (const page of pages.data ?? []) {
    if (!page.access_token) continue;
    const checkRes = await fetch(
      `${META_API_BASE}/${page.id}?fields=instagram_business_account{id}&access_token=${encodeURIComponent(page.access_token)}`
    );
    if (!checkRes.ok) continue;
    const checkData = await checkRes.json() as { instagram_business_account?: { id: string } };
    if (checkData.instagram_business_account?.id === igUserId) {
      return { token: page.access_token, pageId: page.id };
    }
    // Keep the first page that has any IG account as a fallback
    if (checkData.instagram_business_account?.id && !firstIgPage) {
      firstIgPage = { token: page.access_token, pageId: page.id };
    }
  }

  // Fallback: if stored ID didn't match but another page has an IG account, use it
  // (handles the case where the stored ID is stale but the page connection is still valid)
  if (firstIgPage) return firstIgPage;

  // Last resort: probe each page token directly against the media endpoint
  const probeErrors: string[] = [];
  for (const page of pages.data ?? []) {
    if (!page.access_token) continue;
    const probe = await fetch(
      `${META_API_BASE}/${encodeURIComponent(igUserId)}/media?limit=1&fields=id&access_token=${encodeURIComponent(page.access_token)}`
    );
    if (probe.ok) return { token: page.access_token, pageId: page.id };
    const probeErr = await probe.json().catch(() => ({}) as Record<string, unknown>) as { error?: { message: string; code?: number } };
    probeErrors.push(`Page "${page.name}": ${probeErr.error?.message ?? probe.status}`);
  }

  const directErr = await directProbe.json().catch(() => ({}) as Record<string, unknown>) as { error?: { message: string } };
  throw new Error(
    `Instagram access denied. Direct token error: ${directErr.error?.message ?? directProbe.status}. ` +
    `Page token errors: ${probeErrors.join(" | ")}`
  );
}

export async function pullInstagramPosts(accessToken: string, igUserId: string): Promise<InstagramPost[]> {
  const { token: pageToken, pageId } = await getPageTokenForIg(accessToken, igUserId);

  type MediaItem = { id: string; caption?: string; media_type: InstagramPost["mediaType"]; media_product_type?: string; timestamp: string; permalink?: string };
  let mediaItems: MediaItem[];

  if (pageId) {
    // Access media through the Facebook Page — avoids needing instagram_basic permission
    const pageRes = await fetch(
      `${META_API_BASE}/${encodeURIComponent(pageId)}?fields=instagram_business_account{media.limit(10){id,caption,media_type,media_product_type,timestamp,permalink}}&access_token=${encodeURIComponent(pageToken)}`
    );
    if (!pageRes.ok) {
      const body = await pageRes.text().catch(() => "");
      throw new Error(`Instagram media fetch failed: ${pageRes.status} ${body.slice(0, 300)}`);
    }
    const pageData = await pageRes.json() as { instagram_business_account?: { media?: { data?: MediaItem[] } } };
    mediaItems = pageData.instagram_business_account?.media?.data ?? [];
  } else {
    // Fallback: direct access (requires instagram_basic)
    const mediaRes = await fetch(
      `${META_API_BASE}/${encodeURIComponent(igUserId)}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink&limit=10&access_token=${encodeURIComponent(pageToken)}`
    );
    if (!mediaRes.ok) {
      const body = await mediaRes.text().catch(() => "");
      throw new Error(`Instagram media fetch failed: ${mediaRes.status} ${body.slice(0, 300)}`);
    }
    const mediaData = await mediaRes.json() as { data?: MediaItem[] };
    mediaItems = mediaData.data ?? [];
  }

  const posts: InstagramPost[] = [];
  for (const item of mediaItems) {
    try {
      // Reels support shares; image/video/carousel do not
      const isReel = item.media_product_type === "REELS" || String(item.media_type).toUpperCase() === "REELS";
      const metrics = isReel
        ? "reach,impressions,saved,shares"
        : "reach,impressions,saved";

      let insightsData: { data?: Array<{ name: string; values?: Array<{ value?: number }> }>; error?: unknown };

      const insightsRes = await fetch(
        `${META_API_BASE}/${encodeURIComponent(item.id)}/insights?metric=${metrics}&access_token=${encodeURIComponent(pageToken)}`
      );
      insightsData = await insightsRes.json() as typeof insightsData;

      // If the chosen metrics fail, fall back to reach only
      if (!insightsRes.ok || insightsData.error) {
        const fallbackRes = await fetch(
          `${META_API_BASE}/${encodeURIComponent(item.id)}/insights?metric=reach,impressions&access_token=${encodeURIComponent(pageToken)}`
        );
        insightsData = await fallbackRes.json() as typeof insightsData;
      }

      const insights: Record<string, number> = {};
      for (const metric of insightsData.data ?? []) {
        insights[metric.name] = Number(metric.values?.[0]?.value ?? 0);
      }

      posts.push({
        id: item.id,
        caption: item.caption ?? "",
        mediaType: item.media_type,
        timestamp: item.timestamp,
        permalink: item.permalink,
        reach: insights.reach ?? 0,
        impressions: insights.impressions ?? 0,
        likeCount: 0,
        commentsCount: 0,
        saved: insights.saved ?? 0,
        shares: insights.shares ?? 0,
        engagementRate: 0,
        performanceTag: "average"
      });
    } catch (error) {
      console.error(`Failed to get insights for post ${item.id}:`, error);
    }
  }

  return posts;
}

export async function pullMetaCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaign[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "objective",
    "status",
    "spend",
    "impressions",
    "clicks",
    "actions",
    "action_values",
    "cost_per_action_type",
    "purchase_roas",
    "ctr"
  ].join(",");

  let res = await fetch(
    `${META_API_BASE}/${encodeURIComponent(adAccountId)}/insights?fields=${encodeURIComponent(fields)}&date_preset=last_7d&level=campaign&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meta Ads fetch failed: ${res.status} ${body.slice(0, 300)}`);
  }
  let data = await res.json() as { data?: MetaInsightsRow[] };

  // No campaigns in last 7 days — try last 30 days
  if (!data.data?.length) {
    res = await fetch(
      `${META_API_BASE}/${encodeURIComponent(adAccountId)}/insights?fields=${encodeURIComponent(fields)}&date_preset=last_30d&level=campaign&access_token=${encodeURIComponent(accessToken)}`
    );
    if (res.ok) {
      data = await res.json() as { data?: MetaInsightsRow[] };
    }
  }

  // Still no data — fall back to listing campaigns without financial data
  if (!data.data?.length) {
    const listRes = await fetch(
      `${META_API_BASE}/${encodeURIComponent(adAccountId)}/campaigns?fields=id,name,status,objective&limit=10&access_token=${encodeURIComponent(accessToken)}`
    );
    if (listRes.ok) {
      const listData = await listRes.json() as { data?: Array<{ id: string; name: string; status?: string; objective?: string }> };
      return (listData.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        objective: row.objective ?? "",
        status: row.status ?? "",
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        conversions: 0,
        revenueAttributed: 0,
        roas: 0,
        cpl: 0,
        ctr: 0
      }));
    }
  }

  return (data.data ?? []).map((row) => {
    const leads = getActionValue(row.actions, "lead") + getActionValue(row.actions, "onsite_conversion.lead_grouped");
    const conversions = getActionValue(row.actions, "purchase") + getActionValue(row.actions, "offsite_conversion.fb_pixel_purchase");
    const revenue = getActionValue(row.action_values, "purchase") + getActionValue(row.action_values, "offsite_conversion.fb_pixel_purchase");
    const spend = parseFloat(row.spend ?? "0");
    const roas = revenue > 0 && spend > 0 ? revenue / spend : 0;
    const cpl = leads > 0 && spend > 0 ? spend / leads : 0;

    return {
      id: row.campaign_id,
      name: row.campaign_name,
      objective: row.objective ?? "",
      status: row.status ?? "",
      spend,
      impressions: parseInt(row.impressions ?? "0", 10),
      clicks: parseInt(row.clicks ?? "0", 10),
      leads,
      conversions,
      revenueAttributed: revenue,
      roas: parseFloat(roas.toFixed(2)),
      cpl: parseFloat(cpl.toFixed(2)),
      ctr: parseFloat(row.ctr ?? "0")
    };
  });
}

export async function testMetaConnection(accessToken: string, adAccountId: string, igUserId: string) {
  // Test ad account with user token (works fine)
  const adResponse = await fetch(
    `${META_API_BASE}/${encodeURIComponent(adAccountId)}?fields=name,account_id&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!adResponse.ok) throw new Error(`Ad account test failed: ${adResponse.status}`);
  const ad = await adResponse.json() as { name?: string };

  // Instagram Business Account IDs can't be queried directly with a User Token —
  // they require a Page Token. Validate the format instead, then try a media probe.
  let igUsername: string | undefined;
  if (!/^\d{10,20}$/.test(igUserId)) {
    throw new Error(`Instagram ID "${igUserId}" looks invalid — should be a 15-17 digit number starting with 17841`);
  }

  const { token: pageToken, pageId } = await getPageTokenForIg(accessToken, igUserId);

  if (pageId) {
    // Verify via page — uses pages_read_engagement, no instagram_basic needed
    const profileRes = await fetch(
      `${META_API_BASE}/${encodeURIComponent(pageId)}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(pageToken)}`
    );
    if (!profileRes.ok) {
      const errBody = await profileRes.json().catch(() => ({}) as Record<string, unknown>) as { error?: { message: string } };
      throw new Error(`Instagram test failed: ${errBody.error?.message ?? profileRes.status}`);
    }
    const profileData = await profileRes.json() as { instagram_business_account?: { username?: string } };
    igUsername = profileData.instagram_business_account?.username;
  } else {
    // Fallback: direct probe (requires instagram_basic)
    const igProbe = await fetch(
      `${META_API_BASE}/${encodeURIComponent(igUserId)}/media?limit=1&fields=id&access_token=${encodeURIComponent(pageToken)}`
    );
    if (igProbe.ok) {
      const profileProbe = await fetch(
        `${META_API_BASE}/${encodeURIComponent(igUserId)}?fields=username&access_token=${encodeURIComponent(pageToken)}`
      );
      if (profileProbe.ok) {
        const profile = await profileProbe.json() as { username?: string };
        igUsername = profile.username;
      }
    } else {
      const errBody = await igProbe.json().catch(() => ({}) as Record<string, unknown>) as { error?: { message: string } };
      throw new Error(`Instagram test failed: ${errBody.error?.message ?? igProbe.status}`);
    }
  }

  return {
    igUsername: igUsername ?? igUserId,
    adAccountName: ad.name || adAccountId,
  };
}

type MetaInsightsRow = {
  campaign_id: string;
  campaign_name: string;
  objective?: string;
  status?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
  action_values?: Array<{ action_type?: string; value?: string }>;
  ctr?: string;
};

function getActionValue(actions: Array<{ action_type?: string; value?: string }> | undefined, actionType: string): number {
  if (!Array.isArray(actions)) return 0;
  const action = actions.find((item) => item.action_type === actionType);
  return parseFloat(action?.value ?? "0");
}
