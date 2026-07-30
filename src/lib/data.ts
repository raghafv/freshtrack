import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type {
  ActivityEntry,
  AppNotification,
  PantryItem,
  ScanEntry,
  ShoppingItem,
  UserSettings,
} from "@/lib/freshtrack";

async function logActivity(action: string, itemName?: string | null, detail?: string | null) {
  await supabase.from("activity_log").insert({
    action,
    item_name: itemName ?? null,
    detail: detail ?? null,
  });
}

async function notify(title: string, body: string, type = "info") {
  await supabase.from("notifications").insert({ title, body, type });
}

/* ---------------------------------- pantry --------------------------------- */

export function usePantryItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pantry", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PantryItem[]> => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PantryItem[];
    },
  });
}

export type NewPantryItem = {
  name: string;
  brand?: string | null;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  storage: string;
  image_url?: string | null;
  source?: string;
  price?: number | null;
};

export function useAddPantryItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: NewPantryItem) => {
      const { data, error } = await supabase
        .from("pantry_items")
        .insert({ ...item, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      await logActivity("added", item.name, `${item.quantity} ${item.unit} · ${item.storage}`);
      await notify(
        "Item added to pantry",
        `${item.name} expires on ${item.expiry_date}.`,
        "success",
      );
      return data as PantryItem;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdatePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NewPantryItem> }) => {
      const { data, error } = await supabase
        .from("pantry_items")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logActivity("edited", data.name, "Item details updated");
      return data as PantryItem;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Quick +/- stock adjustment. Removes the item when it reaches zero. */
export function useAdjustQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      delta,
    }: {
      item: { id: string; name: string; quantity: number; unit: string };
      delta: number;
    }) => {
      const next = Number((Number(item.quantity) + delta).toFixed(2));
      if (next <= 0) {
        const { error } = await supabase.from("pantry_items").delete().eq("id", item.id);
        if (error) throw error;
        await logActivity("deleted", item.name, "Finished — removed from pantry");
        return { removed: true, quantity: 0 };
      }
      const { error } = await supabase
        .from("pantry_items")
        .update({ quantity: next })
        .eq("id", item.id);
      if (error) throw error;
      await logActivity(
        delta > 0 ? "restocked" : "used",
        item.name,
        `${delta > 0 ? "+" : ""}${delta} ${item.unit} · now ${next} ${item.unit}`,
      );
      return { removed: false, quantity: next };
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Merges a newly added product into an existing pantry entry, keeping history. */
export function useMergePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      quantity: number;
      unit: string;
      expiry_date: string;
      addedQuantity: number;
      purchase_date?: string;
      price?: number | null;
    }) => {
      const patch: { quantity: number; expiry_date: string; price?: number } = {
        quantity: input.quantity,
        expiry_date: input.expiry_date,
      };
      if (input.price != null) patch.price = input.price;
      const { error } = await supabase.from("pantry_items").update(patch).eq("id", input.id);

      if (error) throw error;
      await logActivity(
        "added",
        input.name,
        `Merged +${input.addedQuantity} ${input.unit}${
          input.purchase_date ? ` bought ${input.purchase_date}` : ""
        } · now ${input.quantity} ${input.unit}`,
      );
      await notify(
        "Stock merged",
        `${input.name} is now ${input.quantity} ${input.unit} in one entry.`,
        "info",
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeletePantryItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; name: string }[]) => {
      const ids = items.map((i) => i.id);
      const { error } = await supabase.from("pantry_items").delete().in("id", ids);
      if (error) throw error;
      await logActivity(
        "deleted",
        items.length === 1 ? items[0].name : `${items.length} items`,
        "Removed from pantry",
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}


/* --------------------------------- shopping -------------------------------- */

export function useShoppingItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shopping", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ShoppingItem[]> => {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShoppingItem[];
    },
  });
}

export function useShoppingMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["shopping", user?.id] });

  const add = useMutation({
    mutationFn: async (item: { name: string; category: string; quantity: number; unit: string }) => {
      const { error } = await supabase.from("shopping_items").insert({ ...item, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from("shopping_items").update({ checked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("shopping_items").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, toggle, remove };
}

/* ------------------------------- notifications ------------------------------ */

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const create = useMutation({
    mutationFn: async (n: { title: string; body: string; type?: string }) =>
      notify(n.title, n.body, n.type ?? "info"),
    onSuccess: invalidate,
  });

  return { markAllRead, markRead, clearAll, create };
}

/* --------------------------------- activity -------------------------------- */

export function useActivity(limit = 25) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activity", user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<ActivityEntry[]> => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityEntry[];
    },
  });
}

/* ----------------------------------- scans --------------------------------- */

export function useScanHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scans", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ScanEntry[]> => {
      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as ScanEntry[];
    },
  });
}

export function useRecordScan() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (scan: { method: string; items_added: number; note?: string }) => {
      const { error } = await supabase.from("scan_history").insert({ ...scan, user_id: user!.id });
      if (error) throw error;
      await logActivity("scan", null, `${scan.method} scan · ${scan.items_added} item(s) added`);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/* --------------------------------- settings -------------------------------- */

export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as UserSettings;
      const { data: created, error: insertError } = await supabase
        .from("user_settings")
        .insert({ user_id: user!.id })
        .select()
        .single();
      if (insertError) throw insertError;
      return created as UserSettings;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user!.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", user?.id] }),
  });
}

/* --------------------------------- profile --------------------------------- */

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: { full_name?: string; avatar_url?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user!.id, ...patch }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });
}

/* --------------------------------- storage --------------------------------- */

export async function uploadPantryImage(userId: string, file: File | Blob, ext = "jpg") {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("pantry-images").upload(path, file, {
    contentType: file instanceof File ? file.type : "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage
    .from("pantry-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

/* ---------------------------------- helpers -------------------------------- */

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["pantry"] });
  qc.invalidateQueries({ queryKey: ["activity"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
  qc.invalidateQueries({ queryKey: ["scans"] });
}

/* -------------------------------- assistant -------------------------------- */

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useAssistantMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assistant", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AssistantMessage[]> => {
      const { data, error } = await supabase
        .from("assistant_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AssistantMessage[];
    },
  });
}

export function useClearAssistant() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("assistant_messages")
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assistant", user?.id] }),
  });
}

export { logActivity, notify };
