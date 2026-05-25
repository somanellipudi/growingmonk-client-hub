"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { BarChart3, Home, LayoutGrid, Plus, Settings, Sparkles } from "lucide-react";

type ShellUser = {
  email: string;
  name: string;
  teamId: string;
  roleIds: string[];
};

type DbSummary = {
  counts: {
    clients: number;
    weekly_briefs: number;
  };
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/clients/new", label: "New Client", icon: Plus },
  { href: "/clients", label: "Clients", icon: LayoutGrid },
  { href: "/ai", label: "AI Workspace", icon: Sparkles },
  { href: "/settings", label: "System", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useBrowserPathname();
  const [user, setUser] = useState<ShellUser>({
    email: "Not signed in",
    name: "GrowingMonk Team",
    teamId: "growth_ops",
    roleIds: [],
  });
  const [summary, setSummary] = useState<DbSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadShellData() {
      try {
        const [sessionResponse, summaryResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/db/summary", { cache: "no-store" }),
        ]);
        if (!mounted) return;

        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          if (session.user) setUser(session.user);
        }
        if (summaryResponse.ok) {
          setSummary(await summaryResponse.json());
        }
      } catch {
        // ignore while env/auth is being configured
      }
    }

    void loadShellData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="hidden w-full border-r border-[#2a2825] bg-[#1a1814] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[232px]">
        <div className="flex h-full min-h-screen flex-col overflow-x-hidden px-3 py-4">
          {/* Brand */}
          <Link href="/dashboard" className="mb-3 block border-b border-white/[0.08] px-2 pb-4">
            <BrandLogo />
            <p className="mt-3 text-[17px] font-semibold leading-tight text-white">Client Hub</p>
            <p className="mt-0.5 text-xs text-white/40">Weekly command center</p>
          </Link>

          {/* Nav */}
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex min-w-0 items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/[0.1] text-white"
                      : "text-white/55 hover:bg-white/[0.06] hover:text-white/80",
                  )}
                >
                  <Icon
                    size={15}
                    className={clsx("shrink-0", active && "text-gm-orange")}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="mt-4 border-t border-white/[0.08] px-2 pt-4">
            <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-white/45">{user.email}</p>
            <p className="mt-2 truncate text-[10px] uppercase tracking-[0.18em] text-white/25">
              {user.teamId}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <main className="min-w-0 pb-20 lg:col-start-2 lg:w-[calc(100vw-232px)] lg:pb-0">
        <Topbar summary={summary} />
        <div className="mx-auto w-full max-w-[1280px] min-w-0 px-4 py-6 sm:px-5 lg:px-7">
          {children}
        </div>
      </main>

      <MobileNav pathname={pathname} />
    </div>
  );
}

function useBrowserPathname() {
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    updatePathname();
    window.addEventListener("popstate", updatePathname);
    return () => window.removeEventListener("popstate", updatePathname);
  }, []);

  return pathname;
}

function Topbar({ summary }: { summary: DbSummary | null }) {
  const clientCount = summary?.counts.clients ?? 0;
  const briefCount = summary?.counts.weekly_briefs ?? 0;

  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center justify-between gap-4 overflow-hidden border-b border-stoneLine bg-white/95 px-4 backdrop-blur-sm sm:px-5 lg:px-7">
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <BrandLogo />
        <p className="text-sm font-semibold text-ink">Client Hub</p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex ml-auto">
        <BarChart3 size={15} className="text-gm-orange" />
        <span className="whitespace-nowrap text-xs text-muted">
          {clientCount} clients · {briefCount} briefs
        </span>
      </div>
    </header>
  );
}

function BrandLogo() {
  return (
    <span className="flex min-w-0 items-center gap-2" aria-label="GrowingMonk">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/GrowingMonk_mark_transparent_orange.png"
        alt=""
        className="h-[22px] w-[22px] object-contain"
      />
      <span className="whitespace-nowrap text-[13px] font-bold leading-none text-white">
        GrowingMonk
      </span>
    </span>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const mobileItems = navItems.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#2a2825] bg-[#1a1814] shadow-2xl lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium",
              active ? "text-gm-orange" : "text-white/50",
            )}
          >
            <Icon size={16} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
