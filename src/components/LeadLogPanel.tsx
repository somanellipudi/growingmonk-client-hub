"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui";
import type { LeadLog, LeadOutcome } from "@/types";

const OUTCOMES: { value: LeadOutcome; label: string; color: string }[] = [
  { value: "new",       label: "New",       color: "bg-blue-50 text-blue-800 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  { value: "booked",    label: "Booked",    color: "bg-violet-50 text-violet-800 border-violet-200" },
  { value: "showed",    label: "Showed up", color: "bg-orange-50 text-orange-800 border-orange-200" },
  { value: "converted", label: "Converted", color: "bg-green-50 text-green-800 border-green-200" },
  { value: "lost",      label: "Lost",      color: "bg-gray-100 text-gray-500 border-gray-200" },
];

function outcomeStyle(outcome: LeadOutcome) {
  return OUTCOMES.find((o) => o.value === outcome)?.color ?? "";
}

function outcomeLabel(outcome: LeadOutcome) {
  return OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
}

type FunnelCount = Record<LeadOutcome, number>;

function buildFunnel(leads: LeadLog[]): FunnelCount {
  const counts: FunnelCount = { new: 0, contacted: 0, booked: 0, showed: 0, converted: 0, lost: 0 };
  for (const l of leads) counts[l.outcome]++;
  return counts;
}

export function LeadLogPanel({ clientId, campaigns }: { clientId: string; campaigns?: string[] }) {
  const [leads, setLeads] = useState<LeadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState({ name: "", phone: "", sourceCampaign: "", note: "", leadDate: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/leads`);
      const data = await res.json() as { leads?: LeadLog[] };
      setLeads(data.leads ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void loadLeads(); }, [loadLeads]);

  async function addLead() {
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { lead?: LeadLog; error?: string };
      if (!res.ok) { setSaveError(data.error ?? "Failed to add lead."); return; }
      setLeads((prev) => [data.lead!, ...prev]);
      setForm({ name: "", phone: "", sourceCampaign: "", note: "", leadDate: "" });
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  }

  async function setOutcome(leadId: string, outcome: LeadOutcome) {
    setUpdating(leadId);
    try {
      const res = await fetch(`/api/clients/${clientId}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json() as { lead?: LeadLog };
      if (res.ok && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead! : l)));
      }
    } finally {
      setUpdating(null);
    }
  }

  const funnel = buildFunnel(leads);
  const conversionRate = leads.length > 0
    ? Math.round((funnel.converted / leads.length) * 100)
    : 0;

  return (
    <div className="grid gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-gm-orange" />
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Lead outcome log</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadLeads()}
            className="text-muted hover:text-ink transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <Button type="button" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={13} /> Add lead
          </Button>
        </div>
      </div>

      {/* Funnel strip */}
      {leads.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {OUTCOMES.map(({ value, label, color }) => (
            <div key={value} className={`border rounded px-2 py-2 text-center ${color}`}>
              <p className="text-lg font-bold leading-none">{funnel[value]}</p>
              <p className="text-[10px] font-semibold mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      )}

      {leads.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <TrendingUp size={12} className="text-green-700" />
          <span>
            <span className="font-semibold text-ink">{leads.length}</span> total leads ·{" "}
            <span className="font-semibold text-green-700">{funnel.converted}</span> converted ·{" "}
            <span className="font-semibold text-ink">{conversionRate}%</span> conversion rate
          </span>
        </div>
      )}

      {/* Add lead form */}
      {showAdd && (
        <div className="border border-stoneLine bg-ivory p-4 grid gap-3">
          <p className="text-xs font-semibold text-ink">New lead</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Customer name (optional)"
              className="border border-stoneLine bg-white px-3 py-2 text-xs outline-none focus:border-gm-orange"
            />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number (optional)"
              className="border border-stoneLine bg-white px-3 py-2 text-xs outline-none focus:border-gm-orange font-mono"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {campaigns?.length ? (
              <select
                value={form.sourceCampaign}
                onChange={(e) => setForm((f) => ({ ...f, sourceCampaign: e.target.value }))}
                className="border border-stoneLine bg-white px-3 py-2 text-xs outline-none focus:border-gm-orange"
              >
                <option value="">Campaign (optional)</option>
                {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={form.sourceCampaign}
                onChange={(e) => setForm((f) => ({ ...f, sourceCampaign: e.target.value }))}
                placeholder="Source campaign (optional)"
                className="border border-stoneLine bg-white px-3 py-2 text-xs outline-none focus:border-gm-orange"
              />
            )}
            <input
              type="date"
              value={form.leadDate}
              onChange={(e) => setForm((f) => ({ ...f, leadDate: e.target.value }))}
              className="border border-stoneLine bg-white px-3 py-2 text-xs outline-none focus:border-gm-orange"
            />
          </div>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Note (optional)"
            className="border border-stoneLine bg-white px-3 py-2 text-xs outline-none focus:border-gm-orange"
          />
          {saveError && <p className="text-xs font-semibold text-red-700">{saveError}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={() => void addLead()} disabled={saving}>
              {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving…</> : "Save lead"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setSaveError(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Lead list */}
      {loading ? (
        <p className="text-xs text-muted py-2">Loading leads…</p>
      ) : leads.length === 0 ? (
        <p className="border border-stoneLine bg-ivory p-4 text-xs text-muted leading-5">
          No leads logged yet. Add leads manually as they come in from Meta ads or other sources.
          Track outcomes to measure your real conversion rate.
        </p>
      ) : (
        <div className="grid gap-2">
          {leads.map((lead) => (
            <div key={lead.id} className="border border-stoneLine bg-white px-4 py-3 grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {lead.name || "Unknown"}
                </span>
                {lead.phone && (
                  <span className="text-xs text-muted font-mono">{lead.phone}</span>
                )}
                {lead.sourceCampaign && (
                  <span className="text-[11px] border border-stoneLine bg-ivory px-2 py-0.5 text-muted">
                    {lead.sourceCampaign}
                  </span>
                )}
                <span className="text-[11px] text-muted ml-auto">
                  {new Date(lead.leadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>

              {lead.note && (
                <p className="text-xs text-muted leading-5">{lead.note}</p>
              )}

              {/* Outcome picker */}
              <div className="flex flex-wrap gap-1.5">
                {OUTCOMES.map(({ value, label, color }) => (
                  <button
                    key={value}
                    disabled={updating === lead.id}
                    onClick={() => { if (lead.outcome !== value) void setOutcome(lead.id, value); }}
                    className={`border rounded px-2 py-0.5 text-[11px] font-semibold transition-opacity ${color} ${
                      lead.outcome === value ? "opacity-100 ring-1 ring-offset-1 ring-current" : "opacity-40 hover:opacity-70"
                    } ${updating === lead.id ? "cursor-wait" : "cursor-pointer"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
