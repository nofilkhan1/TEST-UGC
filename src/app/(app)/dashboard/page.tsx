"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, Application, Profile, CreatorProfile } from "@/lib/types";

interface ApplicantView extends Application {
  creator_name: string | null;
  creator: CreatorProfile | null;
}

export default function BrandDashboard() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadCampaigns() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("brand_id", user.id)
      .order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
    if (!selectedId && (data as Campaign[])?.length) {
      setSelectedId((data as Campaign[])[0].id);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedId) loadApplicants(selectedId);
  }, [selectedId]);

  async function loadApplicants(campaignId: string) {
    const { data: apps } = await supabase
      .from("applications")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    const list = (apps as Application[]) ?? [];
    if (!list.length) {
      setApplicants([]);
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
  }

  async function setStatus(appId: string, status: "approved" | "rejected") {
    await supabase.from("applications").update({ status }).eq("id", appId);
    if (selectedId) loadApplicants(selectedId);
  }

  const selected = campaigns.find((c) => c.id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your campaigns</h1>
          <p className="mt-1 text-ink-soft">
            Post a role, review applicants, approve in a click.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + New campaign
        </button>
      </div>

      {showForm && (
        <NewCampaignForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadCampaigns();
          }}
        />
      )}

      {loading ? (
        <p className="mt-10 text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Campaign list */}
          <div className="space-y-3">
            {campaigns.length === 0 && (
              <div className="card p-6 text-sm text-ink-soft">
                No campaigns yet. Create your first one.
              </div>
            )}
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`card w-full p-4 text-left transition ${
                  c.id === selectedId ? "ring-2 ring-violet" : "hover:shadow-pop"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="chip capitalize">{c.platform}</span>
                  <StatusBadge status={c.status} />
                </div>
                <h3 className="mt-2 font-semibold">{c.title}</h3>
                <p className="mt-1 text-xs text-ink-2">
                  {c.num_posts_required} post{c.num_posts_required > 1 ? "s" : ""} required
                </p>
              </button>
            ))}
          </div>

          {/* Applicants */}
          <div>
            {selected ? (
              <>
                <h2 className="text-xl font-semibold">{selected.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">{selected.description}</p>
                <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-2">
                  Applicants ({applicants.length})
                </h3>
                <div className="mt-3 space-y-3">
                  {applicants.length === 0 && (
                    <div className="card p-6 text-sm text-ink-soft">
                      No applications yet — share your campaign link to get creators applying.
                    </div>
                  )}
                  {applicants.map((a) => (
                    <div key={a.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{a.creator_name}</span>
                            <StatusBadge status={a.status} />
                          </div>
                          {a.creator?.bio && (
                            <p className="mt-1 text-sm text-ink-soft">{a.creator.bio}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-2">
                            {a.creator?.instagram_handle && (
                              <span className="chip">IG {a.creator.instagram_handle}</span>
                            )}
                            {a.creator?.tiktok_handle && (
                              <span className="chip">TT {a.creator.tiktok_handle}</span>
                            )}
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
                          {a.pitch && (
                            <p className="mt-2 text-sm italic text-ink-soft">
                              “{a.pitch}”
                            </p>
                          )}
                          {a.price_per_post != null && (
                            <p className="mt-1 text-sm text-ink-soft">
                              Asks ${a.price_per_post} / post
                            </p>
                          )}
                        </div>
                        {a.status === "pending" && (
                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              onClick={() => setStatus(a.id, "approved")}
                              className="btn btn-primary px-4 py-1.5 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setStatus(a.id, "rejected")}
                              className="btn btn-ghost px-4 py-1.5 text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="card p-8 text-center text-ink-soft">
                Select a campaign to see applicants.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-mist-2 text-ink-soft",
    live: "bg-success/15 text-success",
    closed: "bg-ink/10 text-ink-soft",
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    rejected: "bg-danger/15 text-danger",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status]}`}>
      {status}
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
    const { error: err } = await supabase.from("campaigns").insert({
      brand_id: user.id,
      platform,
      title,
      description,
      num_posts_required: parseInt(numPosts, 10) || 1,
      start_date: startDate || null,
      end_date: endDate || null,
      status: "live",
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <form
        onSubmit={submit}
        className="card w-full max-w-lg space-y-4 p-7"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">New campaign</h2>
          <button type="button" onClick={onClose} className="text-ink-2">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["instagram", "tiktok"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold capitalize ${
                platform === p ? "border-violet bg-mist-2" : "border-ink/10"
              }`}
            >
              {p}
            </button>
          ))}
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
        <div className="grid grid-cols-3 gap-3">
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? "Publishing…" : "Publish campaign"}
        </button>
      </form>
    </div>
  );
}
