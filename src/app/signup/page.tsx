"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get("role") === "creator" ? "creator" : "brand";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function createProfile(userId: string): Promise<boolean> {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      role,
      full_name: fullName,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signupErr) {
      setLoading(false);
      setError(signupErr.message);
      return;
    }

    // If email confirmation is off, a session is returned immediately.
    if (data.session && data.user) {
      const ok = await createProfile(data.user.id);
      setLoading(false);
      if (!ok) setError("Could not create your profile.");
      else {
        router.push("/onboarding");
        router.refresh();
      }
      return;
    }

    // Email confirmation is on: auto-confirm server-side, then sign in.
    if (data.user) {
      const confirmRes = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id }),
      });
      if (confirmRes.ok) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) {
          setLoading(false);
          setError(signInErr.message);
          return;
        }
        const ok = await createProfile(data.user.id);
        setLoading(false);
        if (!ok) setError("Could not create your profile.");
        else {
          router.push("/onboarding");
          router.refresh();
        }
        return;
      }
    }

    setLoading(false);
    setInfo(
      "Account created! Check your email to confirm, then log in.",
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl brand-gradient text-sm font-bold text-white">
          S
        </span>
        <span className="text-lg font-bold tracking-tight">SideShift</span>
      </Link>
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-ink-soft">Join as a brand or a creator.</p>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-ink-soft">I am a…</p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                r: "brand",
                icon: "🏢",
                title: "Brand",
                desc: "Post campaigns and hire creators",
              },
              {
                r: "creator",
                icon: "🎬",
                title: "Creator",
                desc: "Apply to campaigns, get paid",
              },
            ] as { r: Role; icon: string; title: string; desc: string }[]
          ).map((opt) => {
            const selected = role === opt.r;
            return (
              <button
                key={opt.r}
                type="button"
                onClick={() => setRole(opt.r)}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  selected
                    ? "border-violet bg-mist-2 shadow-pop"
                    : "border-ink/10 hover:border-ink/25"
                }`}
              >
                <div className="text-2xl">{opt.icon}</div>
                <div className="mt-2 font-bold">{opt.title}</div>
                <div className="mt-0.5 text-xs text-ink-soft">{opt.desc}</div>
                <div
                  className={`mt-3 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    selected ? "border-violet bg-violet text-white" : "border-ink/30"
                  }`}
                >
                  {selected && <span className="text-[10px]">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {role === "brand" ? "Your name" : "Full name"}
          </label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-violet"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-violet"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-violet"
            placeholder="At least 6 characters"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-success">{info}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full text-base">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet">
          Log in
        </Link>
      </p>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
