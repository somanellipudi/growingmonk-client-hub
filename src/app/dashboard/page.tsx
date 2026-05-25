import Link from "next/link";
import { AlertTriangle, Plus, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SyncClientButton } from "@/components/mvp-actions";
import { SendWeeklyReportsButton } from "@/components/SendWeeklyReportsButton";
import { EmptyState, LinkButton, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getDashboardClients, getAgencyStats } from "@/lib/server/repositories";
import { env } from "@/lib/server/env";
import type { Client, WeeklyBrief } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rows, stats] = await Promise.all([getDashboardClients(), getAgencyStats()]);
  const schedulerSecret = env.schedulerSecret;
  const currencySymbol = "₹"; // TODO: infer from client mix

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agency command center"
        title="Client Command Center"
        description="All active clients, latest synced data, alert flags, and weekly intelligence status."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {schedulerSecret && <SendWeeklyReportsButton secret={schedulerSecret} />}
            <LinkButton href="/clients/new"><Plus size={15} /> New Client</LinkButton>
          </div>
        }
      />

      {/* ── Agency-level KPI strip ─────────────────────────────────────── */}
      {stats.clients.total > 0 && (
        <div className="grid gap-4">

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <AgencyStat
              label="Active clients"
              value={String(stats.clients.active)}
              detail={stats.clients.paused > 0 ? `${stats.clients.paused} paused` : "all active"}
              tone={stats.clients.active > 0 ? "neutral" : "gray"}
            />
            <AgencyStat
              label="Avg ROAS"
              value={stats.thisWeek.avgRoas > 0 ? `${stats.thisWeek.avgRoas.toFixed(2)}x` : "—"}
              detail="across clients with ads"
              tone={stats.thisWeek.avgRoas >= 3 ? "green" : stats.thisWeek.avgRoas >= 2 ? "amber" : stats.thisWeek.avgRoas > 0 ? "red" : "gray"}
            />
            <AgencyStat
              label="Total ad spend"
              value={stats.thisWeek.totalAdSpend > 0 ? `${currencySymbol}${Math.round(stats.thisWeek.totalAdSpend).toLocaleString("en-IN")}` : "—"}
              detail="this brief period"
              tone="neutral"
            />
            <AgencyStat
              label="Total leads"
              value={stats.thisWeek.totalLeads > 0 ? String(stats.thisWeek.totalLeads) : "—"}
              detail="across all clients"
              tone={stats.thisWeek.totalLeads > 0 ? "neutral" : "gray"}
            />
            <AgencyStat
              label="New reviews"
              value={stats.thisWeek.totalNewReviews > 0 ? String(stats.thisWeek.totalNewReviews) : "—"}
              detail={stats.thisWeek.totalUnreplied > 0 ? `${stats.thisWeek.totalUnreplied} unreplied` : "all replied"}
              tone={stats.thisWeek.totalUnreplied > 2 ? "amber" : "neutral"}
            />
            <AgencyStat
              label="High alerts"
              value={stats.alerts.highCount > 0 ? String(stats.alerts.highCount) : "0"}
              detail={stats.clients.needingSync > 0 ? `${stats.clients.needingSync} need sync` : "no sync needed"}
              tone={stats.alerts.highCount > 0 ? "red" : "green"}
            />
          </div>

          {/* Attention needed + Top performers side by side */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Attention needed */}
            {(stats.alerts.clients.length > 0 || stats.clients.needingSync > 0) && (
              <div className="border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} className="text-amber-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Needs attention</p>
                </div>
                <div className="grid gap-2">
                  {stats.alerts.clients.map((c) => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="flex items-start gap-3 bg-white border border-amber-200 px-3 py-2 hover:border-amber-400 transition-colors">
                      <span className="text-xs font-semibold text-ink flex-1 min-w-0">
                        {c.name}
                        <span className="ml-2 text-[10px] text-red-600 font-normal">{c.alerts[0]}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5">
                        {c.alerts.length} alert{c.alerts.length > 1 ? "s" : ""}
                      </span>
                    </Link>
                  ))}
                  {stats.clients.needingSync > 0 && (
                    <p className="text-xs text-amber-700">
                      {stats.clients.needingSync} client{stats.clients.needingSync > 1 ? "s" : ""} not synced in 7+ days
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Top performers */}
            {(stats.topPerformers.roas || stats.topPerformers.leads || stats.topPerformers.reach) && (
              <div className="border border-stoneLine bg-paper p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={13} className="text-gm-orange" />
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">This week&apos;s top performers</p>
                </div>
                <div className="grid gap-2">
                  {stats.topPerformers.roas && stats.topPerformers.roas.roas > 0 && (
                    <TopPerformerRow
                      label="Best ROAS"
                      name={stats.topPerformers.roas.name}
                      id={stats.topPerformers.roas.id}
                      value={`${stats.topPerformers.roas.roas.toFixed(2)}x`}
                    />
                  )}
                  {stats.topPerformers.leads && stats.topPerformers.leads.leads > 0 && (
                    <TopPerformerRow
                      label="Most leads"
                      name={stats.topPerformers.leads.name}
                      id={stats.topPerformers.leads.id}
                      value={`${stats.topPerformers.leads.leads} leads`}
                    />
                  )}
                  {stats.topPerformers.reach && stats.topPerformers.reach.reach > 0 && (
                    <TopPerformerRow
                      label="Most reach"
                      name={stats.topPerformers.reach.name}
                      id={stats.topPerformers.reach.id}
                      value={stats.topPerformers.reach.reach.toLocaleString("en-IN")}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lead funnel strip */}
          {Object.keys(stats.leadFunnel).length > 0 && (
            <div className="border border-stoneLine bg-paper p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={13} className="text-gm-orange" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Lead funnel — all clients</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["new", "contacted", "booked", "showed", "converted", "lost"] as const).map((stage) => {
                  const count = stats.leadFunnel[stage] ?? 0;
                  return (
                    <div key={stage} className="border border-stoneLine bg-ivory px-3 py-2 min-w-[80px] text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{stage}</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{count}</p>
                    </div>
                  );
                })}
                <div className="border border-green-200 bg-green-50 px-3 py-2 min-w-[80px] text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-700">Conv. rate</p>
                  <p className="mt-1 text-lg font-semibold text-green-700">
                    {(() => {
                      const total = Object.values(stats.leadFunnel).reduce((s, n) => s + n, 0);
                      const converted = stats.leadFunnel["converted"] ?? 0;
                      return total > 0 ? `${Math.round((converted / total) * 100)}%` : "—";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Package tier distribution */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-[0.1em]">Packages:</span>
            {Object.entries(stats.clients.tiers).map(([tier, count]) => (
              <span key={tier} className="border border-stoneLine bg-ivory px-3 py-1 text-[11px] text-muted">
                {count} {tier}
              </span>
            ))}
            {stats.clients.churned > 0 && (
              <span className="border border-red-200 bg-red-50 px-3 py-1 text-[11px] text-red-700">
                {stats.clients.churned} churned
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Client list ──────────────────────────────────────────────── */}
      {rows.length ? (
        <Panel className="p-0">
          <div className="grid gap-4 border-b border-stoneLine bg-ivory px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted lg:grid-cols-[minmax(0,1.2fr)_repeat(4,120px)_140px_180px]">
            <span>Client</span>
            <span>ROAS</span>
            <span>Leads</span>
            <span>Avg reach</span>
            <span>GBP rating</span>
            <span>Alerts</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-stoneLine">
            {rows.map((row) => (
              <ClientRow key={row.client.id} client={row.client} latestBrief={row.latestBrief} syncStatus={row.syncStatus} />
            ))}
          </div>
        </Panel>
      ) : (
        <EmptyState
          title="No clients yet"
          body="Create a client profile, connect integrations, then generate the first weekly intelligence brief."
          action={<LinkButton href="/clients/new"><Plus size={15} /> New Client</LinkButton>}
        />
      )}
    </AppShell>
  );
}

function ClientRow({
  client,
  latestBrief,
  syncStatus,
}: {
  client: Client;
  latestBrief?: WeeklyBrief;
  syncStatus: "synced" | "needs_sync" | "no_integrations" | "syncing";
}) {
  const metrics = latestBrief?.metrics;
  const highAlerts = latestBrief?.brief.alertFlags.filter((flag) => flag.severity === "high") ?? [];
  return (
    <div className="grid gap-4 px-5 py-4 text-sm lg:grid-cols-[minmax(0,1.2fr)_repeat(4,120px)_140px_180px] lg:items-center hover:bg-ivory/60 transition-colors">
      <Link href={`/clients/${client.id}`} className="min-w-0">
        <span className="block truncate font-semibold text-ink">{client.name}</span>
        <span className="mt-1 block text-xs capitalize text-muted">{client.niche.replace("_", " ")} / {client.city}</span>
      </Link>
      <MetricPill label="ROAS" value={typeof metrics?.blendedRoas === "number" ? `${metrics.blendedRoas.toFixed(2)}x` : "-"} tone={roasTone(metrics?.blendedRoas)} />
      <MetricPill label="Leads" value={typeof metrics?.totalLeads === "number" ? String(metrics.totalLeads) : "-"} tone={metrics ? "neutral" : "gray"} />
      <MetricPill label="Reach" value={typeof metrics?.avgInstagramReach === "number" ? metrics.avgInstagramReach.toLocaleString("en-IN") : "-"} tone={metrics ? "neutral" : "gray"} />
      <MetricPill label="GBP" value={metrics?.avgNewReviewRating ? `${metrics.avgNewReviewRating.toFixed(1)} stars` : "-"} tone={metrics?.avgNewReviewRating && metrics.avgNewReviewRating < 4 ? "red" : metrics ? "green" : "gray"} />
      <div>
        {highAlerts.length ? (
          <span className="inline-flex border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
            {highAlerts.length} high alert
          </span>
        ) : (
          <span className="inline-flex border border-stoneLine bg-ivory px-2.5 py-1 text-xs font-semibold text-muted">
            {syncStatusLabel(syncStatus)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/clients/${client.id}`} variant="secondary">Open</LinkButton>
        {syncStatus !== "no_integrations" ? <SyncClientButton clientId={client.id} label="Sync" /> : null}
      </div>
    </div>
  );
}

function AgencyStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone: "green" | "amber" | "red" | "gray" | "neutral";
}) {
  const toneClass = {
    green:   "border-green-200 bg-green-50",
    amber:   "border-amber-200 bg-amber-50",
    red:     "border-red-200 bg-red-50",
    gray:    "border-stoneLine bg-ivory",
    neutral: "border-stoneLine bg-white",
  }[tone];
  const valueClass = {
    green:   "text-green-800",
    amber:   "text-amber-800",
    red:     "text-red-700",
    gray:    "text-muted",
    neutral: "text-ink",
  }[tone];
  return (
    <div className={`border p-3 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold ${valueClass}`}>{value}</p>
      {detail && <p className="mt-0.5 text-[11px] text-muted/70">{detail}</p>}
    </div>
  );
}

function TopPerformerRow({ label, name, id, value }: { label: string; name: string; id: string; value: string }) {
  return (
    <Link href={`/clients/${id}`} className="flex items-center gap-3 border border-stoneLine bg-ivory px-3 py-2 hover:border-gm-orange/40 transition-colors">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted w-20 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-ink flex-1 truncate">{name}</span>
      <span className="text-xs font-semibold text-gm-orange shrink-0">{value}</span>
    </Link>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "red" | "gray" | "neutral" }) {
  const toneClass = {
    green:   "border-green-200 bg-green-50 text-green-800",
    amber:   "border-amber-200 bg-amber-50 text-amber-800",
    red:     "border-red-200 bg-red-50 text-red-700",
    gray:    "border-stoneLine bg-ivory text-muted",
    neutral: "border-stoneLine bg-white text-ink",
  }[tone];
  return (
    <div className={`border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function roasTone(roas?: number): "green" | "amber" | "red" | "gray" {
  if (typeof roas !== "number") return "gray";
  if (roas >= 3) return "green";
  if (roas >= 2) return "amber";
  return "red";
}

function syncStatusLabel(status: string) {
  if (status === "synced") return "Synced";
  if (status === "needs_sync") return "Needs sync";
  return "No integrations";
}
