import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callClaudeJSON } from "@/lib/ai/claude";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ReviewTheme = {
  theme: string;
  frequency: "often" | "sometimes" | "once";
  examples: string[];
};

export type ReviewInsights = {
  overallSentiment: string;
  whatCustomersLove: ReviewTheme[];
  painPoints: ReviewTheme[];
  marketingAngles: string[];
  improvementSuggestions: string[];
  contentIdeas: string[];
};

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const brief = await getCurrentBrief(params.id);
  const reviews = brief?.gbpReviews ?? [];

  if (reviews.length === 0) {
    return NextResponse.json({ error: "No reviews available. Run a sync first to pull Google reviews." }, { status: 400 });
  }

  const reviewText = reviews
    .map((r) => `★${r.starRating} — ${r.reviewerDisplayName}: "${r.comment || "No text"}"`)
    .join("\n");

  const insights = await callClaudeJSON<ReviewInsights>(
    "review_response_draft",
    buildSystemPrompt(client, "strategy"),
    `Analyse these ${reviews.length} Google reviews for ${client.name} (${client.niche} in ${client.city}):

${reviewText}

Extract deep marketing intelligence from these reviews. Think like a senior brand strategist.

Return this EXACT JSON:
{
  "overallSentiment": "2-sentence summary of what customers collectively feel about this business",
  "whatCustomersLove": [
    { "theme": "specific thing they praise", "frequency": "often|sometimes|once", "examples": ["exact phrase from review 1", "exact phrase from review 2"] }
  ],
  "painPoints": [
    { "theme": "specific complaint or gap", "frequency": "often|sometimes|once", "examples": ["exact phrase"] }
  ],
  "marketingAngles": [
    "Specific angle for ads/content based on what customers actually say — use real language from reviews"
  ],
  "improvementSuggestions": [
    "Specific, actionable business improvement based on review patterns"
  ],
  "contentIdeas": [
    "Ready-to-execute content idea based on review themes — e.g. 'Reel: show the exact moment a customer reacts to their transformation'"
  ]
}

Rules:
- whatCustomersLove: 3-5 themes minimum
- painPoints: include only if there are actual complaints, otherwise empty array
- marketingAngles: 3-4 angles using real customer language as hooks
- improvementSuggestions: 2-3 specific actions
- contentIdeas: 3-4 immediately executable ideas`
  );

  return NextResponse.json({ insights });
}
