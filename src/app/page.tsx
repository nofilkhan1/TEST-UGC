import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl brand-gradient text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">SideShift</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
          <Link href="/campaigns" className="hover:text-ink">
            Browse campaigns
          </Link>
          <Link href="/login" className="hover:text-ink">
            Log in
          </Link>
        </nav>
        <Link href="/signup" className="btn btn-primary">
          Get started
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-violet/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-16 text-center md:pt-24">
          <span className="chip mb-5">1M+ creators apply to you — not the other way around</span>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold md:text-7xl">
            Get <span className="brand-text">50+ qualified creator</span> applications in 24 hours.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft">
            Post a UGC campaign. Vetted creators apply to you. Approve in a few
            clicks, track what performs, and pay out fast — all in one place.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup?role=brand" className="btn btn-primary text-base">
              I&apos;m a brand
            </Link>
            <Link href="/signup?role=creator" className="btn btn-ghost text-base">
              I&apos;m a creator
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-2">Free to start · No credit card</p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">
          From brief to approved in three steps
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Post the role",
              d: "Write a one-tap brief. Creators from a 1M+ pool raise their hand — no cold DMs.",
            },
            {
              n: "02",
              t: "Review & approve",
              d: "Browse applicants, see their profile and top videos, approve the best in a click.",
            },
            {
              n: "03",
              t: "Track & pay",
              d: "Creators fulfill, you track performance, and approved work pays out automatically.",
            },
          ].map((c) => (
            <div key={c.n} className="card p-7">
              <div className="brand-text text-2xl font-bold">{c.n}</div>
              <h3 className="mt-3 text-xl font-semibold">{c.t}</h3>
              <p className="mt-2 text-ink-soft">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature split */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="card overflow-hidden p-0">
            <div className="brand-gradient h-40 w-full" />
            <div className="p-7">
              <h3 className="text-xl font-semibold">For brands</h3>
              <p className="mt-2 text-ink-soft">
                Stop tracking in spreadsheets. Every applicant, view, and payout
                lives in one dashboard.
              </p>
            </div>
          </div>
          <div className="card overflow-hidden p-0">
            <div className="h-40 w-full bg-mist-2" />
            <div className="p-7">
              <h3 className="text-xl font-semibold">For creators</h3>
              <p className="mt-2 text-ink-soft">
                One profile is your common application. Attach handles and your
                best videos, then apply to campaigns with a tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="brand-gradient rounded-2xl px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">
            Launch your first campaign today.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/80">
            Join 3,000+ brands already hiring creators on SideShift.
          </p>
          <Link
            href="/signup"
            className="btn mt-7 bg-white text-ink hover:bg-white/90"
          >
            Get started — it&apos;s free
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/5 py-8 text-center text-sm text-ink-2">
        © 2026 SideShift. Built for the 8x assignment.
      </footer>
    </main>
  );
}
