"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  BrandProfile,
  CreatorProfile,
  Campaign,
  Application,
} from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonTable } from "@/components/Skeleton";

type BrandRow = {
  id: string;
  company: string;
  email: string;
  campaigns: number;
};
type CreatorRow = {
  id: string;
  name: string;
  email: string;
  applications: number;
};
type CampaignRow = {
  id: string;
  title: string;
  brand: string;
  status: string;
  applicants: number;
};

export default function AdminPage() {
  const supabase = createClient();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      const profMap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

      const { data: emails } = await supabase.rpc("admin_user_emails");
      const emailMap = new Map((emails as { id: string; email: string }[] | null)?.map((e) => [e.id, e.email]));

      const { data: bps } = await supabase
        .from("brand_profiles")
        .select("*");
      const { data: cps } = await supabase
        .from("creator_profiles")
        .select("*");
      const { data: camps } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: apps } = await supabase.from("applications").select("*");

      const brandRows = (bps as BrandProfile[] | null) ?? [];
      const campaignList = (camps as Campaign[] | null) ?? [];
      const appList = (apps as Application[] | null) ?? [];

      const campCountByBrand = new Map<string, number>();
      campaignList.forEach((c) =>
        campCountByBrand.set(c.brand_id, (campCountByBrand.get(c.brand_id) ?? 0) + 1),
      );
      const appCountByCreator = new Map<string, number>();
      const appCountByCampaign = new Map<string, number>();
      appList.forEach((a) => {
        appCountByCreator.set(a.creator_id, (appCountByCreator.get(a.creator_id) ?? 0) + 1);
        appCountByCampaign.set(a.campaign_id, (appCountByCampaign.get(a.campaign_id) ?? 0) + 1);
      });
      const brandName = (id: string) =>
        brandRows.find((b) => b.profile_id === id)?.company_name ||
        profMap.get(id)?.full_name ||
        "—";

      setBrands(
        brandRows.map((b) => ({
          id: b.profile_id,
          company: b.company_name || "—",
          email: emailMap.get(b.profile_id) || "—",
          campaigns: campCountByBrand.get(b.profile_id) ?? 0,
        })),
      );

      const creatorRows = (cps as CreatorProfile[] | null) ?? [];
      setCreators(
        creatorRows.map((c) => ({
          id: c.profile_id,
          name: profMap.get(c.profile_id)?.full_name || "—",
          email: emailMap.get(c.profile_id) || "—",
          applications: appCountByCreator.get(c.profile_id) ?? 0,
        })),
      );

      setCampaigns(
        campaignList.map((c) => ({
          id: c.id,
          title: c.title,
          brand: brandName(c.brand_id),
          status: c.status,
          applicants: appCountByCampaign.get(c.id) ?? 0,
        })),
      );
      setLoading(false);
    })();
  }, []);

  if (loading) return <SkeletonTable rows={6} cols={4} />;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Read-only overview. (Stub — no actions wired up yet.)
        </p>
      </div>

      <Table
        title="Brands"
        cols={["Company", "Email", "Campaigns"]}
        rows={brands.map((b) => [b.company, b.email, String(b.campaigns)])}
        empty="No brands yet."
      />
      <Table
        title="Creators"
        cols={["Name", "Email", "Applications"]}
        rows={creators.map((c) => [c.name, c.email, String(c.applications)])}
        empty="No creators yet."
      />
      <Table
        title="Campaigns"
        cols={["Title", "Brand", "Status", "Applicants"]}
        rows={campaigns.map((c) => [c.title, c.brand, c.status, String(c.applicants)])}
        badgeCol={2}
        empty="No campaigns yet."
      />
    </div>
  );
}

function Table({
  title,
  cols,
  rows,
  empty,
  badgeCol,
}: {
  title: string;
  cols: string[];
  rows: string[][];
  empty: string;
  badgeCol?: number;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-ink-2">({rows.length})</span>
      </h2>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-soft">{empty}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-mist text-ink-2">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-4 py-2.5 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-mist/50">
                  {r.map((cell, j) =>
                    badgeCol === j ? (
                      <td key={j} className="px-4 py-2.5">
                        <StatusBadge status={cell as Campaign["status"]} />
                      </td>
                    ) : (
                      <td key={j} className="whitespace-nowrap px-4 py-2.5">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
