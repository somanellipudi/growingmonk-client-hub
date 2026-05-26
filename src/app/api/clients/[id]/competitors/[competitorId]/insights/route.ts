import { NextResponse } from "next/server";
import { getClient, saveCompetitorInsights } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";
import { callGeminiJSON } from "@/lib/ai/gemini";
import type { CompetitorInsights } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewData = {
  rating?: number;
  text?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string };
};

async function fetchPlaceReviews(placeId: string, apiKey: string): Promise<ReviewData[]> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "reviews",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { reviews?: ReviewData[] };
  return data.reviews ?? [];
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string; competitorId: string } }
) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const competitor = (client.competitors ?? []).find((c) => c.id === params.competitorId);
  if (!competitor) return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  return NextResponse.json({ insights: competitor.insights ?? null });
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string; competitorId: string } }
) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const competitor = (client.competitors ?? []).find((c) => c.id === params.competitorId);
  if (!competitor) return NextResponse.json({ error: "Competitor not found" }, { status: 404 });

  if (!env.googleMapsApiKey) return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 503 });

  const reviews = await fetchPlaceReviews(competitor.placeId, env.googleMapsApiKey);
  if (reviews.length === 0) {
    return NextResponse.json({ error: "No reviews available for this place" }, { status: 404 });
  }

  const reviewText = reviews
    .map((r, i) => {
      const stars = r.rating ? `${r.rating}/5 stars` : "";
      const when = r.relativePublishTimeDescription ?? "";
      const body = r.text?.text?.trim() ?? "(no text)";
      return `[Review ${i + 1} — ${stars}${when ? `, ${when}` : ""}]\n${body}`;
    })
    .join("\n\n");

  const insights = await callGeminiJSON<Omit<CompetitorInsights, "reviewsAnalyzed" | "analyzedAt">>(
    "competitor_review_analysis",
    "You are a business intelligence analyst specialising in salon and beauty industry. Extract structured insights from customer reviews. Be specific and concise. Respond with valid JSON only.",
    `Analyse these ${reviews.length} customer reviews for "${competitor.name}" — a competitor to "${client.name}" (${client.niche}, ${client.city}).

${reviewText}

Return JSON with specific, actionable insights (empty array [] if nothing found):
{
  "popularServices": ["specific services or treatments customers frequently praise, e.g. 'keratin treatment', 'bridal makeup', 'beard trim'"],
  "popularProducts": ["specific product brands or items mentioned positively, e.g. 'Schwarzkopf colour', 'OPI nail polish'"],
  "starEmployees": ["staff names mentioned by name with praise — exact names only, e.g. 'Priya', 'Rahul sir'"],
  "pros": ["3-5 specific things customers consistently love about this place"],
  "cons": ["3-5 specific complaints or gaps that your client could turn into an advantage"],
  "summary": "2-3 sentences on this competitor's positioning, reputation, and main differentiator"
}`
  );

  const result: CompetitorInsights = {
    ...insights,
    reviewsAnalyzed: reviews.length,
    analyzedAt: new Date().toISOString(),
  };

  try {
    await saveCompetitorInsights(params.id, params.competitorId, result);
  } catch (err) {
    console.error("Failed to persist competitor insights:", err);
    // Return insights to client even if save fails — they can re-analyse later
  }

  return NextResponse.json({ insights: result });
}
