"use client";

import { useEffect, useState } from "react";
import type { Competitor } from "@/types";

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

export function CompetitorIntel({
  clientId,
  clientName,
  competitors,
}: {
  clientId: string;
  clientName: string;
  competitors: Competitor[];
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/competitors`)
      .then((r) => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (competitors.length === 0) {
    return (
      <div className="border border-stoneLine bg-ivory p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-2">
          Competitor tracking
        </p>
        <p className="text-xs text-muted leading-5">
          No competitors configured. Add Google Place IDs in the client settings to start tracking review growth vs. competitors.
        </p>
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
                <tr key={competitor.id} className="border-b border-stoneLine hover:bg-ivory/60 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="text-xs font-semibold text-ink">{competitor.name}</p>
                    {competitor.note && (
                      <p className="text-[10px] text-muted">{competitor.note}</p>
                    )}
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

      <p className="mt-3 text-[11px] text-muted">
        Snapshots pulled daily via Google Places API · 30-day window shown ·{" "}
        <span className="text-red-600">↑</span> means competitor gaining reviews faster
      </p>
    </div>
  );
}
