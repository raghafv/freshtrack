import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Keeps `profiles` in sync with the signed-in account without ever clobbering
 * what the user typed: the display name is only written when the row is first
 * created (or when it is still empty). Email/avatar come from the verified JWT
 * claims, so Google sign-ins get a real email stored for support and admin.
 */
export const syncProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const claims = (context.claims ?? {}) as Record<string, unknown>;
    const meta = (claims["user_metadata"] ?? {}) as Record<string, unknown>;
    const email =
      (claims["email"] as string | undefined) ?? (meta["email"] as string | undefined) ?? null;
    const avatar =
      (meta["avatar_url"] as string | undefined) ?? (meta["picture"] as string | undefined) ?? null;
    const metaName =
      (meta["full_name"] as string | undefined) ??
      (meta["name"] as string | undefined) ??
      email?.split("@")[0] ??
      null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin
        .from("profiles")
        .insert({ id: context.userId, email, full_name: metaName, avatar_url: avatar });
      return { ok: true };
    }

    const patch: Record<string, unknown> = {};
    if (email && existing.email !== email) patch["email"] = email;
    if (avatar && !existing.avatar_url) patch["avatar_url"] = avatar;
    // Never overwrite a name the user chose themselves.
    if (!existing.full_name && metaName) patch["full_name"] = metaName;

    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from("profiles").update(patch).eq("id", context.userId);
    }
    return { ok: true };
  });
