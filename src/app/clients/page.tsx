import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, LinkButton, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { listClients } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Client operations"
        title="Clients"
        description="Manage active client profiles, integrations, weekly briefs, and plans."
        action={<LinkButton href="/clients/new"><Plus size={16} /> New Client</LinkButton>}
      />

      {clients.length ? (
        <Panel className="p-0">
          <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_140px_120px_56px] gap-4 border-b border-stoneLine bg-[#fbf8f2] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            <span>Client</span>
            <span>Market</span>
            <span>Package</span>
            <span>Status</span>
            <span />
          </div>
          <div className="divide-y divide-stoneLine">
            {clients.map((client) => (
              <div
                key={client.id}
                className="relative grid grid-cols-[minmax(0,1.4fr)_1fr_140px_120px_56px] gap-4 px-5 py-4 text-sm transition hover:bg-gm-orange-light/45"
              >
                <Link href={`/clients/${client.id}`} className="absolute inset-0" aria-label={`View ${client.name}`} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{client.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted">{client.niche.replace("_", " ")} / {platformLabel(client)}</span>
                </span>
                <span className="text-muted">{client.city}, {client.country}</span>
                <span className="font-semibold capitalize text-ink">{client.packageTier}</span>
                <StatusBadge status={client.status} />
                <Link
                  href={`/clients/${client.id}?edit=1`}
                  className="relative z-10 flex items-center justify-center self-center text-muted hover:text-gm-orange transition-colors"
                  aria-label={`Edit ${client.name}`}
                >
                  <Pencil size={15} />
                </Link>
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <EmptyState
          title="No clients yet"
          body="Create the first client profile. Once it is saved, it appears on this list and the dashboard immediately."
          action={<LinkButton href="/clients/new"><Plus size={16} /> New Client</LinkButton>}
        />
      )}
    </AppShell>
  );
}

function platformLabel(client: { activePlatforms: string[]; otherPlatformLabel?: string }) {
  const platforms = client.activePlatforms.map((platform) => platform === "other" && client.otherPlatformLabel ? client.otherPlatformLabel : platform);
  return platforms.join(", ") || "No platforms";
}
