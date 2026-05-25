"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, KeyRound, PenLine } from "lucide-react";
import { CopyButton } from "@/components/mvp-actions";

type FindResult = {
  success: boolean;
  igAccountId?: string;
  igUsername?: string;
  pageId?: string;
  pageName?: string;
  method?: string;
  missingPermission?: string;
  log?: string[];
  error?: string;
};

type Props = {
  clientId: string;
  instagramHandle?: string;
};

export function InstagramIdFinder({ clientId, instagramHandle }: Props) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<FindResult | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Persisted page ID from last successful detection
  const [cachedPageId, setCachedPageId] = useState<string>("");
  const [cachedPageName, setCachedPageName] = useState<string>("");

  // Manual input state
  const [showManual, setShowManual] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`igfinder-page-${clientId}`);
      if (stored) {
        const data = JSON.parse(stored) as { pageId?: string; pageName?: string };
        if (data.pageId) setCachedPageId(data.pageId);
        if (data.pageName) setCachedPageName(data.pageName);
      }
    } catch {}
  }, [clientId]);

  async function handleFind() {
    setState("running");
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch("/api/integrations/meta/find-ig-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json() as FindResult;
      setResult(data);
      setState(data.success ? "done" : "error");
      if (data.pageId) {
        setCachedPageId(data.pageId);
        setCachedPageName(data.pageName ?? "");
        try { localStorage.setItem(`igfinder-page-${clientId}`, JSON.stringify({ pageId: data.pageId, pageName: data.pageName })); } catch {}
      }
      if (!data.success) setShowManual(true);
    } catch (err) {
      setResult({ success: false, error: (err as Error).message });
      setState("error");
      setShowManual(true);
    }
  }

  async function handleSave() {
    if (!result?.igAccountId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/meta/find-ig-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, save: true }),
      });
      const data = await res.json() as FindResult;
      if (data.success) {
        setSaved(true);
        setTimeout(() => window.location.reload(), 1200);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSave() {
    const id = manualId.trim();
    if (!id) return;
    setManualError("");
    // Basic validation â€” IG Business Account IDs are 15-17 digit numbers
    if (!/^\d{10,20}$/.test(id)) {
      setManualError("Instagram Business Account IDs are numeric (15â€“17 digits). Example: 17841400008460056");
      return;
    }
    setManualSaving(true);
    try {
      const res = await fetch("/api/integrations/meta/save-ig-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, igAccountId: id }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setManualSaved(true);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setManualError(data.error ?? "Failed to save");
      }
    } catch (err) {
      setManualError((err as Error).message);
    } finally {
      setManualSaving(false);
    }
  }

  const isMissingPermission = result?.missingPermission === "instagram_basic";

  return (
    <div className="space-y-4">
      {/* Auto-detect button */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-violet-200 bg-violet-50">
        <Search className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-violet-800">Auto-detect Instagram Business Account ID</p>
          <p className="text-xs text-violet-700 leading-5">
            Uses your stored Meta access token to find the Instagram account linked to your Facebook page
            {instagramHandle ? ` (@${instagramHandle})` : ""}.
          </p>
          <button
            onClick={handleFind}
            disabled={state === "running"}
            className="flex items-center gap-2 px-4 py-2 rounded bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            {state === "running"
              ? <><RefreshCw className="w-3 h-3 animate-spin" /> Detectingâ€¦</>
              : <><Search className="w-3 h-3" /> {state === "done" ? "Re-detect" : "Detect Instagram ID"}</>
            }
          </button>
        </div>
      </div>

      {/* Success result */}
      {result?.success && result.igAccountId && (
        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">Instagram Business Account found!</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-emerald-700 font-semibold">Instagram Account ID</p>
              <p className="text-emerald-900 font-mono mt-0.5">{result.igAccountId}</p>
            </div>
            {result.igUsername && (
              <div>
                <p className="text-emerald-700 font-semibold">Username</p>
                <p className="text-emerald-900 mt-0.5">@{result.igUsername}</p>
              </div>
            )}
            {result.pageName && (
              <div>
                <p className="text-emerald-700 font-semibold">Linked to page</p>
                <p className="text-emerald-900 mt-0.5">{result.pageName}</p>
              </div>
            )}
            <div>
              <p className="text-emerald-700 font-semibold">Found via</p>
              <p className="text-emerald-900 mt-0.5">{result.method?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
          >
            {saved
              ? <><CheckCircle2 className="w-3 h-3" /> Saved! Reloadingâ€¦</>
              : saving
              ? <><RefreshCw className="w-3 h-3 animate-spin" /> Savingâ€¦</>
              : "Save to client & sync Instagram posts"}
          </button>
        </div>
      )}

      {/* Missing permission â€” show token fix guide */}
      {isMissingPermission && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-3">
          <div className="flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Token missing <code className="bg-amber-100 px-1 rounded">instagram_basic</code> permission</p>
              <p className="text-xs text-amber-800 mt-1 leading-5">
                Your current token can read ads but can&apos;t access Instagram. You need to regenerate it with Instagram permissions added.
              </p>
            </div>
          </div>
          <div className="text-xs text-amber-800 space-y-1 leading-5">
            <p className="font-semibold">How to fix â€” 2 minutes:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Open <strong>Meta Graph API Explorer</strong>: <span className="font-mono bg-amber-100 px-1 rounded">developers.facebook.com/tools/explorer</span></li>
              <li>Select your app in the top-right dropdown</li>
              <li>Click <strong>Generate Access Token</strong></li>
              <li>In the permissions dialog, add: <code className="bg-amber-100 px-1 rounded">instagram_basic</code>, <code className="bg-amber-100 px-1 rounded">instagram_manage_insights</code>, <code className="bg-amber-100 px-1 rounded">pages_show_list</code>, <code className="bg-amber-100 px-1 rounded">pages_read_engagement</code></li>
              <li>Copy the new token â†’ go to <strong>Edit client</strong> â†’ paste in Meta Access Token field</li>
              <li>Come back and click <strong>Detect Instagram ID</strong> again</li>
            </ol>
          </div>
        </div>
      )}

      {/* Generic error (not permission-related) */}
      {result && !result.success && !isMissingPermission && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Could not find Instagram ID</span>
          </div>
          {result.error && <p className="text-xs text-red-700 mt-1">{result.error}</p>}
        </div>
      )}

      {/* Manual input â€” shown when auto-detect fails */}
      {(showManual || state === "error") && (
        <div className="border border-stoneLine rounded-lg overflow-hidden">
          <button
            onClick={() => setShowManual((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-ivory hover:bg-ivory text-xs font-semibold text-ink transition-colors"
          >
            <span className="flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5" />
              Enter Instagram ID manually
            </span>
            {showManual ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
          </button>
          {showManual && (
            <div className="p-4 bg-white space-y-3 border-t border-stoneLine">
              <div className="text-xs text-muted leading-5 space-y-1">
                <p className="font-semibold text-ink">How to find your Instagram Business Account ID:</p>
                <p><strong>Option A â€” Graph API Explorer</strong> (fastest with new token):</p>
                {(() => {
                  const pageId = result?.pageId ?? cachedPageId ?? "";
                  const query = pageId
                    ? `/${pageId}?fields=instagram_business_account{id,username}`
                    : `/{page-id}?fields=instagram_business_account{id,username}`;
                  const pageName = result?.pageName ?? cachedPageName;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <code className="font-mono bg-ivory border border-stoneLine px-2 py-1.5 rounded text-[11px] break-all flex-1">
                          {query}
                        </code>
                        <CopyButton text={query} label="Copy" />
                      </div>
                      {pageName && pageId && (
                        <p className="text-muted">Page: <span className="text-ink">{pageName}</span></p>
                      )}
                    </>
                  );
                })()}
                <p className="mt-2"><strong>Option B â€” Meta Business Suite</strong>: business.facebook.com â†’ Instagram account â†’ Settings â†’ the URL contains the numeric ID</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. 17841400008460056"
                  className="flex-1 px-3 py-2 text-xs border border-stoneLine rounded focus:outline-none focus:border-ink font-mono bg-white"
                />
                <button
                  onClick={handleManualSave}
                  disabled={!manualId.trim() || manualSaving || manualSaved}
                  className="px-4 py-2 text-xs font-semibold text-white bg-ink hover:bg-ink/80 disabled:opacity-50 rounded transition-colors whitespace-nowrap"
                >
                  {manualSaved
                    ? "Saved!"
                    : manualSaving
                    ? "Savingâ€¦"
                    : "Save ID"}
                </button>
              </div>
              {manualError && (
                <p className="text-xs text-red-600">{manualError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Debug log toggle */}
      {result?.log?.length ? (
        <div>
          <button
            onClick={() => setShowLog((v) => !v)}
            className="flex items-center gap-1 text-xs text-ink/40 hover:text-ink/60 transition-colors"
          >
            {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showLog ? "Hide" : "Show"} debug log
          </button>
          {showLog && (
            <div className="mt-2 p-3 rounded bg-ivory border border-stoneLine font-mono text-xs text-ink/60 leading-6 whitespace-pre-wrap">
              {result.log.join("\n")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
