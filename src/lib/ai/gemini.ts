import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/server/env";
import { googleAccessToken } from "@/lib/server/db";
import { type AITask, getModel, hasCLaudeFallback } from "./router";
import { callClaude, callClaudeJSON, isClaudeAvailable } from "./claude";

let genAI: GoogleGenerativeAI | null = null;

async function getApiKey() {
  if (env.geminiApiKey) return env.geminiApiKey;
  if (!env.geminiApiKeySecret) return "";
  if (!env.googleCloudProject) return "";

  try {
    const token = await googleAccessToken(["https://www.googleapis.com/auth/cloud-platform"]);
    const response = await fetch(
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(env.googleCloudProject)}/secrets/${encodeURIComponent(env.geminiApiKeySecret)}/versions/latest:access`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return "";
    const payload = await response.json() as { payload?: { data?: string } };
    return Buffer.from(String(payload.payload?.data || ""), "base64").toString("utf8").trim();
  } catch {
    return "";
  }
}

async function getGenAI() {
  const key = await getApiKey();
  if (!key) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI;
}

export { getModel };
export type { AITask };

export async function callGemini(task: AITask, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    return await callGeminiDirect(task, systemPrompt, userPrompt);
  } catch (err) {
    if (hasCLaudeFallback(task) && isClaudeAvailable()) {
      console.warn(`[AI] Gemini failed for "${task}", falling back to Claude:`, (err as Error).message);
      return callClaude(task, systemPrompt, userPrompt);
    }
    throw err;
  }
}

export async function callGeminiJSON<T>(task: AITask, systemPrompt: string, userPrompt: string): Promise<T> {
  try {
    return await callGeminiJSONDirect<T>(task, systemPrompt, userPrompt);
  } catch (err) {
    if (hasCLaudeFallback(task) && isClaudeAvailable()) {
      console.warn(`[AI] Gemini JSON failed for "${task}", falling back to Claude:`, (err as Error).message);
      return callClaudeJSON<T>(task, systemPrompt, userPrompt);
    }
    throw err;
  }
}

async function callGeminiDirect(task: AITask, systemPrompt: string, userPrompt: string): Promise<string> {
  const modelName = getModel(task);
  const gen = await getGenAI();
  if (gen) {
    const model = gen.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt
    });
    const result = await model.generateContent(userPrompt);
    return result.response.text();
  }

  const response = await callVertex(modelName, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.45, maxOutputTokens: 2000 }
  });
  return textFromGenerateContent(await response.json());
}

async function callGeminiJSONDirect<T>(task: AITask, systemPrompt: string, userPrompt: string): Promise<T> {
  const modelName = getModel(task);
  const gen = await getGenAI();

  let text = "";
  if (gen) {
    const model = gen.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    const result = await model.generateContent(userPrompt);
    text = result.response.text();
  } else {
    const response = await callVertex(modelName, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.35,
        maxOutputTokens: 12000
      }
    });
    text = textFromGenerateContent(await response.json());
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const clean = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean) as T;
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as T;
      throw new Error(`Gemini response is not valid JSON. Task: ${task}. Response: ${text.slice(0, 200)}`);
    }
  }
}

async function callVertex(modelName: string, body: unknown) {
  if (!env.googleCloudProject) throw new Error("GOOGLE_CLOUD_PROJECT is required for Vertex Gemini.");
  const token = await googleAccessToken(["https://www.googleapis.com/auth/cloud-platform"]);
  const configuredLocation = env.googleCloudLocation || "global";
  const location = configuredLocation === "asia-south1" ? "global" : configuredLocation;
  const response = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(env.googleCloudProject)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(modelName)}:generateContent`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 403) {
      throw new Error(
        "Gemini API key not configured and Vertex AI access is denied.\n" +
        "Fix: Add GEMINI_API_KEY=<your-key> to .env.local\n" +
        "Get a free key at: https://aistudio.google.com/apikey"
      );
    }
    throw new Error(`Vertex Gemini request failed: ${response.status} ${detail.slice(0, 240)}`);
  }
  return response;
}

function textFromGenerateContent(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const candidate = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0];
  return candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}
