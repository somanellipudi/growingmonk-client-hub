import { env } from "@/lib/server/env";

export type AITask =
  | "weekly_brief_generation"
  | "review_response_draft"
  | "whatsapp_message_draft"
  | "caption_draft"
  | "client_update_draft"
  | "sentiment_classification"
  | "post_performance_tagging"
  | "prompt_enhancement"
  | "video_script";

// Primary model (Gemini) per task
export const MODEL_ROUTING: Record<AITask, string> = {
  weekly_brief_generation: env.geminiProModel,
  review_response_draft: env.geminiFlashModel,
  whatsapp_message_draft: env.geminiFlashModel,
  caption_draft: env.geminiFlashModel,
  client_update_draft: env.geminiFlashModel,
  sentiment_classification: env.geminiLiteModel,
  post_performance_tagging: env.geminiLiteModel,
  prompt_enhancement: env.geminiProModel,
  video_script: env.geminiFlashModel,
};

// Tasks that fall back to Claude when Gemini fails
// Lite tasks (sentiment, tagging) are fast/cheap — no fallback needed
export const CLAUDE_FALLBACK_TASKS = new Set<AITask>([
  "weekly_brief_generation",
  "review_response_draft",
  "whatsapp_message_draft",
  "caption_draft",
  "client_update_draft",
  "prompt_enhancement",
  "video_script",
]);

export function getModel(task: AITask): string {
  return MODEL_ROUTING[task];
}

export function hasCLaudeFallback(task: AITask): boolean {
  return CLAUDE_FALLBACK_TASKS.has(task);
}
