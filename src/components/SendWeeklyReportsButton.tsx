"use client";

import { useState } from "react";
import { Check, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

type Summary = { total: number; sent: number; skipped: number; errors: number };

export function SendWeeklyReportsButton({ secret }: { secret: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  async function send() {
    setState("sending");
    setError("");
    setSummary(null);
    try {
      const res = await fetch("/api/scheduler/send-weekly-reports", {
        method: "POST",
        headers: { "x-scheduler-secret": secret },
      });
      const data = await res.json() as { summary?: Summary; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed."); setState("error"); return; }
      setSummary(data.summary ?? null);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setState("error");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <Button type="button" variant="secondary" onClick={() => void send()} disabled={state === "sending"}>
        {state === "sending"
          ? <><RefreshCw size={14} className="animate-spin" /> Sending reports…</>
          : state === "done"
          ? <><Check size={14} /> Reports sent</>
          : <><MessageSquare size={14} /> Send weekly reports</>
        }
      </Button>
      {summary && (
        <span className="text-xs text-muted">
          {summary.sent} sent · {summary.skipped} skipped · {summary.errors} errors (of {summary.total} eligible)
        </span>
      )}
      {error && <span className="text-xs font-semibold text-red-700">{error}</span>}
    </span>
  );
}
