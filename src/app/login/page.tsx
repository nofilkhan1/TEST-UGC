"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    const role = (prof as { role: string } | null)?.role;
    router.push(role === "brand" ? "/dashboard" : role === "creator" ? "/campaigns" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl brand-gradient text-sm font-bold text-white">
          S
        </span>
        <span className="text-lg font-bold tracking-tight">SideShift</span>
      </Link>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Log in to your SideShift account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-violet"
            placeholder="you@brand.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none focus:border-violet"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full text-base">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-violet">
          Create an account
        </Link>
      </p>
    </main>
  );
}
