export type AppEnvironment = "local" | "development" | "production";
export type DbProvider = "json" | "local" | "firestore";

export type WorkspaceUser = {
  email: string;
  name: string;
  status: "active" | "disabled";
  roleIds: Array<"owner" | "admin" | "strategist" | "ops" | "viewer">;
  allowedApps: Array<"client-hub">;
  teamId: string;
  createdAt: string;
  lastLoginAt?: string;
};

export type Platform =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "google_ads"
  | "meta_ads"
  | "youtube"
  | "google_business"
  | "linkedin"
  | "other";

export interface Client {
  id: string;
  sourceLeadId?: string;
  sourceAuditRunId?: string;
  name: string;
  slug: string;
  niche: "salon" | "restaurant" | "ecommerce" | "clinic" | "coach" | "local_service" | "franchise" | "other";
  nicheSubtype?: string;
  city: string;
  country: "IN" | "US";
  timezone: string;
  currency: "INR" | "USD";
  packageTier: "starter" | "growth" | "scale" | "custom";
  status: "active" | "paused" | "churned";
  targetCustomer?: string;
  brandVoice?: string;
  keyCompetitors: string[];
  competitors?: Competitor[];
  businessGoals?: string;
  knownConstraints?: string;
  activePlatforms: Platform[];
  otherPlatformLabel?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  autoWeeklyReport?: boolean;
  instagramHandle?: string;
  websiteUrl?: string;
  metaAccessToken?: string;
  metaAdAccountId?: string;
  metaIgUserId?: string;
  metaConnectedAt?: string;
  googleAdsCustomerId?: string;   // format: 123-456-7890 or 1234567890
  googleAdsManagerId?: string;    // MCC manager account ID (optional)
  gbpAccountId?: string;
  gbpLocationId?: string;
  gbpPlaceId?: string;
  gbpLocationName?: string;
  gbpConnectedAt?: string;
  googleOAuthRefreshToken?: string;
  gbpAccessToken?: string;
  gbpTokenExpiry?: number;
  gbpPlaceRating?: number;
  gbpPlaceReviewCount?: number;
  portalToken?: string;
  portalEnabled?: boolean;
  deepAnalysis?: import("@/app/api/clients/[id]/ai/deep-analysis/route").DeepAnalysis;
  integrationStatus?: {
    meta: "connected" | "error" | "not_connected";
    gbp: "connected" | "error" | "not_connected";
    lastMetaError?: string;
    lastGbpError?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  channelType: string; // SEARCH, PERFORMANCE_MAX, DISPLAY, SHOPPING, VIDEO
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  ctr: number;
  avgCpc: number;
}

export interface WeeklyBrief {
  id: string;
  clientId: string;
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  year: number;
  instagramPosts: InstagramPost[];
  metaCampaigns: MetaCampaign[];
  googleAdsCampaigns: GoogleAdsCampaign[];
  gbpReviews: GBPReview[];
  gbpInsights?: GBPInsights;
  metrics: BriefMetrics;
  brief: AIBrief;
  syncedAt: string;
  syncDurationMs?: number;
  createdAt: string;
}

export interface InstagramPost {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
  permalink?: string;
  reach: number;
  impressions: number;
  likeCount: number;
  commentsCount: number;
  saved: number;
  shares: number;
  engagementRate: number;
  performanceTag: "hit" | "average" | "miss";
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenueAttributed: number;
  roas: number;
  cpl: number;
  ctr: number;
}

export interface GBPReview {
  reviewId: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createTime: string;
  reviewerDisplayName: string;
  reviewerPhotoUrl?: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface GBPInsights {
  queriesIndirect: number;
  queriesDirect: number;
  viewsMaps: number;
  viewsSearch: number;
  actionsPhone: number;
  actionsWebsite: number;
  actionsDirections: number;
}

export interface BriefMetrics {
  avgInstagramReach: number;
  avgEngagementRate: number;
  totalPostsThisWeek: number;
  bestPost: { caption: string; reach: number; mediaType: string; performanceTag: string };
  worstPost: { caption: string; reach: number; mediaType: string };
  totalAdSpend: number;
  totalLeads: number;
  totalRevenue: number;
  blendedRoas: number;
  avgCpl: number;
  activeCampaignCount: number;
  newReviewCount: number;
  avgNewReviewRating: number;
  unrepliedReviewCount: number;
  gbpSearchImpressions?: number;
  gbpPhoneCalls?: number;
}

export interface AIBrief {
  weekSummary: string;
  topInsight: string;
  alertFlags: AlertFlag[];
  contentAnalysis: {
    overallAssessment: string;
    bestPerforming: {
      hook: string;
      why: string;
      replicateStrategy: string;
    };
    worstPerforming: {
      hook: string;
      why: string;
      avoidReason: string;
    };
  };
  adAnalysis: {
    overallAssessment: string;
    campaignRecommendations: CampaignRecommendation[];
    budgetReallocationSuggestion: string;
  };
  weekPlan: {
    strategyRationale: string;
    posts: WeeklyPost[];
    whatsappBlast?: {
      message: string;
      bestTimeToSend: string;
      sendingReason: string;
    };
    clientUpdateDraft: string;
  };
  reviewResponses: ReviewResponseDraft[];
  generatedAt: string;
  modelUsed: string;
}

export interface AlertFlag {
  severity: "high" | "medium" | "low";
  type: "roas_drop" | "reach_drop" | "negative_review" | "budget_burning" | "no_posts" | "cpl_spike" | "zero_leads";
  message: string;
  suggestedAction: string;
}

export interface CampaignRecommendation {
  campaignName: string;
  currentSpend: number;
  currentRoas: number;
  currentCpl: number;
  recommendation: "scale" | "optimize" | "pause" | "kill";
  urgency: "immediate" | "this_week" | "monitor";
  specificAction: string;
  reasoning: string;
}

export interface WeeklyPost {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  platform: "instagram" | "whatsapp" | "facebook" | "google_business";
  postType: "reel" | "carousel" | "static" | "story" | "whatsapp_blast";
  bestTimeToPost: string;
  hook: string;
  captionDraft: string;
  visualDirection: string;
  whyThisWorks: string;
  dataReasoning: string;
}

export interface ReviewResponseDraft {
  reviewId: string;
  starRating: number;
  reviewerName: string;
  reviewText: string;
  suggestedResponse: string;
  tone: "thank_and_invite_back" | "apologize_and_resolve" | "acknowledge_and_improve";
  alreadyReplied: boolean;
}

export type ActivityLog = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export type LeadOutcome =
  | "new"         // just came in, not yet contacted
  | "contacted"   // called/messaged, awaiting response
  | "booked"      // appointment scheduled
  | "showed"      // came in / showed up
  | "converted"   // paid / became customer
  | "lost";       // didn't respond or dropped off

export interface LeadLog {
  id: string;
  clientId: string;
  name?: string;
  phone?: string;
  sourceCampaign?: string;  // Meta campaign name if known
  outcome: LeadOutcome;
  note?: string;
  leadDate: string;         // ISO date — when the lead came in
  updatedAt: string;
  createdAt: string;
}

export interface ReviewRequestLog {
  id: string;
  clientId: string;
  phone: string;
  customerName?: string;
  reviewLink: string;
  sentAt: string;
}

export interface ReviewCountSnapshot {
  id: string;
  clientId: string;
  count: number;
  rating: number;
  snapshotDate: string; // YYYY-MM-DD
}

export interface CompetitorInsights {
  popularServices: string[];
  popularProducts: string[];
  starEmployees: string[];
  pros: string[];
  cons: string[];
  summary: string;
  reviewsAnalyzed: number;
  analyzedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  placeId: string;
  note?: string;
  insights?: CompetitorInsights;
}

export interface CompetitorSnapshot {
  id: string;
  clientId: string;
  competitorId: string;
  competitorName: string;
  count: number;
  rating: number;
  snapshotDate: string; // YYYY-MM-DD
}

export type DbState = {
  meta: {
    version: number;
    provider: "json" | "firestore";
    createdAt: string;
    updatedAt: string;
  };
  users: WorkspaceUser[];
  clients: Client[];
  weekly_briefs: WeeklyBrief[];
  lead_logs: LeadLog[];
  review_request_logs: ReviewRequestLog[];
  review_count_snapshots: ReviewCountSnapshot[];
  competitor_snapshots: CompetitorSnapshot[];
  activity_logs: ActivityLog[];
};

export type SessionResult = {
  authenticated: boolean;
  accessDeniedReason: string | null;
  user: WorkspaceUser | null;
};

export type SourceAuditPrefill = {
  sourceLeadId: string;
  sourceAuditRunId: string;
  name: string;
  niche: Client["niche"];
  nicheSubtype?: string;
  city: string;
  country: Client["country"];
  timezone: string;
  currency: Client["currency"];
  packageTier: Client["packageTier"];
  status: Client["status"];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  instagramHandle?: string;
  websiteUrl?: string;
  targetCustomer?: string;
  brandVoice?: string;
  keyCompetitors: string[];
  businessGoals?: string;
  knownConstraints?: string;
  activePlatforms: Platform[];
  otherPlatformLabel?: string;
};

export type SourceAuditOption = {
  id: string;
  label: string;
  city: string;
  category: string;
  auditStatus: string;
  salesStage?: string;
  score?: number;
  rating?: number;
  reviewCount?: number;
  updatedAt: string;
  prefill: SourceAuditPrefill;
};
