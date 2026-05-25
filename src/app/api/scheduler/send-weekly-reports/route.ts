import { NextResponse } from "next/server";
import { listClients, getCurrentBrief } from "@/lib/server/repositories";
import { sendWhatsAppTemplate, bodyParams, isWhatsAppConfigured } from "@/lib/whatsapp/api";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protect with a shared secret so only Cloud Scheduler / internal crons can call this.
// Set SCHEDULER_SECRET in env. If unset, endpoint is disabled.
function isAuthorized(request: Request): boolean {
  if (!env.schedulerSecret) return false;
  const auth = request.headers.get("x-scheduler-secret") ?? "";
  return auth === env.schedulerSecret;
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${Math.round(amount).toLocaleString("en-IN")}`;
}

type ReportResult = {
  clientId: string;
  clientName: string;
  status: "sent" | "skipped" | "error";
  reason?: string;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "WhatsApp Business API is not configured." }, { status: 503 });
  }

  const clients = await listClients();
  const eligible = clients.filter(
    (c) => c.autoWeeklyReport && c.status === "active" && (c.whatsappNumber || c.contactPhone)
  );

  const results: ReportResult[] = [];

  for (const client of eligible) {
    const phone = (client.whatsappNumber || client.contactPhone)!;
    try {
      const brief = await getCurrentBrief(client.id);
      if (!brief) {
        results.push({ clientId: client.id, clientName: client.name, status: "skipped", reason: "No brief found" });
        continue;
      }

      const { metrics, brief: ai } = brief;
      await sendWhatsAppTemplate({
        to: phone,
        templateName: env.whatsappWeeklyReportTemplate,
        languageCode: "en",
        components: [bodyParams([
          client.name,
          String(metrics.totalPostsThisWeek),
          String(Math.round(metrics.avgInstagramReach)),
          String(metrics.newReviewCount),
          formatCurrency(metrics.totalAdSpend, client.currency),
          String(metrics.totalLeads),
          ai.topInsight.slice(0, 200),
        ])],
      });

      results.push({ clientId: client.id, clientName: client.name, status: "sent" });
    } catch (error) {
      results.push({
        clientId: client.id,
        clientName: client.name,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    summary: { total: eligible.length, sent, skipped: results.filter((r) => r.status === "skipped").length, errors },
    results,
  });
}
