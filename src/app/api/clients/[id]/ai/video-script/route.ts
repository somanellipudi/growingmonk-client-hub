import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callGeminiJSON } from "@/lib/ai/gemini";
import { getUpcomingFestivalsForNiche, daysUntil } from "@/lib/festivals";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type VideoScene = {
  sceneNumber: number;
  duration: string;       // e.g. "0–3s"
  visual: string;         // what to film / show on screen
  voiceover: string;      // what to say (or "" if music only)
  textOverlay: string;    // on-screen text/captions
  direction: string;      // filming/editing note
};

export type VideoScript = {
  title: string;
  platform: string;
  totalDuration: string;
  hook: string;           // first 3-second opener — the grabber
  scenes: VideoScene[];
  cta: string;            // final call to action
  captionDraft: string;   // full Instagram/YouTube caption
  hashtags: string[];
  musicMood: string;      // e.g. "upbeat trending audio, BPM 120+"
  repurposeTips: string[]; // how to get more from this one video
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const body = await request.json() as {
    topic: string;
    platform: "instagram_reel" | "youtube_shorts" | "whatsapp_status";
    duration: 15 | 30 | 60 | 90;
    tone: "educational" | "entertaining" | "promotional" | "behind_the_scenes" | "testimonial";
    additionalContext?: string;
  };

  const { topic, platform, duration, tone, additionalContext } = body;
  if (!topic?.trim()) return NextResponse.json({ error: "Topic is required." }, { status: 400 });

  const brief = await getCurrentBrief(client.id);

  // Build performance context if brief exists
  const performanceContext = brief
    ? `Recent top content: ${brief.instagramPosts
        .filter((p) => p.performanceTag === "hit")
        .slice(0, 3)
        .map((p) => `"${(p.caption || "").slice(0, 100)}" (reach ${p.reach.toLocaleString()}, ${p.engagementRate.toFixed(1)}% engagement)`)
        .join(" | ") || "No top posts yet"}`
    : "No recent performance data available.";

  // Upcoming festivals for content tie-in
  const festivals = getUpcomingFestivalsForNiche(client.niche, 30);
  const festivalContext = festivals.length > 0
    ? `Upcoming festivals in next 30 days: ${festivals.map((f) => `${f.name} (${daysUntil(f.date)}d away)`).join(", ")}`
    : "";

  const platformLabel =
    platform === "instagram_reel" ? "Instagram Reel"
    : platform === "youtube_shorts" ? "YouTube Shorts"
    : "WhatsApp Status";

  const toneLabel = {
    educational: "educational (teach something valuable)",
    entertaining: "entertaining/funny (make them laugh or surprise them)",
    promotional: "promotional (sell without being salesy)",
    behind_the_scenes: "behind-the-scenes (authentic, raw, real)",
    testimonial: "testimonial/social proof (customer story)",
  }[tone];

  const systemPrompt = buildSystemPrompt(client, "strategy");

  const script = await callGeminiJSON<VideoScript>(
    "video_script",
    systemPrompt,
    `Write a short-form video script for ${client.name}.

BUSINESS CONTEXT:
- Niche: ${client.nicheSubtype || client.niche}
- City: ${client.city}, ${client.country}
- Target customer: ${client.targetCustomer || "general audience"}
- Brand voice: ${client.brandVoice || "conversational and relatable"}
- Business goals: ${client.businessGoals || "grow bookings and brand awareness"}

VIDEO BRIEF:
- Topic: ${topic}
- Platform: ${platformLabel}
- Duration: ${duration} seconds
- Tone: ${toneLabel}
${additionalContext ? `- Additional context: ${additionalContext}` : ""}

PERFORMANCE INTELLIGENCE:
${performanceContext}
${festivalContext ? `\n${festivalContext}` : ""}

RULES:
- The hook MUST be the first 3 seconds and grab attention immediately — pattern interrupt, bold claim, question, or visual shock
- Every scene must have a specific visual direction (not vague — tell them exactly what to film)
- Voiceover must sound natural, conversational, local — NOT corporate
- Text overlays should reinforce key points and be readable in 2 seconds
- Caption must include a strong opening line (first 125 chars matter most before "more"), benefit-led body, and clear CTA
- Hashtags: mix of niche (small 10k-500k), location (${client.city}), and broad (1M+) — max 15
- Music mood should reference actual styles (not just "upbeat")
- Repurpose tips should be specific to THIS video's content
- Total scenes must fit the ${duration}s duration — each scene duration must add up
- If a festival is within 14 days, weave it into the hook or visual naturally

Return EXACTLY this JSON:
{
  "title": "short working title for this video",
  "platform": "${platformLabel}",
  "totalDuration": "${duration} seconds",
  "hook": "the exact opening line/visual — first 3 seconds. Written as a direction: 'Open on...' or 'Say directly to camera...'",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "0–3s",
      "visual": "exactly what appears on screen — location, framing, action",
      "voiceover": "word-for-word what to say, or empty string if no VO",
      "textOverlay": "on-screen text/caption to show",
      "direction": "filming tip or editing note for this scene"
    }
  ],
  "cta": "specific call to action — what to say AND what text overlay to show at the end",
  "captionDraft": "full caption with hook line, body, and CTA — ready to copy-paste",
  "hashtags": ["hashtag1", "hashtag2"],
  "musicMood": "specific music style recommendation — genre, BPM range, example artists or sounds",
  "repurposeTips": ["specific way to reuse this video's footage or concept on another platform or format"]
}`
  );

  return NextResponse.json({ script });
}
