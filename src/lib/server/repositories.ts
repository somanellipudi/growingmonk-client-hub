import "server-only";

import type { Client, Competitor, LeadLog, LeadOutcome, Platform, ReviewCountSnapshot, ReviewRequestLog, SessionResult, WeeklyBrief } from "@/types";
import type { DeepAnalysis } from "@/app/api/clients/[id]/ai/deep-analysis/route";
import { env } from "./env";
import { readDb, resetDb, writeDb } from "./db";

export type ClientInput = {
  name?: string;
  sourceLeadId?: string;
  sourceAuditRunId?: string;
  niche?: Client["niche"];
  nicheSubtype?: string;
  city?: string;
  country?: Client["country"];
  timezone?: string;
  currency?: Client["currency"];
  packageTier?: Client["packageTier"];
  status?: Client["status"];
  targetCustomer?: string;
  brandVoice?: string;
  keyCompetitors?: string[] | string;
  competitors?: Competitor[];
  businessGoals?: string;
  knownConstraints?: string;
  activePlatforms?: Platform[] | string;
  otherPlatformLabel?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  autoWeeklyReport?: boolean;
  instagramHandle?: string;
  websiteUrl?: string;
  metaAccessToken?: string;
  metaAdAccountId?: string;
  metaIgUserId?: string;
  googleAdsCustomerId?: string;
  googleAdsManagerId?: string;
  gbpAccountId?: string;
  gbpLocationId?: string;
  gbpPlaceId?: string;
  gbpLocationName?: string;
  googleOAuthRefreshToken?: string;
  gbpAccessToken?: string;
  gbpTokenExpiry?: number;
  gbpPlaceRating?: number;
  gbpPlaceReviewCount?: number;
};

export type IntegrationInput = Pick<ClientInput, "metaAccessToken" | "metaAdAccountId" | "metaIgUserId" | "gbpAccountId" | "gbpLocationId" | "gbpPlaceId">;

