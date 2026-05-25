"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Panel } from "@/components/ui";
import { Button } from "@/components/ui";

type LocationOption = {
  accountId: string;
  locationId: string;
  title: string;
  address: string;
};

export default function GbpSelectPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { accountId?: string };
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selected, setSelected] = useState<LocationOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!searchParams.accountId) {
      setError("Missing account ID.");
      setLoading(false);
      return;
    }
    fetch(`/api/clients/${params.id}/integrations/gbp/locations?accountId=${encodeURIComponent(searchParams.accountId)}`)
      .then((res) => res.json())
      .then((data: { locations?: LocationOption[]; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setLocations(data.locations ?? []);
        if (data.locations?.length === 1) setSelected(data.locations[0]);
      })
      .catch(() => setError("Failed to load locations."))
      .finally(() => setLoading(false));
  }, [params.id, searchParams.accountId]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${params.id}/integrations/gbp/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selected.accountId,
          locationId: selected.locationId,
          locationName: selected.title
        })
      });
      const data = await res.json() as { success?: boolean; redirectUrl?: string; error?: string };
      if (!res.ok || !data.success) { setError(data.error || "Failed to connect location."); return; }
      router.push(data.redirectUrl || `/clients/${params.id}?edit=1`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Google Business Profile"
        title="Choose a location"
        description="Select which Google Business Profile location to connect to this client."
      />
      <Panel>
        {loading ? (
          <p className="text-sm text-muted">Loading locations...</p>
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">{error}</p>
        ) : locations.length === 0 ? (
          <p className="text-sm text-muted">No locations found on this account.</p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3">
              {locations.map((loc) => (
                <button
                  key={loc.locationId}
                  type="button"
                  onClick={() => setSelected(loc)}
                  className={`grid gap-1 border p-4 text-left transition ${
                    selected?.locationId === loc.locationId
                      ? "border-gm-orange bg-gm-orange-light"
                      : "border-stoneLine bg-paper hover:border-gm-orange"
                  }`}
                >
                  <span className="text-sm font-semibold text-ink">{loc.title}</span>
                  {loc.address ? <span className="text-xs text-muted">{loc.address}</span> : null}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 border-t border-stoneLine pt-4">
              <Button onClick={save} disabled={!selected || saving}>
                {saving ? "Connecting..." : "Connect selected location"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/clients/${params.id}?edit=1`)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
