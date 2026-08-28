"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, Application, Profile, CreatorProfile } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonRows } from "@/components/Skeleton";
import { useToast } from "@/components/providers/ToastProvider";

interface ApplicantView extends Application {
  creator_name: string | null;
  creator: CreatorProfile | null;
}

export default function BrandCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applicants, setApplicants] = useState<ApplicantView[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: c } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();
    setCampaign((c as Campaign) ?? null);

    const { data: apps } = await supabase
      .from("applications")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });
    const list = (apps as Application[]) ?? [];
    if (!list.length) {
      setApplicants([]);
      setLoading(false);
      return;
    }
    const ids = list.map((a) => a.creator_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const { data: cprofs } = await supabase
      .from("creator_profiles")
      .select("*")
      .in("profile_id", ids);
    const profMap = new Map((profs as Profile[] | null)?.map((p) => [p.id, p]));
    const cMap = new Map(
      (cprofs as CreatorProfile[] | null)?.map((c) => [c.profile_id, c]),
    );
    setApplicants(
      list.map((a) => ({
        ...a,
        creator_name: profMap.get(a.creator_id)?.full_name ?? null,
        creator: cMap.get(a.creator_id) ?? null,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function decide(appId: string, status: "approved" | "rejected") {
    setApplicants((list) =>
      list.map((a) => (a.id === appId ? { ...a, status } : a)),
    );
    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", appId);
    if (error) {
      toast.error("Couldn't update the application.");
      load();
      return;
    }
    toast.success(status === "approved" ? "Creator approved ✅" : "Application rejected");
  }

  if (loading)
    return (
      <div className="space-y-3">
        <SkeletonRows count={3} />
      </div>
    );
  if (!campaign)
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-soft">Campaign not found.</p>
        <Link href="/brand/dashboard" className="btn btn-ghost mt-4">
          Back to campaigns
        </Link>
      </div>
    );

  const pending = applicants.filter((a) => a.status === "pending").length;

  return (
    <div>
      <Link href="/brand/dashboard" className="text-sm text-ink-soft hover:text-ink">
        ← All campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            campaign.platform === "instagram"
              ? "bg-pink-500/10 text-pink-600"
              : "bg-ink/90 text-white"
          }`}
        >
          {campaign.platform === "instagram" ? "📸 Instagram" : "🎵 TikTok"}
        </span>
        <StatusBadge status={campaign.status} />
        <span className="text-sm text-ink-2">
          {campaign.num_posts_required} post{campaign.num_posts_required > 1 ? "s" : ""}
          {campaign.start_date || campaign.end_date
            ? ` · ${campaign.start_date ?? "…"} → ${campaign.end_date ?? "…"}`
            : ""}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold">{campaign.title}</h1>
      <p className="mt-3 max-w-2xl whitespace-pre-wrap text-ink-soft">
        {campaign.description}
      </p>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Applicants <span className="text-ink-2">({applicants.length})</span>
        </h2>
        {pending > 0 && (
          <span className="chip bg-warning/15 text-warning">
            {pending} awaiting review
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {applicants.length === 0 && (
          <div className="card p-8 text-center text-ink-soft">
            No applications so far.
          </div>
        )}
        {applicants.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">
                    {a.creator_name ?? "Creator"}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                  {a.creator?.age != null && <span>Age {a.creator.age}</span>}
                  {a.creator?.gender && <span className="capitalize">{a.creator.gender}</span>}
                  {a.creator?.instagram_handle && (
                    <span>IG {a.creator.instagram_handle}</span>
                  )}
                  {a.creator?.tiktok_handle && (
                    <span>TT {a.creator.tiktok_handle}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.creator?.portfolio_url && (
                    <a
                      href={a.creator.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="chip hover:bg-mist"
                    >
                      Portfolio ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="text-right">
                {a.price_per_post != null && (
                  <div className="text-lg font-bold text-violet">
                    ${a.price_per_post}
                    <span className="text-xs font-normal text-ink-2">/post</span>
                  </div>
                )}
              </div>
            </div>

            {a.pitch && (
              <p className="mt-3 rounded-xl bg-mist px-3 py-2 text-sm italic text-ink-soft">
                “{a.pitch}”
              </p>
            )}

            {a.status === "pending" ? (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => decide(a.id, "rejected")}
                  className="btn btn-ghost px-4 py-1.5 text-sm"
                >
                  Reject
                </button>
                <button
                  onClick={() => decide(a.id, "approved")}
                  className="btn btn-primary px-4 py-1.5 text-sm"
                >
                  Approve
                </button>
              </div>
            ) : (
              <div className="mt-4 flex justify-end">
                <StatusBadge status={a.status} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
