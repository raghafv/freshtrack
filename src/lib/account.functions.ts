import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Signed pantry-photo links remain valid only while their object exists.
    // Remove every object in this user's isolated folder before account
    // deletion, so even previously issued links stop working immediately.
    const bucket = supabaseAdmin.storage.from("pantry-images");
    const photoPaths: string[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await bucket.list(userId, { limit: pageSize, offset });
      if (error) throw new Error("Could not securely remove pantry photos before account deletion.");
      photoPaths.push(...(data ?? []).filter((entry) => entry.id).map((entry) => `${userId}/${entry.name}`));
      if (!data || data.length < pageSize) break;
    }
    if (photoPaths.length > 0) {
      const { error } = await bucket.remove(photoPaths);
      if (error) throw new Error("Could not securely remove pantry photos before account deletion.");
    }

    await supabaseAdmin.from("pantry_items").delete().eq("user_id", userId);
    await supabaseAdmin.from("shopping_items").delete().eq("user_id", userId);
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("scan_history").delete().eq("user_id", userId);
    await supabaseAdmin.from("activity_log").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_settings").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
