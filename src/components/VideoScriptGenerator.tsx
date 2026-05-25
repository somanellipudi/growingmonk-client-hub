"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Film, Loader2 } from "lucide-react";
import type { VideoScript } from "@/app/api/clients/[id]/ai/video-script/route";

type Platform = "instagram_reel" | "youtube_shorts" | "whatsapp_status";
type Duration = 15 | 30 | 60 | 90;
type Tone = "educational" | "entertaining" | "promotional" | "behind_the_scenes" | "testimonial";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-[11px] text-muted hover:text-gm-orange transition-colors"
    >
      {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ScriptOutput({ script }: { script: VideoScript }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gm-orange/30 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-stoneLine hover:bg-ivory transition-colors"
      >
        <div className="flex items-center gap-2">
          <Film size={14} className="text-gm-orange" />
          <span className="text-sm font-semibold text-ink">{script.title}</span>
          <span className="text-xs text-muted">{script.platform} · {script.totalDuration}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {open && (
        <div className="grid gap-0">
          {/* Hook */}
          <Section label="Hook (first 3 seconds)" highlight>
            <p className="text-sm font-semibold text-ink leading-6">{script.hook}</p>
            <CopyButton text={script.hook} />
          </Section>

          {/* Scenes */}
          <div className="border-b border-stoneLine">
            <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted bg-ivory">
              Scenes
            </p>
            {script.scenes.map((scene) => (
              <div key={scene.sceneNumber} className="px-4 py-3 border-b border-stoneLine last:border-b-0 grid gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gm-orange bg-gm-orange/10 px-2 py-0.5">
                    Scene {scene.sceneNumber}
                  </span>
                  <span className="text-[10px] text-muted">{scene.duration}</span>
                </div>
                <div className="grid gap-1.5 text-xs">
                  <Row label="Visual" value={scene.visual} />
                  {scene.voiceover && <Row label="Voiceover" value={scene.voiceover} copy />}
                  {scene.textOverlay && <Row label="Text overlay" value={scene.textOverlay} copy />}
                  {scene.direction && <Row label="Direction" value={scene.direction} muted />}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Section label="Call to action">
            <p className="text-sm text-ink leading-6">{script.cta}</p>
            <CopyButton text={script.cta} />
          </Section>

          {/* Caption */}
          <Section label="Caption draft">
            <p className="text-xs text-muted leading-6 whitespace-pre-line">{script.captionDraft}</p>
            <CopyButton text={script.captionDraft} />
          </Section>

          {/* Hashtags */}
          <Section label="Hashtags">
            <div className="flex flex-wrap gap-1.5">
              {script.hashtags.map((tag) => (
                <span key={tag} className="text-[11px] bg-ivory border border-stoneLine px-2 py-0.5 text-muted">
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
            <CopyButton text={script.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")} />
          </Section>

          {/* Music + Repurpose */}
          <div className="grid sm:grid-cols-2 border-t border-stoneLine">
            <Section label="Music mood" noBorder>
              <p className="text-xs text-muted leading-5">{script.musicMood}</p>
            </Section>
            <Section label="Repurpose tips" noBorder>
              <ul className="grid gap-1">
                {script.repurposeTips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted leading-5">• {tip}</li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
  highlight,
  noBorder,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
  noBorder?: boolean;
}) {
  return (
    <div className={`px-4 py-3 grid gap-2 ${noBorder ? "" : "border-b border-stoneLine"} ${highlight ? "bg-gm-orange/[0.07]" : ""}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, value, copy, muted }: { label: string; value: string; copy?: boolean; muted?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 w-20 text-[10px] font-semibold text-muted uppercase tracking-[0.1em] pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        <span className={muted ? "text-muted" : "text-ink"}>{value}</span>
        {copy && (
          <span className="ml-2 inline-block">
            <CopyButton text={value} />
          </span>
        )}
      </div>
    </div>
  );
}

export function VideoScriptGenerator({ clientId }: { clientId: string }) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram_reel");
  const [duration, setDuration] = useState<Duration>(30);
  const [tone, setTone] = useState<Tone>("entertaining");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scripts, setScripts] = useState<VideoScript[]>([]);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/video-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, duration, tone, additionalContext }),
      });
      const data = await res.json() as { script?: VideoScript; error?: string };
      if (!res.ok || !data.script) throw new Error(data.error || "Generation failed");
      setScripts((prev) => [data.script!, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">AI video script generator</p>

      {/* Form */}
      <div className="grid gap-3 border border-stoneLine bg-ivory p-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">
            Topic / product / offer
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Our new hair smoothing treatment, Diwali offer, Behind the scenes of a day"
            className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-gm-orange"
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value="instagram_reel">Instagram Reel</option>
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="whatsapp_status">WhatsApp Status</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as Duration)}
              className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted block mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full border border-stoneLine bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value="entertaining">Entertaining</option>
              <option value="educational">Educational</option>
              <option value="promotional">Promotional</option>
              <option value="behind_the_scenes">Behind the scenes</option>
              <option value="testimonial">Testimonial</option>
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
            placeholder="e.g. Targeting women 25–35, we have a ₹499 launch offer this week"
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
            <>
              <Loader2 size={13} className="animate-spin" />
              Generating script…
            </>
          ) : (
            <>
              <Film size={13} />
              Generate script
            </>
          )}
        </button>
      </div>

      {/* Generated scripts */}
      {scripts.length > 0 && (
        <div className="grid gap-3">
          {scripts.map((script, i) => (
            <ScriptOutput key={i} script={script} />
          ))}
        </div>
      )}
    </div>
  );
}
