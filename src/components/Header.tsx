"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Notification } from "@/lib/types";

const ICON: Record<Notification["type"], string> = {
  application_received: "📥",
  application_approved: "✅",
  application_rejected: "↩️",
};

export function Header() {
  const { profile, role, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  async function loadNotifs() {
    if (!profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    const list = (data as Notification[]) ?? [];
    setItems(list);
    setUnread(list.filter((n) => !n.is_read).length);
  }

  useEffect(() => {
    loadNotifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function goNotif(n: Notification) {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.related_application_id) {
      const { data: app } = await supabase
        .from("applications")
        .select("campaign_id")
        .eq("id", n.related_application_id)
        .single();
      if (app?.campaign_id) {
        router.push(
          role === "brand"
            ? `/brand/campaigns/${app.campaign_id}`
            : `/creator/campaigns/${app.campaign_id}`,
        );
        router.refresh();
        return;
      }
    }
    router.push("/notifications");
    router.refresh();
  }

  async function onSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks =
    role === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : role === "brand"
        ? [{ href: "/brand/dashboard", label: "Campaigns" }]
        : [
            { href: "/creator/dashboard", label: "Browse" },
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
          {/* Notification bell + dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
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
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 max-h-[75vh] w-[calc(100vw-2rem)] overflow-y-auto overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-pop sm:w-80">
                  <div className="flex items-center justify-between border-b border-ink/5 px-4 py-2.5">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unread > 0 && (
                      <button
                        onClick={async () => {
                          await supabase
                            .from("notifications")
                            .update({ is_read: true })
                            .eq("user_id", profile!.id)
                            .eq("is_read", false);
                          loadNotifs();
                        }}
                        className="text-xs font-semibold text-violet"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-ink-soft">
                        You&apos;re all caught up.
                      </p>
                    ) : (
                      items.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => goNotif(n)}
                          className={`flex w-full items-start gap-3 border-b border-ink/5 px-4 py-3 text-left transition hover:bg-mist ${
                            n.is_read ? "" : "bg-mist-2/40"
                          }`}
                        >
                          <span className="text-lg">{ICON[n.type]}</span>
                          <span className="flex-1">
                            <span className="block text-sm">{n.message}</span>
                            <span className="mt-0.5 block text-xs text-ink-2">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </span>
                          {!n.is_read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

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
