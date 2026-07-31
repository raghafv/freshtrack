import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  pantry_items: number;
  shopping_items: number;
  scans: number;
  ai_calls: number;
  last_ai_at: string | null;
  push_devices: number;
}

export interface AdminOverview {
  totals: {
    users: number;
    pantryItems: number;
    aiCalls: number;
    aiCalls24h: number;
    aiFailures: number;
    pushDevices: number;
  };
  byProvider: { provider: string; calls: number; avgMs: number; failures: number }[];
  byFeature: { feature: string; calls: number }[];
  daily: { date: string; calls: number }[];
  users: AdminUserRow[];
}

/** True when the signed-in user holds the admin role. */
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ admin: boolean }> => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { admin: Boolean(data) };
  });

/** Owner-only cross-user analytics: AI usage, app usage and pantry sizes. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, usage, pantry, shopping, scans, pushes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, created_at"),
      supabaseAdmin
        .from("ai_usage_log")
        .select("user_id, feature, provider, ok, ms, created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabaseAdmin.from("pantry_items").select("user_id"),
      supabaseAdmin.from("shopping_items").select("user_id"),
      supabaseAdmin.from("scan_history").select("user_id"),
      supabaseAdmin.from("push_subscriptions").select("user_id"),
    ]);

    const count = (rows: { user_id: string | null }[] | null) => {
      const map = new Map<string, number>();
      for (const row of rows ?? []) {
        if (!row.user_id) continue;
        map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
      }
      return map;
    };

    const pantryBy = count(pantry.data);
    const shoppingBy = count(shopping.data);
    const scansBy = count(scans.data);
    const pushBy = count(pushes.data);

    const logs = usage.data ?? [];
    const aiBy = new Map<string, { calls: number; last: string }>();
    const providers = new Map<string, { calls: number; ms: number; failures: number }>();
    const features = new Map<string, number>();
    const days = new Map<string, number>();
    const since24h = Date.now() - 86_400_000;
    let aiCalls24h = 0;
    let aiFailures = 0;

    for (const log of logs) {
      if (log.user_id) {
        const prev = aiBy.get(log.user_id);
        aiBy.set(log.user_id, {
          calls: (prev?.calls ?? 0) + 1,
          last: prev?.last ?? log.created_at,
        });
      }
      const p = log.provider ?? "unknown";
      const agg = providers.get(p) ?? { calls: 0, ms: 0, failures: 0 };
      agg.calls++;
      agg.ms += log.ms ?? 0;
      if (!log.ok) agg.failures++;
      providers.set(p, agg);

      features.set(log.feature, (features.get(log.feature) ?? 0) + 1);
      const day = log.created_at.slice(0, 10);
      days.set(day, (days.get(day) ?? 0) + 1);
      if (new Date(log.created_at).getTime() >= since24h) aiCalls24h++;
      if (!log.ok) aiFailures++;
    }

    const users: AdminUserRow[] = (profiles.data ?? [])
      .map((p) => ({
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        pantry_items: pantryBy.get(p.id) ?? 0,
        shopping_items: shoppingBy.get(p.id) ?? 0,
        scans: scansBy.get(p.id) ?? 0,
        ai_calls: aiBy.get(p.id)?.calls ?? 0,
        last_ai_at: aiBy.get(p.id)?.last ?? null,
        push_devices: pushBy.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.ai_calls - a.ai_calls || b.pantry_items - a.pantry_items);

    return {
      totals: {
        users: users.length,
        pantryItems: pantry.data?.length ?? 0,
        aiCalls: logs.length,
        aiCalls24h,
        aiFailures,
        pushDevices: pushes.data?.length ?? 0,
      },
      byProvider: [...providers.entries()]
        .map(([provider, v]) => ({
          provider,
          calls: v.calls,
          avgMs: v.calls ? Math.round(v.ms / v.calls) : 0,
          failures: v.failures,
        }))
        .sort((a, b) => b.calls - a.calls),
      byFeature: [...features.entries()]
        .map(([feature, calls]) => ({ feature, calls }))
        .sort((a, b) => b.calls - a.calls),
      daily: [...days.entries()]
        .map(([date, calls]) => ({ date, calls }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14),
      users,
    };
  });
