"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, Application } from "@/lib/types";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
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
          (b as BrandProfileName | null)?.company_name ||
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
      setError(err.message.includes("duplicate") ? "You already applied." : err.message);
      return;
    }
    setExisting((data as Application) ?? null);
  }

  if (loading) {
    return <p className="text-ink-soft">Loading…</p>;
  }
  if (!campaign) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-soft">Campaign not found.</p>
        <Link href="/campaigns" className="btn btn-ghost mt-4">
          Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/campaigns" className="text-sm text-ink-soft hover:text-ink">
        ← All campaigns
      </Link>
      <div className="mt-4 flex items-center gap-2">
        <span className="chip capitalize">{campaign.platform}</span>
        <span className="text-sm text-ink-2">{brandName}</span>
      </div>
      <h1 className="mt-3 text-3xl font-bold">{campaign.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-ink-soft">{campaign.description}</p>
      <div className="mt-4 flex gap-3 text-sm">
        <span className="chip">{campaign.num_posts_required} post{campaign.num_posts_required > 1 ? "s" : ""} required</span>
        {campaign.start_date && <span className="chip">Starts {campaign.start_date}</span>}
        {campaign.end_date && <span className="chip">Ends {campaign.end_date}</span>}
      </div>

      <div className="card mt-8 p-6">
        {existing ? (
          <div>
            <h2 className="text-lg font-semibold">Your application</h2>
            <p className="mt-2">
              Status:{" "}
              <span className="font-semibold capitalize text-violet">{existing.status}</span>
            </p>
            {existing.status === "pending" && (
              <p className="mt-2 text-sm text-ink-soft">
                Sit tight — the brand reviews every applicant within 24 hours.
              </p>
            )}
            {existing.status === "approved" && (
              <p className="mt-2 text-sm text-success">
                Approved! The brand will reach out with next steps.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={apply} className="space-y-4">
            <h2 className="text-lg font-semibold">Apply to this campaign</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price per post (USD, optional)</label>
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

interface BrandProfileName {
  company_name: string | null;
}
