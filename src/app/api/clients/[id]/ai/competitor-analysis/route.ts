import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callClaudeJSON } from "@/lib/ai/claude";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CompetitorProfile = {
  name: string;
  perceivedPositioning: string;
  likelyStrengths: string[];
  gaps: string[];
};

export type CompetitorAnalysis = {
  marketLandscape: string;
  competitors: CompetitorProfile[];
  positioningGaps: string[];
  differentiationAngles: string[];
  urgentActions: string[];
  ownableNarrative: string;
};

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  if (!client.keyCompetitors || client.keyCompetitors.length === 0) {
    return NextResponse.json({ error: "No competitors listed. Add competitor names in Edit → client profile." }, { status: 400 });
  }

  const brief = await getCurrentBrief(params.id);
  const reviews = brief?.gbpReviews ?? [];
  const positiveThemes = reviews
    .filter((r) => r.starRating >= 4)
    .map((r) => `"${(r.comment ?? "").slice(0, 80)}"`)
    .slice(0, 4)
    .join(", ");

  const analysis = await callClaudeJSON<CompetitorAnalysis>(
    "weekly_brief_generation",
    buildSystemPrompt(client, "strategy"),
    `You are doing a competitive intelligence analysis for ${client.name}.

CLIENT:
Business: ${client.name}
Niche: ${client.nicheSubtype || client.niche}
City: ${client.city}, ${client.country}
Target customer: ${client.targetCustomer || "not specified"}
Brand voice: ${client.brandVoice || "not specified"}
Business goals: ${client.businessGoals || "not specified"}
${positiveThemes ? `What customers say they love: ${positiveThemes}` : ""}

NAMED COMPETITORS (in ${client.city}):
${client.keyCompetitors.map((c, i) => `${i + 1}. ${c}`).join("\n")}

TASK:
Based on your knowledge of this niche in ${client.city} and what these competitor names suggest about their market position, do a realistic competitive intelligence analysis.

Be specific to the ${client.niche} sector in ${client.city}. Use your knowledge of how these businesses typically position themselves, their price points, and their likely marketing approaches.

Return this EXACT JSON:
{
  "marketLandscape": "2-3 sentence overview of how this ${client.niche} market is structured in ${client.city} right now",
  "competitors": [
    {
      "name": "exact competitor name",
      "perceivedPositioning": "how they likely position themselves — premium/affordable/franchise/local etc.",
      "likelyStrengths": ["strength 1", "strength 2"],
      "gaps": ["gap or weakness they likely have", "another gap"]
    }
  ],
  "positioningGaps": [
    "Specific market gap none of the competitors are owning — be concrete and local"
  ],
  "differentiationAngles": [
    "Specific angle ${client.name} can own that competitors are not — tied to what customers already love about them"
  ],
  "urgentActions": [
    "Specific action this week to claim a positioning gap — content, offer, or messaging"
  ],
  "ownableNarrative": "1 paragraph: the single strongest market position ${client.name} can own and defend, based on competitor gaps and client strengths"
}

Rules:
- competitors: one entry per named competitor
- positioningGaps: 3-4 specific, local, actionable gaps
- differentiationAngles: 3-4 angles with specific language/hooks
- urgentActions: 2-3 immediately executable this week`
  );

  return NextResponse.json({ analysis });
}
