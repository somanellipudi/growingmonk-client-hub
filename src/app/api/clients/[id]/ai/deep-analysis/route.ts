import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callClaudeJSON } from "@/lib/ai/claude";
import { getClient, listBriefHistory, saveDeepAnalysis } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type LovedTheme = {
  theme: string;
  frequency: string;
  quotes: string[];
  howToAmplify: string;
};

export type PainPoint = {
  issue: string;
  frequency: string;
  quotes: string[];
  howToFix: string;
};

export type ImprovementPriority = {
  action: string;
  urgency: "immediate" | "this_week" | "ongoing";
  expectedImpact: string;
};

export type ReviewsDeepDive = {
  sentimentSummary: string;
  scoreOutOf10: number;
  lovedThemes: LovedTheme[];
  painPoints: PainPoint[];
  marketingGold: string[];
  responseStrategy: string;
  urgentIssues: string[];
  improvementPriorities: ImprovementPriority[];
};

export type WorkingPattern = {
  hook: string;
  why: string;
  proof: string;
};

export type FailingPattern = {
  pattern: string;
  why: string;
  fix: string;
};

export type NextWeekPost = {
  day: string;
  format: string;
  hook: string;
  why: string;
};

export type InstagramDeepDive = {
  performanceSummary: string;
  whatIsWorking: WorkingPattern[];
  whatIsNotWorking: FailingPattern[];
  contentGaps: string[];
  optimalPostingStrategy: string;
  topHooks: string[];
  engagementInsights: string;
  nextWeekContent: NextWeekPost[];
};

export type CompetitorGap = {
  opportunity: string;
  howToCapture: string;
  urgency: "now" | "soon" | "later";
};

export type CompetitorsDeepDive = {
  marketSnapshot: string;
  clientCurrentPosition: string;
  gaps: CompetitorGap[];
  winningMoves: string[];
  defensivePriorities: string[];
  ownableNarrative: string;
};

export type ThirtyDayAction = {
  action: string;
  channel: string;
  effort: "low" | "medium" | "high";
  expectedResult: string;
};

export type GrowthPlan = {
  topPriority: string;
  thirtyDayActions: ThirtyDayAction[];
  ninetyDayStrategy: string;
  revenueLevers: string[];
  criticalMetrics: string[];
  quickWins: string[];
};

