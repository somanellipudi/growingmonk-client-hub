import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/server/repositories";

const META_BASE = "https://graph.facebook.com/v21.0";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { clientId: string; igAccountId: string };
    if (!body.clientId || !body.igAccountId) {
      return NextResponse.json({ error: "clientId and igAccountId required" }, { status: 400 });
    }

    const client = await getClient(body.clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const id = body.igAccountId.trim();
    if (!/^\d{10,20}$/.test(id)) {
      return NextResponse.json({ error: "Invalid Instagram account ID format — must be a numeric string" }, { status: 400 });
    }

    // Optionally verify the ID works before saving, if a token is present
    let username: string | undefined;
    if (client.metaAccessToken) {
      const verifyRes = await fetch(
        `${META_BASE}/${encodeURIComponent(id)}?fields=username,id&access_token=${encodeURIComponent(client.metaAccessToken)}`
      ).catch(() => null);
      if (verifyRes?.ok) {
        const data = await verifyRes.json() as { id?: string; username?: string; error?: { message: string } };
        if (data.username) username = data.username;
      }
    }

    await updateClient(body.clientId, { metaIgUserId: id });
    return NextResponse.json({ success: true, igAccountId: id, igUsername: username });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
