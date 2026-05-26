"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, MapPin, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { Competitor, CompetitorInsights } from "@/types";
import type { CompetitorSuggestion } from "@/app/api/clients/[id]/competitors/suggest/route";

type HistoryPoint = { date: string; count: number; rating: number };

type CompetitorEntry = {
  competitor: Competitor;
  count: number | null;
  rating: number | null;
  delta7d: number | null;
  history: HistoryPoint[];
};

type ApiResponse = {
  competitorData: CompetitorEntry[];
  clientCount: number | null;
  clientRating: number | null;
};

function MiniSparkline({ history, color = "#f97316" }: { history: HistoryPoint[]; color?: string }) {
  if (history.length < 2) return <span className="text-xs text-muted">No data</span>;
  const counts = history.map((h) => h.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;
  const W = 80;
  const H = 24;
  const points = counts
    .map((c, i) => `${(i / (counts.length - 1)) * W},${H - ((c - min) / range) * H}`)
    .join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle
        cx={(counts.length - 1) / (counts.length - 1) * W}
        cy={H - ((counts[counts.length - 1]! - min) / range) * H}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-muted">—</span>;
  if (delta === 0) return <span className="text-xs text-muted">±0</span>;
  const up = delta > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-red-600" : "text-green-600"}`}>
      {up ? "↑" : "↓"}{Math.abs(delta)} this week
    </span>
  );
}

