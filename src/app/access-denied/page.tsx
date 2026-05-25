import { LockKeyhole } from "lucide-react";
import { LinkButton, Panel } from "@/components/ui";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <Panel className="max-w-xl text-center">
        <LockKeyhole className="mx-auto text-gm-orange" size={34} />
        <h1 className="mt-5 text-2xl font-semibold text-ink">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          This workspace is limited to allowlisted GrowingMonk team members.
        </p>
        <div className="mt-6">
          <LinkButton href="/login" variant="secondary">Back to login</LinkButton>
        </div>
      </Panel>
    </main>
  );
}
