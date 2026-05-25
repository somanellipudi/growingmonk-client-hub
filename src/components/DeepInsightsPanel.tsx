"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Instagram,
  Layers,
  Loader2,
  MapPin,
  Quote,
  RefreshCw,
  Rocket,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { DeepAnalysis, ImprovementPriority, ThirtyDayAction } from "@/app/api/clients/[id]/ai/deep-analysis/route";

type Tab = "reviews" | "instagram" | "competitors" | "growth";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "reviews", label: "Google Reviews", icon: Star },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "competitors", label: "Competitors", icon: MapPin },
  { id: "growth", label: "Growth Plan", icon: Rocket },
];

const EFFORT_COLOR: Record<string, string> = {
  low: "bg-green-50 text-green-800 border-green-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const URGENCY_COLOR: Record<string, string> = {
  immediate: "bg-red-50 text-red-700 border-red-200",
  this_week: "bg-amber-50 text-amber-800 border-amber-200",
  ongoing: "bg-blue-50 text-blue-800 border-blue-200",
  now: "bg-red-50 text-red-700 border-red-200",
  soon: "bg-amber-50 text-amber-800 border-amber-200",
  later: "bg-gray-100 text-gray-500 border-gray-200",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] rounded-sm ${colorClass}`}>
      {label}
    </span>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className="text-gm-orange shrink-0" />
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{children}</h3>
    </div>
  );
}

function ExpandableCard({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stoneLine bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ivory transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp size={14} className="text-muted shrink-0" /> : <ChevronDown size={14} className="text-muted shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-stoneLine pt-3">{children}</div>}
    </div>
  );
}

function ReviewsTab({ data }: { data: DeepAnalysis["reviews"] }) {
  const scoreColor =
    data.scoreOutOf10 >= 8 ? "text-green-600" : data.scoreOutOf10 >= 6 ? "text-amber-600" : "text-red-600";

  return (
    <div className="grid gap-5">
      {/* Sentiment header */}
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center border border-stoneLine bg-ivory px-6 py-4 min-w-[120px]">
          <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>{data.scoreOutOf10}</span>
          <span className="text-xs text-muted mt-1">/ 10 review health</span>
        </div>
        <div className="border border-stoneLine bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted mb-2">Sentiment Summary</p>
          <p className="text-sm leading-6 text-ink">{data.sentimentSummary}</p>
        </div>
      </div>

      {/* Urgent issues */}
      {data.urgentIssues.length > 0 && (
        <div className="border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-600 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-red-700">Urgent — Action Required</span>
          </div>
          <ul className="space-y-1">
            {data.urgentIssues.map((issue, i) => (
              <li key={i} className="text-sm text-red-700 leading-5">• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* What customers love */}
      <div>
        <SectionTitle icon={Star}>What Customers Love</SectionTitle>
        <div className="grid gap-2">
          {data.lovedThemes.map((theme, i) => (
            <ExpandableCard
              key={i}
              title={theme.theme}
              badge={<span className="text-[10px] text-muted border border-stoneLine px-2 py-0.5">{theme.frequency}</span>}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  {theme.quotes.map((q, qi) => (
                    <div key={qi} className="flex gap-2 text-sm text-muted leading-5">
                      <Quote size={12} className="text-gm-orange mt-0.5 shrink-0" />
                      <span className="italic">{q}</span>
                    </div>
                  ))}
                </div>
                <div className="border-l-2 border-gm-orange pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gm-orange mb-1">How to amplify</p>
                  <p className="text-xs text-ink leading-5">{theme.howToAmplify}</p>
                </div>
              </div>
            </ExpandableCard>
          ))}
        </div>
      </div>

      {/* Pain points */}
      {data.painPoints.length > 0 && (
        <div>
          <SectionTitle icon={AlertTriangle}>Pain Points to Fix</SectionTitle>
          <div className="grid gap-2">
            {data.painPoints.map((pt, i) => (
              <ExpandableCard
                key={i}
                title={pt.issue}
                badge={<span className="text-[10px] text-muted border border-stoneLine px-2 py-0.5">{pt.frequency}</span>}
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    {pt.quotes.map((q, qi) => (
                      <div key={qi} className="flex gap-2 text-sm text-muted leading-5">
                        <Quote size={12} className="text-red-700 mt-0.5 shrink-0" />
                        <span className="italic">{q}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-l-2 border-red-400 pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-600 mb-1">How to fix</p>
                    <p className="text-xs text-ink leading-5">{pt.howToFix}</p>
                  </div>
                </div>
              </ExpandableCard>
            ))}
          </div>
        </div>
      )}

      {/* Marketing gold */}
      <div>
        <SectionTitle icon={Quote}>Marketing Gold — Use These in Ads</SectionTitle>
        <div className="grid gap-2">
          {data.marketingGold.map((quote, i) => (
            <div key={i} className="border border-amber-200 bg-amber-50 p-3 flex gap-3">
              <Quote size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-5 italic">{quote}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Response strategy */}
      <div className="border border-stoneLine bg-ivory p-4">
        <SectionTitle icon={Users}>Review Response Strategy</SectionTitle>
        <p className="text-sm leading-6 text-ink">{data.responseStrategy}</p>
      </div>

      {/* Improvement priorities */}
      <div>
        <SectionTitle icon={TrendingUp}>Improvement Priorities</SectionTitle>
        <div className="grid gap-2">
          {data.improvementPriorities.map((item: ImprovementPriority, i) => (
            <div key={i} className="border border-stoneLine bg-white p-3 grid gap-1">
              <div className="flex items-start gap-2 flex-wrap">
                <Badge label={item.urgency.replace("_", " ")} colorClass={URGENCY_COLOR[item.urgency] ?? ""} />
                <span className="text-sm font-semibold text-ink">{item.action}</span>
              </div>
              <p className="text-xs text-muted leading-5 pl-0.5">{item.expectedImpact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstagramTab({ data }: { data: DeepAnalysis["instagram"] }) {
  return (
    <div className="grid gap-5">
      {/* Summary */}
      <div className="border border-stoneLine bg-white p-4">
        <SectionTitle icon={BarChart2}>Performance Overview</SectionTitle>
        <p className="text-sm leading-6 text-ink">{data.performanceSummary}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* What's working */}
        <div>
          <SectionTitle icon={TrendingUp}>What&apos;s Working</SectionTitle>
          <div className="grid gap-2">
            {data.whatIsWorking.map((item, i) => (
              <div key={i} className="border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-800">{item.hook}</p>
                <p className="text-xs text-green-800 mt-1 leading-5">{item.why}</p>
                <p className="text-[11px] text-green-700 mt-2 font-semibold">{item.proof}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What's not working */}
        <div>
          <SectionTitle icon={AlertTriangle}>What&apos;s Not Working</SectionTitle>
          <div className="grid gap-2">
            {data.whatIsNotWorking.map((item, i) => (
              <div key={i} className="border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">{item.pattern}</p>
                <p className="text-xs text-red-800 mt-1 leading-5">{item.why}</p>
                <div className="border-l-2 border-red-400 pl-2 mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-600 mb-0.5">Fix</p>
                  <p className="text-xs text-red-700">{item.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content gaps */}
      <div>
        <SectionTitle icon={Layers}>Content Gaps to Fill</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.contentGaps.map((gap, i) => (
            <div key={i} className="border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 leading-5">
              {gap}
            </div>
          ))}
        </div>
      </div>

      {/* Posting strategy + engagement */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border border-stoneLine bg-ivory p-4">
          <SectionTitle icon={Clock}>Optimal Posting Strategy</SectionTitle>
          <p className="text-sm leading-6 text-ink">{data.optimalPostingStrategy}</p>
        </div>
        <div className="border border-stoneLine bg-ivory p-4">
          <SectionTitle icon={Users}>Engagement Insights</SectionTitle>
          <p className="text-sm leading-6 text-ink">{data.engagementInsights}</p>
        </div>
      </div>

      {/* Top hooks */}
      <div>
        <SectionTitle icon={Zap}>Ready-to-Use Hooks</SectionTitle>
        <div className="grid gap-2">
          {data.topHooks.map((hook, i) => (
            <div key={i} className="border border-stoneLine bg-white p-3 flex gap-3 items-start">
              <span className="text-[11px] font-bold text-gm-orange bg-gm-orange/10 px-2 py-0.5 shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-sm text-ink leading-5">{hook}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next week content plan */}
      <div>
        <SectionTitle icon={Brain}>Next Week Content Plan</SectionTitle>
        <div className="grid gap-2">
          {data.nextWeekContent.map((post, i) => (
            <div key={i} className="border border-stoneLine bg-white p-3 grid grid-cols-[60px_auto_1fr] gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gm-orange">{post.day.slice(0, 3)}</p>
                <p className="text-[10px] text-muted mt-0.5 border border-stoneLine px-1 inline-block">{post.format}</p>
              </div>
              <div className="border-l border-stoneLine" />
              <div>
                <p className="text-sm font-semibold text-ink leading-5">{post.hook}</p>
                <p className="text-xs text-muted mt-1 leading-5">{post.why}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorsTab({ data }: { data: DeepAnalysis["competitors"] }) {
  return (
    <div className="grid gap-5">
      {/* Market + position */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border border-stoneLine bg-white p-4">
          <SectionTitle icon={MapPin}>Market Landscape</SectionTitle>
          <p className="text-sm leading-6 text-ink">{data.marketSnapshot}</p>
        </div>
        <div className="border border-amber-200 bg-amber-50 p-4">
          <SectionTitle icon={Users}>Your Current Position</SectionTitle>
          <p className="text-sm leading-6 text-amber-800">{data.clientCurrentPosition}</p>
        </div>
      </div>

      {/* Gaps */}
      <div>
        <SectionTitle icon={TrendingUp}>Market Gaps to Capture</SectionTitle>
        <div className="grid gap-2">
          {data.gaps.map((gap, i) => (
            <div key={i} className="border border-stoneLine bg-white p-3 grid gap-2">
              <div className="flex items-start gap-2 flex-wrap">
                <Badge label={gap.urgency} colorClass={URGENCY_COLOR[gap.urgency] ?? ""} />
                <span className="text-sm font-semibold text-ink">{gap.opportunity}</span>
              </div>
              <div className="border-l-2 border-gm-orange pl-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gm-orange mb-0.5">How to capture</p>
                <p className="text-xs text-ink leading-5">{gap.howToCapture}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Winning moves */}
        <div>
          <SectionTitle icon={Rocket}>Winning Moves</SectionTitle>
          <ul className="space-y-2">
            {data.winningMoves.map((move, i) => (
              <li key={i} className="border border-green-200 bg-green-50 p-3 text-sm text-green-800 leading-5 flex gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                {move}
              </li>
            ))}
          </ul>
        </div>

        {/* Defensive priorities */}
        <div>
          <SectionTitle icon={Layers}>Protect These First</SectionTitle>
          <ul className="space-y-2">
            {data.defensivePriorities.map((item, i) => (
              <li key={i} className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 leading-5">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Ownable narrative */}
      <div className="border-l-4 border-gm-orange bg-ivory p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gm-orange mb-3">Your Ownable Market Position</p>
        <p className="text-base font-semibold text-ink leading-7">{data.ownableNarrative}</p>
      </div>
    </div>
  );
}

function GrowthTab({ data }: { data: DeepAnalysis["growthPlan"] }) {
  return (
    <div className="grid gap-5">
      {/* Top priority */}
      <div className="border-2 border-gm-orange bg-gm-orange/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-gm-orange" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-gm-orange">Top Priority — Next 30 Days</span>
        </div>
        <p className="text-base font-semibold text-ink leading-7">{data.topPriority}</p>
      </div>

      {/* Quick wins */}
      <div>
        <SectionTitle icon={CheckCircle2}>Quick Wins — Do This Week</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.quickWins.map((win, i) => (
            <div key={i} className="border border-green-200 bg-green-50 p-3 flex gap-2">
              <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 leading-5">{win}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 30-day action plan */}
      <div>
        <SectionTitle icon={TrendingUp}>30-Day Action Plan</SectionTitle>
        <div className="grid gap-2">
          {data.thirtyDayActions.map((action: ThirtyDayAction, i) => (
            <div key={i} className="border border-stoneLine bg-white p-3 grid gap-2">
              <div className="flex items-start gap-2 flex-wrap">
                <Badge label={action.effort} colorClass={EFFORT_COLOR[action.effort] ?? ""} />
                <span className="text-[10px] font-semibold text-muted border border-stoneLine px-2 py-0.5">{action.channel}</span>
                <span className="text-sm font-semibold text-ink">{action.action}</span>
              </div>
              <p className="text-xs text-muted leading-5 pl-0.5">{action.expectedResult}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 90-day strategy */}
      <div className="border border-stoneLine bg-ivory p-4">
        <SectionTitle icon={Brain}>90-Day Strategy</SectionTitle>
        <p className="text-sm leading-6 text-ink">{data.ninetyDayStrategy}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Revenue levers */}
        <div>
          <SectionTitle icon={Rocket}>Revenue Levers</SectionTitle>
          <ul className="space-y-2">
            {data.revenueLevers.map((lever, i) => (
              <li key={i} className="border border-stoneLine bg-white p-3 text-sm text-ink leading-5 flex gap-2">
                <span className="text-gm-orange font-bold shrink-0">{i + 1}.</span>
                {lever}
              </li>
            ))}
          </ul>
        </div>

        {/* Critical metrics */}
        <div>
          <SectionTitle icon={BarChart2}>Track These Weekly</SectionTitle>
          <ul className="space-y-2">
            {data.criticalMetrics.map((metric, i) => (
              <li key={i} className="border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 leading-5">
                {metric}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function DeepInsightsPanel({ clientId }: { clientId: string }) {
  const [analysis, setAnalysis] = useState<DeepAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("reviews");

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/deep-analysis`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      setAnalysis(json.analysis);
      setTab("reviews");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-stoneLine bg-white">
      {/* Panel header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-stoneLine">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gm-orange/10 flex items-center justify-center shrink-0">
            <Brain size={16} className="text-gm-orange" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Deep Business Intelligence</h2>
            <p className="text-xs text-muted">AI analysis of reviews, Instagram, competitors, and growth strategy</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-gm-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-gm-orange/90 transition-colors shrink-0"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : analysis ? (
            <RefreshCw size={14} />
          ) : (
            <Brain size={14} />
          )}
          {loading ? "Analysing…" : analysis ? "Re-analyse" : "Analyse Business"}
        </button>
      </div>

      {/* Body */}
      {!analysis && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <Brain size={32} className="text-muted/40" />
          <p className="text-sm font-semibold text-ink">Deep intelligence report</p>
          <p className="text-xs text-muted max-w-sm leading-5">
            Analyses your Google reviews, Instagram performance, competitor landscape, and builds a 30/90-day growth plan. Takes 20–40 seconds.
          </p>
          <button
            onClick={generate}
            className="mt-2 flex items-center gap-2 bg-gm-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-gm-orange/90 transition-colors"
          >
            <Brain size={14} />
            Analyse Business
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={28} className="text-gm-orange animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-ink">Generating deep analysis…</p>
            <p className="text-xs text-muted mt-1">Reviewing all data points — 20–40 seconds</p>
          </div>
        </div>
      )}

      {error && (
        <div className="m-5 border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Analysis failed</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-stoneLine overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] whitespace-nowrap border-b-2 transition-colors ${
                  tab === id
                    ? "border-gm-orange text-gm-orange bg-gm-orange/5"
                    : "border-transparent text-muted hover:text-ink hover:bg-ivory"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {tab === "reviews" && <ReviewsTab data={analysis.reviews} />}
            {tab === "instagram" && <InstagramTab data={analysis.instagram} />}
            {tab === "competitors" && <CompetitorsTab data={analysis.competitors} />}
            {tab === "growth" && <GrowthTab data={analysis.growthPlan} />}
          </div>

          <div className="px-5 py-3 border-t border-stoneLine flex items-center justify-between">
            <p className="text-[10px] text-muted">
              Generated {new Date(analysis.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
            <button
              onClick={generate}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-gm-orange transition-colors"
            >
              <RefreshCw size={11} />
              Refresh analysis
            </button>
          </div>
        </>
      )}
    </div>
  );
}
