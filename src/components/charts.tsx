"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import type { GBPInsights, GBPReview, InstagramPost, MetaCampaign } from "@/types";

const C = {
  primary: "#E8620A",
  sage: "#657760",
  saffron: "#D88A33",
  monk: "#B96324",
  hit: "#22c55e",
  average: "#f59e0b",
  miss: "#ef4444",
  stone: "#E4D9C8",
  paper: "#FFFCF6",
  muted: "#6B6257",
} as const;

const tip = {
  contentStyle: {
    fontSize: 12,
    border: `1px solid ${C.stone}`,
    background: C.paper,
    borderRadius: 0,
    boxShadow: "none",
  },
};

function fmtK(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

export function InstagramReachChart({ posts }: { posts: InstagramPost[] }) {
  const data = [...posts]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((p) => ({
      date: new Date(p.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      reach: p.reach,
      tag: p.performanceTag,
    }));
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: C.muted }} width={48} tickFormatter={(v: number) => fmtK(v)} axisLine={false} tickLine={false} />
        <Tooltip {...tip} formatter={(v: unknown) => [(v as number).toLocaleString("en-IN"), "Reach"]} />
        <Bar dataKey="reach" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.tag === "hit" ? C.hit : entry.tag === "miss" ? C.miss : C.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function InstagramEngagementChart({ posts }: { posts: InstagramPost[] }) {
  const data = [...posts]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((p) => ({
      date: new Date(p.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      Likes: p.likeCount,
      Comments: p.commentsCount,
      Saves: p.saved,
      Shares: p.shares,
    }));
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.stone} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: C.muted }} width={36} axisLine={false} tickLine={false} />
        <Tooltip {...tip} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Likes" stackId="e" fill={C.primary} />
        <Bar dataKey="Comments" stackId="e" fill={C.saffron} />
        <Bar dataKey="Saves" stackId="e" fill={C.sage} />
        <Bar dataKey="Shares" stackId="e" fill={C.monk} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CampaignROASChart({ campaigns }: { campaigns: MetaCampaign[] }) {
  const data = campaigns.map((c) => ({
    name: c.name.length > 24 ? c.name.slice(0, 24) + "…" : c.name,
    roas: c.roas,
  }));
  if (!data.length) return null;
  const h = Math.max(120, data.length * 44 + 60);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.stone} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(v: number) => `${v}x`} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.muted }} width={148} axisLine={false} tickLine={false} />
        <Tooltip {...tip} formatter={(v: unknown) => [`${(v as number).toFixed(2)}x`, "ROAS"]} />
        <Bar dataKey="roas" radius={[0, 2, 2, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.roas >= 3 ? C.hit : entry.roas >= 2 ? C.average : C.miss} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CampaignSpendChart({
  campaigns,
  currency,
}: {
  campaigns: MetaCampaign[];
  currency: "INR" | "USD";
}) {
  const sym = currency === "INR" ? "₹" : "$";
  const data = campaigns.map((c) => ({
    name: c.name.length > 24 ? c.name.slice(0, 24) + "…" : c.name,
    Spend: c.spend,
    Revenue: c.revenueAttributed,
  }));
  if (!data.length) return null;
  const h = Math.max(120, data.length * 44 + 60);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.stone} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: C.muted }}
          tickFormatter={(v: number) => `${sym}${fmtK(v)}`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.muted }} width={148} axisLine={false} tickLine={false} />
        <Tooltip
          {...tip}
          formatter={(v: unknown, name: unknown) => [
            `${sym}${(v as number).toLocaleString("en-IN")}`,
            String(name),
          ]}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Spend" fill={C.primary} radius={[0, 2, 2, 0]} />
        <Bar dataKey="Revenue" fill={C.sage} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GBPInsightsChart({ insights }: { insights: GBPInsights }) {
  const data = [
    { name: "Search Views", value: insights.viewsSearch },
    { name: "Map Views", value: insights.viewsMaps },
    { name: "Discovery", value: insights.queriesIndirect },
    { name: "Branded", value: insights.queriesDirect },
    { name: "Directions", value: insights.actionsDirections },
    { name: "Website Clicks", value: insights.actionsWebsite },
    { name: "Phone Calls", value: insights.actionsPhone },
  ].filter((d) => d.value > 0);
  if (!data.length) return null;
  const h = Math.max(160, data.length * 36 + 60);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.stone} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(v: number) => fmtK(v)} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.muted }} width={114} axisLine={false} tickLine={false} />
        <Tooltip {...tip} formatter={(v: unknown) => [(v as number).toLocaleString("en-IN"), "Count"]} />
        <Bar dataKey="value" fill={C.primary} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReviewRatingChart({ reviews }: { reviews: GBPReview[] }) {
  if (!reviews.length) return null;
  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    counts[r.starRating] = (counts[r.starRating] ?? 0) + 1;
  });
  const data = [5, 4, 3, 2, 1].map((star) => ({ name: `${star} ★`, count: counts[star] ?? 0 }));
  const fills = [C.hit, "#86efac", C.saffron, C.average, C.miss];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.stone} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.muted }} width={40} axisLine={false} tickLine={false} />
        <Tooltip {...tip} formatter={(v) => [v as number, "Reviews"]} />
        <Bar dataKey="count" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => <Cell key={i} fill={fills[i]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
