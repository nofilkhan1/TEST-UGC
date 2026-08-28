"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export default function CreatorDashboard() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [liveCount, setLiveCount] = useState(0);
  const [myCount, setMyCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { count: live } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "live");
      setLiveCount(live ?? 0);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("creator_id", user.id);
        setMyCount(count ?? 0);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
      </h1>
      <p className="mt-1 text-ink-soft">
        {liveCount} live campaign{liveCount === 1 ? "" : "s"} waiting for creators
        like you.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Link
          href="/campaigns"
          className="card block p-6 transition hover:shadow-pop"
        >
          <div className="text-3xl font-bold brand-text">{liveCount}</div>
          <h3 className="mt-2 font-semibold">Browse campaigns</h3>
          <p className="mt-1 text-sm text-ink-soft">Find a role that fits you.</p>
        </Link>
        <Link
          href="/applications"
          className="card block p-6 transition hover:shadow-pop"
        >
          <div className="text-3xl font-bold brand-text">{myCount}</div>
          <h3 className="mt-2 font-semibold">My applications</h3>
          <p className="mt-1 text-sm text-ink-soft">Track your pitches.</p>
        </Link>
        <Link
          href="/notifications"
          className="card block p-6 transition hover:shadow-pop"
        >
          <div className="text-3xl font-bold brand-text">🔔</div>
          <h3 className="mt-2 font-semibold">Notifications</h3>
          <p className="mt-1 text-sm text-ink-soft">Approvals & updates.</p>
        </Link>
      </div>
    </div>
  );
}
