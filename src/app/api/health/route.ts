import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { getDbSummary } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getDbSummary().catch(() => null);
  return NextResponse.json({
    ok: true,
    app: "growingmonk-client-hub",
    phase: "mvp_auto_sync",
    authRequired: env.authRequired,
    database: {
      provider: env.dbProvider,
      localPath: env.localDbPath,
      firestore: {
        ready: env.dbProvider === "firestore",
        projectId: env.googleCloudProject || "not configured",
        databaseId: env.firestoreDatabaseId,
        note: "DB provider switch supports local JSON and Firestore state document."
      },
      summary
    },
    cloud: {
      projectId: env.googleCloudProject || "not configured",
      location: env.googleCloudLocation,
      gemini: env.geminiApiKey ? "API key configured" : env.geminiApiKeySecret ? `Secret Manager fallback: ${env.geminiApiKeySecret}` : "ADC / Vertex AI",
      models: {
        pro: env.geminiProModel,
        flash: env.geminiFlashModel,
        lite: env.geminiLiteModel
      }
    }
  });
}
