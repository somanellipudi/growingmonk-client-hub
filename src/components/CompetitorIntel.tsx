"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import type { Competitor } from "@/types";
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

function DiscoverCompetitors({ clientId, onAdded }: { clientId: string; onAdded: (name: string, comp: Competitor) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

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

  async function add(suggestion: CompetitorSuggestion) {
    setAdding(suggestion.placeId);
    try {
      const res = await fetch(`/api/clients/${clientId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suggestion.name, placeId: suggestion.placeId }),
      });
      const data = await res.json() as { competitors?: Competitor[] };
      const added = data.competitors?.find((c) => c.placeId === suggestion.placeId);
      if (added) onAdded(suggestion.name, added);
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
          <p className="text-[11px] text-muted">Showing nearby results for <span className="font-semibold italic">{query}</span></p>
          <div className="grid gap-2">
            {suggestions.map((s) => (
              <div key={s.placeId} className="flex items-center gap-3 bg-white border border-stoneLine px-3 py-2">
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
                  disabled={!!adding || added.has(s.placeId)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border border-stoneLine text-ink hover:bg-ivory disabled:opacity-50 transition-colors"
                >
                  {adding === s.placeId ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  {added.has(s.placeId) ? "Added" : "Add"}
                </button>
              </div>
            ))}
          </div>
          {suggestions.length === 0 && (
            <p className="text-xs text-muted">No nearby businesses found. Add competitors manually in client settings.</p>
          )}
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

  if (competitors.length === 0 && !showDiscover) {
    return <DiscoverCompetitors clientId={clientId} onAdded={(name, comp) => {
      setCompetitors((prev) => [...prev, comp]);
      setShowDiscover(false);
    }} />;
  }

  if (showDiscover) {
    return (
      <div className="grid gap-3">
        <DiscoverCompetitors clientId={clientId} onAdded={(name, comp) => {
          setCompetitors((prev) => [...prev, comp]);
          setShowDiscover(false);
        }} />
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
  const entries = data?.competitorData ?? [];

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-3">
        Competitor review tracking
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stoneLine text-left text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Reviews</th>
              <th className="py-2 pr-4">Rating</th>
              <th className="py-2 pr-4">7-day change</th>
              <th className="py-2">Trend (30d)</th>
            </tr>
          </thead>
          <tbody>
            {/* Client row */}
            <tr className="border-b border-stoneLine bg-gm-orange/[0.07]">
              <td className="py-3 pr-4 font-semibold text-gm-orange">
                {clientName} <span className="text-[10px] font-normal text-muted">(you)</span>
              </td>
              <td className="py-3 pr-4 font-semibold text-ink">
                {clientCount !== null ? clientCount.toLocaleString("en-IN") : "—"}
              </td>
              <td className="py-3 pr-4">
                {clientRating !== null ? `${clientRating.toFixed(1)} ★` : "—"}
              </td>
              <td className="py-3 pr-4 text-xs text-muted">—</td>
              <td className="py-3 text-xs text-muted">—</td>
            </tr>

            {entries.map(({ competitor, count, rating, delta7d, history }) => {
              const ahead =
                clientCount !== null && count !== null
                  ? clientCount - count
                  : null;
              return (
                <tr key={competitor.id} className="border-b border-stoneLine hover:bg-ivory/60 transition-colors group">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs font-semibold text-ink">{competitor.name}</p>
                        {competitor.note && (
                          <p className="text-[10px] text-muted">{competitor.note}</p>
                        )}
                      </div>
                      <button
                        onClick={() => remove(competitor.id)}
                        disabled={removing === competitor.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 shrink-0"
                        title="Remove competitor"
                      >
                        {removing === competitor.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold text-ink">
                      {count !== null ? count.toLocaleString("en-IN") : "—"}
                    </span>
                    {ahead !== null && (
                      <p className={`text-[10px] ${ahead >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {ahead >= 0 ? `+${ahead}` : ahead} vs you
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-ink">
                    {rating !== null ? `${rating.toFixed(1)} ★` : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <DeltaBadge delta={delta7d} />
                  </td>
                  <td className="py-3">
                    <MiniSparkline history={history} color="#52525b" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Snapshots pulled daily via Google Places API · 30-day window shown ·{" "}
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