function normalizeEmail(email?: string) {
  return (email || env.allowlistEmails[0] || "").trim().toLowerCase();
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function splitCsv(value?: string[] | string) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePlatforms(value?: Platform[] | string): Platform[] {
  const allowed = new Set<Platform>(["instagram", "facebook", "whatsapp", "google_ads", "meta_ads", "youtube", "google_business", "linkedin", "other"]);
  return splitCsv(value).filter((item): item is Platform => allowed.has(item as Platform));
}

function defaultTimezone(country: Client["country"]) {
  return country === "US" ? "America/New_York" : "Asia/Kolkata";
}

function defaultCurrency(country: Client["country"]) {
  return country === "US" ? "USD" : "INR";
}

function integrationStatus(input: Pick<Client, "metaAccessToken" | "metaAdAccountId" | "metaIgUserId" | "gbpAccountId" | "gbpLocationId">, current?: Client["integrationStatus"]): NonNullable<Client["integrationStatus"]> {
  return {
    meta: input.metaAccessToken && (input.metaAdAccountId || input.metaIgUserId) ? "connected" : current?.meta === "error" ? "error" : "not_connected",
    gbp: input.gbpAccountId && input.gbpLocationId ? "connected" : current?.gbp === "error" ? "error" : "not_connected",
    lastMetaError: current?.lastMetaError,
    lastGbpError: current?.lastGbpError
  };
}

function normalizeClientInput(input: ClientInput, current?: Client) {
  const name = String(input.name ?? current?.name ?? "").trim();
  if (!name) throw new Error("Client name is required.");
  const country = input.country ?? current?.country ?? "IN";
  const activePlatforms = input.activePlatforms === undefined
    ? current?.activePlatforms ?? ["instagram"]
    : parsePlatforms(input.activePlatforms);
  const keyCompetitors = input.keyCompetitors === undefined
    ? current?.keyCompetitors ?? []
    : splitCsv(input.keyCompetitors);

  return {
    name,
    sourceLeadId: input.sourceLeadId?.trim() || current?.sourceLeadId,
    sourceAuditRunId: input.sourceAuditRunId?.trim() || current?.sourceAuditRunId,
    slug: slugify(name),
    niche: input.niche ?? current?.niche ?? "other",
    nicheSubtype: input.nicheSubtype?.trim() || current?.nicheSubtype,
    city: input.city?.trim() || current?.city || "Unknown",
    country,
    timezone: input.timezone?.trim() || current?.timezone || defaultTimezone(country),
    currency: input.currency ?? current?.currency ?? defaultCurrency(country),
    packageTier: input.packageTier ?? current?.packageTier ?? "starter",
    status: input.status ?? current?.status ?? "active",
    targetCustomer: input.targetCustomer?.trim() || current?.targetCustomer,
    brandVoice: input.brandVoice?.trim() || current?.brandVoice,
    keyCompetitors,
    competitors: input.competitors !== undefined ? input.competitors : current?.competitors ?? [],
    businessGoals: input.businessGoals?.trim() || current?.businessGoals,
    knownConstraints: input.knownConstraints?.trim() || current?.knownConstraints,
    activePlatforms,
    otherPlatformLabel: input.otherPlatformLabel?.trim() || current?.otherPlatformLabel,
    contactName: input.contactName?.trim() || current?.contactName,
    contactPhone: input.contactPhone?.trim() || current?.contactPhone,
    contactEmail: input.contactEmail?.trim() || current?.contactEmail,
    whatsappNumber: input.whatsappNumber?.trim() || current?.whatsappNumber,
    instagramHandle: input.instagramHandle?.trim() || current?.instagramHandle,
    websiteUrl: input.websiteUrl?.trim() || current?.websiteUrl,
    metaAccessToken: input.metaAccessToken?.trim() || current?.metaAccessToken,
    metaAdAccountId: input.metaAdAccountId?.trim() || current?.metaAdAccountId,
    metaIgUserId: input.metaIgUserId?.trim() || current?.metaIgUserId,
    gbpAccountId: input.gbpAccountId?.trim() || current?.gbpAccountId,
    gbpLocationId: input.gbpLocationId?.trim() || current?.gbpLocationId,
    gbpPlaceId: input.gbpPlaceId?.trim() || current?.gbpPlaceId,
    gbpLocationName: input.gbpLocationName?.trim() || current?.gbpLocationName,
    googleOAuthRefreshToken: input.googleOAuthRefreshToken?.trim() || current?.googleOAuthRefreshToken,
    gbpAccessToken: input.gbpAccessToken?.trim() || current?.gbpAccessToken,
    gbpTokenExpiry: input.gbpTokenExpiry ?? current?.gbpTokenExpiry,
    gbpPlaceRating: input.gbpPlaceRating ?? current?.gbpPlaceRating,
    gbpPlaceReviewCount: input.gbpPlaceReviewCount ?? current?.gbpPlaceReviewCount
  };
}

export async function getSession(email?: string): Promise<SessionResult> {
  const requestedEmail = normalizeEmail(email);
  if (!requestedEmail) {
    return { authenticated: false, accessDeniedReason: "No email was provided.", user: null };
  }

  const db = await readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === requestedEmail);
  const allowlisted = env.allowlistEmails.length === 0 || env.allowlistEmails.includes(requestedEmail);
  const active = Boolean(user && user.status === "active" && allowlisted);

  return {
    authenticated: active,
    accessDeniedReason: active ? null : "Email is not active or allowlisted.",
    user: active && user ? user : null
  };
}

