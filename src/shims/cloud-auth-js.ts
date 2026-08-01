// Thin shim over the Lovable Cloud auth client used by the FreshTrack auth bridge.
import { createLovableAuth } from "freshtrack-cloud-auth";

export const createFreshtrackAuth = createLovableAuth;
export type {
  OAuthProvider,
  OAuthTokens,
  SignInWithOAuthOptions,
  SignInWithOAuthResult,
} from "freshtrack-cloud-auth";
