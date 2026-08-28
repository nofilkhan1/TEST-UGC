"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Application, Campaign } from "@/lib/types";

export default function MyApplications() {
  const supabase = createClient();
  const [apps, setApps] = useState<(Application & { title: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data as Application[]) ?? [];
      const campaignIds = list.map((a) => a.campaign_id);
      let titleMap: Record<string, string> = {};
      if (campaignIds.length) {
        const { data: cs } = await supabase
          .from("campaigns")
          .select("id, title")
          .in("id", campaignIds);
        titleMap = Object.fromEntries(
          ((cs as Campaign[] | null) ?? []).map((c) => [c.id, c.title]),
        );
      }
      setApps(list.map((a) => ({ ...a, title: titleMap[a.campaign_id] ?? "Campaign" })));
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">My applications</h1>
      <p className="mt-1 text-ink-soft">Track every campaign you&apos;ve applied to.</p>

      {loading ? (
        <p className="mt-10 text-ink-soft">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-ink-soft">
          You haven&apos;t applied to anything yet.{" "}
          <Link href="/campaigns" className="font-semibold text-violet">
            Browse campaigns →
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={`/campaigns/${a.campaign_id}`}
              className="card flex items-center justify-between p-5 transition hover:shadow-pop"
            >
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-0.5 text-xs text-ink-2">
                  Applied {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  a.status === "approved"
                    ? "bg-success/15 text-success"
                    : a.status === "rejected"
                      ? "bg-danger/15 text-danger"
                      : "bg-warning/15 text-warning"
                }`}
              >
                {a.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
