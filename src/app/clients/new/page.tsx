import { ClientForm } from "@/components/ClientForm";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Panel } from "@/components/ui";

export default function NewClientPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Client onboarding"
        title="New Client"
        description="Create the client profile that integrations, weekly briefs, and AI planning will build on."
      />
      <Panel>
        <ClientForm />
      </Panel>
    </AppShell>
  );
}
