"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, CampaignStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCards } from "@/components/Skeleton";
import { useToast } from "@/components/providers/ToastProvider";

type Filter = "all" | CampaignStatus;

export default function BrandDashboard() {
  const supabase = createClient();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("brand_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data as Campaign[]) ?? [];
    setCampaigns(list);

    if (list.length) {
      const ids = list.map((c) => c.id);
      const { data: apps } = await supabase
        .from("applications")
        .select("campaign_id")
        .in("campaign_id", ids);
      const map: Record<string, number> = {};
      (apps as { campaign_id: string }[] | null)?.forEach((a) => {
        map[a.campaign_id] = (map[a.campaign_id] ?? 0) + 1;
      });
      setCounts(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: CampaignStatus) {
    const prev = campaigns;
    setCampaigns((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    const { error } = await supabase
      .from("campaigns")
      .update({ status })
      .eq("id", id);
    if (error) {
      setCampaigns(prev);
      toast.error("Couldn't update the campaign.");
      return;
    }
    toast.success(status === "live" ? "Campaign is live 🚀" : "Campaign closed");
  }

  const filtered =
    filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "live", label: "Live" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your campaigns</h1>
          <p className="mt-1 text-ink-soft">
            Post a role, review applicants, approve in a click.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + New Campaign
        </button>
      </div>

      {showForm && (
        <NewCampaignForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading ? (
        <SkeletonCards />
      ) : campaigns.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center p-12 text-center">
          <div className="text-4xl">🚀</div>
          <h3 className="mt-3 text-lg font-semibold">No campaigns yet</h3>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            Create your first campaign and creators will start applying to it.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-5">
            + New Campaign
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  filter === t.key
                    ? "bg-ink text-white"
                    : "bg-mist-2 text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
                {t.key !== "all" &&
                  ` (${campaigns.filter((c) => c.status === t.key).length})`}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div key={c.id} className="card flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <PlatformPill platform={c.platform} />
                  <StatusBadge status={c.status} />
                </div>
                <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                  {c.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-ink-2">
                  <span className="chip">{c.num_posts_required} posts</span>
                  <span className="chip">
                    {c.start_date || c.end_date
                      ? `${c.start_date ?? "…"} → ${c.end_date ?? "…"}`
                      : "Flexible dates"}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-ink/5 pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mist-2 px-2.5 py-1 text-xs font-semibold text-ink-soft">
                    👤 {counts[c.id] ?? 0} applicant{counts[c.id] === 1 ? "" : "s"}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.status === "draft" && (
                      <button
                        onClick={() => setStatus(c.id, "live")}
                        className="btn btn-primary px-3 py-1.5 text-xs"
                      >
                        Publish
                      </button>
                    )}
                    {c.status === "live" && (
                      <button
                        onClick={() => setStatus(c.id, "closed")}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        Close
                      </button>
                    )}
                    <Link
                      href={`/brand/campaigns/${c.id}`}
                      className="btn btn-ghost px-3 py-1.5 text-xs"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlatformPill({ platform }: { platform: "instagram" | "tiktok" }) {
  const ig = platform === "instagram";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        ig ? "bg-pink-500/10 text-pink-600" : "bg-ink/90 text-white"
      }`}
    >
      {ig ? "📸 Instagram" : "🎵 TikTok"}
    </span>
  );
}

function NewCampaignForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [platform, setPlatform] = useState<"instagram" | "tiktok">("instagram");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numPosts, setNumPosts] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired.");
      setSaving(false);
      return;
    }
    // Saves as DRAFT — not visible to creators until Published.
    const { error: err } = await supabase.from("campaigns").insert({
      brand_id: user.id,
      platform,
      title,
      description,
      num_posts_required: parseInt(numPosts, 10) || 1,
      start_date: startDate || null,
      end_date: endDate || null,
      status: "draft",
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success("Draft saved — publish when you're ready");
    onCreated();
  }

  const platforms: { key: "instagram" | "tiktok"; icon: string; label: string }[] = [
    { key: "instagram", icon: "📸", label: "Instagram" },
    { key: "tiktok", icon: "🎵", label: "TikTok" },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <form onSubmit={submit} className="card w-full max-w-lg space-y-4 p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">New campaign</h2>
          <button type="button" onClick={onClose} className="text-ink-2">
            ✕
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Platform</label>
          <div className="grid grid-cols-2 gap-3">
            {platforms.map((p) => {
              const sel = platform === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPlatform(p.key)}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition ${
                    sel
                      ? p.key === "instagram"
                        ? "border-pink-500 bg-pink-500/10 text-pink-600"
                        : "border-ink bg-ink/90 text-white"
                      : "border-ink/10 text-ink-soft hover:border-ink/25"
                  }`}
                >
                  <span>{p.icon}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Summer skincare UGC"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Brief</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input resize-none"
            placeholder="What should creators make? Tone, deliverables, must-haves…"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Posts</label>
            <input
              type="number"
              min={1}
              value={numPosts}
              onChange={(e) => setNumPosts(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <p className="text-xs text-ink-2">
          Saves as a draft. Publish it when you&apos;re ready for creators to apply.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? "Saving…" : "Create draft"}
        </button>
      </form>
    </div>
  );
}
