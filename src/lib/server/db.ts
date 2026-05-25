import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DbState, WorkspaceUser } from "@/types";
import { env } from "./env";

function nowIso() {
  return new Date().toISOString();
}

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "Team Member";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function seedUsers(createdAt: string): WorkspaceUser[] {
  return env.allowlistEmails.map((email, index) => ({
    email,
    name: nameFromEmail(email),
    status: "active",
    roleIds: index === 0 ? ["owner", "admin"] : ["strategist"],
    allowedApps: ["client-hub"],
    teamId: "growth_ops",
    createdAt,
    lastLoginAt: createdAt
  }));
}

function initialState(provider: DbState["meta"]["provider"] = "json"): DbState {
  const createdAt = nowIso();
  return {
    meta: {
      version: 2,
      provider,
      createdAt,
      updatedAt: createdAt
    },
    users: seedUsers(createdAt),
    clients: [],
    weekly_briefs: [],
    lead_logs: [],
    review_request_logs: [],
    review_count_snapshots: [],
    competitor_snapshots: [],
    activity_logs: []
  };
}

function resolveDbPath() {
  return path.resolve(process.cwd(), env.localDbPath);
}

async function ensureLocalDb() {
  const dbPath = resolveDbPath();
  await mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(initialState(), null, 2), "utf8");
  }
  return dbPath;
}

function normalizeState(input: Partial<DbState> & Record<string, unknown> | null | undefined): DbState {
  const provider = env.dbProvider === "firestore" ? "firestore" : "json";
  const fallback = initialState(provider);
  const rawMeta = input?.meta && typeof input.meta === "object" ? input.meta as DbState["meta"] : fallback.meta;
  const state: DbState = {
    meta: {
      ...fallback.meta,
      ...rawMeta,
      version: 2,
      provider
    },
    users: Array.isArray(input?.users) ? input.users as WorkspaceUser[] : [],
    clients: Array.isArray(input?.clients) ? input.clients as DbState["clients"] : [],
    weekly_briefs: Array.isArray(input?.weekly_briefs) ? input.weekly_briefs as DbState["weekly_briefs"] : [],
    lead_logs: Array.isArray(input?.lead_logs) ? input.lead_logs as DbState["lead_logs"] : [],
    review_request_logs: Array.isArray(input?.review_request_logs) ? input.review_request_logs as DbState["review_request_logs"] : [],
    review_count_snapshots: Array.isArray(input?.review_count_snapshots) ? input.review_count_snapshots as DbState["review_count_snapshots"] : [],
    competitor_snapshots: Array.isArray(input?.competitor_snapshots) ? input.competitor_snapshots as DbState["competitor_snapshots"] : [],
    activity_logs: Array.isArray(input?.activity_logs) ? input.activity_logs as DbState["activity_logs"] : []
  };

  const configuredUsers = seedUsers(state.meta.createdAt);
  const existingEmails = new Set(state.users.map((user) => user.email.toLowerCase()));
  const missingUsers = configuredUsers.filter((user) => !existingEmails.has(user.email));
  if (missingUsers.length) state.users = [...state.users, ...missingUsers];

  state.clients = state.clients.map((client) => ({
    ...client,
    keyCompetitors: Array.isArray(client.keyCompetitors) ? client.keyCompetitors : [],
    competitors: Array.isArray(client.competitors) ? client.competitors : [],
    activePlatforms: Array.isArray(client.activePlatforms) ? client.activePlatforms : [],
    integrationStatus: client.integrationStatus ?? {
      meta: client.metaAccessToken || client.metaAdAccountId || client.metaIgUserId ? "connected" : "not_connected",
      gbp: client.gbpAccountId || client.gbpLocationId ? "connected" : "not_connected"
    }
  }));

  return state;
}

export async function readDb(): Promise<DbState> {
  if (env.dbProvider === "firestore") return readFirestoreState();

  const dbPath = await ensureLocalDb();
  const raw = await readFile(dbPath, "utf8");
  try {
    return normalizeState(raw.trim() ? JSON.parse(raw) as Partial<DbState> & Record<string, unknown> : null);
  } catch {
    const state = initialState();
    await writeFile(dbPath, JSON.stringify(state, null, 2), "utf8");
    return state;
  }
}

export async function writeDb(nextState: DbState) {
  const state: DbState = {
    ...nextState,
    meta: {
      ...nextState.meta,
      provider: env.dbProvider === "firestore" ? "firestore" : "json",
      updatedAt: nowIso()
    }
  };

  if (env.dbProvider === "firestore") {
    await writeFirestoreState(state);
    return;
  }

  const dbPath = await ensureLocalDb();
  await writeFile(dbPath, JSON.stringify(state, null, 2), "utf8");
}

export async function resetDb() {
  const state = initialState(env.dbProvider === "firestore" ? "firestore" : "json");
  await writeDb(state);
  return state;
}

async function readFirestoreState() {
  const token = await googleAccessToken(["https://www.googleapis.com/auth/datastore"]);
  const response = await fetch(firestoreStateUrl(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (response.status === 404) {
    const state = initialState("firestore");
    await writeFirestoreState(state);
    return state;
  }
  if (!response.ok) throw new Error(`Firestore read failed: ${response.status}`);
  const document = await response.json() as { fields?: { json?: { stringValue?: string } } };
  const json = document.fields?.json?.stringValue ?? "";
  return normalizeState(json ? JSON.parse(json) as Partial<DbState> & Record<string, unknown> : null);
}

async function writeFirestoreState(state: DbState) {
  const token = await googleAccessToken(["https://www.googleapis.com/auth/datastore"]);
  const response = await fetch(firestoreStateUrl(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      fields: {
        json: { stringValue: JSON.stringify(state) },
        updatedAt: { timestampValue: state.meta.updatedAt }
      }
    })
  });
  if (!response.ok) throw new Error(`Firestore write failed: ${response.status}`);
}

function firestoreStateUrl() {
  if (!env.googleCloudProject) throw new Error("GOOGLE_CLOUD_PROJECT is required for Firestore.");
  const databaseId = env.firestoreDatabaseId || "(default)";
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.googleCloudProject)}/databases/${encodeURIComponent(databaseId)}/documents/clientHub/state`;
}

export async function googleAccessToken(scopes: string[]) {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({ scopes });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Google ADC did not return an access token.");
  return token.token;
}
