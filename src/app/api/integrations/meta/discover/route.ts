import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://graph.facebook.com/v21.0";

export type DiscoveredUser = {
  id: string;
  name: string;
  email: string;
};

export type DiscoveredPage = {
  pageId: string;
  pageName: string;
  fanCount: number;
  pageToken: string; // long-lived if user token is long-lived
  instagramId: string;
  instagramUsername: string;
  instagramFollowers: number;
  instagramMediaCount: number;
  instagramBio: string;
};

export type DiscoveredAdAccount = {
  id: string; // act_XXXXXXX
  name: string;
  currency: string;
  timezone: string;
  status: number; // 1=active, 2=disabled, 3=unsettled, 7=pending_risk_review, 9=in_grace_period, 100=pending_closure, 101=closed, 201=any_active, 202=any_closed
  statusLabel: string;
};

export type DiscoveredBusiness = {
  id: string;
  name: string;
};

export type DiscoverResult = {
  user: DiscoveredUser;
  pages: DiscoveredPage[];
  adAccounts: DiscoveredAdAccount[];
  businesses: DiscoveredBusiness[];
  tokenScopes: string[];
};

function adStatusLabel(status: number): string {
  const map: Record<number, string> = {
    1: "Active", 2: "Disabled", 3: "Unsettled", 7: "Pending review",
    9: "In grace period", 100: "Pending closure", 101: "Closed",
  };
  return map[status] ?? `Status ${status}`;
}

async function get<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { accessToken?: string };
  const token = (body.accessToken ?? "").trim();
  if (!token) return NextResponse.json({ error: "Access token required." }, { status: 400 });

  // ── Run top-level calls in parallel ──────────────────────────────────────
  const [meData, pagesData, adData, bizData, debugData] = await Promise.all([
    get<{ id: string; name: string; email?: string }>(
      "/me?fields=id,name,email", token
    ),
    get<{ data: Array<{ id: string; name: string; fan_count?: number; access_token?: string }> }>(
      "/me/accounts?fields=id,name,fan_count,access_token&limit=25", token
    ),
    get<{ data: Array<{ account_id?: string; id?: string; name: string; account_status?: number; currency?: string; timezone_name?: string }> }>(
      "/me/adaccounts?fields=account_id,name,account_status,currency,timezone_name&limit=25", token
    ),
    get<{ data: Array<{ id: string; name: string }> }>(
      "/me/businesses?fields=id,name&limit=10", token
    ),
    get<{ data: { app_id?: string; scopes?: string[]; is_valid?: boolean; expires_at?: number } }>(
      `/debug_token?input_token=${encodeURIComponent(token)}`, token
    ),
  ]);

  if (!meData) {
    return NextResponse.json(
      { error: "Invalid token or no permission. Make sure the token has pages_show_list and pages_read_engagement." },
      { status: 400 }
    );
  }

  // ── Enrich each page with Instagram details (parallel) ───────────────────
  const rawPages = pagesData?.data ?? [];
  const pages: DiscoveredPage[] = await Promise.all(
    rawPages.map(async (page): Promise<DiscoveredPage> => {
      const pageToken = page.access_token ?? token;

      const igData = await get<{
        instagram_business_account?: {
          id?: string;
          username?: string;
          followers_count?: number;
          media_count?: number;
          biography?: string;
        };
      }>(
        `/${page.id}?fields=instagram_business_account{id,username,followers_count,media_count,biography}`,
        pageToken
      );

      const iga = igData?.instagram_business_account;
      return {
        pageId: page.id,
        pageName: page.name,
        fanCount: page.fan_count ?? 0,
        pageToken,
        instagramId: iga?.id ?? "",
        instagramUsername: iga?.username ?? "",
        instagramFollowers: iga?.followers_count ?? 0,
        instagramMediaCount: iga?.media_count ?? 0,
        instagramBio: iga?.biography ?? "",
      };
    })
  );

  // Sort: pages with Instagram first
  pages.sort((a, b) => (b.instagramId ? 1 : 0) - (a.instagramId ? 1 : 0));

  // ── Ad accounts ───────────────────────────────────────────────────────────
  const adAccounts: DiscoveredAdAccount[] = (adData?.data ?? []).map((a) => {
    const rawId = a.account_id ?? (a.id ?? "").replace("act_", "");
    const status = a.account_status ?? 1;
    return {
      id: `act_${rawId}`,
      name: a.name,
      currency: a.currency ?? "USD",
      timezone: a.timezone_name ?? "",
      status,
      statusLabel: adStatusLabel(status),
    };
  });

  // ── Token scopes ──────────────────────────────────────────────────────────
  const tokenScopes = debugData?.data?.scopes ?? [];

  const result: DiscoverResult = {
    user: { id: meData.id, name: meData.name, email: meData.email ?? "" },
    pages,
    adAccounts,
    businesses: bizData?.data ?? [],
    tokenScopes,
  };

  return NextResponse.json(result);
}
