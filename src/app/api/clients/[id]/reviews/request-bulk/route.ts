import { NextResponse } from "next/server";
import { getClient, logReviewRequest, wasRecentlyRequested } from "@/lib/server/repositories";
import { sendWhatsAppTemplate, bodyParams, isWhatsAppConfigured } from "@/lib/whatsapp/api";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildReviewLink(placeId?: string) {
  if (!placeId) return "https://g.page/r/review";
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

type RecipientInput = { phone: string; customerName?: string };

type RecipientResult = {
  phone: string;
  customerName?: string;
  status: "sent" | "skipped_recent" | "error";
  reason?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isWhatsAppConfigured()) {
      return NextResponse.json({ error: "WhatsApp Business API is not configured." }, { status: 503 });
    }

    const body = await request.json() as { recipients?: RecipientInput[] };
    const recipients = body.recipients ?? [];

    if (!recipients.length) {
      return NextResponse.json({ error: "No recipients provided." }, { status: 400 });
    }
    if (recipients.length > 100) {
      return NextResponse.json({ error: "Maximum 100 recipients per batch." }, { status: 400 });
    }

    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const reviewLink = buildReviewLink(client.gbpPlaceId);
    const results: RecipientResult[] = [];

    for (const rec of recipients) {
      const phone = rec.phone.trim();
      if (!phone) continue;

      // Dedup: skip if sent in last 30 days
      const recent = await wasRecentlyRequested(client.id, phone, 30);
      if (recent) {
        results.push({ phone, customerName: rec.customerName, status: "skipped_recent", reason: "Sent within last 30 days" });
        continue;
      }

      try {
        await sendWhatsAppTemplate({
          to: phone,
          templateName: env.whatsappReviewRequestTemplate,
          languageCode: "en",
          components: [bodyParams([
            rec.customerName?.trim() || "there",
            client.name,
            reviewLink,
          ])],
        });
        await logReviewRequest(client.id, phone, reviewLink, rec.customerName);
        results.push({ phone, customerName: rec.customerName, status: "sent" });
      } catch (error) {
        results.push({
          phone,
          customerName: rec.customerName,
          status: "error",
          reason: error instanceof Error ? error.message : "Send failed",
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "skipped_recent").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({ summary: { sent, skipped, errors, total: results.length }, results, reviewLink });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send review requests." },
      { status: 500 }
    );
  }
}
