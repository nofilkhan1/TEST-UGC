"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, Application } from "@/lib/types";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/providers/ToastProvider";

export default function CreatorCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [brandName, setBrandName] = useState<string>("A brand");
  const [existing, setExisting] = useState<Application | null>(null);
  const [price, setPrice] = useState("");
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      setCampaign((c as Campaign) ?? null);
      if (c) {
        const { data: b } = await supabase
          .from("brand_profiles")
          .select("company_name")
          .eq("profile_id", (c as Campaign).brand_id)
          .single();
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (c as Campaign).brand_id)
          .single();
        setBrandName(
          (b as { company_name: string | null } | null)?.company_name ||
            (p as { full_name: string } | null)?.full_name ||
            "A brand",
        );
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: app } = await supabase
          .from("applications")
          .select("*")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .maybeSingle();
        setExisting((app as Application) ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Please log in as a creator.");
      setSaving(false);
      return;
    }
    const { data, error: err } = await supabase
      .from("applications")
      .insert({
        campaign_id: id,
        creator_id: user.id,
        price_per_post: price ? parseFloat(price) : null,
        pitch: pitch || null,
        status: "pending",
      })
      .select()
      .single();
    setSaving(false);
    if (err) {
      if (err.message.toLowerCase().includes("duplicate")) {
        // Race: someone else inserted it (or it existed) — show applied state.
        const { data: app } = await supabase
          .from("applications")
          .select("*")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .maybeSingle();
        setExisting((app as Application) ?? null);
        toast.info("You've already applied to this campaign.");
        return;
      }
      setError(err.message);
      toast.error("Couldn't submit your application.");
      return;
    }
    setExisting((data as Application) ?? null);
    toast.success("Application sent — you're in the queue 🎉");
  }

  if (loading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  if (!campaign)
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-soft">Campaign not found.</p>
        <Link href="/creator/dashboard" className="btn btn-ghost mt-4">
          Back to browse
        </Link>
      </div>
    );

  const ig = campaign.platform === "instagram";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/creator/dashboard" className="text-sm text-ink-soft hover:text-ink">
        ← Browse campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            ig ? "bg-pink-500/10 text-pink-600" : "bg-ink/90 text-white"
          }`}
        >
          {ig ? "📸 Instagram" : "🎵 TikTok"}
        </span>
        <span className="text-sm text-ink-2">{brandName}</span>
        <span className="text-sm text-ink-2">
          {campaign.num_posts_required} post{campaign.num_posts_required > 1 ? "s" : ""}
          {campaign.start_date || campaign.end_date
            ? ` · ${campaign.start_date ?? "…"} → ${campaign.end_date ?? "…"}`
            : ""}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold">{campaign.title}</h1>
      <p className="mt-3 whitespace-pre-wrap text-ink-soft">{campaign.description}</p>

      <div className="card mt-8 p-6">
        {existing ? (
          <div>
            <h2 className="text-lg font-semibold">Your application</h2>
            <p className="mt-2">
              Status:{" "}
              <span className="font-semibold capitalize text-violet">
                {existing.status}
              </span>
            </p>
            {existing.status === "pending" && (
              <p className="mt-2 text-sm text-ink-soft">
                You&apos;re in the queue — the brand reviews every applicant (usually
                within 24 hours).
              </p>
            )}
            {existing.status === "approved" && (
              <p className="mt-2 text-sm text-success">
                Approved! The brand will reach out with next steps.
              </p>
            )}
            {existing.status === "rejected" && (
              <p className="mt-2 text-sm text-ink-soft">
                Not this time — but more campaigns are waiting.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={apply} className="space-y-4">
            <h2 className="text-lg font-semibold">Apply — it&apos;s one tap</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Price per post (USD, optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input"
                placeholder="80"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Pitch (optional)
              </label>
              <textarea
                rows={3}
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                className="input resize-none"
                placeholder="Why you're a great fit…"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? "Submitting…" : "Submit application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
