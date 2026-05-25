import { NextResponse } from "next/server";
import { getClient } from "@/lib/server/repositories";
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!isWhatsAppConfigured()) {
      return NextResponse.json({ error: "WhatsApp Business API is not configured." }, { status: 503 });
    }

    const body = await request.json() as { phone?: string; message?: string };
    const { phone, message } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Recipient phone number is required." }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message text is required." }, { status: 400 });
    }

    const client = await getClient(params.id);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const result = await sendWhatsAppText({ to: phone.trim(), text: message.trim() });
    return NextResponse.json({ success: true, messageId: result.messageId, to: result.to });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message." },
      { status: 500 }
    );
  }
}
