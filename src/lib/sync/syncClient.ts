import { buildSystemPrompt } from "@/lib/ai/agentContext";
import { callGeminiJSON, getModel } from "@/lib/ai/gemini";
import { getUpcomingFestivalsForNiche, daysUntil } from "@/lib/festivals";
import { getClient, saveGoogleBusinessConnection, saveReviewCountSnapshot, saveWeeklyBrief } from "@/lib/server/repositories";
import type { AIBrief, BriefMetrics, Client, GBPInsights, GBPReview, GoogleAdsCampaign, InstagramPost, MetaCampaign, WeeklyBrief } from "@/types";
import { pullGBPData, type GBPData } from "./gbpApi";
import { pullGoogleAdsCampaigns } from "./googleAdsApi";
import { pullInstagramPosts, pullMetaCampaigns } from "./metaApi";

export async function syncClient(clientId: string): Promise<WeeklyBrief> {
  const startTime = Date.now();
  const client = await getClient(clientId);
  if (!client) throw new Error("Client not found.");

  const [instagramPosts, metaCampaigns, gbpData, googleAdsCampaigns] = await Promise.all([
    client.metaAccessToken && client.metaIgUserId
      ? pullInstagramPosts(client.metaAccessToken, client.metaIgUserId).catch((error) => {
        console.error("Instagram pull failed:", error);
        return [] as InstagramPost[];
      })
      : Promise.resolve([] as InstagramPost[]),
    client.metaAccessToken && client.metaAdAccountId
      ? pullMetaCampaigns(client.metaAccessToken, client.metaAdAccountId).catch((error) => {
        console.error("Meta Ads pull failed:", error);
        return [] as MetaCampaign[];
      })
      : Promise.resolve([] as MetaCampaign[]),
    (client.gbpAccountId && client.gbpLocationId) || client.gbpPlaceId
      ? pullGBPData(client).catch((error) => {
        console.error("GBP pull failed:", error);
        return { reviews: [] as GBPReview[], insights: null } as GBPData;
      })
      : Promise.resolve({ reviews: [] as GBPReview[], insights: null } as GBPData),
    client.googleAdsCustomerId
      ? pullGoogleAdsCampaigns(client).catch((error) => {
        console.error("Google Ads pull failed:", error);
        return [] as GoogleAdsCampaign[];
      })
      : Promise.resolve([] as GoogleAdsCampaign[]),
  ]);

  // Persist place rating/count to client record if pulled from Places API
  if (gbpData.placeRating !== undefined || gbpData.placeReviewCount !== undefined) {
    saveGoogleBusinessConnection(client.id, {
      placeRating: gbpData.placeRating,
      placeReviewCount: gbpData.placeReviewCount,
    }).catch((err) => console.error("Failed to persist place data:", err));
  }

  // Snapshot review count for growth tracking
  const reviewCount = gbpData.placeReviewCount ?? client.gbpPlaceReviewCount;
  const reviewRating = gbpData.placeRating ?? client.gbpPlaceRating;
  if (reviewCount !== undefined && reviewRating !== undefined) {
    saveReviewCountSnapshot(client.id, reviewCount, reviewRating).catch(
      (err) => console.error("Failed to save review count snapshot:", err)
    );
  }

  const metrics = computeMetrics(instagramPosts, metaCampaigns, gbpData.reviews, gbpData.insights);
  const dataContext = buildDataContext(client, instagramPosts, metaCampaigns, googleAdsCampaigns, gbpData, metrics);
  const systemPrompt = buildSystemPrompt(client, "strategy");
  const brief = await generateAIBrief(systemPrompt, dataContext, client);
  const weekStart = getWeekStart();

  const weeklyBrief: WeeklyBrief = {
    id: `brief_${weekStart.toISOString().slice(0, 10)}_${Date.now().toString(36)}`,
    clientId: client.id,
    weekStartDate: weekStart.toISOString(),
    weekEndDate: getWeekEnd(weekStart).toISOString(),
    weekNumber: getISOWeekNumber(weekStart),
    year: weekStart.getFullYear(),
    instagramPosts,
    metaCampaigns,
    googleAdsCampaigns,
    gbpReviews: gbpData.reviews,
    gbpInsights: gbpData.insights ?? undefined,
    metrics,
    brief,
    syncedAt: new Date().toISOString(),
    syncDurationMs: Date.now() - startTime,
    createdAt: new Date().toISOString()
  };

  const saved = await saveWeeklyBrief(client.id, weeklyBrief);
  if (!saved) throw new Error("Unable to save weekly brief.");
  return weeklyBrief;
}

