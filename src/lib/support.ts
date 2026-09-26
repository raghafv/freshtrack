import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const SUPPORT_CATEGORIES = [
  "Bug or glitch",
  "Scanner problem",
  "Recipe or AI problem",
  "Account & data",
  "Idea or feedback",
  "Other",
] as const;

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string | null;
  category: string;
  message: string;
  image_urls: string[];
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

/** Upload one support screenshot and return a long-lived signed link. */
export async function uploadSupportImage(userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("support-images").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage
    .from("support-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

/** Tickets the signed-in person has sent (admins additionally see everyone's). */
export function useMyTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["support-tickets", "mine", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

/** Every ticket in the app — returns nothing for non-admins thanks to access rules. */
export function useAllTickets() {
  return useQuery({
    queryKey: ["support-tickets", "all"],
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

export function useSubmitTicket() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { category: string; message: string; files: File[] }) => {
      if (!user) throw new Error("Please sign in first.");
      const urls: string[] = [];
      for (const file of input.files.slice(0, 3)) {
        const url = await uploadSupportImage(user.id, file);
        if (url) urls.push(url);
      }
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        user_email: user.email ?? null,
        category: input.category,
        message: input.message.trim(),
        image_urls: urls,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-tickets"] }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: string; admin_reply?: string }) => {
      const patch: {
        status?: string;
        admin_reply?: string;
        replied_at?: string;
      } = {};

      if (input.status) patch['status'] = input.status;
      if (input.admin_reply !== undefined) {
        patch['admin_reply'] = input.admin_reply;
        patch['replied_at'] = new Date().toISOString();
      }
      const { error } = await supabase.from("support_tickets").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-tickets"] }),
  });
}
