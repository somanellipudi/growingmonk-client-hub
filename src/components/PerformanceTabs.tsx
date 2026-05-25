"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  Globe,
  Instagram,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import {
  CampaignROASChart,
  CampaignSpendChart,
  GBPInsightsChart,
  InstagramEngagementChart,
  InstagramReachChart,
  ReviewRatingChart,
} from "@/components/charts";
import { CompetitorIntel } from "@/components/CompetitorIntel";
import { ReviewDraftButton } from "@/components/mvp-actions";
import { ReviewEngine } from "@/components/ReviewEngine";
import { StatusBadge } from "@/components/ui";
import { InstagramIdFinder } from "@/components/InstagramIdFinder";
import { MetaDiagnostics } from "@/components/MetaDiagnostics";
import type { Client, MetaCampaign, WeeklyBrief } from "@/types";

type Tab = "instagram" | "ads" | "gads" | "google";

type Props = {
  brief: WeeklyBrief;
  client: Client;
  hasInstagram: boolean;
  hasCampaigns: boolean;
  hasReviews: boolean;
  hasMeta: boolean;
  hasGbp: boolean;
  hasGoogleAds: boolean;
};

function formatMoney(value: number, currency: Client["currency"]) {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function RoasBar({ campaign }: { campaign: MetaCampaign }) {
  const fill = Math.max(0, Math.min(100, (campaign.roas / 5) * 100));
  const color =
    campaign.roas >= 3 ? "bg-green-500" : campaign.roas >= 2 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="min-w-[140px]">
      <span className="font-semibold text-ink">{campaign.roas.toFixed(2)}x</span>
      <div className="mt-2 h-2 w-full bg-stoneLine">
        <div className={`h-2 ${color}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

// ─── Instagram Tab ───────────────────────────────────────────────────────────

function InstagramTab({
  brief,
  client,
  hasInstagram,
  hasMeta,
}: {
  brief: WeeklyBrief;
  client: Client;
  hasInstagram: boolean;
  hasMeta: boolean;
}) {
  const metaDataMissing = hasMeta && !hasInstagram && !brief.metaCampaigns.length;
  const posts = [...brief.instagramPosts].sort((a, b) => b.reach - a.reach);

  if (!hasInstagram) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Instagram posts not pulling
              {client.instagramHandle ? ` — @${client.instagramHandle}` : ""}
            </p>
            <p className="text-xs text-amber-700 leading-5">
              {(() => {
                const id = client.metaIgUserId;
                if (!id) return "No Instagram Business Account ID saved. Use the detector below to find and save it.";
                const looksValid = /^\d{13,20}$/.test(id) && id.startsWith("17841");
                if (looksValid) return `Instagram account ID (${id}) is saved and looks correct, but the API couldn't pull posts — the access token may have expired or is missing the pages_read_engagement permission. Re-run sync after refreshing the token, or use the detector below to re-confirm the ID.`;
                return `Stored ID (${id}) appears to be a Facebook Page ID, not an Instagram Business Account ID. Use the detector below to find the correct one — it starts with 17841 and is 15–17 digits.`;
              })()}
            </p>
          </div>
          {metaDataMissing ? (
            <MetaDiagnostics
              clientId={client.id}
              instagramHandle={client.instagramHandle}
            />
          ) : (
            <InstagramIdFinder
              clientId={client.id}
              instagramHandle={client.instagramHandle}
            />
          )}
        </div>
        <div className="border border-stoneLine bg-ivory p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
            Content direction (AI brief)
          </p>
          <p className="text-xs font-semibold text-ink mb-1">Replicate this:</p>
          <p className="text-xs text-muted leading-5">
            {brief.brief.contentAnalysis.bestPerforming.replicateStrategy}
          </p>
          <p className="text-xs font-semibold text-ink mt-3 mb-1">Avoid this:</p>
          <p className="text-xs text-muted leading-5">
            {brief.brief.contentAnalysis.worstPerforming.avoidReason}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Reach by post
          </p>
          <InstagramReachChart posts={brief.instagramPosts} />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Engagement breakdown
          </p>
          <InstagramEngagementChart posts={brief.instagramPosts} />
        </div>
      </div>

      {/* Post grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink || "#"}
            target={post.permalink ? "_blank" : undefined}
            rel="noreferrer"
            className="block border border-stoneLine bg-white p-4 hover:border-gm-orange/60 transition-colors"
          >
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={post.mediaType.toLowerCase()} />
              <StatusBadge status={post.performanceTag} />
            </div>
            <p className="mt-4 text-2xl font-semibold text-ink">
              {post.reach.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted">
              reach · {post.engagementRate.toFixed(1)}% engagement · {post.saved} saves
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
              {post.caption || "No caption"}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Ads Tab ─────────────────────────────────────────────────────────────────

function AdsTab({
  brief,
  client,
  hasCampaigns,
}: {
  brief: WeeklyBrief;
  client: Client;
  hasCampaigns: boolean;
}) {
  const hasSpend = brief.metaCampaigns.some((c) => c.spend > 0);

  if (!hasCampaigns) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-stoneLine bg-ivory p-4">
          <p className="text-sm font-semibold text-ink mb-2">No campaigns found</p>
          <p className="text-xs text-muted leading-5">
            Ad account{" "}
            <code className="bg-ivory border border-stoneLine px-1">
              {client.metaAdAccountId || "not set"}
            </code>{" "}
            returned no campaigns. Verify the account ID in Meta Ads Manager.
          </p>
        </div>
        <div className="border border-stoneLine bg-ivory p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
            Ad strategy (from AI brief)
          </p>
          <p className="text-xs text-muted leading-5">
            {brief.brief.adAnalysis.overallAssessment}
          </p>
        </div>
      </div>
    );
  }

  if (!hasSpend) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-3 flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle size={13} className="shrink-0" />
            No ad spend in the last 30 days — campaigns exist but are not currently running.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stoneLine text-left text-[11px] uppercase tracking-[0.14em] text-muted">
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Objective</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {brief.metaCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-stoneLine">
                    <td className="py-2 pr-4 text-xs font-semibold text-ink">{campaign.name}</td>
                    <td className="py-2 pr-4 text-xs text-muted">
                      {campaign.objective.replace(/_/g, " ")}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={campaign.status.toLowerCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border border-stoneLine bg-ivory p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
            AI recommendation
          </p>
          <p className="text-xs text-muted leading-5">
            {brief.brief.adAnalysis.overallAssessment}
          </p>
          <p className="text-xs font-semibold text-ink mt-3 mb-1">Budget suggestion</p>
          <p className="text-xs text-muted leading-5">
            {brief.brief.adAnalysis.budgetReallocationSuggestion}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            ROAS by campaign
          </p>
          <CampaignROASChart campaigns={brief.metaCampaigns} />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Spend vs revenue
          </p>
          <CampaignSpendChart campaigns={brief.metaCampaigns} currency={client.currency} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stoneLine text-left text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-3 pr-4">Campaign</th>
              <th className="py-3 pr-4">Spend</th>
              <th className="py-3 pr-4">Leads</th>
              <th className="py-3 pr-4">ROAS</th>
              <th className="py-3 pr-4">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {brief.metaCampaigns.map((campaign) => {
              const rec = brief.brief.adAnalysis.campaignRecommendations.find(
                (r) => r.campaignName === campaign.name
              );
              return (
                <tr key={campaign.id} className="border-b border-stoneLine">
                  <td className="py-3 pr-4 font-semibold text-ink">{campaign.name}</td>
                  <td className="py-3 pr-4">{formatMoney(campaign.spend, client.currency)}</td>
                  <td className="py-3 pr-4">{campaign.leads}</td>
                  <td className="py-3 pr-4">
                    <RoasBar campaign={campaign} />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={rec?.recommendation || "monitor"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border border-stoneLine bg-ivory p-4 text-sm leading-6 text-muted">
        <span className="font-semibold text-ink">Budget suggestion:</span>{" "}
        {brief.brief.adAnalysis.budgetReallocationSuggestion}
      </div>
    </div>
  );
}

// ─── Google Ads Tab ───────────────────────────────────────────────────────────

function GadsRoasBar({ roas }: { roas: number }) {
  const fill = Math.max(0, Math.min(100, (roas / 5) * 100));
  const color = roas >= 3 ? "bg-green-500" : roas >= 2 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="min-w-[140px]">
      <span className="font-semibold text-ink">{roas > 0 ? `${roas.toFixed(2)}x` : "—"}</span>
      <div className="mt-2 h-2 w-full bg-stoneLine">
        <div className={`h-2 ${color}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

function GoogleAdsTab({ brief, client }: { brief: WeeklyBrief; client: Client }) {
  const campaigns = brief.googleAdsCampaigns ?? [];
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const blendedRoas =
    totalSpend > 0
      ? campaigns.reduce((s, c) => s + c.conversionValue, 0) / totalSpend
      : 0;

  if (campaigns.length === 0) {
    return (
      <div className="border border-stoneLine bg-ivory p-4">
        <p className="text-sm font-semibold text-ink mb-2">No campaigns found</p>
        <p className="text-xs text-muted leading-5">
          Customer ID{" "}
          <code className="bg-ivory border border-stoneLine px-1">
            {client.googleAdsCustomerId || "not set"}
          </code>{" "}
          returned no campaigns in the last 30 days. Verify the account in Google Ads Manager.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total spend", value: formatMoney(totalSpend, client.currency) },
          { label: "Clicks", value: totalClicks.toLocaleString("en-IN") },
          { label: "Conversions", value: totalConversions.toFixed(1) },
          { label: "Blended ROAS", value: blendedRoas > 0 ? `${blendedRoas.toFixed(2)}x` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="border border-stoneLine bg-ivory p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Campaign table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stoneLine text-left text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-3 pr-4">Campaign</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Spend</th>
              <th className="py-3 pr-4">Clicks</th>
              <th className="py-3 pr-4">CTR</th>
              <th className="py-3 pr-4">Avg CPC</th>
              <th className="py-3 pr-4">Conv.</th>
              <th className="py-3">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-stoneLine">
                <td className="py-3 pr-4 font-semibold text-ink max-w-[220px] truncate">
                  {c.name}
                </td>
                <td className="py-3 pr-4 text-xs text-muted">{c.channelType}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={c.status.toLowerCase()} />
                </td>
                <td className="py-3 pr-4 text-xs">{formatMoney(c.spend, client.currency)}</td>
                <td className="py-3 pr-4 text-xs">{c.clicks.toLocaleString("en-IN")}</td>
                <td className="py-3 pr-4 text-xs">
                  {(c.ctr * 100).toFixed(2)}%
                </td>
                <td className="py-3 pr-4 text-xs">{formatMoney(c.avgCpc, client.currency)}</td>
                <td className="py-3 pr-4 text-xs">{c.conversions.toFixed(1)}</td>
                <td className="py-3">
                  <GadsRoasBar roas={c.roas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Data for last 30 days · Top 20 campaigns by spend ·{" "}
        {client.googleAdsManagerId && (
          <span>MCC: {client.googleAdsManagerId} · </span>
        )}
        Customer: {client.googleAdsCustomerId}
      </p>
    </div>
  );
}

// ─── Google Business Tab ──────────────────────────────────────────────────────

function GoogleTab({
  brief,
  client,
  hasReviews,
  hasGbp,
}: {
  brief: WeeklyBrief;
  client: Client;
  hasReviews: boolean;
  hasGbp: boolean;
}) {
  return (
    <div className="grid gap-8">
      {/* GBP Insights */}
      {brief.gbpInsights && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
            Last 7 days — Search views, map views, calls, directions
          </p>
          <GBPInsightsChart insights={brief.gbpInsights} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Search views", value: brief.gbpInsights.viewsSearch },
              { label: "Map views", value: brief.gbpInsights.viewsMaps },
              { label: "Phone calls", value: brief.gbpInsights.actionsPhone },
              { label: "Directions", value: brief.gbpInsights.actionsDirections },
            ].map(({ label, value }) => (
              <div key={label} className="border border-stoneLine bg-ivory p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {value.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
          Google Reviews
        </p>
        {hasReviews ? (
          <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                Rating distribution
              </p>
              <ReviewRatingChart reviews={brief.gbpReviews} />
            </div>
            <div className="grid gap-4">
              {brief.gbpReviews.map((review) => (
                <div key={review.reviewId} className="border border-stoneLine bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">
                      {"★".repeat(review.starRating)}
                      {"☆".repeat(5 - review.starRating)}
                    </span>
                    <span className="text-sm text-muted">{review.reviewerDisplayName}</span>
                    {review.reviewReply ? (
                      <StatusBadge status="replied" />
                    ) : (
                      <StatusBadge status="needs_reply" />
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {review.comment || "No review text."}
                  </p>
                  {review.reviewReply ? (
                    <p className="mt-3 border border-stoneLine bg-ivory p-3 text-sm leading-6 text-muted">
                      {review.reviewReply.comment}
                    </p>
                  ) : (
                    <ReviewDraftButton
                      clientId={client.id}
                      review={review}
                      hasGbpOAuth={Boolean(client.googleOAuthRefreshToken && client.gbpAccountId && client.gbpLocationId)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="border border-stoneLine bg-ivory p-4 text-sm leading-6 text-muted">
            No GBP reviews were pulled for this brief.{" "}
            {!hasGbp && "Connect Google Business Profile in the client settings."}
          </p>
        )}
      </div>

      {/* Review generation engine */}
      <div className="border border-stoneLine bg-white p-4">
        <ReviewEngine
          clientId={client.id}
          currentReviewCount={client.gbpPlaceReviewCount}
          currentRating={client.gbpPlaceRating}
        />
      </div>

      {/* Competitor intelligence */}
      <div className="border border-stoneLine bg-white p-4">
        <CompetitorIntel
          clientId={client.id}
          clientName={client.name}
          competitors={client.competitors ?? []}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PerformanceTabs({
  brief,
  client,
  hasInstagram,
  hasCampaigns,
  hasReviews,
  hasMeta,
  hasGbp,
  hasGoogleAds,
}: Props) {
  const defaultTab: Tab = hasInstagram
    ? "instagram"
    : hasCampaigns
    ? "ads"
    : hasGoogleAds
    ? "gads"
    : "google";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const allTabs: { id: Tab; label: string; icon: React.ElementType; count: number; show: boolean }[] = [
    {
      id: "instagram" as const,
      label: "Instagram",
      icon: Instagram,
      count: brief.instagramPosts.length,
      show: hasMeta || hasInstagram,
    },
    {
      id: "ads" as const,
      label: "Meta Ads",
      icon: BarChart2,
      count: brief.metaCampaigns.length,
      show: hasMeta,
    },
    {
      id: "gads" as const,
      label: "Google Ads",
      icon: Search,
      count: (brief.googleAdsCampaigns ?? []).length,
      show: hasGoogleAds,
    },
    {
      id: "google" as const,
      label: "Google Business",
      icon: Globe,
      count: brief.gbpReviews.length,
      show: hasGbp,
    },
  ];
  const tabs = allTabs.filter((t) => t.show);

  if (tabs.length === 0) return null;

  return (
    <div className="border border-stoneLine bg-white">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-stoneLine">
        <Star size={15} className="text-gm-orange" />
        <h2 className="text-base font-semibold text-ink">Performance</h2>
        <span className="text-xs text-muted">
          w/c{" "}
          {new Date(brief.weekStartDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-stoneLine overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${
              tab === id
                ? "border-gm-orange text-gm-orange bg-gm-orange/5"
                : "border-transparent text-muted hover:text-ink hover:bg-ivory"
            }`}
          >
            <Icon size={13} />
            {label}
            {count > 0 && (
              <span className="ml-1 text-[10px] bg-stoneLine/70 text-muted px-1.5 py-0.5 rounded-full tabular-nums">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === "instagram" && (
          <InstagramTab
            brief={brief}
            client={client}
            hasInstagram={hasInstagram}
            hasMeta={hasMeta}
          />
        )}
        {tab === "ads" && (
          <AdsTab brief={brief} client={client} hasCampaigns={hasCampaigns} />
        )}
        {tab === "gads" && (
          <GoogleAdsTab brief={brief} client={client} />
        )}
        {tab === "google" && (
          <GoogleTab
            brief={brief}
            client={client}
            hasReviews={hasReviews}
            hasGbp={hasGbp}
          />
        )}
      </div>

      {/* Footer link for full content plan */}
      {tab === "instagram" && hasInstagram && (
        <div className="px-5 py-3 border-t border-stoneLine">
          <Link
            href={`/clients/${client.id}/plan`}
            className="text-xs font-semibold text-gm-orange hover:underline"
          >
            View full content plan →
          </Link>
        </div>
      )}
    </div>
  );
}
