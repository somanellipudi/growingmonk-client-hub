import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { sendWhatsAppTemplate, bodyParams, isWhatsAppConfigured } from "@/lib/whatsapp/api";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildReviewLink(placeId?: string): string {
  if (!placeId) return "https://g.page/r/review";
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isWhatsAppConfigured()) {
      return NextResponse.json({ error: "WhatsApp Business API is not configured." }, { status: 503 });
    }

    const body = await request.json() as { phone?: string; customerName?: string };
    const { phone, customerName } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Customer phone number is required." }, { status: 400 });
    }

    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const reviewLink = buildReviewLink(client.gbpPlaceId);

    // Template `review_request` expects 3 variables:
    //   {{1}} customer first name (or "there" if not provided)
    //   {{2}} business name
    //   {{3}} Google review link
    const templateParams = bodyParams([
      customerName?.trim() || "there",
      client.name,
      reviewLink,
    ]);

    const result = await sendWhatsAppTemplate({
      to: phone.trim(),
      templateName: env.whatsappReviewRequestTemplate,
      languageCode: "en",
      components: [templateParams],
    });

    return NextResponse.json({ success: true, messageId: result.messageId, to: result.to, reviewLink });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send review request." },
      { status: 500 }
    );
  }
}
