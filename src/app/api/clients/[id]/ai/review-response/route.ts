import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callGeminiJSON } from "@/lib/ai/gemini";
import { getClient } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewResponsePayload = {
  reviewId?: string;
  reviewText?: string;
  starRating?: number;
  reviewerName?: string;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const payload = await request.json().catch(() => ({})) as ReviewResponsePayload;
  const result = await callGeminiJSON<{ response: string; tone: string }>(
    "review_response_draft",
    buildSystemPrompt(client, "strategy"),
    `Draft a warm, local Google Business Profile review reply for ${client.name}.
Reviewer: ${payload.reviewerName || "Customer"}
Rating: ${payload.starRating || 0}
Review ID: ${payload.reviewId || ""}
Review text: ${payload.reviewText || ""}
Return JSON: { "response": "reply text", "tone": "thank_and_invite_back|apologize_and_resolve|acknowledge_and_improve" }`
  );
  return NextResponse.json(result);
}
