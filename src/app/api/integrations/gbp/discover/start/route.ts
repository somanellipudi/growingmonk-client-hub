import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

// Standalone discover OAuth — no client ID needed.
// State encodes { mode: "discover", returnTo } so the shared callback can
// distinguish this from the per-client connect flow.
export async function GET(request: Request) {
  if (!env.googleOAuthClientId || !env.googleOAuthClientSecret) {
    return NextResponse.json({ error: "Google OAuth not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/clients/new";

  const redirectUri =
    env.googleOAuthRedirectUri ||
    `${env.nextAuthUrl.replace(/\/$/, "")}/api/integrations/gbp/oauth/callback`;

  const oauth2 = new google.auth.OAuth2(
    env.googleOAuthClientId,
    env.googleOAuthClientSecret,
    redirectUri
  );

  const state = Buffer.from(
    JSON.stringify({ mode: "discover", returnTo }),
    "utf8"
  ).toString("base64url");

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GBP_SCOPE],
    state,
  });

  return NextResponse.redirect(authUrl);
}
