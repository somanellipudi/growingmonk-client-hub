import { NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const client = await createClient(payload);
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create client." }, { status: 400 });
  }
}