function InsightsPanel({ insights }: { insights: CompetitorInsights }) {
  const Tag = ({ text }: { text: string }) => (
    <span className="inline-block bg-stone-100 text-ink text-[10px] px-2 py-0.5 rounded-sm">{text}</span>
  );
  return (
    <div className="grid gap-3 pt-3">
      {insights.summary && (
        <p className="text-[11px] text-ink leading-5 italic">{insights.summary}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {insights.popularServices.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">Popular services</p>
            <div className="flex flex-wrap gap-1">{insights.popularServices.map((s) => <Tag key={s} text={s} />)}</div>
          </div>
        )}
        {insights.popularProducts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">Products used</p>
            <div className="flex flex-wrap gap-1">{insights.popularProducts.map((s) => <Tag key={s} text={s} />)}</div>
          </div>
        )}
        {insights.starEmployees.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">Star employees</p>
            <div className="flex flex-wrap gap-1">{insights.starEmployees.map((s) => <Tag key={s} text={s} />)}</div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {insights.pros.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-700 mb-1.5">What they do well</p>
            <ul className="grid gap-1">{insights.pros.map((p) => (
              <li key={p} className="text-[11px] text-ink flex gap-1.5"><span className="text-green-600 shrink-0">✓</span>{p}</li>
            ))}</ul>
          </div>
        )}
        {insights.cons.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-700 mb-1.5">Your opportunity</p>
            <ul className="grid gap-1">{insights.cons.map((c) => (
              <li key={c} className="text-[11px] text-ink flex gap-1.5"><span className="text-red-500 shrink-0">✗</span>{c}</li>
            ))}</ul>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted">Based on {insights.reviewsAnalyzed} reviews · analysed {new Date(insights.analyzedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
    </div>
  );
}

function CompetitorRow({
  clientId, competitor, count, rating, delta7d, history, clientCount, removing, onRemove,
}: {
  clientId: string;
  competitor: Competitor;
  count: number | null;
  rating: number | null;
  delta7d: number | null;
  history: HistoryPoint[];
  clientCount: number | null;
  removing: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<CompetitorInsights | null>(competitor.insights ?? null);

  const ahead = clientCount !== null && count !== null ? clientCount - count : null;

  async function analyze() {
    setAnalyzing(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/competitors/${competitor.id}/insights`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json() as { insights: CompetitorInsights };
      setInsights(data.insights);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="border-b border-stoneLine">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3 group">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{competitor.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={analyze}
                disabled={analyzing}
                className="flex items-center gap-1 text-[10px] text-gm-orange hover:text-gm-orange/80 transition-colors disabled:opacity-50"
              >
                {analyzing ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                {insights ? "Re-analyse reviews" : "Analyse reviews"}
              </button>
              {insights && (
                <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-0.5 text-[10px] text-muted hover:text-ink transition-colors">
                  {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {open ? "Hide" : "Show"} insights
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onRemove}
            disabled={removing}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 shrink-0 ml-1"
            title="Remove competitor"
          >
            {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
        <div className="w-20 text-right">
          <span className="text-xs font-semibold text-ink">{count !== null ? count.toLocaleString("en-IN") : "—"}</span>
          {ahead !== null && (
            <p className={`text-[10px] ${ahead >= 0 ? "text-green-600" : "text-red-600"}`}>
              {ahead >= 0 ? `+${ahead}` : ahead} vs you
            </p>
          )}
        </div>
        <span className="w-14 text-right text-xs text-ink">{rating !== null ? `${rating.toFixed(1)} ★` : "—"}</span>
        <span className="w-24 text-right"><DeltaBadge delta={delta7d} /></span>
        <span className="w-20"><MiniSparkline history={history} color="#52525b" /></span>
      </div>
      {open && (
        <div className="pb-4 px-1">
          {analyzing ? (
            <div className="flex items-center gap-2 text-xs text-muted py-2">
              <Loader2 size={12} className="animate-spin text-gm-orange" />
              Reading reviews and extracting insights…
            </div>
          ) : insights ? (
            <InsightsPanel insights={insights} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function DiscoverCompetitors({ clientId, onAdded, onDone }: {
  clientId: string;
  onAdded: (name: string, comp: Competitor, rating: number | null, reviewCount: number | null) => void;
  onDone: () => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);

  async function discover() {
    setState("loading");
    try {
      const res = await fetch(`/api/clients/${clientId}/competitors/suggest`);
      const data = await res.json() as { suggestions: CompetitorSuggestion[]; query: string };
      setSuggestions(data.suggestions ?? []);
      setQuery(data.query ?? "");
      setState("done");
    } catch {
      setState("error");
    }
  }

  async function findMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const shownIds = suggestions.map((s) => s.placeId).join(",");
      const res = await fetch(`/api/clients/${clientId}/competitors/suggest?exclude=${encodeURIComponent(shownIds)}`);
      const data = await res.json() as { suggestions: CompetitorSuggestion[]; query: string };
      const newOnes = (data.suggestions ?? []).filter((s) => !suggestions.some((e) => e.placeId === s.placeId));
      setSuggestions((prev) => [...prev, ...newOnes]);
    } finally {
      setLoadingMore(false);
    }
  }

  async function add(suggestion: CompetitorSuggestion) {
    if (adding === suggestion.placeId || added.has(suggestion.placeId)) return;
    setAdding(suggestion.placeId);
    try {
      const res = await fetch(`/api/clients/${clientId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          placeId: suggestion.placeId,
          rating: suggestion.rating,
          reviewCount: suggestion.reviewCount,
        }),
      });
      if (!res.ok) return;
      const data = await res.json() as { competitors?: Competitor[] };
      const newComp = data.competitors?.find((c) => c.placeId === suggestion.placeId)
        ?? { id: `comp_${Date.now()}`, name: suggestion.name, placeId: suggestion.placeId };
      onAdded(suggestion.name, newComp, suggestion.rating, suggestion.reviewCount);
      setAdded((prev) => new Set([...prev, suggestion.placeId]));
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-2">Competitor tracking</p>

      {state === "idle" && (
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs text-muted leading-5">No competitors configured yet.</p>
          <button
            onClick={discover}
            className="flex items-center gap-1.5 shrink-0 bg-gm-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-gm-orange/90 transition-colors"
          >
            <Search size={11} /> Discover nearby
          </button>
        </div>
      )}

      {state === "loading" && (
        <div className="flex items-center gap-2 text-xs text-muted py-2">
          <Loader2 size={13} className="animate-spin text-gm-orange" />
          Searching Google Maps for similar businesses…
        </div>
      )}

      {state === "error" && (
        <p className="text-xs text-red-700">Failed to fetch suggestions. Check Google Maps API key.</p>
      )}

      {state === "done" && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted">Nearby results for <span className="font-semibold italic">{query}</span></p>
            {added.size > 0 && (
              <button onClick={onDone} className="text-[11px] font-semibold text-gm-orange hover:text-gm-orange/80">
                Done ({added.size} added) →
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {suggestions.map((s) => {
              const isAdded = added.has(s.placeId);
              const isAdding = adding === s.placeId;
              return (
                <div key={s.placeId} className={`flex items-center gap-3 border px-3 py-2 ${isAdded ? "bg-green-50 border-green-200" : "bg-white border-stoneLine"}`}>
                  <MapPin size={12} className="text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{s.name}</p>
                    <p className="text-[10px] text-muted truncate">{s.address}</p>
                  </div>
                  <div className="text-right shrink-0 grid gap-0.5">
                    {s.rating !== null && (
                      <span className="text-[10px] text-muted">{s.rating.toFixed(1)} ★ · {s.reviewCount?.toLocaleString("en-IN")} reviews</span>
                    )}
                    {s.distanceKm !== null && (
                      <span className="text-[10px] text-muted">{s.distanceKm} km away</span>
                    )}
                  </div>
                  <button
                    onClick={() => add(s)}
                    disabled={isAdded || isAdding}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                      isAdded
                        ? "border-green-300 text-green-700 bg-green-50"
                        : "border-stoneLine text-ink hover:bg-ivory"
                    } disabled:cursor-default`}
                  >
                    {isAdding ? <Loader2 size={10} className="animate-spin" /> : isAdded ? "✓" : <Plus size={10} />}
                    {isAdded ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
          {suggestions.length === 0 && (
            <p className="text-xs text-muted">No nearby businesses found. Add competitors manually in client settings.</p>
          )}
          <button
            onClick={findMore}
            disabled={loadingMore}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-gm-orange hover:text-gm-orange/80 transition-colors disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
            {loadingMore ? "Searching…" : "Find more"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CompetitorIntel({
  clientId,
  clientName,
  competitors: initialCompetitors,
}: {
  clientId: string;
  clientName: string;
  competitors: Competitor[];
}) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/competitors`)
      .then((r) => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  async function remove(competitorId: string) {
    setRemoving(competitorId);
    try {
      await fetch(`/api/clients/${clientId}/competitors`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      });
      setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
      setData((prev) => prev ? { ...prev, competitorData: prev.competitorData.filter((e) => e.competitor.id !== competitorId) } : prev);
    } finally {
      setRemoving(null);
    }
  }

  function handleAdded(name: string, comp: Competitor, rating: number | null, reviewCount: number | null) {
    setCompetitors((prev) => prev.some((c) => c.id === comp.id) ? prev : [...prev, comp]);
    setData((prev) => {
      if (!prev) return prev;
      if (prev.competitorData.some((e) => e.competitor.id === comp.id)) return prev;
      return {
        ...prev,
        competitorData: [
          ...prev.competitorData,
          { competitor: comp, count: reviewCount, rating, delta7d: null, history: [] },
        ],
      };
    });
  }

  if (competitors.length === 0 && !showDiscover) {
    return <DiscoverCompetitors
      clientId={clientId}
      onAdded={handleAdded}
      onDone={() => setShowDiscover(false)}
    />;
  }

  if (showDiscover) {
    return (
      <div className="grid gap-2">
        <DiscoverCompetitors
          clientId={clientId}
          onAdded={handleAdded}
          onDone={() => setShowDiscover(false)}
        />
        <button onClick={() => setShowDiscover(false)} className="text-xs text-muted hover:text-ink text-left px-1">← Back to tracking</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-stoneLine bg-ivory p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-2">
          Competitor tracking
        </p>
        <p className="text-xs text-muted">Loading…</p>
      </div>
    );
  }

  const clientCount = data?.clientCount ?? null;
  const clientRating = data?.clientRating ?? null;
  const entries = competitors.map((comp) => {
    const found = data?.competitorData?.find((e) => e.competitor.id === comp.id);
    return found ?? { competitor: comp, count: null, rating: null, delta7d: null, history: [] as HistoryPoint[] };
  });

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
        Competitor review tracking
      </p>

      <div className="grid gap-0">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-stoneLine pb-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>Name</span>
          <span className="w-20 text-right">Reviews</span>
          <span className="w-14 text-right">Rating</span>
          <span className="w-24 text-right">7-day</span>
          <span className="w-20">Trend</span>
        </div>

        {/* Client row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center border-b border-stoneLine py-3 bg-gm-orange/[0.04] px-2 -mx-2">
          <span className="text-xs font-semibold text-gm-orange">
            {clientName} <span className="text-[10px] font-normal text-muted">(you)</span>
          </span>
          <span className="w-20 text-right text-xs font-semibold text-ink">
            {clientCount !== null ? clientCount.toLocaleString("en-IN") : "—"}
          </span>
          <span className="w-14 text-right text-xs text-ink">
            {clientRating !== null ? `${clientRating.toFixed(1)} ★` : "—"}
          </span>
          <span className="w-24 text-right text-xs text-muted">—</span>
          <span className="w-20 text-xs text-muted">—</span>
        </div>

        {entries.map(({ competitor, count, rating, delta7d, history }) => (
          <CompetitorRow
            key={competitor.id}
            clientId={clientId}
            competitor={competitor}
            count={count}
            rating={rating}
            delta7d={delta7d}
            history={history}
            clientCount={clientCount}
            removing={removing === competitor.id}
            onRemove={() => remove(competitor.id)}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Snapshots pulled daily · reviews analysed from Google Places ·{" "}
          <span className="text-red-600">↑</span> means competitor gaining reviews faster
        </p>
        <button
          onClick={() => setShowDiscover(true)}
          className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-gm-orange hover:text-gm-orange/80 transition-colors"
        >
          <Plus size={11} /> Add more
        </button>
      </div>
    </div>
  );
}
