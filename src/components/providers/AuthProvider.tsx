"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

interface AuthState {
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function refresh() {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    setUser({ id: u.id, email: u.email ?? null });
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .single();
    setProfile((p as Profile) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
