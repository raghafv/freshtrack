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
  });

  if (error) {
    // Unique index on pending barcodes — someone submitted it a moment ago.
    if (error.code === "23505") return { status: "duplicate" };
    return { status: "error", message: error.message };
  }
  return { status: "submitted" };
}
