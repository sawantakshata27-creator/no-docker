import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  team_name: string | null;
  onboarded: boolean;
  current_org_id: string | null;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  owner_id: string;
}

export interface Membership {
  id: string;
  org_id: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  org: Organization | null;
  membership: Membership | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  org: null,
  membership: null,
  loading: true,
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        setTimeout(() => get().refreshProfile(), 0);
      } else {
        set({ profile: null, org: null, membership: null });
      }
    });

    // If we landed here from an OAuth redirect with a PKCE ?code= param,
    // exchange it for a session before fetching state, then clean the URL.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("code")) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        } catch (e) {
          console.error("[auth] exchangeCodeForSession failed", e);
        }
      }
    }

    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, loading: false });
    if (data.session?.user) await get().refreshProfile();
  },
  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, team_name, onboarded, current_org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return;
    set({ profile: profile as Profile });

    let org: Organization | null = null;
    let membership: Membership | null = null;
    if (profile.current_org_id) {
      const { data: o } = await supabase
        .from("organizations")
        .select("id, name, code, owner_id")
        .eq("id", profile.current_org_id)
        .maybeSingle();
      org = (o as Organization) ?? null;
      const { data: m } = await supabase
        .from("organization_members")
        .select("id, org_id, role, status")
        .eq("org_id", profile.current_org_id)
        .eq("user_id", user.id)
        .maybeSingle();
      membership = (m as Membership) ?? null;
    }
    set({ org, membership });
  },
  switchOrg: async (orgId: string) => {
    const { user } = get();
    if (!user) return;
    await supabase.from("profiles").update({ current_org_id: orgId }).eq("id", user.id);
    await get().refreshProfile();
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, org: null, membership: null });
  },
}));
