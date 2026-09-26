import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SAFE_FILE = /^[a-z0-9][a-z0-9._-]{0,80}\.(png|jpg|jpeg|webp)$/i;

/**
 * Signed links for the shared dish photo library.
 * The bucket itself stays closed to direct reads; links are handed out here,
 * only to signed-in people and only for plain file names in that library.
 */
export const getDishImageUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { files: string[] }) => ({
    files: (data?.files ?? []).filter((f) => typeof f === "string" && SAFE_FILE.test(f)).slice(0, 80),
  }))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (data.files.length === 0) return {};
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("foods")
      .createSignedUrls(data.files, 60 * 60 * 6);
    const map: Record<string, string> = {};
    for (const row of signed ?? []) {
      if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
    }
    return map;
  });