export type DeepAnalysis = {
  reviews: ReviewsDeepDive;
  instagram: InstagramDeepDive;
  competitors: CompetitorsDeepDive;
  growthPlan: GrowthPlan;
  generatedAt: string;
};

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  // Pull last 8 briefs (~2 months) for richer review history
  const briefs = await listBriefHistory(params.id, 8);
  if (briefs.length === 0) return NextResponse.json({ error: "No data found. Run a sync first to pull data." }, { status: 400 });

  const latestBrief = briefs[0];

  // Aggregate and deduplicate reviews across all briefs
  const allReviewsRaw = briefs.flatMap((b) => b.gbpReviews ?? []);
  const reviewMap = new Map(allReviewsRaw.map((r) => [r.reviewId, r]));
  const reviews = Array.from(reviewMap.values()).sort(
    (a, b) => (b.createTime ?? "").localeCompare(a.createTime ?? "")
  );

  // Instagram posts and campaigns from latest brief only (current week)
  const posts = latestBrief.instagramPosts ?? [];
  const campaigns = latestBrief.metaCampaigns ?? [];
  const brief = latestBrief;

  const reviewsText = reviews.length > 0
    ? reviews
        .map((r) => `★${r.starRating} — ${r.reviewerDisplayName}: "${r.comment || "No text"}" [${r.reviewReply ? "replied" : "no reply"}]`)
        .join("\n")
    : "No Google reviews available yet.";

  const postsText = posts.length > 0
    ? posts
        .map((p) =>
          `[${p.performanceTag.toUpperCase()}] ${p.mediaType} — Reach: ${p.reach.toLocaleString()}, Engagement: ${p.engagementRate.toFixed(1)}%, Likes: ${p.likeCount}, Comments: ${p.commentsCount}, Saves: ${p.saved}, Shares: ${p.shares}\nCaption: "${(p.caption || "").slice(0, 150)}"`
        )
        .join("\n\n")
    : "No Instagram posts pulled yet.";

  const campaignsText = campaigns.length > 0
    ? campaigns
        .map((c) => `${c.name}: Spend ${c.spend.toLocaleString()}, ROAS: ${c.roas.toFixed(2)}x, Leads: ${c.leads}, CPL: ${c.cpl.toFixed(0)}`)
        .join("\n")
    : "No Meta campaigns available.";

  const metricsText = [
    `Avg reach: ${brief.metrics.avgInstagramReach.toLocaleString()}`,
    `Avg engagement: ${brief.metrics.avgEngagementRate.toFixed(1)}%`,
    `Posts this week: ${brief.metrics.totalPostsThisWeek}`,
    `Blended ROAS: ${brief.metrics.blendedRoas.toFixed(2)}x`,
    `Total ad spend: ${brief.metrics.totalAdSpend.toLocaleString()}`,
    `Total leads: ${brief.metrics.totalLeads}`,
    `New reviews: ${brief.metrics.newReviewCount}`,
    `Avg rating: ${brief.metrics.avgNewReviewRating.toFixed(1)} ★`,
    `Unreplied reviews: ${brief.metrics.unrepliedReviewCount}`,
  ].join(" | ");

  const gbpText = brief.gbpInsights
    ? `GBP: Search views ${brief.gbpInsights.viewsSearch}, Map views ${brief.gbpInsights.viewsMaps}, Calls ${brief.gbpInsights.actionsPhone}, Direction requests ${brief.gbpInsights.actionsDirections}`
    : "No GBP insights available.";

  const now = new Date().toISOString();

  const analysis = await callClaudeJSON<DeepAnalysis>(
    "weekly_brief_generation",
    buildSystemPrompt(client, "strategy"),
    `You are doing a COMPREHENSIVE DEEP INTELLIGENCE report for ${client.name}.
Think like a senior growth strategist who has worked with 500+ ${client.niche} businesses. Be brutally honest. Be specific. Avoid generic advice.

BUSINESS PROFILE:
Name: ${client.name}
Niche: ${client.nicheSubtype || client.niche}
City: ${client.city}, ${client.country}
Package: ${client.packageTier}
Target customer: ${client.targetCustomer || "not specified"}
Brand voice: ${client.brandVoice || "not specified"}
Business goals: ${client.businessGoals || "not specified"}
Known constraints: ${client.knownConstraints || "none mentioned"}
Competitors: ${client.keyCompetitors.join(", ") || "none listed"}

THIS WEEK'S METRICS:
${metricsText}

${gbpText}

GOOGLE REVIEWS (${reviews.length} unique reviews across last ${briefs.length} weeks):
${reviewsText}

INSTAGRAM POSTS (${posts.length} posts):
${postsText}

META AD CAMPAIGNS:
${campaignsText}

---

Return this EXACT JSON — every field is required:

{
  "reviews": {
    "sentimentSummary": "2-3 sentences: what customers actually feel about this business — specific, not vague. Reference ratings and recurring themes.",
    "scoreOutOf10": <integer 1-10 reflecting overall review health — factor in ratings distribution, volume, recency of issues, response rate>,
    "lovedThemes": [
      {
        "theme": "specific thing customers praise — not 'great service' but 'quick turnaround same-day appointments'",
        "frequency": "e.g. '4 of 7 reviewers mention this'",
        "quotes": ["short verbatim or paraphrase from review", "another quote"],
        "howToAmplify": "specific ad/reel/story idea using this exact theme — actionable this week"
      }
    ],
    "painPoints": [
      {
        "issue": "specific complaint — not 'communication' but 'long wait times between booking and confirmation'",
        "frequency": "e.g. '2 reviewers mention this'",
        "quotes": ["short quote"],
        "howToFix": "specific operational or communication fix — e.g. 'Send WhatsApp confirmation within 30 min of booking'"
      }
    ],
    "marketingGold": [
      "Exact phrase from a review that could be used verbatim in an ad caption or reel text overlay — customer voice beats brand voice"
    ],
    "responseStrategy": "1 paragraph: the exact tone, structure, and key phrases to use when responding to reviews. What to always say. What to never say. How to turn a 3-star into a returning customer.",
    "urgentIssues": ["Critical issue needing action THIS WEEK — e.g. '3 unanswered negative reviews visible on Google Maps right now'"],
    "improvementPriorities": [
      {
        "action": "specific business improvement — operational, service, communication, or experience",
        "urgency": "immediate|this_week|ongoing",
        "expectedImpact": "measurable result — e.g. 'Reduce 1-star reviews by 50%, improve avg rating from 4.2 to 4.5 in 60 days'"
      }
    ]
  },
  "instagram": {
    "performanceSummary": "2-3 honest sentences on Instagram performance — specific numbers, what's growing, what's stuck, honest comparison to niche benchmarks",
    "whatIsWorking": [
      {
        "hook": "specific content pattern or format that's outperforming — be precise, not 'reels' but 'before/after transformation reels with trending audio'",
        "why": "psychological or algorithmic reason this works for this specific audience",
        "proof": "reference actual post data — e.g. 'Reach 2,400 vs avg 890, saved 34 times'"
      }
    ],
    "whatIsNotWorking": [
      {
        "pattern": "specific content type or posting behavior underperforming",
        "why": "specific reason — e.g. 'text-heavy carousels lose attention in first 2 seconds for this audience'",
        "fix": "exact change to make — e.g. 'Lead with the result visual, not the process'"
      }
    ],
    "contentGaps": [
      "Specific content type NOT being made that would perform well — e.g. 'Behind-the-scenes team content — builds trust and increases saves by 40% in this niche'"
    ],
    "optimalPostingStrategy": "Specific recommendation: days, times, frequency, mix of formats — based on the post performance data above, not generic advice",
    "topHooks": [
      "Ready-to-post hook for a reel or carousel — specific enough to film tomorrow. E.g. 'POV: You booked your first appointment here and here's what happened next...'"
    ],
    "engagementInsights": "2-3 sentences: what specifically drives saves, comments, and shares for this business type and audience. What makes people DM vs scroll past.",
    "nextWeekContent": [
      {
        "day": "Monday",
        "format": "Reel|Carousel|Static|Story",
        "hook": "exact hook line to use — ready to film",
        "why": "specific reason this will work this week — tie to timing, trend, or audience pattern"
      }
    ]
  },
  "competitors": {
    "marketSnapshot": "2-3 sentences: current power dynamics in the ${client.niche} market in ${client.city}. Who's winning and why. What's shifting.",
    "clientCurrentPosition": "Honest 2-sentence positioning statement — where ${client.name} sits right now vs competitors. Don't sugarcoat.",
    "gaps": [
      {
        "opportunity": "specific market gap none of the listed competitors are owning — be local and concrete",
        "howToCapture": "specific action this week — content angle, offer, or messaging to claim this gap",
        "urgency": "now|soon|later"
      }
    ],
    "winningMoves": [
      "Specific strategic move to gain competitive advantage — actionable within 30 days, specific to this niche and city"
    ],
    "defensivePriorities": [
      "Specific strength or audience relationship to protect before competitors copy it — what's currently the moat"
    ],
    "ownableNarrative": "2 sentences: the single most defensible market position for ${client.name}. Use specific language. This should feel like a positioning statement they could put on their website."
  },
  "growthPlan": {
    "topPriority": "THE ONE highest-leverage action for the next 30 days — specific, measurable, tied to revenue. Not a category, an action: e.g. 'Launch a referral program giving existing customers 20% off their next service for each referral that books'",
    "thirtyDayActions": [
      {
        "action": "specific action — who does what by when",
        "channel": "Instagram|Google Reviews|WhatsApp|Meta Ads|Operations|Website|Email",
        "effort": "low|medium|high",
        "expectedResult": "specific measurable outcome — e.g. '+15% new bookings from referrals, 3 new 5-star reviews'"
      }
    ],
    "ninetyDayStrategy": "3-4 sentences: the 90-day growth arc for this specific business. What to build in month 1, double down in month 2, and scale in month 3. Specific to their niche, city, and constraints.",
    "revenueLevers": [
      "Specific mechanism that directly drives bookings/sales for this business type — not 'improve marketing' but 'introduce a loyalty card that gives 10th service free, typical businesses in this niche see 30% repeat rate improvement'"
    ],
    "criticalMetrics": [
      "Specific metric to track weekly — with a target number. E.g. 'Instagram saves per post (target: 20+)', 'Google review response rate (target: 100% within 24h)'"
    ],
    "quickWins": [
      "Action completable TODAY or this week with visible results within 7 days — low effort, high signal"
    ]
  },
  "generatedAt": "${now}"
}

Rules:
- lovedThemes: 3-6 themes (only if reviews exist, otherwise 1 generic theme about lacking data)
- painPoints: only real ones from data — empty array if reviews are genuinely positive
- marketingGold: 3-5 quotes
- whatIsWorking: 2-4 patterns (if no posts, note data gap)
- whatIsNotWorking: 1-3 honest patterns
- nextWeekContent: exactly 5 posts (Mon through Fri or best days)
- gaps: 3-5 opportunities ranked by urgency
- thirtyDayActions: 6-8 specific actions
- quickWins: 3-5 items
- criticalMetrics: 4-6 metrics with targets
- revenueLevers: 3-5 levers
- Every string must be specific to THIS business — if you write something that could apply to any business, rewrite it`
  );

  await saveDeepAnalysis(params.id, analysis);
  return NextResponse.json({ analysis });
}
