import { notFound } from "next/navigation";
import { getClientByPortalToken, getCurrentBrief } from "@/lib/server/repositories";
import type { Client, WeeklyBrief } from "@/types";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: { token: string } }) {
  const client = await getClientByPortalToken(params.token);
  if (!client) notFound();

  const brief = await getCurrentBrief(client.id);

  return (
    <main className="min-h-screen bg-app-bg">
      <PortalHeader client={client} />
      <div className="mx-auto max-w-3xl px-4 py-8 grid gap-6">
        {brief ? (
          <BriefView client={client} brief={brief} />
        ) : (
          <div className="border border-stoneLine bg-paper p-6 text-center">
            <p className="text-sm text-muted">Your performance report is being prepared. Check back soon.</p>
          </div>
        )}
        <PortalFooter />
      </div>
    </main>
  );
}

function PortalHeader({ client }: { client: Client }) {
  return (
    <div className="border-b border-stoneLine bg-paper px-4 py-4">
      <div className="mx-auto max-w-3xl flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gm-orange">GrowingMonk</p>
          <h1 className="text-base font-semibold text-ink">{client.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted">Performance portal</p>
          <p className="text-[11px] text-muted">{client.city} · {client.packageTier}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border border-stoneLine bg-paper p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function BriefView({ client, brief }: { client: Client; brief: WeeklyBrief }) {
  const symbol = client.currency === "INR" ? "₹" : "$";
  const hasInstagram = brief.instagramPosts.length > 0;
  const hasCampaigns = brief.metaCampaigns.some((c) => c.spend > 0);
  const topPosts = [...brief.instagramPosts]
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 3);
  const unreplied = brief.gbpReviews.filter((r) => !r.reviewReply).length;

  return (
    <div className="grid gap-6">
      {/* Period header */}
      <div>
        <p className="text-xs font-semibold text-muted">
          Week of{" "}
          {new Date(brief.weekStartDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="mt-2 text-base leading-7 text-ink">
          {brief.brief.weekSummary}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hasInstagram && (
          <StatCard
            label="Avg reach"
            value={brief.metrics.avgInstagramReach.toLocaleString("en-IN")}
            detail={`${brief.metrics.avgEngagementRate.toFixed(1)}% engagement`}
          />
        )}
        {hasCampaigns && (
          <StatCard
            label="Ad spend"
            value={`${symbol}${Math.round(brief.metrics.totalAdSpend).toLocaleString("en-IN")}`}
            detail={`${brief.metrics.totalLeads} leads`}
          />
        )}
        {hasCampaigns && brief.metrics.blendedRoas > 0 && (
          <StatCard
            label="ROAS"
            value={`${brief.metrics.blendedRoas.toFixed(2)}x`}
            detail={brief.metrics.blendedRoas >= 3 ? "On target" : "Optimising"}
          />
        )}
        {client.gbpPlaceReviewCount && (
          <StatCard
            label="Google reviews"
            value={client.gbpPlaceReviewCount.toLocaleString("en-IN")}
            detail={client.gbpPlaceRating ? `${client.gbpPlaceRating.toFixed(1)} ★ avg rating` : undefined}
          />
        )}
        {brief.metrics.newReviewCount > 0 && (
          <StatCard
            label="New reviews"
            value={String(brief.metrics.newReviewCount)}
            detail={unreplied > 0 ? `${unreplied} being replied to` : "All replied"}
          />
        )}
      </div>

      {/* Top insight */}
      <div className="border-l-4 border-gm-orange bg-paper pl-4 pr-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gm-orange mb-1">Top insight this week</p>
        <p className="text-sm leading-6 text-ink">{brief.brief.topInsight}</p>
      </div>

      {/* Top performing posts */}
      {topPosts.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
            Top posts this week
          </p>
          <div className="grid gap-3">
            {topPosts.map((post) => (
              <div key={post.id} className="border border-stoneLine bg-paper p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 ${
                    post.performanceTag === "hit"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : post.performanceTag === "average"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {post.performanceTag}
                  </span>
                  <span className="text-xs text-muted">{post.mediaType.replace("_", " ")}</span>
                  <span className="ml-auto text-xs font-semibold text-ink">
                    {post.reach.toLocaleString("en-IN")} reach
                  </span>
                </div>
                {post.caption && (
                  <p className="mt-3 text-xs leading-5 text-muted line-clamp-3">{post.caption}</p>
                )}
                <div className="mt-3 flex gap-4 text-[11px] text-muted">
                  <span>{post.engagementRate.toFixed(1)}% engagement</span>
                  <span>{post.likeCount} likes</span>
                  <span>{post.commentsCount} comments</span>
                  {post.saved > 0 && <span>{post.saved} saves</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad performance */}
      {hasCampaigns && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
            Ad campaigns
          </p>
          <div className="grid gap-2">
            {brief.metaCampaigns.filter((c) => c.spend > 0).map((campaign) => (
              <div key={campaign.id} className="border border-stoneLine bg-paper px-4 py-3 flex flex-wrap items-center gap-4">
                <p className="text-xs font-semibold text-ink flex-1 min-w-0 truncate">{campaign.name}</p>
                <div className="flex gap-4 text-xs text-muted shrink-0">
                  <span>{symbol}{Math.round(campaign.spend).toLocaleString("en-IN")} spent</span>
                  {campaign.leads > 0 && <span>{campaign.leads} leads</span>}
                  {campaign.roas > 0 && <span>{campaign.roas.toFixed(2)}x ROAS</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted leading-5">
            {brief.brief.adAnalysis.budgetReallocationSuggestion}
          </p>
        </div>
      )}

      {/* What's planned */}
      <div className="border border-stoneLine bg-paper p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
          Content plan — coming week
        </p>
        <p className="text-xs text-muted leading-5 mb-3">
          {brief.brief.weekPlan.strategyRationale}
        </p>
        <div className="grid gap-2">
          {brief.brief.weekPlan.posts.slice(0, 5).map((post, i) => (
            <div key={i} className="flex gap-3 text-xs border-t border-stoneLine pt-2">
              <span className="font-semibold text-gm-orange w-8 shrink-0">{post.day.slice(0, 3)}</span>
              <span className="text-muted">{post.postType}</span>
              <span className="text-ink flex-1">{post.hook}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PortalFooter() {
  return (
    <div className="text-center py-4">
      <p className="text-[11px] text-muted">
        Powered by{" "}
        <span className="font-semibold text-gm-orange">GrowingMonk</span>
        {" "}· Digital growth partner
      </p>
    </div>
  );
}