export async function listClients() {
  const db = await readDb();
  return db.clients.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClient(clientId: string) {
  const db = await readDb();
  return db.clients.find((client) => client.id === clientId || client.slug === clientId) ?? null;
}

export async function getClientByPortalToken(token: string) {
  const db = await readDb();
  return db.clients.find((c) => c.portalToken === token && c.portalEnabled) ?? null;
}

export async function generatePortalToken(clientId: string): Promise<string> {
  const db = await readDb();
  const index = db.clients.findIndex((c) => c.id === clientId);
  if (index === -1) throw new Error("Client not found");
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  db.clients[index] = { ...db.clients[index]!, portalToken: token, portalEnabled: true };
  await writeDb(db);
  return token;
}

export async function setPortalEnabled(clientId: string, enabled: boolean) {
  const db = await readDb();
  const index = db.clients.findIndex((c) => c.id === clientId);
  if (index === -1) throw new Error("Client not found");
  db.clients[index] = { ...db.clients[index]!, portalEnabled: enabled };
  await writeDb(db);
}

export async function addCompetitor(clientId: string, competitor: { name: string; placeId: string; note?: string }) {
  const db = await readDb();
  const index = db.clients.findIndex((c) => c.id === clientId);
  if (index === -1) throw new Error("Client not found");
  const existing = db.clients[index]!.competitors ?? [];
  if (existing.some((c) => c.placeId === competitor.placeId)) return existing;
  const newCompetitor = { id: `comp_${Date.now()}`, ...competitor };
  db.clients[index] = { ...db.clients[index]!, competitors: [...existing, newCompetitor] };
  await writeDb(db);
  return db.clients[index]!.competitors;
}

export async function saveDeepAnalysis(clientId: string, analysis: DeepAnalysis) {
  const db = await readDb();
  const index = db.clients.findIndex((c) => c.id === clientId);
  if (index === -1) throw new Error("Client not found");
  db.clients[index] = { ...db.clients[index]!, deepAnalysis: analysis };
  await writeDb(db);
}

export async function createClient(input: ClientInput) {
  const db = await readDb();
  const normalized = normalizeClientInput(input);
  const now = new Date().toISOString();
  const slugBase = normalized.slug || id("client");
  const duplicateSlugCount = db.clients.filter((client) => client.slug === slugBase || client.slug.startsWith(`${slugBase}-`)).length;
  const client: Client = {
    id: id("client"),
    ...normalized,
    slug: duplicateSlugCount ? `${slugBase}-${duplicateSlugCount + 1}` : slugBase,
    integrationStatus: integrationStatus(normalized),
    metaConnectedAt: normalized.metaAccessToken || normalized.metaAdAccountId || normalized.metaIgUserId ? now : undefined,
    gbpConnectedAt: normalized.gbpAccountId || normalized.gbpLocationId ? now : undefined,
    createdAt: now,
    updatedAt: now
  };

  db.clients.unshift(client);
  db.activity_logs.unshift({
    id: id("log"),
    actorId: normalizeEmail() || "system@growingmonk.com",
    action: "client.created",
    entityType: "clients",
    entityId: client.id,
    createdAt: now
  });
  await writeDb(db);
  return client;
}

export async function updateClient(clientId: string, input: ClientInput) {
  const db = await readDb();
  const index = db.clients.findIndex((client) => client.id === clientId || client.slug === clientId);
  if (index === -1) return null;

  const current = db.clients[index];
  const normalized = normalizeClientInput(input, current);
  const now = new Date().toISOString();
  const client: Client = {
    ...current,
    ...normalized,
    slug: current.slug,
    integrationStatus: integrationStatus(normalized, current.integrationStatus),
    metaConnectedAt: normalized.metaAccessToken || normalized.metaAdAccountId || normalized.metaIgUserId ? current.metaConnectedAt ?? now : undefined,
    gbpConnectedAt: normalized.gbpAccountId || normalized.gbpLocationId ? current.gbpConnectedAt ?? now : undefined,
    updatedAt: now
  };

  db.clients[index] = client;
  await writeDb(db);
  return client;
}

export async function updateClientIntegrations(clientId: string, input: IntegrationInput) {
  const db = await readDb();
  const index = db.clients.findIndex((client) => client.id === clientId || client.slug === clientId);
  if (index === -1) return null;
  const current = db.clients[index];
  const now = new Date().toISOString();
  const next: Client = {
    ...current,
    metaAccessToken: input.metaAccessToken?.trim() || undefined,
    metaAdAccountId: input.metaAdAccountId?.trim() || undefined,
    metaIgUserId: input.metaIgUserId?.trim() || undefined,
    gbpAccountId: input.gbpAccountId?.trim() || undefined,
    gbpLocationId: input.gbpLocationId?.trim() || undefined,
    gbpPlaceId: input.gbpPlaceId?.trim() || undefined,
    updatedAt: now
  };
  const nextIntegrationStatus = integrationStatus(next, current.integrationStatus);
  next.integrationStatus = nextIntegrationStatus;
  next.metaConnectedAt = nextIntegrationStatus.meta === "connected" ? current.metaConnectedAt ?? now : undefined;
  next.gbpConnectedAt = nextIntegrationStatus.gbp === "connected" ? current.gbpConnectedAt ?? now : undefined;
  db.clients[index] = next;
  await writeDb(db);
  return next;
}

export async function saveGoogleBusinessConnection(clientId: string, input: {
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
  accountId?: string;
  locationId?: string;
  placeId?: string;
  locationName?: string;
  placeRating?: number;
  placeReviewCount?: number;
}) {
  const db = await readDb();
  const index = db.clients.findIndex((client) => client.id === clientId || client.slug === clientId);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const current = db.clients[index];
  const isFullyConnected = Boolean(input.accountId && input.locationId);
  const next: Client = {
    ...current,
    gbpAccountId: input.accountId || current.gbpAccountId,
    gbpLocationId: input.locationId || current.gbpLocationId,
    gbpPlaceId: input.placeId || current.gbpPlaceId,
    gbpLocationName: input.locationName || current.gbpLocationName,
    googleOAuthRefreshToken: input.refreshToken || current.googleOAuthRefreshToken,
    gbpAccessToken: input.accessToken || current.gbpAccessToken,
    gbpTokenExpiry: input.tokenExpiry ?? current.gbpTokenExpiry,
    gbpPlaceRating: input.placeRating ?? current.gbpPlaceRating,
    gbpPlaceReviewCount: input.placeReviewCount ?? current.gbpPlaceReviewCount,
    gbpConnectedAt: isFullyConnected ? now : current.gbpConnectedAt,
    integrationStatus: {
      meta: current.integrationStatus?.meta ?? "not_connected",
      gbp: isFullyConnected ? "connected" : (current.integrationStatus?.gbp ?? "not_connected"),
      lastMetaError: current.integrationStatus?.lastMetaError
    },
    updatedAt: now
  };
  db.clients[index] = next;
  await writeDb(db);
  return next;
}

export async function disconnectGoogleBusiness(clientId: string) {
  const db = await readDb();
  const index = db.clients.findIndex((client) => client.id === clientId || client.slug === clientId);
  if (index === -1) return null;
  const current = db.clients[index];
  const now = new Date().toISOString();
  const next: Client = {
    ...current,
    gbpAccountId: undefined,
    gbpLocationId: undefined,
    gbpPlaceId: undefined,
    gbpLocationName: undefined,
    googleOAuthRefreshToken: undefined,
    gbpAccessToken: undefined,
    gbpTokenExpiry: undefined,
    gbpPlaceRating: undefined,
    gbpPlaceReviewCount: undefined,
    gbpConnectedAt: undefined,
    integrationStatus: {
      meta: current.integrationStatus?.meta ?? "not_connected",
      gbp: "not_connected",
      lastMetaError: current.integrationStatus?.lastMetaError
    },
    updatedAt: now
  };
  db.clients[index] = next;
  await writeDb(db);
  return next;
}

export async function setIntegrationError(clientId: string, provider: "meta" | "gbp", error: string) {
  const db = await readDb();
  const index = db.clients.findIndex((client) => client.id === clientId || client.slug === clientId);
  if (index === -1) return null;
  const current = db.clients[index];
  db.clients[index] = {
    ...current,
    integrationStatus: {
      meta: provider === "meta" ? "error" : current.integrationStatus?.meta ?? "not_connected",
      gbp: provider === "gbp" ? "error" : current.integrationStatus?.gbp ?? "not_connected",
      lastMetaError: provider === "meta" ? error : current.integrationStatus?.lastMetaError,
      lastGbpError: provider === "gbp" ? error : current.integrationStatus?.lastGbpError
    },
    updatedAt: new Date().toISOString()
  };
  await writeDb(db);
  return db.clients[index];
}

export async function deleteClient(clientId: string) {
  const db = await readDb();
  const client = db.clients.find((item) => item.id === clientId || item.slug === clientId);
  if (!client) return null;
  db.clients = db.clients.filter((item) => item.id !== client.id);
  db.weekly_briefs = db.weekly_briefs.filter((brief) => brief.clientId !== client.id);
  await writeDb(db);
  return client;
}

export async function saveWeeklyBrief(clientId: string, brief: WeeklyBrief) {
  const db = await readDb();
  const client = db.clients.find((item) => item.id === clientId || item.slug === clientId);
  if (!client) return null;
  db.weekly_briefs = db.weekly_briefs.filter((item) => item.id !== brief.id);
  db.weekly_briefs.unshift({ ...brief, clientId: client.id });
  await writeDb(db);
  return brief;
}

export async function getCurrentBrief(clientId: string) {
  const db = await readDb();
  const client = db.clients.find((item) => item.id === clientId || item.slug === clientId);
  if (!client) return null;
  return db.weekly_briefs
    .filter((brief) => brief.clientId === client.id)
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate) || b.syncedAt.localeCompare(a.syncedAt))[0] ?? null;
}

