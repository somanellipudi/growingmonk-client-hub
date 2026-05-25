import { NextResponse } from "next/server";
import { google } from "googleapis";
import { completeGoogleBusinessOAuth } from "@/lib/sync/googleBusinessOAuth";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthState =
  | { clientId: string; placeId?: string }
  | { mode: "discover"; returnTo: string };

function decodeState(raw: string): OAuthState {
  const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, string>;
  if (parsed.mode === "discover") return { mode: "discover", returnTo: parsed.returnTo ?? "/clients/new" };
  if (!parsed.clientId) throw new Error("OAuth state is missing client id.");
  return { clientId: parsed.clientId, placeId: parsed.placeId };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const base = env.nextAuthUrl.replace(/\/$/, "");

  if (error) return redirectWithMessage("", `Google OAuth failed: ${error}`);
  if (!code || !state) return redirectWithMessage("", "Google OAuth callback is missing code or state.");

  let decoded: OAuthState;
  try {
    decoded = decodeState(state);
  } catch {
    return redirectWithMessage("", "Invalid OAuth state.");
  }

  // ── Discover mode — exchange code, list all locations, redirect back with data ──
  if ("mode" in decoded && decoded.mode === "discover") {
    try {
      const redirectUri =
        env.googleOAuthRedirectUri ||
        `${base}/api/integrations/gbp/oauth/callback`;

      const oauth2 = new google.auth.OAuth2(
        env.googleOAuthClientId,
        env.googleOAuthClientSecret,
        redirectUri
      );
      const { tokens } = await oauth2.getToken(code);
      const refreshToken = tokens.refresh_token;
      if (!refreshToken) throw new Error("Google did not return a refresh token. Try revoking access at myaccount.google.com/permissions and reconnecting.");

      const returnTo = decoded.returnTo;
      const sep = returnTo.includes("?") ? "&" : "?";
      return NextResponse.redirect(
        `${base}${returnTo}${sep}gbpRefreshToken=${encodeURIComponent(refreshToken)}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "GBP discover OAuth failed.";
      return NextResponse.redirect(`${base}${decoded.returnTo}?gbpError=${encodeURIComponent(msg)}`);
    }
  }

  // ── Normal per-client connect flow ────────────────────────────────────────
  try {
    const result = await completeGoogleBusinessOAuth({ code, state });

    if (result.type === "picker") {
      return NextResponse.redirect(
        `${base}/clients/${result.clientId}/gbp-select?accountId=${encodeURIComponent(result.accountId)}`
      );
    }

    return redirectWithMessage(result.clientId, `Google Business connected: ${result.locationName}`);
  } catch (callbackError) {
    return redirectWithMessage("", callbackError instanceof Error ? callbackError.message : "Unable to complete Google Business connection.");
  }
}

function redirectWithMessage(clientId: string, message: string) {
  const base = env.nextAuthUrl.replace(/\/$/, "");
  const path = clientId
    ? `/clients/${clientId}?edit=1&gbpMessage=${encodeURIComponent(message)}`
    : `/dashboard?gbpMessage=${encodeURIComponent(message)}`;
  return NextResponse.redirect(`${base}${path}`);
}
