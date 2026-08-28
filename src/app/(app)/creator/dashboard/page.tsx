"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, Application, Profile, BrandProfile } from "@/lib/types";

type Tab = "browse" | "applications";

export default function CreatorDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("browse");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Record<string, string>>({});
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [myApps, setMyApps] = useState<(Application & { title: string; brand: string })[]>([]);
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

      // Live campaigns across all brands
      const { data: cs } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "live")
        .order("created_at", { ascending: false });
      const list = (cs as Campaign[]) ?? [];
      setCampaigns(list);

      if (list.length) {
        const ids = list.map((c) => c.brand_id);
        const { data: bps } = await supabase
          .from("brand_profiles")
          .select("profile_id, company_name")
          .in("profile_id", ids);
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        const pMap = new Map((ps as Profile[] | null)?.map((p) => [p.id, p]));
        const bMap = new Map(
          (bps as BrandProfile[] | null)?.map((b) => [b.profile_id, b]),
        );
        const map: Record<string, string> = {};
        ids.forEach((i) => {
          map[i] =
            bMap.get(i)?.company_name || pMap.get(i)?.full_name || "A brand";
        });
        setBrands(map);
      }

      // This creator's applications (for "Applied" badges + My Applications tab)
      const { data: apps } = await supabase
        .from("applications")
        .select("*")
        .eq("creator_id", user.id);
      const appList = (apps as Application[]) ?? [];
      setAppliedIds(new Set(appList.map((a) => a.campaign_id)));

      if (appList.length) {
        const cIds = appList.map((a) => a.campaign_id);
        const { data: cs2 } = await supabase
          .from("campaigns")
          .select("id, title, brand_id")
          .in("id", cIds);
        const titleMap = new Map((cs2 as Campaign[] | null)?.map((c) => [c.id, c]));
        const brandIds = (cs2 as Campaign[] | null)?.map((c) => c.brand_id) ?? [];
        const { data: bps2 } = await supabase
          .from("brand_profiles")
          .select("profile_id, company_name")
          .in("profile_id", brandIds);
        const { data: ps2 } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", brandIds);
        const pMap2 = new Map((ps2 as Profile[] | null)?.map((p) => [p.id, p]));
        const bMap2 = new Map(
          (bps2 as BrandProfile[] | null)?.map((b) => [b.profile_id, b]),
        );
        setMyApps(
          appList.map((a) => {
            const c = titleMap.get(a.campaign_id);
            const brand =
              (c && (bMap2.get(c.brand_id)?.company_name || pMap2.get(c.brand_id)?.full_name)) ||
              "A brand";
            return {
              ...a,
              title: c?.title ?? "Campaign",
              brand,
            };
          }),
        );
      }
      setLoading(false);
    })();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "browse", label: "Browse Campaigns" },
    { key: "applications", label: `My Applications${myApps.length ? ` (${myApps.length})` : ""}` },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold">Creator dashboard</h1>
      <p className="mt-1 text-ink-soft">
        Browse live campaigns and track every application.
      </p>

      <div className="mt-6 flex gap-2 border-b border-ink/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "border-violet text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-ink-soft">Loading…</p>
      ) : tab === "browse" ? (
        campaigns.length === 0 ? (
          <div className="card mt-10 p-10 text-center text-ink-soft">
            No live campaigns right now — check back soon.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {campaigns.map((c) => {
              const applied = appliedIds.has(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/creator/campaigns/${c.id}`}
                  className="card block p-6 transition hover:shadow-pop"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        c.platform === "instagram"
                          ? "bg-pink-500/10 text-pink-600"
                          : "bg-ink/90 text-white"
                      }`}
                    >
                      {c.platform === "instagram" ? "📸 Instagram" : "🎵 TikTok"}
                    </span>
                    {applied ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        ✓ Applied
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-violet">Apply →</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{c.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-ink-2">
                    <span className="chip">{brands[c.brand_id]}</span>
                    <span className="chip">
                      {c.num_posts_required} post{c.num_posts_required > 1 ? "s" : ""}
                    </span>
                    {c.start_date || c.end_date ? (
                      <span className="chip">
                        {c.start_date ?? "…"} → {c.end_date ?? "…"}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : myApps.length === 0 ? (
        <div className="card mt-10 p-10 text-center text-ink-soft">
          You haven&apos;t applied to anything yet.{" "}
          <Link href="/creator/dashboard" className="font-semibold text-violet">
            Browse campaigns →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {myApps.map((a) => (
            <Link
              key={a.id}
              href={`/creator/campaigns/${a.campaign_id}`}
              className="card flex items-center justify-between p-5 transition hover:shadow-pop"
            >
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-0.5 text-xs text-ink-2">{a.brand}</p>
                {a.price_per_post != null && (
                  <p className="mt-1 text-xs text-ink-2">${a.price_per_post} / post</p>
                )}
              </div>
              <AppStatusBadge status={a.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AppStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    rejected: "bg-danger/15 text-danger",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}
