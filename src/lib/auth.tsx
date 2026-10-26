import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncProfile } from "@/lib/profile.functions";


interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // A refresh that momentarily returns no session must NOT sign the user
      // out — only an explicit sign-out (or a deleted user) ends the session.
      if (!next && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        setLoading(false);
        return;
      }
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Coming back to the tab/PWA after a while: make sure the token is fresh
    // instead of letting the next request fail and bounce us to the login page.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) setSession(data.session);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);


  useEffect(() => {
    if (!session?.user) return;
    // Server-side sync: fills in email/avatar from the verified token and only
    // ever sets the display name when the profile has none, so a name typed in
    // onboarding is never overwritten on the next sign-in.
    void syncProfile().catch(() => {});
  }, [session?.user?.id]);


  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
