import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Exact-barcode lookup in the shared catalog. The table itself is no longer
 * readable in bulk; signed-in users can only fetch one product by its barcode.
 */
export const lookupCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { barcode: string }) => {
    const barcode = String(data?.barcode ?? "").replace(/\D/g, "").slice(0, 32);
    if (barcode.length < 6) throw new Error("Invalid barcode");
    return { barcode };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("barcode,name,brand,category,size,image_url,shelf_life_days,storage,source")
      .eq("barcode", data.barcode)
      .maybeSingle();
    if (error) return { product: null };
    return { product: row ?? null };
  });
