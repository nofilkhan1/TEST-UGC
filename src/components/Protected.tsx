"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";

export function Protected({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center text-ink-soft">
        Loading…
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </>
  );
}
