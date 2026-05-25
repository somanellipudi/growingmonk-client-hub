import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Panel } from "@/components/ui";

export default function AIPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="AI workspace"
        title="Brief intelligence only"
        description="The MVP AI layer now runs during client sync. Open a client brief or weekly plan to use the generated intelligence."
      />
      <Panel>
        <p className="text-sm leading-6 text-muted">
          Chat has been removed from the MVP. Gemini now generates weekly briefs, plans, review replies, captions, and client updates from synced Meta and GBP data.
        </p>
      </Panel>
    </AppShell>
  );
}