export async function listBriefHistory(clientId: string, limit = 8) {
  const db = await readDb();
  const client = db.clients.find((item) => item.id === clientId || item.slug === clientId);
  if (!client) return [];
  return db.weekly_briefs
    .filter((brief) => brief.clientId === client.id)
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate) || b.syncedAt.localeCompare(a.syncedAt))
    .slice(0, limit);
}

export async function getDashboardClients() {
  const clients = await listClients();
  const db = await readDb();
  return clients.map((client) => {
    const latestBrief = db.weekly_briefs
      .filter((brief) => brief.clientId === client.id)
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate) || b.syncedAt.localeCompare(a.syncedAt))[0];
    const hasIntegrations = Boolean(client.metaAccessToken || client.metaIgUserId || client.metaAdAccountId || client.gbpAccountId || client.gbpLocationId);
    return {
      client,
      latestBrief,
      syncStatus: latestBrief ? "synced" as const : hasIntegrations ? "needs_sync" as const : "no_integrations" as const
    };
  });
}

export async function getAgencyStats() {
  const db = await readDb();
  const activeClients = db.clients.filter((c) => c.status === "active");
  const pausedClients = db.clients.filter((c) => c.status === "paused");
  const churnedClients = db.clients.filter((c) => c.status === "churned");

  const tiers: Record<string, number> = {};
  for (const c of db.clients) {
    tiers[c.packageTier] = (tiers[c.packageTier] ?? 0) + 1;
  }

  // Latest brief per active client
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  let totalAdSpend = 0;
  let totalLeads = 0;
  let totalReach = 0;
  let roasSum = 0;
  let roasCount = 0;
  let totalNewReviews = 0;
  let totalUnreplied = 0;
  let highAlertCount = 0;
  let clientsNeedingSync = 0;
  let clientsWithHighAlerts: { id: string; name: string; alerts: string[] }[] = [];
  let topByRoas: { id: string; name: string; roas: number } | null = null;
  let topByReach: { id: string; name: string; reach: number } | null = null;
  let topByLeads: { id: string; name: string; leads: number } | null = null;

  for (const client of activeClients) {
    const latestBrief = db.weekly_briefs
      .filter((b) => b.clientId === client.id)
      .sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))[0];

    const hasIntegrations = Boolean(
      client.metaAccessToken || client.metaIgUserId || client.gbpAccountId || client.googleAdsCustomerId
    );
    if (hasIntegrations && (!latestBrief || latestBrief.syncedAt < cutoff)) {
      clientsNeedingSync++;
    }

    if (!latestBrief) continue;

    const m = latestBrief.metrics;
    totalAdSpend += m.totalAdSpend;
    totalLeads += m.totalLeads;
    totalReach += m.avgInstagramReach;
    if (m.blendedRoas > 0) { roasSum += m.blendedRoas; roasCount++; }
    totalNewReviews += m.newReviewCount;
    totalUnreplied += m.unrepliedReviewCount;

    const highAlerts = latestBrief.brief.alertFlags.filter((f) => f.severity === "high");
    highAlertCount += highAlerts.length;
    if (highAlerts.length > 0) {
      clientsWithHighAlerts.push({ id: client.id, name: client.name, alerts: highAlerts.map((a) => a.message) });
    }

    if (!topByRoas || m.blendedRoas > topByRoas.roas) topByRoas = { id: client.id, name: client.name, roas: m.blendedRoas };
    if (!topByReach || m.avgInstagramReach > topByReach.reach) topByReach = { id: client.id, name: client.name, reach: m.avgInstagramReach };
    if (!topByLeads || m.totalLeads > topByLeads.leads) topByLeads = { id: client.id, name: client.name, leads: m.totalLeads };
  }

  // Lead funnel across all clients
  const leadsByOutcome: Record<string, number> = {};
  for (const l of db.lead_logs) {
    leadsByOutcome[l.outcome] = (leadsByOutcome[l.outcome] ?? 0) + 1;
  }

  return {
    clients: {
      active: activeClients.length,
      paused: pausedClients.length,
      churned: churnedClients.length,
      total: db.clients.length,
      tiers,
      needingSync: clientsNeedingSync,
    },
    thisWeek: {
      totalAdSpend,
      totalLeads,
      avgReach: activeClients.length > 0 ? Math.round(totalReach / activeClients.length) : 0,
      avgRoas: roasCount > 0 ? roasSum / roasCount : 0,
      totalNewReviews,
      totalUnreplied,
    },
    alerts: {
      highCount: highAlertCount,
      clients: clientsWithHighAlerts,
    },
    topPerformers: {
      roas: topByRoas,
      reach: topByReach,
      leads: topByLeads,
    },
    leadFunnel: leadsByOutcome,
  };
}

