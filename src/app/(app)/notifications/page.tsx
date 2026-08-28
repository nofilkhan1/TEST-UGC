"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

const ICON: Record<Notification["type"], string> = {
  application_received: "📥",
  application_approved: "✅",
  application_rejected: "↩️",
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  }

  async function markAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {items.some((i) => !i.is_read) && (
          <button onClick={markAll} className="btn btn-ghost px-4 py-1.5 text-sm">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-10 text-ink-soft">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-ink-soft">
          You&apos;re all caught up.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start gap-3 p-5 ${
                n.is_read ? "opacity-60" : ""
              }`}
            >
              <span className="text-xl">{ICON[n.type]}</span>
              <div className="flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="mt-1 text-xs text-ink-2">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="text-xs font-semibold text-violet"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
