"use client";

import { useState } from "react";
import { Film, Sparkles } from "lucide-react";
import { CaptionGenerator } from "@/components/CaptionGenerator";
import { VideoScriptGenerator } from "@/components/VideoScriptGenerator";
import type { WeeklyPost } from "@/types";

type Tool = "caption" | "script";

export function ContentToolsTabs({
  clientId,
  weekPlanPosts,
}: {
  clientId: string;
  weekPlanPosts: WeeklyPost[];
}) {
  const [tool, setTool] = useState<Tool>("caption");

  return (
    <div className="border border-stoneLine bg-paper">
      {/* Tab bar */}
      <div className="flex border-b border-stoneLine">
        {([
          { id: "caption" as const, label: "Caption generator", icon: Sparkles },
          { id: "script" as const, label: "Video script", icon: Film },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${
              tool === id
                ? "border-gm-orange text-gm-orange bg-gm-orange/5"
                : "border-transparent text-muted hover:text-ink hover:bg-ivory"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tool === "caption" && (
          <CaptionGenerator clientId={clientId} weekPlanPosts={weekPlanPosts} />
        )}
        {tool === "script" && (
          <VideoScriptGenerator clientId={clientId} />
        )}
      </div>
    </div>
  );
}
