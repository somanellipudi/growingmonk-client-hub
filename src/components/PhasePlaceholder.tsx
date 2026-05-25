import { AppShell } from "@/components/layout/AppShell";
import { LinkButton, PageHeader, Panel } from "@/components/ui";

export function PhasePlaceholder({
  eyebrow,
  title,
  description,
  phaseItems
}: {
  eyebrow: string;
  title: string;
  description: string;
  phaseItems: string[];
}) {
  return (
    <AppShell>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={<LinkButton href="/dashboard" variant="secondary">Back to dashboard</LinkButton>}
      />
      <Panel>
        <h2 className="text-lg font-semibold text-ink">Planned scope</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {phaseItems.map((item) => (
            <div key={item} className="border border-stoneLine bg-ivory px-4 py-3 text-sm font-semibold text-muted">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