export async function getDbSummary() {
  const db = await readDb();
  return {
    provider: db.meta.provider,
    counts: {
      users: db.users.length,
      clients: db.clients.length,
      weekly_briefs: db.weekly_briefs.length,
      lead_logs: db.lead_logs.length,
      activity_logs: db.activity_logs.length
    },
    updatedAt: db.meta.updatedAt
  };
}

// ─── Lead Logs ────────────────────────────────────────────────────────────────

export async function listLeads(clientId: string): Promise<LeadLog[]> {
  const db = await readDb();
  const client = db.clients.find((c) => c.id === clientId || c.slug === clientId);
  if (!client) return [];
  return db.lead_logs
    .filter((l) => l.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLead(
  clientId: string,
  input: { name?: string; phone?: string; sourceCampaign?: string; note?: string; leadDate?: string }
): Promise<LeadLog | null> {
  const db = await readDb();
  const client = db.clients.find((c) => c.id === clientId || c.slug === clientId);
  if (!client) return null;
  const now = new Date().toISOString();
  const lead: LeadLog = {
    id: id("lead"),
    clientId: client.id,
    name: input.name?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    sourceCampaign: input.sourceCampaign?.trim() || undefined,
    note: input.note?.trim() || undefined,
    outcome: "new",
    leadDate: input.leadDate || now.slice(0, 10),
    updatedAt: now,
    createdAt: now,
  };
  db.lead_logs.unshift(lead);
  await writeDb(db);
  return lead;
}

export async function updateLeadOutcome(
  clientId: string,
  leadId: string,
  outcome: LeadOutcome,
  note?: string
): Promise<LeadLog | null> {
  const db = await readDb();
  const client = db.clients.find((c) => c.id === clientId || c.slug === clientId);
  if (!client) return null;
  const index = db.lead_logs.findIndex((l) => l.id === leadId && l.clientId === client.id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  db.lead_logs[index] = {
    ...db.lead_logs[index]!,
    outcome,
    note: note?.trim() ?? db.lead_logs[index]!.note,
    updatedAt: now,
  };
  await writeDb(db);
  return db.lead_logs[index]!;
}

// ─── Review Request Logs ──────────────────────────────────────────────────────

export async function listReviewRequests(clientId: string): Promise<ReviewRequestLog[]> {
  const db = await readDb();
  const client = db.clients.find((c) => c.id === clientId || c.slug === clientId);
  if (!client) return [];
  return db.review_request_logs
    .filter((r) => r.clientId === client.id)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export async function wasRecentlyRequested(
  clientId: string,
  phone: string,
  withinDays = 30
): Promise<boolean> {
  const db = await readDb();
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const normalized = phone.replace(/\D/g, "");
  return db.review_request_logs.some(
    (r) =>
      r.clientId === clientId &&
      r.phone.replace(/\D/g, "") === normalized &&
      r.sentAt >= cutoff
  );
}

export async function logReviewRequest(
  clientId: string,
  phone: string,
  reviewLink: string,
  customerName?: string
): Promise<ReviewRequestLog> {
  const db = await readDb();
  const now = new Date().toISOString();
  const entry: ReviewRequestLog = {
    id: id("rrl"),
    clientId,
    phone,
    customerName,
    reviewLink,
    sentAt: now,
  };
  db.review_request_logs.unshift(entry);
  await writeDb(db);
  return entry;
}

// ─── Review Count Snapshots ───────────────────────────────────────────────────

export async function saveReviewCountSnapshot(
  clientId: string,
  count: number,
  rating: number
): Promise<void> {
  const db = await readDb();
  const today = new Date().toISOString().slice(0, 10);
  // One snapshot per client per day — update if already exists for today
  const existing = db.review_count_snapshots.findIndex(
    (s) => s.clientId === clientId && s.snapshotDate === today
  );
  const entry: ReviewCountSnapshot = { id: id("rcs"), clientId, count, rating, snapshotDate: today };
  if (existing !== -1) {
    db.review_count_snapshots[existing] = entry;
  } else {
    db.review_count_snapshots.unshift(entry);
  }
  // Keep last 90 snapshots per client
  const clientSnaps = db.review_count_snapshots.filter((s) => s.clientId === clientId);
  if (clientSnaps.length > 90) {
    const oldest = clientSnaps.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))[0];
    db.review_count_snapshots = db.review_count_snapshots.filter((s) => s.id !== oldest?.id);
  }
  await writeDb(db);
}

export async function getReviewCountHistory(clientId: string, weeks = 10): Promise<ReviewCountSnapshot[]> {
  const db = await readDb();
  return db.review_count_snapshots
    .filter((s) => s.clientId === clientId)
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
    .slice(-weeks);
}

// ─── Competitor snapshots ─────────────────────────────────────────────────────

export async function saveCompetitorSnapshot(
  clientId: string,
  competitorId: string,
  competitorName: string,
  count: number,
  rating: number
) {
  const db = await readDb();
  const today = new Date().toISOString().slice(0, 10);

  const existing = db.competitor_snapshots.findIndex(
    (s) => s.clientId === clientId && s.competitorId === competitorId && s.snapshotDate === today
  );

  const entry = {
    id: existing >= 0 ? db.competitor_snapshots[existing]!.id : id("cs"),
    clientId,
    competitorId,
    competitorName,
    count,
    rating,
    snapshotDate: today,
  };

  if (existing >= 0) {
    db.competitor_snapshots[existing] = entry;
  } else {
    db.competitor_snapshots.push(entry);
  }

  // Keep 90 days per competitor
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  db.competitor_snapshots = db.competitor_snapshots.filter(
    (s) => s.snapshotDate >= cutoffStr
  );

  await writeDb(db);
}

export async function getCompetitorHistory(
  clientId: string,
  competitorId: string,
  days = 30
): Promise<import("@/types").CompetitorSnapshot[]> {
  const db = await readDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return db.competitor_snapshots
    .filter(
      (s) =>
        s.clientId === clientId &&
        s.competitorId === competitorId &&
        s.snapshotDate >= cutoffStr
    )
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
}

export async function getAllCompetitorSnapshots(
  clientId: string
): Promise<import("@/types").CompetitorSnapshot[]> {
  const db = await readDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return db.competitor_snapshots
    .filter((s) => s.clientId === clientId && s.snapshotDate >= cutoffStr)
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
}

export { resetDb };
