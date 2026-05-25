"use client";

import { useState, useEffect } from "react";
import { Check, Copy, ExternalLink, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";

type Props = {
  clientId: string;
  initialToken: string | null;
  initialEnabled: boolean;
};

export function PortalLinkPanel({ clientId, initialToken, initialEnabled }: Props) {
  const [token, setToken] = useState(initialToken);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const portalUrl = token && origin ? `${origin}/portal/${token}` : null;

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/portal`, { method: "POST" });
      const data = await res.json() as { token?: string };
      if (data.token) {
        setToken(data.token);
        setEnabled(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(next: boolean) {
    setEnabled(next);
    await fetch(`/api/clients/${clientId}/portal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
  }

  async function copyLink() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Client portal</p>
        {token && (
          <button
            onClick={() => toggleEnabled(!enabled)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            {enabled
              ? <ToggleRight size={16} className="text-green-600" />
              : <ToggleLeft size={16} />}
            {enabled ? "Active" : "Disabled"}
          </button>
        )}
      </div>

      {!token ? (
        <div>
          <p className="text-xs text-muted leading-5 mb-3">
            Generate a private link to share with this client. They can view their weekly performance data without logging in.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 bg-gm-orange text-white text-xs font-semibold uppercase tracking-[0.1em] hover:bg-gm-orange/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Generating…" : "Generate portal link"}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {!enabled && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
              Portal is disabled — the link will return a 404 until you re-enable it.
            </p>
          )}

          <div className="flex items-center gap-2 bg-white border border-stoneLine px-3 py-2 min-w-0">
            <span className="text-xs text-muted truncate flex-1 font-mono">
              {portalUrl ?? `…/portal/${token}`}
            </span>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gm-orange hover:text-gm-orange/80"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-muted hover:text-ink"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          >
            <RefreshCw size={12} />
            {loading ? "Regenerating…" : "Regenerate (invalidates old link)"}
          </button>
        </div>
      )}
    </div>
  );
}
