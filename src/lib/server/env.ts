import type { DbProvider } from "@/types";

function csv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function dbProvider(value: string | undefined): DbProvider {
  const normalized = (value ?? "json").toLowerCase();
  if (normalized === "firestore") return "firestore";
  if (normalized === "local") return "local";
  return "json";
}

export const env = {
  appEnv: process.env.APP_ENV ?? "development",
  authRequired: (process.env.AUTH_REQUIRED ?? "false").toLowerCase() === "true",
  dbProvider: dbProvider(process.env.DB_PROVIDER),
  localDbPath: process.env.LOCAL_DB_PATH ?? ".data/client-hub.json",
  allowlistEmails: csv(process.env.ALLOWLIST_EMAILS),
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION ?? "asia-south1",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID ?? "client-hub",
  monkAuditDbPath: process.env.MONKAUDIT_DB_PATH ?? "../monkaudit-v2/.data/growingmonk-sales-os.json",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiApiKeySecret: process.env.GEMINI_API_KEY_SECRET ?? "gemini-api-key",
  geminiProModel: process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro",
  geminiFlashModel: process.env.GEMINI_FLASH_MODEL ?? "gemini-2.5-flash",
  geminiLiteModel: process.env.GEMINI_LITE_MODEL ?? "gemini-2.5-flash-lite",
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  defaultGbpPlaceId: process.env.DEFAULT_GBP_PLACE_ID ?? "ChIJuVcVlxeTyzsRv7FDAzZhqpE",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  claudeSonnetModel: process.env.CLAUDE_SONNET_MODEL ?? "claude-sonnet-4-6",
  claudeHaikuModel: process.env.CLAUDE_HAIKU_MODEL ?? "claude-haiku-4-5-20251001",
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3001",
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappWeeklyReportTemplate: process.env.WHATSAPP_WEEKLY_REPORT_TEMPLATE ?? "weekly_report",
  whatsappReviewRequestTemplate: process.env.WHATSAPP_REVIEW_REQUEST_TEMPLATE ?? "review_request",
  schedulerSecret: process.env.SCHEDULER_SECRET ?? "",
  googleAdsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
};
