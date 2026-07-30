// Lightweight auth bridge for FreshTrack.
// Keeps the same runtime behavior as the previous bridge.

import { createFreshtrackAuth } from "../../shims/cloud-auth-js";
import { supabase } from "../supabase/client";
const authBridge = createFreshtrackAuth();

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const freshtrackAuth = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      const result = await authBridge.signInWithOAuth(provider, {
        redirect_uri: opts?.redirect_uri,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        await supabase.auth.setSession(result.tokens);
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};
