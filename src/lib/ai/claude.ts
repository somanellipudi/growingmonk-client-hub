import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/server/env";
import type { AITask } from "./router";

// Claude model per task — Sonnet for critical/complex, Haiku for fast/cheap
const CLAUDE_TASK_MODELS: Partial<Record<AITask, string>> = {
  weekly_brief_generation: env.claudeSonnetModel,
  review_response_draft: env.claudeHaikuModel,
  whatsapp_message_draft: env.claudeHaikuModel,
  caption_draft: env.claudeHaikuModel,
  client_update_draft: env.claudeHaikuModel,
};

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.anthropicApiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey });
  return _client;
}

export function getClaudeModel(task: AITask): string {
  return CLAUDE_TASK_MODELS[task] ?? env.claudeHaikuModel;
}

export async function callClaude(task: AITask, systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured — add it to .env.local");

  const message = await client.messages.create({
    model: getClaudeModel(task),
    max_tokens: task === "weekly_brief_generation" ? 12000 : 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

export async function callClaudeJSON<T>(task: AITask, systemPrompt: string, userPrompt: string): Promise<T> {
  const text = await callClaude(
    task,
    systemPrompt,
    userPrompt + "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, no explanation."
  );

  try {
    return JSON.parse(text) as T;
  } catch {
    const clean = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean) as T;
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as T;
      throw new Error(`Claude response is not valid JSON. Task: ${task}. Response: ${text.slice(0, 200)}`);
    }
  }
}

export function isClaudeAvailable(): boolean {
  return Boolean(env.anthropicApiKey);
}
