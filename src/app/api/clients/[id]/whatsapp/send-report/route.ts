import { NextResponse } from "next/server";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";
import { sendWhatsAppTemplate, bodyParams, isWhatsAppConfigured } from "@/lib/whatsapp/api";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${Math.round(amount).toLocaleString("en-IN")}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isWhatsAppConfigured()) {
      return NextResponse.json({ error: "WhatsApp Business API is not configured." }, { status: 503 });
    }

    const body = await request.json() as { phone?: string };
    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    // Use provided phone, fall back to client's saved WhatsApp number or contact phone
    const phone = body.phone?.trim() || client.whatsappNumber || client.contactPhone;
    if (!phone) {
      return NextResponse.json(
        { error: "No phone number provided and client has no saved WhatsApp number." },
        { status: 400 }
      );
    }

    const brief = await getCurrentBrief(params.id);
    if (!brief) {
      return NextResponse.json({ error: "No brief found for this client. Run a sync first." }, { status: 404 });
    }

    const { metrics, brief: ai } = brief;

    // Build concise report text — used as template body parameters
    // Template `weekly_report` expects 7 variables:
    //   {{1}} client name
    //   {{2}} posts count
    //   {{3}} avg reach
    //   {{4}} new reviews
    //   {{5}} ad spend
    //   {{6}} leads count
    //   {{7}} top insight (one sentence)
    const templateParams = bodyParams([
      client.name,
      String(metrics.totalPostsThisWeek),
      String(Math.round(metrics.avgInstagramReach)),
      String(metrics.newReviewCount),
      formatCurrency(metrics.totalAdSpend, client.currency),
      String(metrics.totalLeads),
      ai.topInsight.slice(0, 200),
    ]);

    const result = await sendWhatsAppTemplate({
      to: phone,
      templateName: env.whatsappWeeklyReportTemplate,
      languageCode: "en",
      components: [templateParams],
    });

    return NextResponse.json({ success: true, messageId: result.messageId, to: result.to });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send report." },
      { status: 500 }
    );
  }
}
