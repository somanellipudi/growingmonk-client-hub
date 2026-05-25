import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callGeminiJSON } from "@/lib/ai/gemini";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";
import { getUpcomingFestivalsForNiche, daysUntil } from "@/lib/festivals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CaptionVariant = {
  style: string;       // e.g. "Storytelling", "Direct offer", "Educational"
  caption: string;
  openingLine: string; // first 125 chars — the preview
  hashtags: string[];
  cta: string;
  emojiStyle: "heavy" | "light" | "none";
};

export type CaptionDraftResult = {
  topic: string;
  variants: CaptionVariant[];
  bestFor: string; // which variant suits which situation
};

type RequestPayload = {
  // New full format
  topic?: string;
  postType?: "reel" | "carousel" | "static" | "story";
  tone?: "engaging" | "educational" | "promotional" | "storytelling" | "conversational";
  length?: "short" | "medium" | "long";
  additionalContext?: string;
  // Legacy minimal format
  hook?: string;
  platform?: string;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const payload = await request.json().catch(() => ({})) as RequestPayload;

  // Legacy minimal format — return single caption for backwards compat
  if (!payload.topic && payload.hook) {
    const result = await callGeminiJSON<{ caption: string; hashtags: string[] }>(
      "caption_draft",
      buildSystemPrompt(client, "creative"),
      `Write a caption for ${client.name}.
Hook: ${payload.hook || ""}
Platform: ${payload.platform || "instagram"}
Post type: ${payload.postType || "reel"}
Return JSON: { "caption": "full caption", "hashtags": ["tag"] }`
    );
    return NextResponse.json(result);
  }

  const topic = payload.topic?.trim();
  if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });

  const brief = await getCurrentBrief(client.id);
  const topPost = brief?.instagramPosts
    .filter((p) => p.performanceTag === "hit")
    .sort((a, b) => b.reach - a.reach)[0];

  const festivals = getUpcomingFestivalsForNiche(client.niche, 21);
  const festivalNote = festivals.length > 0
    ? `Upcoming: ${festivals.slice(0, 2).map((f) => `${f.name} in ${daysUntil(f.date)}d`).join(", ")} — weave in naturally if relevant`
    : "";

  const lengthGuide = {
    short: "under 100 words (punchy, great for reels)",
    medium: "150–250 words (balanced storytelling)",
    long: "300–400 words (carousels, deep engagement)",
  }[payload.length ?? "medium"];

  const postType = payload.postType ?? "reel";
  const systemPrompt = buildSystemPrompt(client, "creative");

  const result = await callGeminiJSON<CaptionDraftResult>(
    "caption_draft",
    systemPrompt,
    `Write 3 Instagram caption VARIANTS for ${client.name}.

BRIEF:
- Topic: ${topic}
- Post type: ${postType}
- Tone preference: ${payload.tone ?? "engaging"}
- Length: ${lengthGuide}
- Brand voice: ${client.brandVoice || "conversational, relatable, local"}
- Target customer: ${client.targetCustomer || "general audience in " + client.city}
${payload.additionalContext ? `- Additional context: ${payload.additionalContext}` : ""}
${festivalNote ? `- ${festivalNote}` : ""}
${topPost ? `- Their best performing post recently got ${topPost.reach.toLocaleString()} reach with this hook: "${(topPost.caption || "").slice(0, 100)}" — study this style` : ""}

RULES:
- Each variant must be DISTINCTLY different in style, not just slight rewrites
- Opening line of each caption must stop the scroll — do not start with the business name or a greeting
- Never use generic phrases like "We are excited to share" or "Check out our latest"
- Hashtags: 8–12 per variant, mix of niche (50k–500k), local (#${client.city.toLowerCase().replace(/\s/g, "")}), and broad (1M+)
- CTA must be specific — tell them EXACTLY what to do and why right now
- Language: ${client.country === "IN" ? "English with natural Hinglish where it fits the voice" : "English"}
- City must feel present — reference ${client.city} lifestyle, timing, or context where natural
- Emoji: each variant should have a different emoji density (heavy / light / none)

Return EXACTLY this JSON:
{
  "topic": "${topic}",
  "variants": [
    {
      "style": "Storytelling",
      "caption": "full caption text",
      "openingLine": "just the first 125 characters of the caption",
      "hashtags": ["tag1", "tag2"],
      "cta": "the specific call to action line",
      "emojiStyle": "heavy"
    },
    {
      "style": "Direct offer",
      "caption": "full caption text",
      "openingLine": "just the first 125 characters",
      "hashtags": ["tag1"],
      "cta": "specific CTA",
      "emojiStyle": "light"
    },
    {
      "style": "Educational/value",
      "caption": "full caption text",
      "openingLine": "just the first 125 characters",
      "hashtags": ["tag1"],
      "cta": "specific CTA",
      "emojiStyle": "none"
    }
  ],
  "bestFor": "one sentence: which variant to use when — e.g. use Storytelling for reels with high reach, Direct offer for paid promotion, Educational for saves and shares"
}`
  );

  return NextResponse.json(result);
}
