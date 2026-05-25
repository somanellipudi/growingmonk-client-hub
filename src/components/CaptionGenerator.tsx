"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Loader2, Sparkles } from "lucide-react";
import type { CaptionDraftResult, CaptionVariant } from "@/app/api/clients/[id]/ai/caption-draft/route";
import type { WeeklyPost } from "@/types";

type PostType = "reel" | "carousel" | "static" | "story";
type Tone = "engaging" | "educational" | "promotional" | "storytelling" | "conversational";
type Length = "short" | "medium" | "long";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }}
      className="flex items-center gap-1.5 text-xs font-semibold text-gm-orange hover:text-gm-orange/80 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

const EMOJI_LABEL: Record<CaptionVariant["emojiStyle"], string> = {
  heavy: "🔥 Heavy emoji",
  light: "✨ Light emoji",
  none: "No emoji",
};

function VariantCard({ variant }: { variant: CaptionVariant }) {
  const [expanded, setExpanded] = useState(false);
  const fullText = `${variant.caption}\n\n${variant.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}`;

  return (
    <div className="border border-stoneLine bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stoneLine bg-ivory">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-gm-orange">
          {variant.style}
        </span>
        <span className="text-[10px] text-muted border border-stoneLine bg-paper px-1.5 py-0.5">
          {EMOJI_LABEL[variant.emojiStyle]}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <CopyButton text={fullText} label="Copy all" />
          <button
            onClick={() => setExpanded((o) => !o)}
            className="text-muted hover:text-ink transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Opening line preview — always visible */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-[0.1em] mb-1">Opening (preview)</p>
        <p className="text-sm text-ink leading-6 font-medium">{variant.openingLine}</p>
      </div>

      {/* Full caption — expanded */}
      {expanded && (
        <div className="border-t border-stoneLine px-4 py-3 grid gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-muted uppercase tracking-[0.1em]">Full caption</p>
              <CopyButton text={variant.caption} />
            </div>
            <p className="text-sm text-muted leading-7 whitespace-pre-line">{variant.caption}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-muted uppercase tracking-[0.1em]">CTA</p>
              <CopyButton text={variant.cta} />
            </div>
            <p className="text-sm text-ink">{variant.cta}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-[0.1em]">Hashtags</p>
              <CopyButton text={variant.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {variant.hashtags.map((tag) => (
                <span key={tag} className="text-[11px] bg-ivory border border-stoneLine px-2 py-0.5 text-muted">
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBlock({ result }: { result: CaptionDraftResult }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">
          Topic: <span className="text-ink">{result.topic}</span>
        </p>
      </div>
      {result.variants.map((v, i) => (
        <VariantCard key={i} variant={v} />
      ))}
      {result.bestFor && (
        <p className="text-xs text-muted leading-5 border-l-2 border-gm-orange pl-3 py-1">
          💡 {result.bestFor}
        </p>
      )}
    </div>
  );
}

export function CaptionGenerator({
  clientId,
  weekPlanPosts,
}: {
  clientId: string;
  weekPlanPosts?: WeeklyPost[];
}) {
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState<PostType>("reel");
  const [tone, setTone] = useState<Tone>("engaging");
  const [length, setLength] = useState<Length>("medium");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CaptionDraftResult[]>([]);

  function fillFromPost(post: WeeklyPost) {
    setTopic(post.hook);
    setPostType(post.postType === "story" ? "story" : post.postType === "carousel" ? "carousel" : post.postType === "static" ? "static" : "reel");
    setAdditionalContext(post.captionDraft ? `Draft direction: ${post.captionDraft.slice(0, 150)}` : "");
  }

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/caption-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, postType, tone, length, additionalContext }),
      });
      const data = await res.json() as CaptionDraftResult & { error?: string };
      if (!res.ok || !data.variants) throw new Error(data.error || "Generation failed");
      setResults((prev) => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">AI caption generator</p>

      {/* Quick-fill from week plan */}
      {weekPlanPosts && weekPlanPosts.length > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-2 font-semibold uppercase tracking-[0.1em]">
            Quick-fill from this week&apos;s plan
          </p>
          <div className="flex flex-wrap gap-2">
            {weekPlanPosts.slice(0, 5).map((post, i) => (
              <button
                key={i}
                onClick={() => fillFromPost(post)}
                className="text-[11px] border border-stoneLine bg-ivory px-2.5 py-1.5 text-muted hover:border-gm-orange/50 hover:text-ink transition-colors text-left max-w-[200px] truncate"
                title={post.hook}
              >
                {post.day.slice(0, 3)} · {post.hook.slice(0, 40)}{post.hook.length > 40 ? "…" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="grid gap-3 border border-stoneLine bg-ivory p-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">
            Topic / hook / offer
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Our Diwali hair spa package, 3 signs you need a deep conditioning treatment, New menu launch"
            className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-gm-orange"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && generate()}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">Post type</label>
            <select value={postType} onChange={(e) => setPostType(e.target.value as PostType)}
              className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink">
              <option value="reel">Reel</option>
              <option value="carousel">Carousel</option>
              <option value="static">Static</option>
              <option value="story">Story</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink">
              <option value="engaging">Engaging</option>
              <option value="educational">Educational</option>
              <option value="promotional">Promotional</option>
              <option value="storytelling">Storytelling</option>
              <option value="conversational">Conversational</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">Length</label>
            <select value={length} onChange={(e) => setLength(e.target.value as Length)}
              className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink">
              <option value="short">Short (reels)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="long">Long (carousels)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">
            Additional context <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="e.g. We have 30% off this weekend, targeting bridal season, include booking link in bio"
            className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-gm-orange"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gm-orange text-white text-xs font-semibold uppercase tracking-[0.1em] hover:bg-gm-orange/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <><Loader2 size={13} className="animate-spin" /> Generating 3 variants…</>
          ) : (
            <><Sparkles size={13} /> Generate captions</>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="grid gap-6">
          {results.map((r, i) => (
            <ResultBlock key={i} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
