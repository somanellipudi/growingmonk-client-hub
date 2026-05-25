"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Info, Sparkles, Search, Save } from "lucide-react";
import { Button } from "@/components/ui";
import type { Client, Platform, SourceAuditOption, SourceAuditPrefill } from "@/types";

function parseCompetitorLines(raw: string): { id: string; name: string; placeId: string; note?: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const noteMatch = line.match(/\(([^)]+)\)\s*$/);
      const note = noteMatch?.[1];
      const cleaned = noteMatch ? line.slice(0, noteMatch.index).trim() : line;
      const colonIdx = cleaned.indexOf(":");
      if (colonIdx < 0) return null;
      const name = cleaned.slice(0, colonIdx).trim();
      const placeId = cleaned.slice(colonIdx + 1).trim();
      if (!name || !placeId) return null;
      return { id: `comp_${name.toLowerCase().replace(/\W+/g, "_")}`, name, placeId, note };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

type PlaceLookupResult = {
  name: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  placeId: string;
  address: string;
};

const platformOptions: Array<{ value: Platform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "google_business", label: "Google Business" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" }
];

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Partial<Client> | SourceAuditPrefill | undefined>(client);
  const integrationDraft = draft as Partial<Client> | undefined;
  const [formKey, setFormKey] = useState(client?.id ?? "new-client");
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(client?.activePlatforms ?? ["instagram"]);

  function handleQuickFill(data: Partial<Client>) {
    setDraft((prev) => ({ ...prev, ...data } as Partial<Client>));
    setFormKey((prev) => prev + "-qf");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      niche: String(form.get("niche") || "other"),
      nicheSubtype: String(form.get("nicheSubtype") || ""),
      city: String(form.get("city") || ""),
      country: String(form.get("country") || "IN"),
      timezone: String(form.get("timezone") || ""),
      currency: String(form.get("currency") || "INR"),
      packageTier: String(form.get("packageTier") || "starter"),
      status: String(form.get("status") || "active"),
      sourceLeadId: String(form.get("sourceLeadId") || ""),
      sourceAuditRunId: String(form.get("sourceAuditRunId") || ""),
      contactName: String(form.get("contactName") || ""),
      contactPhone: String(form.get("contactPhone") || ""),
      contactEmail: String(form.get("contactEmail") || ""),
      whatsappNumber: String(form.get("whatsappNumber") || ""),
      autoWeeklyReport: form.get("autoWeeklyReport") === "on",
      instagramHandle: String(form.get("instagramHandle") || ""),
      websiteUrl: String(form.get("websiteUrl") || ""),
      targetCustomer: String(form.get("targetCustomer") || ""),
      brandVoice: String(form.get("brandVoice") || ""),
      keyCompetitors: String(form.get("keyCompetitors") || ""),
      competitors: parseCompetitorLines(String(form.get("competitorTrackingRaw") || "")),
      businessGoals: String(form.get("businessGoals") || ""),
      knownConstraints: String(form.get("knownConstraints") || ""),
      otherPlatformLabel: String(form.get("otherPlatformLabel") || ""),
      metaAccessToken: String(form.get("metaAccessToken") || ""),
      metaAdAccountId: String(form.get("metaAdAccountId") || ""),
      metaIgUserId: String(form.get("metaIgUserId") || ""),
      googleAdsCustomerId: String(form.get("googleAdsCustomerId") || ""),
      googleAdsManagerId: String(form.get("googleAdsManagerId") || ""),
      gbpAccountId: String(form.get("gbpAccountId") || ""),
      gbpLocationId: String(form.get("gbpLocationId") || ""),
      gbpPlaceId: String(form.get("gbpPlaceId") || ""),
      activePlatforms
    };

    try {
      const response = await fetch(client ? `/api/clients/${client.id}` : "/api/clients", {
        method: client ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Unable to save client.");
        return;
      }
      router.push(`/clients/${result.client.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(platform: Platform) {
    setActivePlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  }

  return (
    <form key={formKey} onSubmit={submit} className="grid gap-5">
      {!client ? (
        <SourceAuditPrefillPanel
          onSelect={(prefill) => {
            setDraft(prefill);
            setActivePlatforms(prefill.activePlatforms.length ? prefill.activePlatforms : ["instagram"]);
            setFormKey(prefill.sourceAuditRunId);
          }}
        />
      ) : null}

      <QuickFillBar onFill={handleQuickFill} />

      <input type="hidden" name="sourceLeadId" defaultValue={draft?.sourceLeadId ?? ""} />
      <input type="hidden" name="sourceAuditRunId" defaultValue={draft?.sourceAuditRunId ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client name" name="name" required defaultValue={draft?.name} />
        <Field label="City" name="city" required defaultValue={draft?.city} />
        <Select label="Niche" name="niche" defaultValue={draft?.niche ?? "other"} options={[
          ["salon", "Salon"],
          ["restaurant", "Restaurant"],
          ["ecommerce", "Ecommerce"],
          ["clinic", "Clinic"],
          ["coach", "Coach"],
          ["local_service", "Local service"],
          ["franchise", "Franchise"],
          ["other", "Other"]
        ]} />
        <Field label="Niche subtype" name="nicheSubtype" defaultValue={draft?.nicheSubtype} placeholder="Luxury salon, dental clinic, cloud kitchen..." />
        <Select label="Country" name="country" defaultValue={draft?.country ?? "IN"} options={[["IN", "India"], ["US", "United States"]]} />
        <Select label="Currency" name="currency" defaultValue={draft?.currency ?? "INR"} options={[["INR", "INR"], ["USD", "USD"]]} />
        <Field label="Timezone" name="timezone" defaultValue={draft?.timezone ?? "Asia/Kolkata"} />
        <Select label="Package tier" name="packageTier" defaultValue={draft?.packageTier ?? "starter"} options={[
          ["starter", "Starter"],
          ["growth", "Growth"],
          ["scale", "Scale"],
          ["custom", "Custom"]
        ]} />
        <Select label="Status" name="status" defaultValue={draft?.status ?? "active"} options={[
          ["active", "Active"],
          ["paused", "Paused"],
          ["churned", "Churned"]
        ]} />
      </div>

      <div className="border-t border-stoneLine pt-5">
        <h2 className="text-lg font-semibold text-ink">Platforms</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {platformOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => togglePlatform(option.value)}
              className={activePlatforms.includes(option.value)
                ? "border border-gm-orange bg-gm-orange-light px-3 py-2 text-sm font-semibold text-gm-orange"
                : "border border-stoneLine bg-white px-3 py-2 text-sm font-semibold text-muted"}
            >
              {option.label}
            </button>
          ))}
        </div>
        {activePlatforms.includes("other") ? (
          <div className="mt-4 max-w-xl">
            <Field
              label="Other platform name"
              name="otherPlatformLabel"
              defaultValue={draft?.otherPlatformLabel}
              placeholder="LinkedIn Ads, Pinterest, Justdial, Practo..."
              help="Use this when the channel is client-specific or not in the standard list. It will be saved on the client profile and included in AI context."
            />
          </div>
        ) : (
          <input type="hidden" name="otherPlatformLabel" value="" />
        )}
      </div>

      <div className="grid gap-4 border-t border-stoneLine pt-5 md:grid-cols-2">
        <Field label="Contact name" name="contactName" defaultValue={draft?.contactName} />
        <Field label="Contact phone" name="contactPhone" defaultValue={draft?.contactPhone} />
        <Field label="Contact email" name="contactEmail" defaultValue={draft?.contactEmail} />
        <Field label="WhatsApp number" name="whatsappNumber" defaultValue={draft?.whatsappNumber} />
        <label className="flex items-center gap-3 self-end pb-1 cursor-pointer">
          <input
            type="checkbox"
            name="autoWeeklyReport"
            defaultChecked={(draft as Partial<Client>)?.autoWeeklyReport ?? false}
            className="w-4 h-4 accent-gm-orange"
          />
          <span className="text-sm text-ink">Auto-send weekly report to client WhatsApp</span>
        </label>
        <Field label="Instagram handle" name="instagramHandle" defaultValue={draft?.instagramHandle} />
        <Field label="Website URL" name="websiteUrl" defaultValue={draft?.websiteUrl} />
      </div>

      <div className="grid gap-4 border-t border-stoneLine pt-5 md:grid-cols-2">
        <Textarea label="Target customer" name="targetCustomer" defaultValue={draft?.targetCustomer} />
        <Textarea label="Brand voice" name="brandVoice" defaultValue={draft?.brandVoice} />
        <Textarea label="Business goals" name="businessGoals" defaultValue={draft?.businessGoals} />
        <Textarea label="Known constraints" name="knownConstraints" defaultValue={draft?.knownConstraints} />
        <Textarea label="Key competitors" name="keyCompetitors" defaultValue={draft?.keyCompetitors?.join(", ")} placeholder="Comma separated" className="md:col-span-2" />
      </div>

      <div className="grid gap-5 border-t border-stoneLine pt-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Integrations</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Connect real data sources. Tokens are stored on the client record for this MVP.</p>
        </div>

        {/* Client onboarding message */}
        <ClientOnboardingMessage clientName={integrationDraft?.name ?? draft?.name ?? "the client"} />

        {/* META */}
        <div className="grid gap-0 border border-stoneLine">
          <div className="bg-ivory px-4 py-3 border-b border-stoneLine">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Meta (Instagram + Ads)</h3>
          </div>

          <SetupGuide title="How to set up Meta access" steps={[
            {
              label: "Ask the client to add you as a Partner in Meta Business Manager",
              detail: (
                <span>
                  Client goes to{" "}
                  <a href="https://business.facebook.com/settings/partners" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gm-orange underline">
                    business.facebook.com â†’ Settings â†’ Partners <ExternalLink size={11} />
                  </a>{" "}
                  â†’ click <strong>Add</strong> â†’ enter your Business Manager ID and request <strong>Manage ads + View performance</strong> access.
                </span>
              ),
            },
            {
              label: "Generate the User Access Token",
              detail: (
                <span>
                  Go to{" "}
                  <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gm-orange underline">
                    Meta Graph API Explorer <ExternalLink size={11} />
                  </a>
                  . Select your app â†’ click <strong>Generate Access Token</strong> â†’ tick these permissions:{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">pages_show_list</code>{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">pages_read_engagement</code>{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">instagram_basic</code>{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">instagram_manage_insights</code>{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">ads_read</code>. Then exchange for a{" "}
                  <a href="https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gm-orange underline">
                    long-lived token <ExternalLink size={11} />
                  </a>{" "}
                  (60-day) via the token exchange endpoint.
                </span>
              ),
            },
            {
              label: "Find the Ad Account ID",
              detail: (
                <span>
                  Open{" "}
                  <a href="https://adsmanager.facebook.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gm-orange underline">
                    Meta Ads Manager <ExternalLink size={11} />
                  </a>
                  . The account ID is in the top-left dropdown or in the URL â€” it starts with <strong>act_</strong>. Paste it exactly, e.g. <code className="bg-stoneLine px-1 text-[11px]">act_1234567890</code>.
                </span>
              ),
            },
            {
              label: "Find the Instagram Business Account ID",
              detail: (
                <span>
                  In Graph API Explorer, run:{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">/me/accounts</code> â†’ copy the Facebook Page ID â†’ then run{" "}
                  <code className="bg-stoneLine px-1 text-[11px]">/{"{PAGE_ID}"}?fields=instagram_business_account</code> â†’ copy the <strong>id</strong> value inside <code className="bg-stoneLine px-1 text-[11px]">instagram_business_account</code>. It starts with <strong>17841â€¦</strong>.
                </span>
              ),
            },
          ]} />

          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <MetaDiscoverPanel
                defaultToken={integrationDraft?.metaAccessToken}
                onSelect={(token, igId, adAccountId) => {
                  setDraft((prev) => ({
                    ...prev,
                    metaAccessToken: token,
                    metaIgUserId: igId,
                    metaAdAccountId: adAccountId,
                  } as Partial<Client>));
                  setFormKey((prev) => prev + "-md");
                }}
              />
            </div>
            <Field
              label="User Access Token"
              name="metaAccessToken"
              defaultValue={integrationDraft?.metaAccessToken}
              placeholder="Long-lived Meta token (60 days)"
              help="Paste token above and click Auto-discover, or enter manually. Needs pages_show_list + pages_read_engagement + ads_read."
            />
            <Field
              label="Ad Account ID"
              name="metaAdAccountId"
              defaultValue={integrationDraft?.metaAdAccountId}
              placeholder="act_XXXXXXXXX"
              help="Auto-filled by Discover, or find in Meta Ads Manager top-left. Always include act_ prefix."
            />
            <Field
              label="Instagram Business Account ID"
              name="metaIgUserId"
              defaultValue={integrationDraft?.metaIgUserId}
              placeholder="17841XXXXXXXXXX"
              help="From Graph API Explorer: /me/accounts â†’ get page ID â†’ /{PAGE_ID}?fields=instagram_business_account â†’ copy the id. Starts with 17841."
            />
            {client ? <IntegrationTestButton clientId={client.id} type="meta" /> : null}
          </div>
        </div>

        {/* GOOGLE ADS */}
        <div className="grid gap-0 border border-stoneLine">
          <div className="bg-ivory px-4 py-3 border-b border-stoneLine">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Google Ads</h3>
            <p className="text-xs text-muted mt-1">Uses the same Google OAuth token as GBP. Connect Google Business first, then add the Customer ID.</p>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <Field
              label="Customer ID"
              name="googleAdsCustomerId"
              defaultValue={integrationDraft?.googleAdsCustomerId}
              placeholder="123-456-7890"
              help="Found in Google Ads top bar, or Tools → Account Settings. Format: XXX-XXX-XXXX"
            />
            <Field
              label="Manager Account ID (MCC)"
              name="googleAdsManagerId"
              defaultValue={integrationDraft?.googleAdsManagerId}
              placeholder="123-456-7890 (optional)"
              help="Only needed if this client is managed via a Google Ads Manager account. Leave blank if the client has their own standalone Ads account."
            />
            {client ? <IntegrationTestButton clientId={client.id} type="google-ads" /> : null}
          </div>
        </div>

        {/* GOOGLE BUSINESS PROFILE */}
        <div className="grid gap-0 border border-stoneLine">
          <div className="bg-ivory px-4 py-3 border-b border-stoneLine flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Google Business Profile</h3>
            {client && integrationDraft?.googleOAuthRefreshToken
              ? <GBPConnectedHeader client={integrationDraft as Partial<Client>} clientId={client.id} />
              : null}
          </div>

          <SetupGuide title="How to set up Google Business access" steps={[
            {
              label: "Ask the client to add you as a Manager on their Google Business Profile",
              detail: (
                <span>
                  Client goes to{" "}
                  <a href="https://business.google.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gm-orange underline">
                    business.google.com <ExternalLink size={11} />
                  </a>{" "}
                  â†’ click on the listing â†’ <strong>Menu (â‹®) â†’ Business Profile settings â†’ Managers â†’ Add</strong> â†’ enter your Google account email and choose role <strong>Manager</strong>. They click Send Invite.
                </span>
              ),
            },
            {
              label: "Find the Google Place ID",
              detail: (
                <span>
                  Go to{" "}
                  <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gm-orange underline">
                    Google Place ID Finder <ExternalLink size={11} />
                  </a>{" "}
                  â†’ search for the business â†’ copy the Place ID (starts with <strong>ChIJâ€¦</strong>). Alternatively search on Google Maps, click the business, and look at the URL â€” it contains <code className="bg-stoneLine px-1 text-[11px]">cid=</code> or <code className="bg-stoneLine px-1 text-[11px]">place_id=</code>.
                </span>
              ),
            },
            {
              label: "Connect via OAuth (recommended) or enter IDs manually",
              detail: (
                <span>
                  Once the client has added you as Manager: paste the Place ID below, <strong>save the client first</strong>, then click <strong>Connect Google Business</strong>. The OAuth flow auto-fills the Account ID and Location ID. Manual IDs are only needed if OAuth is blocked.
                </span>
              ),
            },
          ]} />

          {/* GBP Discover panel â€” shown when not yet OAuth-connected */}
          {!integrationDraft?.googleOAuthRefreshToken && (
            <GbpDiscoverPanel
              clientId={client?.id}
              onSelect={(loc) => {
                setDraft((prev) => ({
                  ...prev,
                  gbpPlaceId: loc.placeId || (prev as Partial<Client>)?.gbpPlaceId,
                  gbpAccountId: loc.accountId,
                  gbpLocationId: loc.locationId,
                } as Partial<Client>));
                setFormKey((prev) => prev + "-gbp");
              }}
            />
          )}

          <div className="grid gap-4 p-4 md:grid-cols-2">
            {integrationDraft?.googleOAuthRefreshToken ? (
              <>
                <input type="hidden" name="gbpPlaceId" value={integrationDraft?.gbpPlaceId ?? ""} />
                <input type="hidden" name="gbpAccountId" value={integrationDraft?.gbpAccountId ?? ""} />
                <input type="hidden" name="gbpLocationId" value={integrationDraft?.gbpLocationId ?? ""} />
              </>
            ) : (
              <>
                <Field
                  label="Google Place ID"
                  name="gbpPlaceId"
                  defaultValue={integrationDraft?.gbpPlaceId}
                  placeholder="ChIJâ€¦"
                  help="Auto-filled by Discover, or paste from Google Maps URL. Starts with ChIJ."
                />
                <Field
                  label="Account ID"
                  name="gbpAccountId"
                  defaultValue={integrationDraft?.gbpAccountId}
                  placeholder="accounts/XXXXXXXXX"
                  help="Auto-filled by Discover or OAuth connect."
                />
                <Field
                  label="Location ID"
                  name="gbpLocationId"
                  defaultValue={integrationDraft?.gbpLocationId}
                  placeholder="locations/XXXXXXXXX"
                  help="Auto-filled by Discover or OAuth connect."
                />
              </>
            )}
            {client ? (
              <div className="flex flex-col items-start justify-end gap-2">
                {integrationDraft?.googleOAuthRefreshToken
                  ? <GBPDisconnectButton clientId={client.id} />
                  : (
                    <>
                      <GoogleBusinessOAuthButton clientId={client.id} />
                      <IntegrationTestButton clientId={client.id} type="gbp" />
                    </>
                  )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* COMPETITOR TRACKING */}
      <div className="grid gap-0 border border-stoneLine border-t-0">
        <div className="bg-ivory px-4 py-3 border-b border-stoneLine">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Competitor tracking</h3>
          <p className="text-xs text-muted mt-1">Add competitors with their Google Place IDs to track review growth daily. Each line: <code className="bg-white border border-stoneLine px-1">Name: ChIJâ€¦</code></p>
        </div>
        <div className="p-4">
          <Textarea
            label="Competitors (one per line)"
            name="competitorTrackingRaw"
            defaultValue={(draft as Partial<Client>)?.competitors
              ?.map((c) => c.note ? `${c.name}: ${c.placeId} (${c.note})` : `${c.name}: ${c.placeId}`)
              .join("\n") ?? ""}
            placeholder={"Rivals Salon: ChIJabc123...\nGlow Studio: ChIJxyz789... (main competitor)"}
            className="md:col-span-2 font-mono text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-stoneLine pt-5">
        <Button type="submit" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save client"}
        </Button>
        {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
      </div>
    </form>
  );
}

function GBPConnectedHeader({ client }: { client: Partial<Client>; clientId: string }) {
  const rating = client.gbpPlaceRating;
  const reviewCount = client.gbpPlaceReviewCount;

  return (
    <div className="mt-2">
      <p className="flex items-center gap-2 text-xs font-semibold text-green-800">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        {client.gbpLocationName ? `Connected â€” ${client.gbpLocationName}` : "Connected"}
      </p>
      {rating != null && reviewCount != null ? (
        <p className="mt-1 text-xs text-muted">
          {rating.toFixed(1)}â˜… Â· {reviewCount.toLocaleString("en-IN")} reviews
        </p>
      ) : null}
    </div>
  );
}

function GBPDisconnectButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");

  async function disconnect() {
    if (!window.confirm("Disconnect Google Business Profile? This will remove the OAuth tokens and stop GBP data from being pulled.")) return;
    setDisconnecting(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/integrations/gbp/disconnect`, { method: "DELETE" });
      if (!res.ok) { setError("Failed to disconnect."); return; }
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button type="button" variant="secondary" onClick={disconnect} disabled={disconnecting}>
        {disconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function GoogleBusinessOAuthButton({ clientId }: { clientId: string }) {
  function connect(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest("form");
    const data = form ? new FormData(form) : new FormData();
    const placeId = String(data.get("gbpPlaceId") || "ChIJuVcVlxeTyzsRv7FDAzZhqpE");
    window.location.href = `/api/clients/${clientId}/integrations/gbp/oauth/start?placeId=${encodeURIComponent(placeId)}`;
  }

  return (
    <Button type="button" onClick={connect}>
      Connect Google Business
    </Button>
  );
}

function IntegrationTestButton({ clientId, type }: { clientId: string; type: "meta" | "gbp" | "google-ads" }) {
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  async function testConnection(event: React.MouseEvent<HTMLButtonElement>) {
    setTesting(true);
    setMessage("");
    try {
      if (type === "google-ads") {
        const response = await fetch(`/api/clients/${clientId}/integrations/google-ads/test`, { method: "POST" });
        const result = await response.json();
        if (!response.ok || !result.success) { setMessage(`Failed: ${result.error || "unknown error"}`); return; }
        setMessage(result.message ?? "Connected");
        return;
      }
      const form = event.currentTarget.closest("form");
      if (!form) return;
      const data = new FormData(form);
      const payload = type === "meta"
        ? { accessToken: String(data.get("metaAccessToken") || ""), adAccountId: String(data.get("metaAdAccountId") || ""), igUserId: String(data.get("metaIgUserId") || "") }
        : { accountId: String(data.get("gbpAccountId") || ""), locationId: String(data.get("gbpLocationId") || "") };
      const response = await fetch(`/api/clients/${clientId}/integrations/${type}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) { setMessage(`Failed: ${result.error || "unknown error"}`); return; }
      setMessage(type === "meta"
        ? `Connected — @${result.igUsername || "Instagram"} / ${result.adAccountName || "ad account"}`
        : `Connected — ${result.locationName || "GBP location"} / ${result.reviewCount ?? 0} recent reviews`);
    } finally {
      setTesting(false);
    }
  }

  const label = type === "meta" ? "Test Meta connection" : type === "gbp" ? "Test GBP connection" : "Test Google Ads";
  return (
    <div className="flex flex-col items-start justify-end gap-2">
      <Button type="button" variant="secondary" onClick={testConnection} disabled={testing}>
        {testing ? "Testing…" : label}
      </Button>
      {message ? <p className={`text-xs font-semibold ${message.startsWith("Connected") ? "text-green-700" : "text-red-600"}`}>{message}</p> : null}
    </div>
  );
}

function SourceAuditPrefillPanel({ onSelect }: { onSelect: (prefill: SourceAuditPrefill) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SourceAuditOption[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextQuery = query) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/source-audits?q=${encodeURIComponent(nextQuery)}`, { cache: "no-store" });
      const payload = await response.json();
      const sourceAudits = Array.isArray(payload.sourceAudits) ? payload.sourceAudits as SourceAuditOption[] : [];
      setOptions(sourceAudits);
      if (!sourceAudits.length) setMessage("No MonkAudit records found.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load("");
  }, [load]);

  return (
    <div className="border border-gm-orange bg-gm-orange-light p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Prefill from MonkAudit</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Search approved or completed audits and pull useful profile details into this form.</p>
        </div>
        <div className="flex min-w-0 gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search business, city, category..."
            className="h-10 w-full min-w-0 border border-stoneLine bg-white px-3 text-sm text-ink outline-none focus:border-gm-orange lg:w-80"
          />
          <Button type="button" variant="secondary" onClick={() => load()}>
            <Search size={16} /> {loading ? "Searching" : "Search"}
          </Button>
        </div>
      </div>

      {options.length ? (
        <div className="mt-4 grid gap-3">
          {options.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => onSelect(option.prefill)}
              className="grid gap-2 border border-stoneLine bg-white p-4 text-left transition hover:border-gm-orange md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-1 block text-xs text-muted">{option.category} / {option.city} / {option.auditStatus}{option.salesStage ? ` / ${option.salesStage}` : ""}</span>
              </span>
              <span className="text-xs font-semibold text-gm-orange">
                {option.score ? `Score ${option.score}` : "Use details"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-muted">{loading ? "Checking MonkAudit..." : message}</p>
      )}
    </div>
  );
}

// â”€â”€â”€ Meta auto-discover â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type DiscoveredPage = {
  pageId: string; pageName: string; fanCount: number; pageToken: string;
  instagramId: string; instagramUsername: string; instagramFollowers: number;
  instagramMediaCount: number; instagramBio: string;
};
type DiscoveredAdAccount = { id: string; name: string; currency: string; timezone: string; status: number; statusLabel: string };
type DiscoveredBusiness = { id: string; name: string };
type DiscoverResult = {
  user: { id: string; name: string; email: string };
  pages: DiscoveredPage[];
  adAccounts: DiscoveredAdAccount[];
  businesses: DiscoveredBusiness[];
  tokenScopes: string[];
};

function MetaDiscoverPanel({
  defaultToken,
  onSelect,
}: {
  defaultToken?: string;
  onSelect: (token: string, igId: string, adAccountId: string) => void;
}) {
  const [token, setToken] = useState(defaultToken ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedAd, setSelectedAd] = useState("");
  const [done, setDone] = useState(false);

  async function discover() {
    const t = token.trim();
    if (!t) { setError("Paste your access token first."); return; }
    setLoading(true); setError(""); setResult(null); setDone(false);
    try {
      const res = await fetch("/api/integrations/meta/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: t }),
      });
      const data = await res.json() as DiscoverResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Discovery failed."); return; }
      setResult(data);
      const firstIg = data.pages.find((p) => p.instagramId);
      const firstAd = data.adAccounts[0];
      if (firstIg) setSelectedPage(firstIg.pageId);
      if (firstAd) setSelectedAd(firstAd.id);
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    const page = result?.pages.find((p) => p.pageId === selectedPage);
    if (!page) { setError("Select a page first."); return; }
    onSelect(token.trim(), page.instagramId, selectedAd);
    setDone(true);
  }

  const scopeColor = (scope: string) => {
    const key = ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_manage_insights", "ads_read", "instagram_business_basic"];
    return key.includes(scope) ? "bg-green-100 text-green-800 border-green-200" : "bg-stone-100 text-muted border-stoneLine";
  };

  return (
    <div className="border border-gm-orange/40 bg-gm-orange-light p-4 grid gap-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-gm-orange shrink-0" />
        <p className="text-sm font-semibold text-ink">Auto-discover all Meta accounts</p>
      </div>
      <p className="text-xs text-muted">Paste your User Access Token â€” we'll fetch every Page, Instagram account, Ad Account, and Business Manager connected to it.</p>

      <div className="flex gap-2">
        <input
          value={token}
          onChange={(e) => { setToken(e.target.value); setDone(false); setResult(null); }}
          placeholder="Paste Meta User Access Token here"
          className="h-10 flex-1 border border-stoneLine bg-white px-3 text-xs font-mono outline-none focus:border-gm-orange min-w-0"
        />
        <Button type="button" variant="secondary" onClick={() => void discover()} disabled={loading || !token.trim()}>
          {loading ? "Discoveringâ€¦" : "Discover"}
        </Button>
      </div>

      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

      {result && (
        <div className="grid gap-4 border-t border-gm-orange/20 pt-3">

          {/* Token owner */}
          <div className="flex items-center gap-2 bg-white border border-stoneLine px-3 py-2">
            <span className="text-xs text-muted">Signed in as</span>
            <span className="text-xs font-semibold text-ink">{result.user.name}</span>
            {result.user.email && <span className="text-xs text-muted">Â· {result.user.email}</span>}
            <span className="text-xs text-muted ml-auto">ID: {result.user.id}</span>
          </div>

          {/* Token scopes */}
          {result.tokenScopes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">Token permissions</p>
              <div className="flex flex-wrap gap-1">
                {result.tokenScopes.map((s) => (
                  <span key={s} className={`border px-1.5 py-0.5 text-[10px] font-semibold ${scopeColor(s)}`}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Business Managers */}
          {result.businesses.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">Business Managers</p>
              <div className="grid gap-1">
                {result.businesses.map((biz) => (
                  <div key={biz.id} className="flex items-center justify-between bg-white border border-stoneLine px-3 py-2">
                    <span className="text-xs font-semibold text-ink">{biz.name}</span>
                    <span className="text-[11px] text-muted font-mono">ID: {biz.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages + Instagram */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">
              Facebook Pages &amp; Instagram accounts ({result.pages.length})
            </p>
            <div className="grid gap-2">
              {result.pages.map((page) => (
                <label key={page.pageId} className={`flex items-start gap-3 border bg-white p-3 cursor-pointer transition ${selectedPage === page.pageId ? "border-gm-orange" : "border-stoneLine hover:border-gm-orange/50"}`}>
                  <input
                    type="radio"
                    name="discover-page"
                    value={page.pageId}
                    checked={selectedPage === page.pageId}
                    onChange={() => setSelectedPage(page.pageId)}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0 flex-1 grid gap-1">
                    <span className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink">{page.pageName}</span>
                      <span className="text-[11px] text-muted font-mono">Page ID: {page.pageId}</span>
                    </span>
                    {page.fanCount > 0 && (
                      <span className="text-[11px] text-muted">{page.fanCount.toLocaleString("en-IN")} Page followers</span>
                    )}
                    {page.instagramId ? (
                      <span className="grid gap-0.5 mt-1 border-t border-stoneLine pt-1">
                        <span className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-green-700">@{page.instagramUsername}</span>
                          <span className="text-[11px] font-mono text-muted">IG ID: {page.instagramId}</span>
                        </span>
                        <span className="text-[11px] text-muted">
                          {page.instagramFollowers.toLocaleString("en-IN")} followers Â· {page.instagramMediaCount} posts
                        </span>
                        {page.instagramBio && (
                          <span className="text-[11px] text-muted italic line-clamp-1">{page.instagramBio}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 mt-1 border-t border-stoneLine pt-1">No Instagram Business account connected to this page</span>
                    )}
                  </span>
                </label>
              ))}
              {result.pages.length === 0 && (
                <p className="text-xs text-muted px-3 py-2 bg-white border border-stoneLine">No Facebook Pages found. Make sure your token has <code className="bg-stoneLine px-1">pages_show_list</code> permission.</p>
              )}
            </div>
          </div>

          {/* Ad Accounts */}
          {result.adAccounts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1.5">Ad Accounts ({result.adAccounts.length})</p>
              <select
                value={selectedAd}
                onChange={(e) => setSelectedAd(e.target.value)}
                className="h-10 w-full border border-stoneLine bg-white px-3 text-sm text-ink outline-none focus:border-gm-orange"
              >
                <option value="">â€” No ad account â€”</option>
                {result.adAccounts.map((ad) => (
                  <option key={ad.id} value={ad.id}>
                    {ad.name} Â· {ad.id} Â· {ad.currency} Â· {ad.statusLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Apply */}
          <div className="flex items-center gap-3 border-t border-gm-orange/20 pt-2">
            <Button type="button" onClick={apply} disabled={!selectedPage}>
              {done ? <><Check size={14} /> Applied</> : "Apply to form"}
            </Button>
            {done && <p className="text-xs font-semibold text-green-700">All fields filled â€” scroll down to review and save.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ GBP auto-discover â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type GbpLocation = {
  accountId: string; locationId: string; title: string; address: string;
  placeId: string; phone: string; websiteUri: string;
  rating: number | null; reviewCount: number | null;
};

function GbpDiscoverPanel({
  clientId,
  onSelect,
}: {
  clientId?: string;
  onSelect: (loc: { accountId: string; locationId: string; placeId: string }) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState<GbpLocation[] | null>(null);
  const [selected, setSelected] = useState("");
  const [done, setDone] = useState(false);

  async function discover(refreshToken: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/integrations/gbp/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json() as { locations?: GbpLocation[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Discovery failed."); return; }
      const locs = data.locations ?? [];
      setLocations(locs);
      if (locs.length === 1) setSelected(locs[0].locationId);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const token = params.get("gbpRefreshToken");
    const err = params.get("gbpError");

    if (err) {
      setError(err);
      params.delete("gbpError");
    }
    if (token) {
      params.delete("gbpRefreshToken");
      void discover(token);
    }
    if (err || token) {
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  function apply() {
    const loc = locations?.find((l) => l.locationId === selected);
    if (!loc) { setError("Select a location first."); return; }
    onSelect({ accountId: loc.accountId, locationId: loc.locationId, placeId: loc.placeId });
    setDone(true);
  }

  function startOAuth() {
    const p = new URLSearchParams(window.location.search);
    p.delete("gbpRefreshToken");
    p.delete("gbpError");
    const qs = p.toString();
    const returnTo = window.location.pathname + (qs ? "?" + qs : "");
    window.location.href = `/api/integrations/gbp/discover/start?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <div className="border-b border-stoneLine p-4 grid gap-3 bg-gm-orange-light">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-gm-orange shrink-0" />
        <p className="text-sm font-semibold text-ink">Auto-discover Google Business locations</p>
      </div>
      <p className="text-xs text-muted">
        Connect via Google OAuth to fetch all your Business Profile locations â€” no manual IDs needed.
        {clientId ? "" : " You can also enter IDs manually below."}
      </p>

      {!locations && !loading && (
        <Button type="button" onClick={startOAuth} className="self-start">
          Connect via Google OAuth
        </Button>
      )}

      {loading && <p className="text-xs font-semibold text-muted">Fetching your Google Business locationsâ€¦</p>}

      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

      {locations && locations.length === 0 && (
        <p className="text-xs text-muted border border-stoneLine bg-white px-3 py-2">
          No Business Profile locations found for this Google account. Make sure you have been added as Manager on the listing.
        </p>
      )}

      {locations && locations.length > 0 && (
        <div className="grid gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Business locations ({locations.length})
          </p>
          <div className="grid gap-2">
            {locations.map((loc) => (
              <label
                key={loc.locationId}
                className={`flex items-start gap-3 border bg-white p-3 cursor-pointer transition ${
                  selected === loc.locationId ? "border-gm-orange" : "border-stoneLine hover:border-gm-orange/50"
                }`}
              >
                <input
                  type="radio"
                  name="discover-gbp-location"
                  value={loc.locationId}
                  checked={selected === loc.locationId}
                  onChange={() => setSelected(loc.locationId)}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0 flex-1 grid gap-0.5">
                  <span className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink">{loc.title}</span>
                    {loc.rating != null && (
                      <span className="text-[11px] text-muted">
                        {loc.rating.toFixed(1)}â˜… Â· {loc.reviewCount?.toLocaleString("en-IN")} reviews
                      </span>
                    )}
                  </span>
                  {loc.address && <span className="text-[11px] text-muted">{loc.address}</span>}
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {loc.phone && <span className="text-[11px] text-muted">{loc.phone}</span>}
                    {loc.placeId && <span className="text-[11px] font-mono text-muted">Place ID: {loc.placeId}</span>}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3 border-t border-gm-orange/20 pt-2">
            <Button type="button" onClick={apply} disabled={!selected}>
              {done ? <><Check size={14} /> Applied</> : "Apply to form"}
            </Button>
            {done && <p className="text-xs font-semibold text-green-700">Fields filled â€” review and save.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Quick fill from URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuickFillBar({ onFill }: { onFill: (data: Partial<Client>) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleFill() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus(null);

    // Instagram URL or @handle
    const igMatch =
      trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/) ??
      (trimmed.startsWith("@") ? [null, trimmed.slice(1)] : null);
    if (igMatch?.[1]) {
      onFill({ instagramHandle: igMatch[1] });
      setUrl("");
      setStatus({ ok: true, message: `Instagram handle @${igMatch[1]} filled in.` });
      return;
    }

    // Google Maps URL or plain text search (business name + city)
    const isGoogleUrl =
      trimmed.includes("google.com/maps") ||
      trimmed.includes("maps.app.goo.gl") ||
      trimmed.includes("goo.gl/maps") ||
      trimmed.includes("share.google") ||
      trimmed.includes("g.co/");
    const isAnyUrl = trimmed.startsWith("http");
    const isTextSearch = !isAnyUrl; // plain text â†’ treat as business name search

    if (isGoogleUrl || isTextSearch) {
      setLoading(true);
      try {
        const body = isTextSearch
          ? { query: trimmed }
          : { url: trimmed };
        const res = await fetch("/api/lookup/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { place?: PlaceLookupResult; error?: string };
        if (!res.ok || !data.place) {
          setStatus({ ok: false, message: data.error ?? "Lookup failed." });
          return;
        }
        const p = data.place;
        onFill({
          name: p.name || undefined,
          city: p.city || undefined,
          country: (p.country as Client["country"]) || undefined,
          contactPhone: p.phone || undefined,
          whatsappNumber: p.phone || undefined,
          websiteUrl: p.website || undefined,
          gbpPlaceId: p.placeId || undefined,
        });
        setUrl("");
        setStatus({
          ok: true,
          message: `Filled: ${p.name}${p.city ? `, ${p.city}` : ""}${p.phone ? ` Â· ${p.phone}` : ""}. Review and save.`,
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    setStatus({
      ok: false,
      message: "Paste a Google Maps URL, or type the business name and city (e.g. Uber Dry Visakhapatnam).",
    });
  }

  return (
    <div className="border border-stoneLine bg-ivory p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-gm-orange" />
        <h3 className="text-sm font-semibold text-ink">Auto-fill from URL</h3>
      </div>
      <p className="text-xs text-muted mb-3">
        Paste a Google Maps URL <span className="text-ink font-medium">or just type the business name + city</span> to fill name, city, phone, website &amp; Place ID. Or paste an Instagram URL for the handle.
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleFill(); } }}
          placeholder="Uber Dry Visakhapatnam   OR   share.google/â€¦   OR   instagram.com/username"
          className="h-10 flex-1 border border-stoneLine bg-white px-3 text-sm outline-none focus:border-gm-orange min-w-0"
        />
        <Button type="button" variant="secondary" onClick={() => void handleFill()} disabled={loading || !url.trim()}>
          {loading ? "Looking upâ€¦" : "Auto-fill"}
        </Button>
      </div>
      {status ? (
        <p className={`mt-2 text-xs font-semibold ${status.ok ? "text-green-700" : "text-red-600"}`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

// â”€â”€â”€ Client onboarding message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ClientOnboardingMessage({ clientName }: { clientName: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = `Hi${clientName && clientName !== "the client" ? ` ${clientName.split(" ")[0]}` : ""},

To connect your business accounts to our GrowingMonk Intelligence Hub, we need two quick access grants. This takes about 5 minutes and gives us read-only access to pull your data.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“± META (INSTAGRAM + ADS)
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Please add us as a Partner in your Meta Business Manager:

1. Go to: business.facebook.com
2. Click Settings (top right) â†’ Partners â†’ Add Partner
3. Enter our Business Manager ID: [ADD YOUR BM ID]
4. Select "Manage campaigns + View performance" and send the request

We need this to pull:
â€¢ Instagram post reach & engagement
â€¢ Meta ad campaign ROAS and leads
â€¢ Audience performance data

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“ GOOGLE BUSINESS PROFILE
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Please add us as a Manager on your Google Business listing:

1. Go to: business.google.com
2. Click on your listing â†’ Menu (â‹®) â†’ Business Profile settings
3. Click Managers â†’ Add â†’ enter: [ADD YOUR EMAIL]
4. Select role: Manager â†’ Send invite

We need this to pull:
â€¢ Customer reviews (with reply functionality)
â€¢ Search & map views, phone calls, direction requests

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
âš ï¸ IMPORTANT
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
We only read your data. We cannot post, edit, or delete anything without your explicit approval. Access can be revoked by you at any time.

Let us know once both are done â€” we'll get your dashboard live within the hour!

â€” GrowingMonk Team`;

  function copy() {
    void navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="border border-blue-200 bg-blue-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="block text-sm font-semibold text-blue-800">Message to send your client</span>
          <span className="block text-xs text-blue-700">Copy a pre-written WhatsApp/email asking for access to Meta and Google Business</span>
        </span>
        {open ? <ChevronUp size={15} className="text-blue-700 shrink-0" /> : <ChevronDown size={15} className="text-blue-700 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-blue-200 p-4 grid gap-3">
          <pre className="text-xs leading-5 text-blue-800 whitespace-pre-wrap font-sans bg-white border border-blue-200 p-3 max-h-64 overflow-y-auto">
            {message}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="self-start flex items-center gap-2 bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy message"}
          </button>
          <p className="text-[11px] text-blue-700">
            Replace <strong>[ADD YOUR BM ID]</strong> with your Meta Business Manager ID and <strong>[ADD YOUR EMAIL]</strong> with the Google account you use for GBP access.
          </p>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Setup guide (expandable steps) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Step = { label: string; detail: React.ReactNode };

function SetupGuide({ title, steps }: { title: string; steps: Step[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="border-b border-stoneLine">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="text-xs font-semibold text-muted">{title}</span>
        {open ? <ChevronUp size={13} className="text-muted shrink-0" /> : <ChevronDown size={13} className="text-muted shrink-0" />}
      </button>
      {open && (
        <div ref={ref} className="px-4 pb-4 pt-1 grid gap-3 bg-white border-t border-stoneLine">
          {steps.map((step, i) => (
            <div key={i} className="grid grid-cols-[24px_1fr] gap-3 items-start">
              <span className="flex items-center justify-center w-6 h-6 bg-gm-orange/10 text-gm-orange text-[11px] font-bold rounded-full shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold text-ink leading-5">{step.label}</p>
                <p className="mt-1 text-xs text-muted leading-5">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  help
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink" suppressHydrationWarning>
      <LabelWithHelp label={label} help={help} />
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 border border-stoneLine bg-white px-3 text-sm font-normal text-ink outline-none focus:border-gm-orange"
      />
    </label>
  );
}

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span>{label}</span>
      {help ? (
        <span className="group relative inline-flex">
          <span
            tabIndex={0}
            role="button"
            aria-label={`How to get ${label}`}
            className="inline-grid h-5 w-5 place-items-center border border-stoneLine bg-white text-muted outline-none transition hover:border-gm-orange hover:text-gm-orange focus:border-gm-orange focus:text-gm-orange"
          >
            <Info size={13} />
          </span>
          <span className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-[min(320px,calc(100vw-48px))] -translate-x-1/2 border border-stoneLine bg-white p-3 text-xs font-normal leading-5 text-muted shadow-xl group-hover:block group-focus-within:block">
            {help}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink" suppressHydrationWarning>
      {label}
      <select name={name} defaultValue={defaultValue} className="h-11 border border-stoneLine bg-white px-3 text-sm font-normal text-ink outline-none focus:border-gm-orange">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  className
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-semibold text-ink ${className ?? ""}`} suppressHydrationWarning>
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="resize-y border border-stoneLine bg-white px-3 py-3 text-sm font-normal leading-6 text-ink outline-none focus:border-gm-orange"
      />
    </label>
  );
}
