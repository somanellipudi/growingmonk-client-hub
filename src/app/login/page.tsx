import { LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next || "/dashboard";

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden border border-stoneLine bg-paper shadow-calm lg:grid-cols-[1fr_420px]">
        <div className="p-8 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gm-orange">GrowingMonk private workspace</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-ink">GrowingMonk Client Hub</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Internal weekly command center for managed clients, data sync, content planning, and AI-assisted operations.
          </p>

          <LoginForm next={next} />

          <div className="mt-7 grid gap-3 border-t border-stoneLine pt-6 md:grid-cols-2">
            <div className="flex gap-3 text-sm leading-6 text-muted">
              <LockKeyhole className="mt-1 shrink-0 text-gm-orange" size={17} />
              Phase 1 uses the same allowlist gate pattern as MonkAudit.
            </div>
            <div className="flex gap-3 text-sm leading-6 text-muted">
              <ShieldCheck className="mt-1 shrink-0 text-sage" size={17} />
              Firebase Google login is reserved for production hardening.
            </div>
          </div>
        </div>
        <aside className="bg-[#211f1b] p-8 text-paper lg:p-10">
          <span className="flex items-center gap-2" aria-label="GrowingMonk">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/GrowingMonk_mark_transparent_orange.png" alt="" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold leading-none text-paper">GrowingMonk</span>
          </span>
          <p className="mt-10 text-2xl font-semibold leading-tight">Client operations need a weekly rhythm.</p>
          <p className="mt-4 text-sm leading-7 text-paper/65">
            This hub starts with a shared foundation, then grows into planning, reporting, asset matching, and AI support.
          </p>
        </aside>
      </section>
    </main>
  );
}
