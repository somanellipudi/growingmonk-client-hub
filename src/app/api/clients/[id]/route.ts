import { NextResponse } from "next/server";
import { deleteClient, getClient, updateClient } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json();
    const client = await updateClient(params.id, payload);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update client." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const client = await deleteClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json({ client });
}
