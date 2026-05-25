"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui";

export function SyncClientButton({ clientId, label = "Sync" }: { clientId: string; label?: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch(`/api/clients/${clientId}/sync`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Sync failed.");
        return;
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <Button type="button" onClick={sync} disabled={syncing}>
        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing..." : label}
      </Button>
      {message ? <span className="text-xs font-semibold text-red-700">{message}</span> : null}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1300);
  }

  return (
    <Button type="button" variant="secondary" onClick={copy}>
      <Copy size={15} /> {copied ? "Copied" : label}
    </Button>
  );
}

export function InlineCopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1300);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink transition-colors"
    >
      {copied
        ? <Check size={11} className="text-green-600" />
        : <Copy size={11} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ReviewDraftButton({
  clientId,
  review,
  hasGbpOAuth = false,
}: {
  clientId: string;
  review: { reviewId: string; comment: string; starRating: number; reviewerDisplayName: string };
  hasGbpOAuth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState("");

  async function draftReply() {
    setOpen(true);
    if (draft) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/clients/${clientId}/ai/review-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: review.reviewId,
          reviewText: review.comment,
          starRating: review.starRating,
          reviewerName: review.reviewerDisplayName
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to draft reply.");
        return;
      }
      setDraft(result.response || "");
    } finally {
      setLoading(false);
    }
  }

  async function postToGoogle() {
    if (!draft.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/integrations/gbp/reviews/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.reviewId, comment: draft.trim() }),
      });
      const result = await res.json();
      if (!res.ok) { setPostError(result.error || "Failed to post reply."); return; }
      setPosted(true);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mt-3">
      <Button type="button" variant="secondary" onClick={draftReply} disabled={loading}>
        {loading ? "Drafting..." : "Draft reply"}
      </Button>
      {open ? (
        <div className="mt-3 border border-stoneLine bg-ivory p-3 grid gap-3">
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
          {draft ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setPosted(false); }}
                rows={4}
                className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-gm-orange resize-y"
              />
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton text={draft} label="Copy reply" />
                {hasGbpOAuth && !posted && (
                  <Button type="button" onClick={() => void postToGoogle()} disabled={posting || !draft.trim()}>
                    <Send size={14} /> {posting ? "Postingâ€¦" : "Post to Google"}
                  </Button>
                )}
                {posted && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <Check size={13} /> Posted to Google Business Profile
                  </span>
                )}
              </div>
              {postError ? <p className="text-xs font-semibold text-red-700">{postError}</p> : null}
            </>
          ) : !error ? <p className="text-sm text-muted">Generating response...</p> : null}
        </div>
      ) : null}
    </div>
  );
}