export function computeMetrics(posts: InstagramPost[], campaigns: MetaCampaign[], reviews: GBPReview[], insights?: GBPInsights | null): BriefMetrics {
  const avgReach = posts.length > 0 ? posts.reduce((sum, post) => sum + post.reach, 0) / posts.length : 0;

  posts.forEach((post) => {
    post.engagementRate = post.reach > 0 ? ((post.likeCount + post.commentsCount + post.saved) / post.reach) * 100 : 0;
    post.performanceTag = post.reach >= avgReach * 1.5 ? "hit" : post.reach <= avgReach * 0.7 ? "miss" : "average";
  });

  const sorted = [...posts].sort((a, b) => b.reach - a.reach);
  const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const totalLeads = campaigns.reduce((sum, campaign) => sum + (campaign.leads || 0), 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + (campaign.revenueAttributed || 0), 0);
  const avgNewRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.starRating, 0) / reviews.length : 0;

  return {
    avgInstagramReach: Math.round(avgReach),
    avgEngagementRate: round2(posts.length > 0 ? posts.reduce((sum, post) => sum + post.engagementRate, 0) / posts.length : 0),
    totalPostsThisWeek: posts.length,
    bestPost: sorted[0]
      ? { caption: (sorted[0].caption ?? "").slice(0, 80), reach: sorted[0].reach, mediaType: sorted[0].mediaType, performanceTag: sorted[0].performanceTag }
      : { caption: "No posts this week", reach: 0, mediaType: "", performanceTag: "miss" },
    worstPost: sorted[sorted.length - 1] && sorted.length > 1
      ? { caption: (sorted[sorted.length - 1].caption ?? "").slice(0, 80), reach: sorted[sorted.length - 1].reach, mediaType: sorted[sorted.length - 1].mediaType }
      : { caption: "No posts", reach: 0, mediaType: "" },
    totalAdSpend: round2(totalSpend),
    totalLeads,
    totalRevenue: round2(totalRevenue),
    blendedRoas: totalSpend > 0 ? round2(totalRevenue / totalSpend) : 0,
    avgCpl: totalLeads > 0 ? round2(totalSpend / totalLeads) : 0,
    activeCampaignCount: campaigns.length,
    newReviewCount: reviews.length,
    avgNewReviewRating: round1(avgNewRating),
    unrepliedReviewCount: reviews.filter((review) => !review.reviewReply).length,
    gbpSearchImpressions: insights?.viewsSearch,
    gbpPhoneCalls: insights?.actionsPhone
  };
}

