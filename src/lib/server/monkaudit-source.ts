import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Client, Platform, SourceAuditOption, SourceAuditPrefill } from "@/types";
import { env } from "./env";

type MonkAuditLead = {
  id: string;
  businessName?: string;
  city?: string;
  country?: string;
  area?: string;
  category?: string;
  website?: string;
  instagramUrl?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  salesContext?: string;
  salesStage?: string;
  status?: string;
  wonNotes?: string;
  notes?: string;
};

type MonkAuditRun = {
  id: string;
  leadId: string;
  businessName?: string;
  city?: string;
  country?: string;
  area?: string;
  category?: string;
  auditStatus?: string;
  status?: string;
  score?: number;
  rating?: number;
  reviewCount?: number;
  hasWebsite?: boolean;
  hasWhatsApp?: boolean;
  hasInstagram?: boolean;
  hasGoogleBusinessProfile?: boolean;
  sourceLinks?: {
    website?: string;
    instagramUrl?: string;
  };
  discoveredData?: Record<string, unknown>;
  finalDataUsed?: Record<string, unknown>;
  lastUpdated?: string;
};

type MonkAuditDb = {
  leads?: MonkAuditLead[];
  audit_runs?: MonkAuditRun[];
};

function resolveSourcePath() {
  return path.resolve(process.cwd(), env.monkAuditDbPath);
}

export async function listSourceAudits(query = ""): Promise<SourceAuditOption[]> {
  const db = await readMonkAuditDb();
  const leads = new Map((db.leads ?? []).map((lead) => [lead.id, lead]));
  const normalizedQuery = query.trim().toLowerCase();

  return (db.audit_runs ?? [])
    .map((audit) => toSourceOption(audit, leads.get(audit.leadId)))
    .filter((option) => {
      if (!normalizedQuery) return true;
      return [option.label, option.city, option.category, option.auditStatus, option.salesStage]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12);
}

async function readMonkAuditDb(): Promise<MonkAuditDb> {
  try {
    const raw = await readFile(resolveSourcePath(), "utf8");
    return JSON.parse(raw) as MonkAuditDb;
  } catch {
    return { leads: [], audit_runs: [] };
  }
}

function toSourceOption(audit: MonkAuditRun, lead?: MonkAuditLead): SourceAuditOption {
  const name = text(audit.businessName) || text(lead?.businessName) || "Unnamed audit";
  const category = text(audit.category) || text(lead?.category) || "Other";
  const city = bestCity(audit, lead);
  const country = toCountry(text(audit.country) || text(lead?.country));
  const discovered = audit.finalDataUsed || audit.discoveredData || {};
  const googleReviews = objectAt(discovered, "googleReviews");
  const instagram = objectAt(discovered, "instagram");
  const competitors = Array.isArray(discovered.competitors) ? discovered.competitors : [];
  const competitorNames = competitors
    .map((item) => typeof item === "object" && item ? text((item as { name?: unknown }).name) : "")
    .filter(Boolean)
    .slice(0, 5);
  const phone = text(googleReviews.phone) || text(lead?.phone);
  const website = text(lead?.website) || text(audit.sourceLinks?.website) || text(googleReviews.website);
  const instagramUrl = text(lead?.instagramUrl) || text(audit.sourceLinks?.instagramUrl) || text(instagram.url);
  const platformSet = new Set<Platform>();
  if (audit.hasInstagram || instagramUrl) platformSet.add("instagram");
  if (audit.hasWebsite || website) platformSet.add("google_business");
  if (audit.hasGoogleBusinessProfile) platformSet.add("google_business");
  if (audit.hasWhatsApp || phone) platformSet.add("whatsapp");
  if (platformSet.size === 0) platformSet.add("instagram");

  const prefill: SourceAuditPrefill = {
    sourceLeadId: audit.leadId,
    sourceAuditRunId: audit.id,
    name,
    niche: toNiche(category),
    nicheSubtype: category,
    city,
    country,
    timezone: country === "US" ? "America/New_York" : "Asia/Kolkata",
    currency: country === "US" ? "USD" : "INR",
    packageTier: "starter",
    status: "active",
    contactName: text(lead?.contactName) || undefined,
    contactPhone: phone,
    contactEmail: text(lead?.email) || undefined,
    whatsappNumber: phone,
    instagramHandle: instagramHandle(instagramUrl) || text(instagram.handle) || undefined,
    websiteUrl: website || undefined,
    targetCustomer: targetCustomerFrom(category, city),
    brandVoice: "Professional, local, trust-first",
    keyCompetitors: competitorNames,
    businessGoals: businessGoalsFrom(audit, lead),
    knownConstraints: constraintsFrom(audit),
    activePlatforms: Array.from(platformSet)
  };

  return {
    id: audit.id,
    label: name,
    city,
    category,
    auditStatus: text(audit.auditStatus) || text(audit.status) || "Unknown",
    salesStage: lead?.salesStage || lead?.status,
    score: audit.score,
    rating: audit.rating,
    reviewCount: audit.reviewCount,
    updatedAt: audit.lastUpdated || new Date(0).toISOString(),
    prefill
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function objectAt(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function bestCity(audit: MonkAuditRun, lead?: MonkAuditLead) {
  const rawCity = text(audit.city) || text(lead?.city) || text(audit.area) || text(lead?.area);
  if (/chandanagar|chanda nagar/i.test(rawCity)) return "Hyderabad";
  return rawCity || "Unknown";
}

function toCountry(value: string): Client["country"] {
  if (/us|usa|united states/i.test(value)) return "US";
  return "IN";
}

function toNiche(category: string): Client["niche"] {
  const value = category.toLowerCase();
  if (value.includes("salon") || value.includes("beauty") || value.includes("hair")) return "salon";
  if (value.includes("restaurant") || value.includes("food") || value.includes("cafe")) return "restaurant";
  if (value.includes("clinic") || value.includes("dental") || value.includes("health")) return "clinic";
  if (value.includes("coach") || value.includes("trainer")) return "coach";
  if (value.includes("service")) return "local_service";
  return "other";
}

function instagramHandle(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("instagram.com")) return "";
    return parsed.pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    return "";
  }
}

function targetCustomerFrom(category: string, city: string) {
  const lower = category.toLowerCase();
  if (lower.includes("salon") || lower.includes("beauty")) return `Local beauty and grooming customers around ${city}`;
  return `Local customers around ${city}`;
}

function businessGoalsFrom(audit: MonkAuditRun, lead?: MonkAuditLead) {
  const parts = [
    audit.score ? `Improve growth readiness from audit score ${audit.score}.` : "",
    audit.rating && audit.reviewCount ? `Convert strong Google proof (${audit.rating} rating, ${audit.reviewCount} reviews) into tracked enquiries.` : "",
    text(lead?.wonNotes) || text(lead?.salesContext) || text(lead?.notes)
  ].filter(Boolean);
  return parts.join(" ");
}

function constraintsFrom(audit: MonkAuditRun) {
  const discovered = audit.finalDataUsed || audit.discoveredData || {};
  const limitations = [
    ...arrayOfText(discovered.limitations),
    ...arrayOfText(objectAt(discovered, "instagram").limitations)
  ];
  return limitations.slice(0, 4).join(" ");
}

function arrayOfText(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}
