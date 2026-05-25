"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Target, Zap, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import type { CompetitorAnalysis, CompetitorProfile } from "@/app/api/clients/[id]/ai/competitor-analysis/route";

type Props = {
  clientId: string;
  competitors: string[];
};

export function CompetitorInsightsPanel({ clientId, competitors }: Props) {
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);

  if (!competitors || competitors.length === 0) return null;

  async function analyse() {
    setLoading(true);
    setError("");
    setOpen(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/competitor-analysis`, { method: "POST" });
      const data = await res.json() as { analysis?: CompetitorAnalysis; error?: string };
      if (!res.ok || !data.analysis) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-stoneLine overflow-hidden">
      {/* Header */}
      <button
        onClick={analysis ? () => setOpen((v) => !v) : analyse}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-ivory transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-ink">Competitor Intelligence</p>
            <p className="text-xs text-ink/50">
              {loading ? "Analysing…" : `${competitors.length} competitor${competitors.length > 1 ? "s" : ""}: ${competitors.slice(0, 3).join(", ")}${competitors.length > 3 ? "…" : ""}`}
            </p>
          </div>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
        </div>
        {analysis
          ? (open ? <ChevronUp className="w-4 h-4 text-ink/30" /> : <ChevronDown className="w-4 h-4 text-ink/30" />)
          : !loading && <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Run analysis →</span>
        }
      </button>

      {error && (
        <p className="px-5 pb-4 text-sm text-red-500">{error}</p>
      )}

      {analysis && open && (
        <div className="border-t border-stoneLine bg-ivory p-5 space-y-5">
          {/* Market landscape */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-1.5">Market Landscape</p>
            <p className="text-sm text-ink/80 leading-relaxed">{analysis.marketLandscape}</p>
          </div>

          {/* Competitors */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-2">Competitor Profiles</p>
            <div className="grid md:grid-cols-2 gap-3">
              {analysis.competitors.map((comp) => (
                <CompetitorCard
                  key={comp.name}
                  comp={comp}
                  expanded={expandedComp === comp.name}
                  onToggle={() => setExpandedComp(expandedComp === comp.name ? null : comp.name)}
                />
              ))}
            </div>
          </div>

          {/* Positioning gaps */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> Positioning Gaps You Can Own
            </p>
            <ul className="space-y-1.5">
              {analysis.positioningGaps.map((gap, i) => (
                <li key={i} className="text-sm text-ink/80 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>

          {/* Differentiation angles */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600 mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Differentiation Angles
            </p>
            <ul className="space-y-1.5">
              {analysis.differentiationAngles.map((angle, i) => (
                <li key={i} className="text-sm text-ink/80 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-violet-500 mt-2 shrink-0" />
                  {angle}
                </li>
              ))}
            </ul>
          </div>

          {/* Ownable narrative */}
          <div className="p-4 rounded-lg bg-ink/5 border border-ink/10">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Ownable Narrative
            </p>
            <p className="text-sm text-ink leading-relaxed">{analysis.ownableNarrative}</p>
          </div>

          {/* Urgent actions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2">This Week — Urgent Actions</p>
            <ul className="space-y-1.5">
              {analysis.urgentActions.map((action, i) => (
                <li key={i} className="text-sm text-emerald-900 flex items-start gap-2 bg-emerald-50 border border-emerald-200/60 rounded px-3 py-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={analyse}
            disabled={loading}
            className="text-xs text-ink/40 hover:text-ink/60 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Re-analyse
          </button>
        </div>
      )}
    </div>
  );
}

function CompetitorCard({ comp, expanded, onToggle }: { comp: CompetitorProfile; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border border-stoneLine rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-ivory transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-bold text-ink">{comp.name}</p>
          <p className="text-[11px] text-ink/50">{comp.perceivedPositioning}</p>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-ink/30" /> : <ChevronDown className="w-3.5 h-3.5 text-ink/30" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-stoneLine">
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Likely Strengths</p>
            <ul className="space-y-0.5">
              {comp.likelyStrengths.map((s, i) => (
                <li key={i} className="text-xs text-ink/70 flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Gaps You Can Exploit</p>
            <ul className="space-y-0.5">
              {comp.gaps.map((g, i) => (
                <li key={i} className="text-xs text-ink/70 flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />{g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
