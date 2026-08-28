"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, Profile, BrandProfile } from "@/lib/types";

export default function BrowseCampaigns() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "live")
        .order("created_at", { ascending: false });
      const list = (data as Campaign[]) ?? [];
      setCampaigns(list);
      if (list.length) {
        const ids = list.map((c) => c.brand_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        const { data: bprofs } = await supabase
          .from("brand_profiles")
          .select("profile_id, company_name")
          .in("profile_id", ids);
        const profMap = new Map((profs as Profile[] | null)?.map((p) => [p.id, p]));
        const bMap = new Map(
          (bprofs as BrandProfile[] | null)?.map((b) => [b.profile_id, b]),
        );
        const map: Record<string, string> = {};
        ids.forEach((id) => {
          map[id] =
            bMap.get(id)?.company_name ||
            profMap.get(id)?.full_name ||
            "A brand";
        });
        setBrands(map);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Open campaigns</h1>
      <p className="mt-1 text-ink-soft">
        Brands posted these roles. Apply with one tap — no resumes.
      </p>

      {loading ? (
        <p className="mt-10 text-ink-soft">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-ink-soft">
          No live campaigns right now. Check back soon.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="card block p-6 transition hover:shadow-pop">
              <div className="flex items-center justify-between">
                <span className="chip capitalize">{c.platform}</span>
                <span className="text-xs text-ink-2">{brands[c.brand_id]}</span>
              </div>
              <h3 className="mt-3 text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{c.description}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-ink-2">
                <span className="chip">{c.num_posts_required} post{c.num_posts_required > 1 ? "s" : ""}</span>
                <span className="font-medium text-violet">Apply →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
