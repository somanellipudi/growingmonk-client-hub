import { NextResponse } from "next/server";
import { updateLeadOutcome } from "@/lib/server/repositories";
import type { LeadOutcome } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_OUTCOMES: LeadOutcome[] = ["new", "contacted", "booked", "showed", "converted", "lost"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; leadId: string } }
) {
  try {
    const body = await request.json() as { outcome?: string; note?: string };

    if (!body.outcome || !VALID_OUTCOMES.includes(body.outcome as LeadOutcome)) {
      return NextResponse.json(
        { error: `outcome must be one of: ${VALID_OUTCOMES.join(", ")}` },
        { status: 400 }
      );
    }

    const lead = await updateLeadOutcome(
      params.id,
      params.leadId,
      body.outcome as LeadOutcome,
      body.note
    );
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lead." },
      { status: 500 }
    );
  }
}
