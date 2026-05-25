"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, RefreshCw, Star, TrendingUp, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui";
import type { ReviewCountSnapshot, ReviewRequestLog } from "@/types";

type BulkResult = {
  summary: { sent: number; skipped: number; errors: number; total: number };
  reviewLink: string;
};

// ─── Growth sparkline ─────────────────────────────────────────────────────────

function GrowthSparkline({ snapshots }: { snapshots: ReviewCountSnapshot[] }) {
  if (snapshots.length < 2) return null;
  const counts = snapshots.map((s) => s.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;
  const w = 200;
  const h = 40;
  const pts = counts.map((c, i) => {
    const x = (i / (counts.length - 1)) * w;
    const y = h - ((c - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  const gained = last.count - first.count;

  return (
    <div className="flex items-center gap-4">
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#f97316"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((pt, i) => {
          const [x, y] = pt.split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r="2" fill="#f97316" />;
        })}
      </svg>
      <div className="text-xs">
        <p className="font-semibold text-ink">{last.count.toLocaleString("en-IN")} reviews</p>
        <p className="text-muted">
          {gained >= 0 ? "+" : ""}{gained} since {new Date(first.snapshotDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewEngine({
  clientId,
  currentReviewCount,
  currentRating,
}: {
  clientId: string;
  currentReviewCount?: number;
  currentRating?: number;
}) {
  const [snapshots, setSnapshots] = useState<ReviewCountSnapshot[]>([]);
  const [history, setHistory] = useState<ReviewRequestLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Bulk send state
  const [bulkText, setBulkText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [snapRes, histRes] = await Promise.all([
      fetch(`/api/clients/${clientId}/reviews/snapshots`),
      fetch(`/api/clients/${clientId}/reviews/request-log`),
    ]);
    if (snapRes.ok) {
      const d = await snapRes.json() as { snapshots?: ReviewCountSnapshot[] };
      setSnapshots(d.snapshots ?? []);
    }
    if (histRes.ok) {
      const d = await histRes.json() as { logs?: ReviewRequestLog[] };
      setHistory(d.logs ?? []);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  function parseRecipients(): Array<{ phone: string; customerName?: string }> {
    return bulkText
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Support "Name: number" or "Name, number" or just "number"
        const colonSplit = line.split(":");
        if (colonSplit.length === 2) {
          return { customerName: colonSplit[0]!.trim(), phone: colonSplit[1]!.trim() };
        }
        return { phone: line };
      });
  }

  async function sendBulk() {
    const recipients = parseRecipients();
    if (!recipients.length) { setError("Paste at least one phone number."); return; }
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/reviews/request-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });
      const data = await res.json() as BulkResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to send."); return; }
      setResult(data);
      setBulkText("");
      void load();
    } finally {
      setSending(false);
    }
  }

  const thisMonth = history.filter((r) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return new Date(r.sentAt) >= cutoff;
  }).length;

  return (
    <div className="space-y-5">

      {/* Header + stats */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Star size={15} className="text-gm-orange" />
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Review generation engine</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {currentReviewCount !== undefined && (
            <span className="border border-stoneLine bg-ivory px-3 py-1.5 font-semibold text-ink">
              {currentReviewCount.toLocaleString("en-IN")} total reviews
            </span>
          )}
          {currentRating !== undefined && (
            <span className="border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800">
              ★ {currentRating.toFixed(1)} avg rating
            </span>
          )}
          <span className="border border-violet-200 bg-violet-50 px-3 py-1.5 font-semibold text-violet-800">
            {thisMonth} requests sent this month
          </span>
        </div>
      </div>

      {/* Growth sparkline */}
      {snapshots.length >= 2 && (
        <div className="border border-stoneLine bg-ivory p-3">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={12} className="text-gm-orange" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Review count growth</p>
          </div>
          <GrowthSparkline snapshots={snapshots} />
        </div>
      )}

      {/* Bulk send */}
      <div className="border border-stoneLine bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-ink">Send review requests</p>
        <p className="text-xs text-muted leading-5">
          Paste phone numbers — one per line, or <code className="bg-ivory border border-stoneLine px-1">Name: +91number</code> for personalised messages.
          Numbers contacted in the last 30 days are automatically skipped.
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => { setBulkText(e.target.value); setError(""); setResult(null); }}
          rows={5}
          placeholder={`+91 98765 43210\nPriya: +91 87654 32109\n+91 76543 21098`}
          className="w-full border border-stoneLine bg-white px-3 py-2 text-xs font-mono outline-none focus:border-gm-orange resize-y leading-6"
        />
        <div className="flex items-center gap-3">
          <Button type="button" onClick={() => void sendBulk()} disabled={sending || !bulkText.trim()}>
            {sending
              ? <><RefreshCw size={13} className="animate-spin" /> Sending…</>
              : <><Send size={13} /> Send {parseRecipients().length > 0 ? `to ${parseRecipients().length}` : "review requests"}</>
            }
          </Button>
          {result && (
            <span className="text-xs text-muted">
              <span className="font-semibold text-green-700">{result.summary.sent} sent</span>
              {result.summary.skipped > 0 && <span className="ml-2 text-amber-700">{result.summary.skipped} skipped (recent)</span>}
              {result.summary.errors > 0 && <span className="ml-2 text-red-600">{result.summary.errors} errors</span>}
            </span>
          )}
        </div>
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        {result && (
          <p className="text-xs text-muted">
            Review link: <span className="font-mono text-ink">{result.reviewLink}</span>
          </p>
        )}
      </div>

      {/* Request history */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <Clock size={12} />
            {showHistory ? "Hide" : "Show"} request history ({history.length})
            {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showHistory && (
            <div className="mt-3 border border-stoneLine divide-y divide-stoneLine">
              {history.slice(0, 50).map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <span className="font-mono text-muted">{log.phone}</span>
                  {log.customerName && <span className="text-ink font-semibold">{log.customerName}</span>}
                  <span className="ml-auto text-muted">
                    {new Date(log.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
