import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";

const META_BASE = "https://graph.facebook.com/v21.0";

export type DiagnosticCheck = {
  name: string;
  status: "ok" | "fail" | "warn" | "skip";
  message: string;
  detail?: string;
  fix?: string;
};

export type MetaDiagnosticResult = {
  checks: DiagnosticCheck[];
  overallStatus: "healthy" | "partial" | "broken";
  tokenExpiry?: string;
  igAccountId?: string;
  igUsername?: string;
  adAccountName?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as { clientId: string };
  const client = await getClient(body.clientId);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const token = client.metaAccessToken;
  const checks: DiagnosticCheck[] = [];
  let igAccountId: string | undefined;
  let igUsername: string | undefined;
  let adAccountName: string | undefined;
  let tokenExpiry: string | undefined;

  // ── 1. Token validity ────────────────────────────────────────────────────────
  if (!token) {
    checks.push({ name: "Access token", status: "fail", message: "No Meta access token stored", fix: "Go to Edit → paste your Meta access token" });
  } else {
    const debugRes = await fetch(`${META_BASE}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`).catch(() => null);
    if (!debugRes?.ok) {
      const meRes = await fetch(`${META_BASE}/me?access_token=${encodeURIComponent(token)}`);
      if (meRes.ok) {
        checks.push({ name: "Access token", status: "ok", message: "Token is valid" });
      } else {
        const err = await meRes.json() as { error?: { message: string } };
        checks.push({ name: "Access token", status: "fail", message: "Token is invalid or expired", detail: err.error?.message, fix: "Generate a new long-lived token in Graph API Explorer and update in Edit" });
      }
    } else {
      const dbg = await debugRes.json() as { data?: { is_valid?: boolean; expires_at?: number; error?: { message: string } } };
      const d = dbg.data;
      if (d?.is_valid === false || d?.error) {
        checks.push({ name: "Access token", status: "fail", message: d?.error?.message ?? "Token is invalid", fix: "Refresh the token in Meta Graph API Explorer" });
      } else {
        if (d?.expires_at) {
          tokenExpiry = new Date(d.expires_at * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          const daysLeft = Math.round((d.expires_at * 1000 - Date.now()) / 86400000);
          checks.push({ name: "Access token", status: daysLeft < 14 ? "warn" : "ok", message: daysLeft < 14 ? `Token expires in ${daysLeft} days` : `Token valid, expires ${tokenExpiry}`, fix: daysLeft < 14 ? "Refresh token soon" : undefined });
        } else {
          checks.push({ name: "Access token", status: "ok", message: "Token is valid" });
        }
      }
    }
  }

  if (!token) {
    const overall = "broken";
    return NextResponse.json({ checks, overallStatus: overall });
  }

  // ── 2. Instagram ID check ────────────────────────────────────────────────────
  const storedIgId = client.metaIgUserId;
  if (!storedIgId) {
    checks.push({ name: "Instagram Account ID", status: "fail", message: "No Instagram account ID stored", fix: "Use the 'Detect Instagram ID' button below" });
  } else {
    // Check if it looks like a Page ID (Instagram IDs start with 17841 and are 15-17 digits)
    const looksLikePageId = !storedIgId.startsWith("17841") && storedIgId.length < 16;
    if (looksLikePageId) {
      checks.push({ name: "Instagram Account ID", status: "warn", message: `Stored ID "${storedIgId}" appears to be a Facebook Page ID, not an Instagram Business Account ID`, detail: "Instagram Business Account IDs start with 17841… and are 15-17 digits", fix: "Use the 'Detect Instagram ID' button to auto-find and save the correct ID" });
    }

    // Find the Facebook Page linked to this IG account so we can use the page-through approach
    // (avoids needing instagram_basic — pages_read_engagement is sufficient)
    let linkedPageId: string | undefined;
    let linkedPageToken: string | undefined;
    const pagesRes = await fetch(`${META_BASE}/me/accounts?fields=id,name,access_token&limit=25&access_token=${encodeURIComponent(token)}`);
    if (pagesRes.ok) {
      const pages = await pagesRes.json() as { data?: Array<{ id: string; name?: string; access_token?: string }> };
      for (const page of pages.data ?? []) {
        if (!page.access_token) continue;
        const checkRes = await fetch(`${META_BASE}/${page.id}?fields=instagram_business_account{id}&access_token=${encodeURIComponent(page.access_token)}`);
        if (!checkRes.ok) continue;
        const checkData = await checkRes.json() as { instagram_business_account?: { id: string } };
        if (checkData.instagram_business_account?.id === storedIgId) {
          linkedPageId = page.id;
          linkedPageToken = page.access_token;
          break;
        }
      }
    }

    if (linkedPageId && linkedPageToken) {
      // Use page-through approach to read media
      const pageRes = await fetch(
        `${META_BASE}/${encodeURIComponent(linkedPageId)}?fields=instagram_business_account{username,media.limit(1){id}}&access_token=${encodeURIComponent(linkedPageToken)}`
      );
      const pageData = await pageRes.json() as { instagram_business_account?: { username?: string; media?: { data?: unknown[] }; error?: { message: string; code?: number } }; error?: { message: string; code?: number } };

      if (!pageRes.ok || pageData.error) {
        const errMsg = pageData.error?.message ?? `HTTP ${pageRes.status}`;
        checks.push({ name: "Instagram posts", status: "fail", message: `Cannot read Instagram posts: ${errMsg}`, detail: errMsg, fix: "Check token permissions: needs pages_read_engagement and instagram_manage_insights" });
      } else {
        const mediaCount = pageData.instagram_business_account?.media?.data?.length ?? 0;
        igUsername = pageData.instagram_business_account?.username;
        igAccountId = storedIgId;
        if (mediaCount === 0) {
          checks.push({ name: "Instagram posts", status: "warn", message: "Connected — but no posts found in the account", detail: "The account may have no posts accessible to this token" });
        } else {
          checks.push({ name: "Instagram posts", status: "ok", message: `Connected — can read posts`, detail: `Found ${mediaCount} post(s) from API` });
        }
      }
    } else {
      // Fallback: direct access (requires instagram_basic)
      const mediaRes = await fetch(`${META_BASE}/${encodeURIComponent(storedIgId)}/media?limit=1&access_token=${encodeURIComponent(token)}`);
      const mediaData = await mediaRes.json() as { data?: unknown[]; error?: { message: string; code?: number } };

      if (!mediaRes.ok || mediaData.error) {
        const errMsg = mediaData.error?.message ?? `HTTP ${mediaRes.status}`;
        const isPageIdError = errMsg.includes("nonexisting field") || errMsg.includes("does not exist") || mediaData.error?.code === 100;
        checks.push({
          name: "Instagram posts",
          status: "fail",
          message: isPageIdError
            ? `Instagram ID is wrong — this looks like a Facebook Page ID, not an IG account`
            : `Cannot read Instagram posts: ${errMsg}`,
          detail: errMsg,
          fix: isPageIdError
            ? "Click 'Detect Instagram ID' to auto-find the correct Instagram Business Account ID"
            : "Check that the Instagram Business Account is linked to a Facebook Page you manage"
        });
      } else if ((mediaData.data?.length ?? 0) === 0) {
        checks.push({ name: "Instagram posts", status: "warn", message: "Connected — but no posts found in the account", detail: "The account may have no posts, or the account has no posts accessible to this token" });
        igAccountId = storedIgId;
      } else {
        checks.push({ name: "Instagram posts", status: "ok", message: `Connected — can read posts`, detail: `Found ${mediaData.data?.length ?? 0} post(s) from API` });
        igAccountId = storedIgId;

        const profileRes = await fetch(`${META_BASE}/${encodeURIComponent(storedIgId)}?fields=username&access_token=${encodeURIComponent(token)}`);
        if (profileRes.ok) {
          const profile = await profileRes.json() as { username?: string };
          igUsername = profile.username;
        }
      }
    }
  }

  // ── 3. Ad Account check ───────────────────────────────────────────────────────
  const adAccountId = client.metaAdAccountId;
  if (!adAccountId) {
    checks.push({ name: "Ad Account", status: "fail", message: "No ad account ID stored", fix: "Go to Edit → add your Meta Ad Account ID (format: act_XXXXXXXXX)" });
  } else {
    const acctRes = await fetch(`${META_BASE}/${encodeURIComponent(adAccountId)}?fields=name,account_status&access_token=${encodeURIComponent(token)}`);
    const acctData = await acctRes.json() as { name?: string; account_status?: number; error?: { message: string } };

    if (!acctRes.ok || acctData.error) {
      checks.push({ name: "Ad Account", status: "fail", message: `Cannot access ad account: ${acctData.error?.message ?? acctRes.status}`, fix: "Check the ad account ID and token has ads_read permission" });
    } else {
      adAccountName = acctData.name;
      checks.push({ name: "Ad Account", status: "ok", message: `Connected — "${acctData.name}"`, detail: acctData.account_status === 1 ? "Active" : `Status: ${acctData.account_status}` });
    }

    // Test campaigns
    const campRes = await fetch(`${META_BASE}/${encodeURIComponent(adAccountId)}/campaigns?fields=id,name,status&limit=5&access_token=${encodeURIComponent(token)}`);
    const campData = await campRes.json() as { data?: Array<{ id: string; name: string; status: string }>; error?: { message: string } };

    if (!campRes.ok || campData.error) {
      checks.push({ name: "Ad Campaigns", status: "fail", message: `Cannot read campaigns: ${campData.error?.message ?? campRes.status}`, fix: "Token needs ads_read permission" });
    } else if ((campData.data?.length ?? 0) === 0) {
      checks.push({ name: "Ad Campaigns", status: "warn", message: "No campaigns in this ad account", detail: "Account has no campaigns, or all campaigns were deleted" });
    } else {
      const activeCount = campData.data?.filter((c) => c.status === "ACTIVE").length ?? 0;
      checks.push({ name: "Ad Campaigns", status: activeCount > 0 ? "ok" : "warn", message: `Found ${campData.data?.length} campaign(s), ${activeCount} active`, detail: campData.data?.map((c) => `"${c.name}" (${c.status})`).join(", ") });
    }
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const overallStatus = failCount > 0 ? "broken" : warnCount > 0 ? "partial" : "healthy";

  return NextResponse.json({ checks, overallStatus, tokenExpiry, igAccountId, igUsername, adAccountName } satisfies MetaDiagnosticResult);
}