export function buildDataContext(
  client: Client,
  posts: InstagramPost[],
  campaigns: MetaCampaign[],
  googleAdsCampaigns: GoogleAdsCampaign[],
  gbpData: { reviews: GBPReview[]; insights: GBPInsights | null },
  metrics: BriefMetrics
) {
  const curr = currencySymbol(client.currency);
  const sortedPosts = [...posts].sort((a, b) => b.reach - a.reach);

  const gadsSpend = googleAdsCampaigns.reduce((sum, c) => sum + c.spend, 0);
  const gadsConversions = googleAdsCampaigns.reduce((sum, c) => sum + c.conversions, 0);
  const gadsRevenue = googleAdsCampaigns.reduce((sum, c) => sum + c.conversionValue, 0);
  const totalSpendAllChannels = metrics.totalAdSpend + gadsSpend;

  return `
LAST 30 DAYS - REAL PERFORMANCE DATA FOR ${client.name.toUpperCase()}

INSTAGRAM (${posts.length} posts this week)
Week average reach: ${metrics.avgInstagramReach}
Week average engagement rate: ${metrics.avgEngagementRate.toFixed(1)}%

Posts ranked best to worst:
${sortedPosts.map((post, index) => `
${index + 1}. [${post.performanceTag.toUpperCase()}] ${post.mediaType}
   Reach: ${post.reach.toLocaleString()} | Impressions: ${post.impressions.toLocaleString()}
   Engagement: ${post.likeCount} likes, ${post.commentsCount} comments, ${post.saved} saves, ${post.shares} shares
   Engagement rate: ${post.engagementRate.toFixed(1)}%
   Posted: ${new Date(post.timestamp).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
   Caption: "${(post.caption ?? "").slice(0, 120)}${(post.caption ?? "").length > 120 ? "..." : ""}"
`).join("") || "No Instagram posts pulled this week."}

META ADS (${campaigns.length} campaigns)
Total spend: ${curr}${metrics.totalAdSpend.toLocaleString("en-IN")}
Total leads: ${metrics.totalLeads}
Blended ROAS: ${metrics.blendedRoas}x
Average CPL: ${curr}${metrics.avgCpl.toFixed(0)}
Total revenue attributed: ${curr}${metrics.totalRevenue.toLocaleString("en-IN")}

Campaign breakdown:
${campaigns.map((campaign) => `
Campaign: "${campaign.name}"
Objective: ${campaign.objective}
Spend: ${curr}${campaign.spend.toLocaleString("en-IN")} | Impressions: ${campaign.impressions.toLocaleString("en-IN")} | Clicks: ${campaign.clicks}
Leads: ${campaign.leads} | Conversions: ${campaign.conversions} | Revenue: ${curr}${campaign.revenueAttributed.toLocaleString("en-IN")}
ROAS: ${campaign.roas.toFixed(2)}x | CPL: ${curr}${campaign.cpl.toFixed(0)} | CTR: ${campaign.ctr.toFixed(2)}%
`).join("") || "No Meta campaign rows pulled this week."}

GOOGLE ADS (${googleAdsCampaigns.length} campaigns, last 30 days)
${googleAdsCampaigns.length > 0 ? `Total spend: ${curr}${gadsSpend.toLocaleString("en-IN")}
Total conversions: ${gadsConversions.toFixed(0)}
Total conversion value: ${curr}${gadsRevenue.toLocaleString("en-IN")}
Blended Google Ads ROAS: ${gadsSpend > 0 && gadsRevenue > 0 ? (gadsRevenue / gadsSpend).toFixed(2) : "0"}x
TOTAL CROSS-CHANNEL SPEND: ${curr}${totalSpendAllChannels.toLocaleString("en-IN")}

Campaign breakdown:
${googleAdsCampaigns.map((c) => `
Campaign: "${c.name}" [${c.channelType}] Status: ${c.status}
Spend: ${curr}${c.spend.toLocaleString("en-IN")} | Impressions: ${c.impressions.toLocaleString("en-IN")} | Clicks: ${c.clicks}
Conversions: ${c.conversions} | Conv. Value: ${curr}${c.conversionValue.toLocaleString("en-IN")}
ROAS: ${c.roas.toFixed(2)}x | CTR: ${(c.ctr * 100).toFixed(2)}% | Avg CPC: ${curr}${c.avgCpc}
`).join("")}` : "Google Ads not connected for this client."}

GOOGLE BUSINESS PROFILE (${gbpData.reviews.length} new reviews)
${gbpData.reviews.length === 0
    ? "No new reviews this week."
    : gbpData.reviews.map((review) => `
${review.starRating} stars - ${review.reviewerDisplayName}
"${review.comment}"
Status: ${review.reviewReply ? "Already replied" : "NO REPLY YET - needs response"}
`).join("")}

${gbpData.insights ? `
GBP Insights this week:
Search impressions: ${gbpData.insights.viewsSearch.toLocaleString("en-IN")}
Map views: ${gbpData.insights.viewsMaps.toLocaleString("en-IN")}
Phone calls from GBP: ${gbpData.insights.actionsPhone}
Direction requests: ${gbpData.insights.actionsDirections}
Website clicks: ${gbpData.insights.actionsWebsite}
Discovery searches: ${gbpData.insights.queriesIndirect.toLocaleString("en-IN")}
Branded searches: ${gbpData.insights.queriesDirect.toLocaleString("en-IN")}
` : "GBP insights not available this week."}

UPCOMING FESTIVALS & SEASONAL OPPORTUNITIES (next 45 days)
${(() => {
  const upcoming = getUpcomingFestivalsForNiche(client.niche, 45);
  if (upcoming.length === 0) return "No major festivals in the next 45 days.";
  return upcoming.map((f) => {
    const days = daysUntil(f.date);
    const urgency = days <= 7 ? "⚠️ THIS WEEK" : days <= 14 ? "📅 NEXT WEEK" : `${days} days away`;
    return `${f.name} — ${f.date} (${urgency})
  Content angle: ${f.contentAngle}`;
  }).join("\n");
})()}

INSTRUCTION: When writing the weekPlan posts, actively incorporate the nearest festival if it's within 14 days. Name the festival explicitly in post hooks and captions where relevant. Prioritize festival-timed content if a major one falls this week.
`;
}

async function generateAIBrief(systemPrompt: string, dataContext: string, client: Client): Promise<AIBrief> {
  const curr = currencySymbol(client.currency);
  const model = getModel("weekly_brief_generation");
  const userPrompt = `
${dataContext}

Generate a complete weekly intelligence brief for ${client.name}.

RULES:
- Every monetary value must use ${curr} and the client currency ${client.currency}
- Every timing recommendation must be in ${client.city} local time
- Every recommendation must be specific to a ${client.niche} business in ${client.city}
- Content advice must reference actual post performance from the data above
- Ad recommendations must reference actual ROAS and CPL numbers from the data above
- The dataReasoning field for each post must quote actual numbers from the data
- Review responses must feel local and authentic, not corporate
- If a metric is 0 or missing, acknowledge this honestly
- Generate 4-5 posts in weekPlan, and every post must have a non-empty dataReasoning field
- For ${client.city} businesses, include a specific local posting time such as 19:00 only if it fits the strategy

Return this exact JSON object shape:
{
  "weekSummary": "2-3 sentence summary with actual numbers",
  "topInsight": "single most important insight",
  "alertFlags": [{ "severity": "high|medium|low", "type": "roas_drop|reach_drop|negative_review|budget_burning|no_posts|cpl_spike|zero_leads", "message": "plain English", "suggestedAction": "specific action" }],
  "contentAnalysis": {
    "overallAssessment": "paragraph",
    "bestPerforming": { "hook": "string", "why": "string", "replicateStrategy": "string" },
    "worstPerforming": { "hook": "string", "why": "string", "avoidReason": "string" }
  },
  "adAnalysis": {
    "overallAssessment": "paragraph with numbers",
    "campaignRecommendations": [{ "campaignName": "exact campaign name", "currentSpend": 0, "currentRoas": 0, "currentCpl": 0, "recommendation": "scale|optimize|pause|kill", "urgency": "immediate|this_week|monitor", "specificAction": "action", "reasoning": "number-tied reason" }],
    "budgetReallocationSuggestion": "plain English with specific amounts"
  },
  "weekPlan": {
    "strategyRationale": "why this plan, referencing data",
    "posts": [{ "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday", "platform": "instagram|whatsapp|facebook|google_business", "postType": "reel|carousel|static|story|whatsapp_blast", "bestTimeToPost": "HH:MM", "hook": "string", "captionDraft": "string", "visualDirection": "string", "whyThisWorks": "string", "dataReasoning": "string with actual numbers" }],
    "whatsappBlast": { "message": "ready message", "bestTimeToSend": "day and time", "sendingReason": "why this timing" },
    "clientUpdateDraft": "complete WhatsApp message for client"
  },
  "reviewResponses": [{ "reviewId": "id", "starRating": 5, "reviewerName": "name", "reviewText": "text", "suggestedResponse": "response", "tone": "thank_and_invite_back|apologize_and_resolve|acknowledge_and_improve", "alreadyReplied": false }],
  "generatedAt": "${new Date().toISOString()}",
  "modelUsed": "${model}"
}
`;

  const brief = await callGeminiJSON<AIBrief>("weekly_brief_generation", systemPrompt, userPrompt);
  return {
    ...brief,
    generatedAt: brief.generatedAt || new Date().toISOString(),
    modelUsed: brief.modelUsed || model,
    alertFlags: brief.alertFlags ?? [],
    reviewResponses: brief.reviewResponses ?? []
  };
}

function getWeekStart(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekEnd(weekStart: Date) {
  const copy = new Date(weekStart);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function getISOWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function currencySymbol(currency: Client["currency"]) {
  return currency === "INR" ? String.fromCharCode(8377) : String.fromCharCode(36);
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
