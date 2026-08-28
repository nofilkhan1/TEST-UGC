"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brand fields
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  // Creator fields
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const r = (p as { role: Role } | null)?.role ?? null;
      if (!r || r === "admin") {
        router.replace("/login");
        return;
      }
      setRole(r);
      setLoading(false);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please log in again.");
      setSaving(false);
      return;
    }

    let err: { message: string } | null = null;
    if (role === "brand") {
      const res = await supabase.from("brand_profiles").insert({
        profile_id: user.id,
        company_name: companyName || null,
        website: website || null,
      });
      err = res.error;
    } else {
      const res = await supabase.from("creator_profiles").insert({
        profile_id: user.id,
        gender: gender || null,
        age: age ? parseInt(age, 10) : null,
        portfolio_url: portfolioUrl || null,
        bio: bio || null,
        instagram_handle: instagram || null,
        tiktok_handle: tiktok || null,
      });
      err = res.error;
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(role === "brand" ? "/brand/dashboard" : "/creator/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-ink-soft">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold">
        {role === "brand" ? "Set up your brand" : "Build your creator profile"}
      </h1>
      <p className="mt-2 text-ink-soft">
        {role === "brand"
          ? "Tell creators who they'd be working with."
          : "This is your common application — make it stand out."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {role === "brand" ? (
          <>
            <Field label="Company name">
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input"
                placeholder="Acme Co."
              />
            </Field>
            <Field label="Website (optional)">
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="input"
                placeholder="https://acme.com"
              />
            </Field>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Gender">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="input">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="input"
                  placeholder="24"
                />
              </Field>
            </div>
            <Field label="Portfolio URL">
              <input
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="input"
                placeholder="https://your-portfolio.com"
              />
            </Field>
            <Field label="Short bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="I make punchy UGC that converts…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Instagram">
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="input"
                  placeholder="@handle"
                />
              </Field>
              <Field label="TikTok">
                <input
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="input"
                  placeholder="@handle"
                />
              </Field>
            </div>
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary w-full text-base">
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
