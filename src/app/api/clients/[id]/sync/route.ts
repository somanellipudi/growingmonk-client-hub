import { NextResponse } from "next/server";
import { syncClient } from "@/lib/sync/syncClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const brief = await syncClient(params.id);
    return NextResponse.json({ brief });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync client." },
      { status: 500 }
    );
  }
}
