"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export function Header() {
  const { profile, role, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function onSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks =
    role === "brand"
      ? [{ href: "/brand/dashboard", label: "Campaigns" }]
      : [
          { href: "/creator/dashboard", label: "Home" },
          { href: "/campaigns", label: "Browse" },
          { href: "/applications", label: "Applications" },
        ];

  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg brand-gradient text-xs font-bold text-white">
              S
            </span>
            <span className="text-base font-bold tracking-tight">SideShift</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-mist-2 text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="relative rounded-full p-2 text-ink-soft transition hover:bg-mist hover:text-ink"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="chip capitalize">{role}</span>
            <span className="text-sm font-medium">{profile?.full_name}</span>
          </span>
          <button onClick={onSignOut} className="btn btn-ghost px-3 py-1.5 text-sm">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
