import { PhasePlaceholder } from "@/components/PhasePlaceholder";

export default function SettingsPage() {
  return (
    <PhasePlaceholder
      eyebrow="Phase 5"
      title="System Settings"
      description="Production hardening will move the app to Firestore collections, Cloud Scheduler, Secret Manager, and Firebase Google login."
      phaseItems={["Firestore collections", "Cloud Scheduler", "Secret status", "Firebase Google login"]}
    />
  );
}
