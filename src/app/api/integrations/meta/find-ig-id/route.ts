import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/server/repositories";

const META_BASE = "https://graph.facebook.com/v21.0";

type IgAccount = { id: string; username?: string };
type PageEntry = { id: string; name?: string; access_token?: string };

function saveAndReturn(
  clientId: string,
  save: boolean,
  account: IgAccount,
  method: string,
  extra: Record<string, unknown>,
  log: string[]
) {
  const savePromise = save && account.id ? updateClient(clientId, { metaIgUserId: account.id }) : Promise.resolve();
  if (save) log.push(`   ✓ Saved to client record.`);
  return savePromise.then(() =>
    NextResponse.json({ success: true, igAccountId: account.id, igUsername: account.username, method, log, ...extra })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { clientId: string; save?: boolean };
    const client = await getClient(body.clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const token = client.metaAccessToken;
    if (!token) return NextResponse.json({ error: "No Meta access token stored for this client" }, { status: 400 });

    const handle = client.instagramHandle?.toLowerCase().replace(/^@/, "");
    const log: string[] = [];

    // ── Step 0: Ad account linked Instagram actors ────────────────────────────
    // Works if the token has ads_read — which it does since campaigns are visible
    const adAccountId = client.metaAdAccountId;
    if (adAccountId) {
      const normalizedAdId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      log.push(`0. Querying Instagram accounts linked to ad account ${normalizedAdId}…`);

      // Try /act_XXX/instagram_accounts
      const adIgRes = await fetch(
        `${META_BASE}/${normalizedAdId}/instagram_accounts?fields=id,username&access_token=${encodeURIComponent(token)}`
      );
      const adIgData = await adIgRes.json() as { data?: IgAccount[]; error?: { message: string } };

      if (adIgRes.ok && adIgData.data?.length) {
        log.push(`   Found ${adIgData.data.length} account(s): ${adIgData.data.map((a) => `@${a.username ?? "?"} (${a.id})`).join(", ")}`);
        const match = handle
          ? adIgData.data.find((a) => a.username?.toLowerCase() === handle) ?? adIgData.data[0]
          : adIgData.data[0];
        if (match?.id) {
          log.push(`   ✓ Found via ad account: ID=${match.id} @${match.username ?? "?"}`);
          return saveAndReturn(body.clientId, !!body.save, match, "ad_account_instagram_actors", { adAccountId: normalizedAdId }, log);
        }
      } else if (adIgData.error) {
        log.push(`   Ad account IG actors error: ${adIgData.error.message}`);
      } else {
        log.push(`   No Instagram accounts linked to this ad account`);
      }

      // Also try /act_XXX/actor_instagram_user_ids (newer endpoint name)
      const adActorRes = await fetch(
        `${META_BASE}/${normalizedAdId}/adaccountuser?fields=id,name&access_token=${encodeURIComponent(token)}`
      );
      const adActorData = await adActorRes.json() as { data?: Array<{ id: string; name?: string }>; error?: { message: string } };
      if (adActorData.error) log.push(`   /adaccountuser: ${adActorData.error.message}`);
    }

    // ── Step 1: /me/instagram_accounts — direct path, no page token needed ───────
    log.push("1. Trying /me/instagram_accounts (direct path)…");
    const directRes = await fetch(
      `${META_BASE}/me/instagram_accounts?fields=id,username&limit=25&access_token=${encodeURIComponent(token)}`
    );
    const directData = await directRes.json() as { data?: IgAccount[]; error?: { message: string; code?: number } };

    if (directRes.ok && directData.data?.length) {
      log.push(`   Found ${directData.data.length} account(s): ${directData.data.map((a) => `@${a.username ?? "?"} (${a.id})`).join(", ")}`);

      const match = handle
        ? directData.data.find((a) => a.username?.toLowerCase() === handle)
        : directData.data[0];

      if (match?.id) {
        log.push(`   ✓ Found: ID=${match.id} username=@${match.username ?? "unknown"}`);
        return saveAndReturn(body.clientId, !!body.save, match, "direct_instagram_accounts", {}, log);
      }
      log.push(`   Account list returned but no match for handle "${handle ?? "(none)"}"`);
    } else if (directData.error) {
      log.push(`   /me/instagram_accounts error: ${directData.error.message}`);
      // Code 100 on this endpoint = instagram_basic permission is missing
      if (directData.error.code === 100 && directData.error.message.includes("nonexisting field")) {
        log.push("   ⚠ TOKEN IS MISSING 'instagram_basic' PERMISSION — all Instagram paths will fail");
        log.push("   Fix: Regenerate token in Graph API Explorer with instagram_basic added");
        return NextResponse.json({
          success: false,
          missingPermission: "instagram_basic",
          log,
          error: "Token is missing the 'instagram_basic' permission. Regenerate your Meta access token with instagram_basic, pages_show_list, and pages_read_engagement added.",
        });
      }
    } else {
      log.push(`   /me/instagram_accounts returned 0 accounts`);
    }

    // ── Step 2: Get pages with page-level tokens ───────────────────────────────
    log.push("2. Fetching managed pages with page-level tokens…");
    const pagesRes = await fetch(
      `${META_BASE}/me/accounts?fields=id,name,access_token&limit=25&access_token=${encodeURIComponent(token)}`
    );
    const pagesData = await pagesRes.json() as { data?: PageEntry[]; error?: { message: string } };

    if (!pagesRes.ok || pagesData.error) {
      log.push(`   Could not fetch pages: ${pagesData.error?.message ?? pagesRes.status}`);
    } else {
      const pages: PageEntry[] = pagesData.data ?? [];
      log.push(`   Found ${pages.length} page(s): ${pages.map((p) => `"${p.name}" (${p.id})`).join(", ")}`);

      for (const page of pages) {
        const pageToken = page.access_token;
        if (!pageToken) {
          log.push(`   Page "${page.name}" — no page token (missing manage_pages permission)`);
          continue;
        }

        // Try instagram_business_account
        log.push(`3. Querying instagram_business_account for "${page.name}" (${page.id})…`);
        const igRes = await fetch(
          `${META_BASE}/${encodeURIComponent(page.id)}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(pageToken)}`
        );
        const igData = await igRes.json() as { instagram_business_account?: IgAccount; error?: { message: string } };

        if (igData.instagram_business_account?.id) {
          const account = igData.instagram_business_account;
          log.push(`   ✓ Found via instagram_business_account: ID=${account.id} @${account.username ?? "?"}`);
          return saveAndReturn(body.clientId, !!body.save, account, "instagram_business_account", { pageId: page.id, pageName: page.name }, log);
        }
        if (igData.error) log.push(`   instagram_business_account error: ${igData.error.message}`);
        else log.push(`   instagram_business_account: field not present`);

        // Try connected_instagram_account
        log.push(`   Trying connected_instagram_account…`);
        const connRes = await fetch(
          `${META_BASE}/${encodeURIComponent(page.id)}?fields=connected_instagram_account{id,username}&access_token=${encodeURIComponent(pageToken)}`
        );
        const connData = await connRes.json() as { connected_instagram_account?: IgAccount; error?: { message: string } };

        if (connData.connected_instagram_account?.id) {
          const account = connData.connected_instagram_account;
          log.push(`   ✓ Found via connected_instagram_account: ID=${account.id} @${account.username ?? "?"}`);
          return saveAndReturn(body.clientId, !!body.save, account, "connected_instagram_account", { pageId: page.id, pageName: page.name }, log);
        }
        if (connData.error) log.push(`   connected_instagram_account error: ${connData.error.message}`);
        else log.push(`   connected_instagram_account: not found`);
      }
    }

    // ── Step 3: Business Manager path ─────────────────────────────────────────
    log.push("4. Trying Business Manager path…");
    const bizRes = await fetch(
      `${META_BASE}/me/businesses?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
    const bizData = await bizRes.json() as { data?: Array<{ id: string; name?: string }>; error?: { message: string } };

    if (bizRes.ok && bizData.data?.length) {
      for (const biz of bizData.data) {
        log.push(`   Checking business "${biz.name}" (${biz.id})…`);
        const igAccRes = await fetch(
          `${META_BASE}/${encodeURIComponent(biz.id)}/instagram_accounts?fields=id,username&access_token=${encodeURIComponent(token)}`
        );
        const igAccData = await igAccRes.json() as { data?: IgAccount[]; error?: { message: string } };

        if (igAccData.data?.length) {
          const match = handle
            ? igAccData.data.find((a) => a.username?.toLowerCase() === handle) ?? igAccData.data[0]
            : igAccData.data[0];

          if (match?.id) {
            log.push(`   ✓ Found via Business Manager: ID=${match.id} @${match.username ?? "?"}`);
            return saveAndReturn(body.clientId, !!body.save, match, "business_manager", { businessId: biz.id, businessName: biz.name }, log);
          }
        }
        if (igAccData.error) log.push(`   Business Manager IG accounts error: ${igAccData.error.message}`);
      }
    } else if (bizData.error) {
      log.push(`   /me/businesses error: ${bizData.error.message}`);
    }

    // ── Step 4: /me/accounts with instagram fields directly ───────────────────
    log.push("5. Trying /me/accounts with instagram fields on pages…");
    const acctRes = await fetch(
      `${META_BASE}/me/accounts?fields=id,name,instagram_business_account{id,username},connected_instagram_account{id,username}&limit=25&access_token=${encodeURIComponent(token)}`
    );
    const acctData = await acctRes.json() as {
      data?: Array<PageEntry & { instagram_business_account?: IgAccount; connected_instagram_account?: IgAccount }>;
      error?: { message: string };
    };

    if (acctRes.ok && acctData.data?.length) {
      for (const page of acctData.data) {
        const account = page.instagram_business_account ?? page.connected_instagram_account;
        if (account?.id) {
          log.push(`   ✓ Found on page "${page.name}": ID=${account.id} @${account.username ?? "?"}`);
          return saveAndReturn(body.clientId, !!body.save, account, "accounts_with_ig_fields", { pageId: page.id, pageName: page.name }, log);
        }
      }
      log.push(`   No IG account found on any of the ${acctData.data.length} page(s)`);
    }

    // ── All paths exhausted ────────────────────────────────────────────────────
    log.push("");
    log.push("✗ Could not find Instagram Business Account ID via any method.");
    log.push("Most likely cause: the token is missing required permissions.");
    log.push("Go to developers.facebook.com/tools/explorer and generate a new token with:");
    log.push("  instagram_basic, instagram_manage_insights, pages_show_list,");
    log.push("  pages_read_engagement, business_management");

    return NextResponse.json({ success: false, log });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
