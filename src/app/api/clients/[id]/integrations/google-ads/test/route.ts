import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { pullGoogleAdsCampaigns } from "@/lib/sync/googleAdsApi";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    if (!client.googleAdsCustomerId) {
      return NextResponse.json({ success: false, error: "No Google Ads Customer ID set for this client." }, { status: 400 });
    }
    if (!env.googleAdsDeveloperToken) {
      return NextResponse.json({ success: false, error: "GOOGLE_ADS_DEVELOPER_TOKEN is not configured on the server." }, { status: 500 });
    }
    const campaigns = await pullGoogleAdsCampaigns(client);
    return NextResponse.json({
      success: true,
      customerId: client.googleAdsCustomerId,
      managerId: client.googleAdsManagerId ?? null,
      campaignCount: campaigns.length,
      message: campaigns.length > 0
        ? `Connected — ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} found`
        : "Connected — no active campaigns in the last 30 days",
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Google Ads connection failed." }, { status: 400 });
  }
}
