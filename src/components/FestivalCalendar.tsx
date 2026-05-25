"use client";

import { useMemo, useState } from "react";
import { getUpcomingFestivals, daysUntil, type Festival } from "@/lib/festivals";

const TYPE_COLORS: Record<Festival["type"], string> = {
  hindu:      "bg-orange-50 text-orange-800 border-orange-200",
  muslim:     "bg-green-50 text-green-800 border-green-200",
  sikh:       "bg-yellow-50 text-yellow-800 border-yellow-200",
  christian:  "bg-red-50 text-red-700 border-red-200",
  national:   "bg-blue-50 text-blue-800 border-blue-200",
  commercial: "bg-purple-50 text-purple-800 border-purple-200",
};

const TYPE_LABELS: Record<Festival["type"], string> = {
  hindu: "Hindu",
  muslim: "Muslim",
  sikh: "Sikh",
  christian: "Christian",
  national: "National",
  commercial: "Commercial",
};

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0) return null;
  if (days === 0)
    return (
      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5">
        TODAY
      </span>
    );
  if (days <= 3)
    return (
      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5">
        {days}d
      </span>
    );
  if (days <= 7)
    return (
      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
        {days}d
      </span>
    );
  return <span className="text-[10px] text-muted px-1.5 py-0.5">{days}d</span>;
}

export function FestivalCalendar({ niche }: { niche: string }) {
  const [daysAhead, setDaysAhead] = useState(60);
  const [expanded, setExpanded] = useState<string | null>(null);

  const festivals = useMemo(() => getUpcomingFestivals(daysAhead), [daysAhead]);

  const relevant = festivals.filter(
    (f) => f.niches.includes(niche) || f.type === "national" || f.type === "commercial",
  );

  const others = festivals.filter(
    (f) => !f.niches.includes(niche) && f.type !== "national" && f.type !== "commercial",
  );

  if (festivals.length === 0) {
    return (
      <div className="border border-stoneLine bg-ivory p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted mb-1">Festival calendar</p>
        <p className="text-xs text-muted">No festivals in the next {daysAhead} days.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Festival calendar — content opportunities
        </p>
        <select
          value={daysAhead}
          onChange={(e) => setDaysAhead(Number(e.target.value))}
          className="text-xs border border-stoneLine bg-paper px-2 py-1 text-muted"
        >
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
        </select>
      </div>

      {relevant.length > 0 && (
        <div className="grid gap-2 mb-4">
          {relevant.map((f) => {
            const days = daysUntil(f.date);
            const isOpen = expanded === f.date + f.name;
            return (
              <button
                key={f.date + f.name}
                onClick={() => setExpanded(isOpen ? null : f.date + f.name)}
                className="w-full text-left border border-stoneLine bg-paper p-3 hover:border-gm-orange/40 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <UrgencyBadge days={days} />
                  <span className="text-xs font-semibold text-ink">{f.name}</span>
                  <span className={`text-[10px] border px-1.5 py-0.5 ${TYPE_COLORS[f.type]}`}>
                    {TYPE_LABELS[f.type]}
                  </span>
                  <span className="ml-auto text-[11px] text-muted">
                    {new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
                {isOpen && (
                  <p className="mt-2 text-xs text-muted leading-5 text-left">
                    💡 {f.contentAngle}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {others.length > 0 && (
        <details className="group">
          <summary className="text-[11px] text-muted cursor-pointer hover:text-ink mb-2 list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            {others.length} other festival{others.length > 1 ? "s" : ""} (less relevant to {niche})
          </summary>
          <div className="grid gap-1.5 pl-3">
            {others.map((f) => {
              const days = daysUntil(f.date);
              return (
                <div key={f.date + f.name} className="flex items-center gap-2 border border-stoneLine bg-ivory px-3 py-2">
                  <UrgencyBadge days={days} />
                  <span className="text-xs text-muted">{f.name}</span>
                  <span className="ml-auto text-[11px] text-muted">
                    {new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
