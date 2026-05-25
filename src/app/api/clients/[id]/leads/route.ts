import { NextResponse } from "next/server";
import { listLeads, createLead } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leads = await listLeads(params.id);
    return NextResponse.json({ leads });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leads." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as {
      name?: string;
      phone?: string;
      sourceCampaign?: string;
      note?: string;
      leadDate?: string;
    };

    const lead = await createLead(params.id, body);
    if (!lead) return NextResponse.json({ error: "Client not found." }, { status: 404 });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create lead." },
      { status: 500 }
    );
  }
}
