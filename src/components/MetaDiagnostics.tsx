"use client";

import { useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { DiagnosticCheck, MetaDiagnosticResult } from "@/app/api/integrations/meta/diagnose/route";
import { InstagramIdFinder } from "./InstagramIdFinder";

type Props = {
  clientId: string;
  instagramHandle?: string;
};

export function MetaDiagnostics({ clientId, instagramHandle }: Props) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<MetaDiagnosticResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function run() {
    setState("running");
    setResult(null);
    setFetchError(null);
    try {
      const res = await fetch("/api/integrations/meta/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json() as MetaDiagnosticResult;
      setResult(data);
      setState("done");
    } catch (err) {
      setFetchError((err as Error).message);
      setState("error");
    }
  }

  const igFailed = result?.checks.some(
    (c) => (c.name === "Instagram Account ID" || c.name === "Instagram posts") && c.status === "fail"
  );

  return (
    <div className="border border-stoneLine rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-ivory border-b border-stoneLine">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-gm-orange" />
          <h3 className="text-sm font-bold text-ink">Meta Connection Diagnostics</h3>
          {result && (
            <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
              result.overallStatus === "healthy" ? "bg-green-100 text-green-800" :
              result.overallStatus === "partial" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-800"
            }`}>
              {result.overallStatus}
            </span>
          )}
        </div>
        <button
          onClick={run}
          disabled={state === "running"}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-ink hover:bg-ink/80 disabled:opacity-50 rounded transition-colors"
        >
          {state === "running"
            ? <><RefreshCw size={12} className="animate-spin" /> Runningâ€¦</>
            : <><Activity size={12} /> {state === "done" ? "Re-run diagnostics" : "Run Diagnostics"}</>}
        </button>
      </div>

      {/* Idle placeholder */}
      {state === "idle" && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted max-w-md mx-auto leading-6">
            Meta shows as connected but no data is pulling. Run diagnostics to check token validity, Instagram account ID, and ad account access â€” and get specific fixes.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary bar */}
          {(result.igUsername || result.adAccountName || result.tokenExpiry) && (
            <div className="px-5 py-3 bg-ivory border-b border-stoneLine flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              {result.igUsername && (
                <span>Instagram: <strong className="text-ink">@{result.igUsername}</strong></span>
              )}
              {result.igAccountId && (
                <span>IG ID: <code className="bg-white border border-stoneLine px-1 py-0.5 rounded font-mono">{result.igAccountId}</code></span>
              )}
              {result.adAccountName && (
                <span>Ad account: <strong className="text-ink">{result.adAccountName}</strong></span>
              )}
              {result.tokenExpiry && (
                <span>Token expires: <strong className="text-ink">{result.tokenExpiry}</strong></span>
              )}
            </div>
          )}

          {/* Check list */}
          <div className="divide-y divide-stoneLine">
            {result.checks.map((check) => (
              <CheckRow key={check.name} check={check} />
            ))}
          </div>

          {/* Instagram ID finder if IG check failed */}
          {igFailed && (
            <div className="px-5 py-5 bg-violet-50 border-t border-violet-200">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-800 mb-4">
                Fix: Auto-detect the correct Instagram Business Account ID
              </p>
              <InstagramIdFinder clientId={clientId} instagramHandle={instagramHandle} />
            </div>
          )}
        </div>
      )}

      {fetchError && (
        <div className="px-5 py-4 text-sm text-red-700 bg-red-50">
          Error running diagnostics: {fetchError}
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: DiagnosticCheck }) {
  const [expanded, setExpanded] = useState(false);
  const hasExtra = Boolean(check.detail ?? check.fix);

  return (
    <div className={`px-5 py-3.5 ${
      check.status === "fail" ? "bg-red-50" :
      check.status === "warn" ? "bg-amber-50" : ""
    }`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {check.status === "ok" && <CheckCircle2 size={15} className="text-green-500" />}
          {check.status === "warn" && <AlertTriangle size={15} className="text-amber-500" />}
          {check.status === "fail" && <XCircle size={15} className="text-red-500" />}
          {check.status === "skip" && (
            <span className="block w-3.5 h-3.5 rounded-full border-2 border-muted/30 mt-0.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink">{check.name}</span>
            {hasExtra && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-ink/30 hover:text-ink/60 transition-colors"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 leading-5">{check.message}</p>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {check.detail && (
                <p className="text-xs text-ink/60 bg-white border border-stoneLine px-2 py-1.5 rounded font-mono break-all">
                  {check.detail}
                </p>
              )}
              {check.fix && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded leading-5">
                  Fix: {check.fix}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
