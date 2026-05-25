"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import type { ReviewInsights, ReviewTheme } from "@/app/api/clients/[id]/ai/review-insights/route";

type Props = {
  clientId: string;
};

export function ReviewInsightsPanel({ clientId }: Props) {
  const [insights, setInsights] = useState<ReviewInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function analyse() {
    setLoading(true);
    setError("");
    setOpen(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/review-insights`, { method: "POST" });
      const data = await res.json() as { insights?: ReviewInsights; error?: string };
      if (!res.ok || !data.insights) throw new Error(data.error || "Analysis failed");
      setInsights(data.insights);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border border-violet-200 bg-violet-50 rounded">
      <button
        onClick={insights ? () => setOpen((v) => !v) : analyse}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-violet-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-sm font-semibold text-violet-800">
            {loading ? "Analysing reviews…" : "AI Review Intelligence"}
          </span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-violet-600 animate-spin" />}
        </div>
        {insights && (open ? <ChevronUp className="w-4 h-4 text-violet-600" /> : <ChevronDown className="w-4 h-4 text-violet-600" />)}
        {!insights && !loading && (
          <span className="text-xs text-violet-700 font-medium">Analyse all reviews →</span>
        )}
      </button>

      {error && (
        <p className="px-4 pb-3 text-sm text-red-600">{error}</p>
      )}

      {insights && open && (
        <div className="px-4 pb-4 space-y-4 border-t border-violet-200">
          {/* Overall sentiment */}
          <div className="pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700 mb-1">Overall Sentiment</p>
            <p className="text-sm text-violet-800 leading-relaxed">{insights.overallSentiment}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* What customers love */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> What Customers Love
              </p>
              <div className="space-y-2">
                {insights.whatCustomersLove.map((theme, i) => (
                  <ThemeCard key={i} theme={theme} color="emerald" />
                ))}
              </div>
            </div>

            {/* Pain points */}
            {insights.painPoints.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Pain Points
                </p>
                <div className="space-y-2">
                  {insights.painPoints.map((theme, i) => (
                    <ThemeCard key={i} theme={theme} color="red" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Marketing angles */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600 mb-2 flex items-center gap-1">
              <Megaphone className="w-3 h-3" /> Marketing Angles (use real customer language)
            </p>
            <ul className="space-y-1.5">
              {insights.marketingAngles.map((angle, i) => (
                <li key={i} className="text-sm text-violet-800 flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {angle}
                </li>
              ))}
            </ul>
          </div>

          {/* Content ideas */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Content Ideas from Reviews
            </p>
            <ul className="space-y-1.5">
              {insights.contentIdeas.map((idea, i) => (
                <li key={i} className="text-sm text-amber-800 flex items-start gap-2 bg-amber-50 rounded px-3 py-2">
                  <span className="w-1 h-1 rounded-full bg-amber-400 mt-2 shrink-0" />
                  {idea}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvement suggestions */}
          {insights.improvementSuggestions.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Improvement Suggestions</p>
              <ul className="space-y-1">
                {insights.improvementSuggestions.map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={analyse}
            disabled={loading}
            className="text-xs text-violet-700 hover:text-violet-900 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Re-analyse
          </button>
        </div>
      )}
    </div>
  );
}

function ThemeCard({ theme, color }: { theme: ReviewTheme; color: "emerald" | "red" }) {
  const colors = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", badge: "bg-emerald-100 text-emerald-700", quote: "text-emerald-700" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700", quote: "text-red-600" },
  }[color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded p-2.5 space-y-1`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold ${colors.text}`}>{theme.theme}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.badge} font-medium shrink-0`}>{theme.frequency}</span>
      </div>
      {theme.examples.slice(0, 2).map((ex, i) => (
        <p key={i} className={`text-[11px] ${colors.quote} italic`}>&ldquo;{ex}&rdquo;</p>
      ))}
    </div>
  );
}
