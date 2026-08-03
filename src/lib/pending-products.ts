import { supabase } from "@/integrations/supabase/client";

/**
 * Unknown barcodes are never written straight into the shared catalog.
 * They go into `pending_products` and only reach the global `products`
 * table once an admin approves them.
 */

export type PendingSubmitResult =
  | { status: "submitted" }
  | { status: "duplicate" }
  | { status: "error"; message: string };

export async function submitPendingProduct(input: {
  barcode: string;
  name: string;
  quantity: string;
  imageUrl?: string | null;
  userId?: string | null;
  shelfLifeDays?: number | null;
}): Promise<PendingSubmitResult> {
  const barcode = input.barcode.replace(/\D/g, "");
  if (!barcode) return { status: "error", message: "That barcode looks invalid." };

  const { data: existing } = await supabase
    .from("pending_products")
    .select("id")
    .eq("barcode", barcode)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return { status: "duplicate" };

  const { error } = await supabase.from("pending_products").insert({
    barcode,
    name: input.name.trim(),
    quantity: input.quantity.trim() || null,
    image_url: input.imageUrl ?? null,
    submitted_by: input.userId ?? null,
    shelf_life_days:
      input.shelfLifeDays && input.shelfLifeDays > 0 ? Math.round(input.shelfLifeDays) : null,
  });


  if (error) {
    // Unique index on pending barcodes — someone submitted it a moment ago.
    if (error.code === "23505") return { status: "duplicate" };
    return { status: "error", message: error.message };
  }
  return { status: "submitted" };
}

/**
 * A barcode the signed-in user already described but that an admin hasn't
 * approved yet. Used so the same product never re-opens the "new barcode"
 * form after the user has taught it once.
 */
export async function findMyPendingProduct(
  code: string,
  userId?: string | null,
): Promise<{ name: string; quantity: string | null; shelfLifeDays: number | null } | null> {
  const barcode = code.replace(/\D/g, "");
  if (!barcode || !userId) return null;
  const { data } = await supabase
    .from("pending_products")
    .select("name, quantity, shelf_life_days")
    .eq("barcode", barcode)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data
    ? { name: data.name, quantity: data.quantity, shelfLifeDays: data.shelf_life_days }
    : null;
}

