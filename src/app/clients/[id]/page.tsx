import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Edit3, MessageSquare, TrendingUp, Zap } from "lucide-react";
import { ClientForm } from "@/components/ClientForm";
import { AppShell } from "@/components/layout/AppShell";
import { CopyButton, InlineCopyButton, SyncClientButton } from "@/components/mvp-actions";
import { WhatsAppBlastButton, WhatsAppReportButton } from "@/components/whatsapp-actions";
import { LinkButton, PageHeader, Panel, StatCard } from "@/components/ui";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";
import { PerformanceTabs } from "@/components/PerformanceTabs";
import { DeepInsightsPanel } from "@/components/DeepInsightsPanel";
import { LeadLogPanel } from "@/components/LeadLogPanel";
import { PortalLinkPanel } from "@/components/PortalLinkPanel";
import { FestivalCalendar } from "@/components/FestivalCalendar";
import { ContentToolsTabs } from "@/components/ContentToolsTabs";
import type { Client, WeeklyBrief } from "@/types";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string; gbpMessage?: string };
}) {
  const [client, brief] = await Promise.all([
    getClient(params.id),
    getCurrentBrief(params.id),
  ]);
  if (!client) notFound();

  const editing = searchParams.edit === "1";
  const hasMeta = Boolean(
    client.metaAccessToken && (client.metaAdAccountId || client.metaIgUserId)
  );
  const hasGbp =
    Boolean(client.gbpAccountId && client.gbpLocationId) ||
    Boolean(client.gbpPlaceId);

  return (
    <AppShell>
      <PageHeader
        eyebrow={client.niche.replace("_", " ")}
        title={client.name}
        description={`${client.city}, ${client.country} · ${client.packageTier} · ${client.currency}`}
        action={
          editing ? (
            <LinkButton href={`/clients/${client.id}`} variant="secondary">
              Cancel edit
            </LinkButton>
          ) : (
            <LinkButton
              href={`/clients/${client.id}?edit=1`}
              variant="secondary"
            >
              <Edit3 size={16} /> Edit
            </LinkButton>
          )
        }
      />

      {editing ? (
        <Panel className="p-6">
          {searchParams.gbpMessage ? (
            <p className="mb-4 border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {searchParams.gbpMessage}
            </p>
          ) : null}
          <ClientForm client={client} />
        </Panel>
      ) : !hasMeta && !hasGbp ? (
        <NoIntegrations client={client} />
      ) : !brief ? (
        <ReadyToGenerate client={client} hasMeta={hasMeta} hasGbp={hasGbp} hasGoogleAds={Boolean(client.googleAdsCustomerId)} />
      ) : (
        <BriefReady
          client={client}
          brief={brief}
          hasMeta={hasMeta}
          hasGbp={hasGbp}
          hasGoogleAds={Boolean(client.googleAdsCustomerId)}
        />
      )}
    </AppShell>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function NoIntegrations({ client }: { client: Client }) {
  return (
    <Panel className="min-h-80 p-8">
      <h2 className="text-xl font-semibold text-ink">No integrations connected</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Connect Meta and Google Business Profile to generate the weekly
        intelligence brief. The MVP pulls real posts, ad campaigns, and reviews
        automatically.
      </p>
      <div className="mt-6">
        <LinkButton href={`/clients/${client.id}?edit=1`}>
          Connect integrations
        </LinkButton>
      </div>
    </Panel>
  );
}

function ReadyToGenerate({
  client,
  hasMeta,
  hasGbp,
  hasGoogleAds,
}: {
  client: Client;
  hasMeta: boolean;
  hasGbp: boolean;
  hasGoogleAds: boolean;
}) {
  return (
    <Panel className="min-h-80 p-8">
      <div className="flex flex-wrap gap-2">
        <IntegrationDot active={hasMeta} label="Meta" />
        <IntegrationDot active={hasGbp} label="Google Business" />
        <IntegrationDot active={hasGoogleAds} label="Google Ads" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-ink">
        Ready to generate your first intelligence brief
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        This pulls last week&apos;s Instagram posts, Meta ad campaigns, and
        Google reviews, then generates a complete strategy brief. It can take
        30–60 seconds.
      </p>
      <div className="mt-6">
        <SyncClientButton clientId={client.id} label="Generate intel brief" />
      </div>
    </Panel>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function BriefReady({
  client,
  brief,
  hasMeta,
  hasGbp,
  hasGoogleAds,
}: {
  client: Client;
  brief: WeeklyBrief;
  hasMeta: boolean;
  hasGbp: boolean;
  hasGoogleAds: boolean;
}) {
  const allAlerts = brief.brief.alertFlags;
  const hasInstagram = brief.instagramPosts.length > 0;
  const hasCampaigns = brief.metaCampaigns.length > 0;
  const hasReviews = brief.gbpReviews.length > 0;
  const unreplied = brief.gbpReviews.filter((r) => !r.reviewReply);

  return (
    <div className="grid gap-6">

      {/* ── Section 1: Status bar ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <IntegrationDot active={hasMeta} label="Meta" />
          <IntegrationDot active={hasGbp} label="Google Business" />
          <IntegrationDot active={hasGoogleAds} label="Google Ads" />
          <span className="border border-stoneLine bg-ivory px-3 py-1 text-xs font-semibold text-muted">
            Synced{" "}
            {new Date(brief.syncedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <SyncClientButton clientId={client.id} label="Sync now" />
      </div>

      {/* ── Section 2: KPI snapshot (4 cards) ──────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Avg reach"
          value={
            hasInstagram
              ? brief.metrics.avgInstagramReach.toLocaleString("en-IN")
              : "–"
          }
          detail={
            hasInstagram
              ? `${brief.metrics.avgEngagementRate.toFixed(1)}% engagement`
              : "No posts pulled"
          }
        />
        <StatCard
          label="Blended ROAS"
          value={hasCampaigns ? `${brief.metrics.blendedRoas.toFixed(2)}x` : "–"}
          detail={
            hasCampaigns
              ? brief.metrics.blendedRoas >= 3
                ? "Healthy"
                : "Below target"
              : "No campaigns"
          }
        />
        <StatCard
          label="Leads / CPL"
          value={hasCampaigns ? String(brief.metrics.totalLeads) : "–"}
          detail={
            hasCampaigns
              ? `${formatMoney(brief.metrics.avgCpl, client.currency)}/lead`
              : "No ad data"
          }
        />
        <StatCard
          label="GBP rating"
          value={
            client.gbpPlaceRating
              ? `${client.gbpPlaceRating.toFixed(1)} ★`
              : brief.metrics.avgNewReviewRating
              ? `${brief.metrics.avgNewReviewRating.toFixed(1)} ★`
              : "–"
          }
          detail={
            client.gbpPlaceReviewCount
              ? `${client.gbpPlaceReviewCount.toLocaleString("en-IN")} total · ${unreplied.length} need reply`
              : `${brief.metrics.newReviewCount} new · ${unreplied.length} need reply`
          }
        />
      </div>

      {/* ── Section 3: Alert flags ──────────────────────────────────────── */}
      {allAlerts.length > 0 && (
        <div className="grid gap-2">
          {allAlerts.map((flag) => (
            <div
              key={`${flag.type}-${flag.message}`}
              className={`flex items-start gap-3 border px-4 py-3 text-sm ${
                flag.severity === "high"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : flag.severity === "medium"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-stoneLine bg-ivory text-ink"
              }`}
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">{flag.message}</span>
                <span className="ml-2 text-xs opacity-80">
                  {flag.suggestedAction}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 4: Lead outcome log ────────────────────────────────── */}
      <Panel className="p-5">
        <LeadLogPanel
          clientId={client.id}
          campaigns={brief.metaCampaigns.map((c) => c.name)}
        />
      </Panel>

      {/* ── Section 5: Intelligence brief + This week plan ─────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

        {/* Left: brief summary + content posts */}
        <div className="grid gap-5 content-start">
          <Panel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-gm-orange" />
              <h2 className="text-lg font-semibold text-ink">
                Weekly intelligence brief
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3 text-sm leading-6 text-muted">
                <p className="text-base font-semibold text-ink leading-7">
                  {brief.brief.weekSummary}
                </p>
                <div className="border-l-2 border-gm-orange pl-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gm-orange mb-1">
                    Top insight
                  </p>
                  <p>{brief.brief.topInsight}</p>
                </div>
                <p>
                  <span className="font-semibold text-ink">Content:</span>{" "}
                  {brief.brief.contentAnalysis.overallAssessment}
                </p>
                <p>
                  <span className="font-semibold text-ink">Ads:</span>{" "}
                  {brief.brief.adAnalysis.overallAssessment}
                </p>
              </div>
              <div className="border-t border-stoneLine pt-4 lg:border-t-0 lg:border-l lg:pl-4 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-2">
                    Best performing
                  </p>
                  <p className="text-xs font-semibold text-ink">
                    {brief.brief.contentAnalysis.bestPerforming.hook}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {brief.brief.contentAnalysis.bestPerforming.why}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-2">
                    Budget suggestion
                  </p>
                  <p className="text-xs text-muted">
                    {brief.brief.adAnalysis.budgetReallocationSuggestion}
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-gm-orange" />
                <h2 className="text-lg font-semibold text-ink">
                  Content plan — this week
                </h2>
              </div>
              <Link
                href={`/clients/${client.id}/plan`}
                className="flex items-center gap-1 text-sm font-semibold text-gm-orange"
              >
                Full plan <ArrowRight size={14} />
              </Link>
            </div>
            <p className="mb-4 text-sm text-muted leading-6">
              {brief.brief.weekPlan.strategyRationale}
            </p>
            <div className="grid gap-3">
              {brief.brief.weekPlan.posts.slice(0, 5).map((post, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border border-stoneLine bg-ivory p-4"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gm-orange">
                      {post.day.slice(0, 3)}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {post.bestTimeToPost}
                    </p>
                    <p className="text-[10px] text-muted">{post.postType}</p>
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-ink leading-5">
                        {post.hook}
                      </p>
                      <InlineCopyButton text={post.hook} />
                    </div>
                    <p className="text-xs text-muted mt-1 leading-5 line-clamp-2">
                      {post.dataReasoning}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-stoneLine">
              <FestivalCalendar niche={client.niche} />
            </div>
          </Panel>
        </div>

        {/* Right: quick actions sidebar */}
        <div className="grid gap-5 content-start">
          {brief.brief.weekPlan.whatsappBlast ? (
            <Panel className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-gm-orange" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">
                    WhatsApp blast
                  </h3>
                </div>
                <InlineCopyButton text={brief.brief.weekPlan.whatsappBlast.message} label="Copy" />
              </div>
              <p className="text-xs font-semibold text-ink mb-0.5">
                {brief.brief.weekPlan.whatsappBlast.bestTimeToSend}
              </p>
              <p className="text-xs text-muted mb-3">
                {brief.brief.weekPlan.whatsappBlast.sendingReason}
              </p>
              <p className="text-sm leading-6 text-ink bg-ivory border border-stoneLine px-4 py-3 mb-0">
                {brief.brief.weekPlan.whatsappBlast.message}
              </p>
              <WhatsAppBlastButton
                clientId={client.id}
                message={brief.brief.weekPlan.whatsappBlast.message}
              />
            </Panel>
          ) : null}

          <Panel className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">
                Client update draft
              </h3>
              <InlineCopyButton text={brief.brief.weekPlan.clientUpdateDraft} label="Copy draft" />
            </div>
            <BriefText text={brief.brief.weekPlan.clientUpdateDraft} className="text-xs leading-5 text-muted space-y-1.5 mb-4" />
            <WhatsAppReportButton
              clientId={client.id}
              defaultPhone={client.whatsappNumber || client.contactPhone}
              clientName={client.name}
            />
          </Panel>

          <PortalLinkPanel
            clientId={client.id}
            initialToken={client.portalToken ?? null}
            initialEnabled={client.portalEnabled ?? false}
          />
        </div>
      </div>

      {/* ── Section 5: Content creation tools ───────────────────────── */}
      <ContentToolsTabs clientId={client.id} weekPlanPosts={brief.brief.weekPlan.posts} />

      {/* ── Section 6: Performance — tabbed (Instagram | Meta Ads | Google) */}
      <PerformanceTabs
        brief={brief}
        client={client}
        hasInstagram={hasInstagram}
        hasCampaigns={hasCampaigns}
        hasReviews={hasReviews}
        hasMeta={hasMeta}
        hasGbp={hasGbp}
        hasGoogleAds={hasGoogleAds}
      />

      {/* ── Section 6: Deep AI Intelligence ────────────────────────────── */}
      <DeepInsightsPanel clientId={client.id} />

    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function BriefText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <div className={className}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        const isBullet = line.startsWith("- ");
        const raw = isBullet ? line.slice(2) : line;
        const segments = raw.split(/\*\*(.*?)\*\*/g);
        const rendered = segments.map((seg, j) =>
          j % 2 === 1
            ? <strong key={j} className="font-semibold text-ink">{seg}</strong>
            : <span key={j}>{seg}</span>
        );
        return isBullet ? (
          <div key={i} className="flex gap-2">
            <span className="text-gm-orange shrink-0 select-none">·</span>
            <span>{rendered}</span>
          </div>
        ) : (
          <p key={i}>{rendered}</p>
        );
      })}
    </div>
  );
}

function IntegrationDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold ${
        active
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-stoneLine bg-ivory text-muted"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-muted"}`}
      />
      {label} {active ? "connected" : "not connected"}
    </span>
  );
}

function formatMoney(value: number, currency: Client["currency"]) {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
