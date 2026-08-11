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
    return { admin: await isOwnerOrAdmin(context) };
  });

/** Owner-only cross-user analytics: AI usage, app usage and pantry sizes. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context);

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

export interface AdminPantryRow {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  unit: string;
  storage: string;
  purchase_date: string;
  expiry_date: string;
}

export interface AdminUserDetail {
  profile: {
    user_id: string;
    email: string | null;
    full_name: string | null;
    created_at: string | null;
  };
  pantry: AdminPantryRow[];
  shopping: { id: string; name: string; quantity: number; unit: string; checked: boolean }[];
  scans: { id: string; method: string; items_added: number; created_at: string }[];
  products: { id: string; barcode: string; name: string; brand: string | null; created_at: string }[];
  aiCalls: number;
}

export const OWNER_EMAIL = "raghav.goyal909@gmail.com";

/** True only for the permanent owner account, verified from the signed token. */
async function isOwner(context: { supabase: any; userId: string; claims?: any }) {
  const claimEmail = (context.claims?.email ?? context.claims?.user_metadata?.email) as
    | string
    | undefined;
  if (claimEmail?.toLowerCase() === OWNER_EMAIL) return true;

  const { data: profile } = await context.supabase
    .from("profiles")
    .select("email")
    .eq("id", context.userId)
    .maybeSingle();

  return profile?.email?.toLowerCase() === OWNER_EMAIL;
}

async function isOwnerOrAdmin(context: { supabase: any; userId: string; claims?: any }) {
  if (await isOwner(context)) return true;

  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  return Boolean(data);
}

async function assertAdmin(context: { supabase: any; userId: string; claims?: any }) {
  if (!(await isOwnerOrAdmin(context))) throw new Error("Forbidden");
}

/** Guard for actions only the owner may perform, such as granting admin rights. */
async function assertOwner(context: { supabase: any; userId: string; claims?: any }) {
  if (!(await isOwner(context))) throw new Error("Forbidden");
}

/** True only for the permanent owner — unlocks the role-management panel. */
export const amIOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ owner: boolean }> => {
    return { owner: await isOwner(context) };
  });

export interface AdminRoleRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_owner: boolean;
}

/** Owner-only: everyone who currently holds the admin role. */
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ admins: AdminRoleRow[] }> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { admins: [] };

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);

    return {
      admins: ids.map((id) => {
        const p = (profiles ?? []).find((x) => x.id === id);
        return {
          user_id: id,
          email: p?.email ?? null,
          full_name: p?.full_name ?? null,
          is_owner: (p?.email ?? "").toLowerCase() === OWNER_EMAIL,
        };
      }),
    };
  });

/** Owner-only: grant or revoke the admin role for an account, by email. */
export const setAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; grant: boolean }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Enter a valid email address");
    return { email, grant: Boolean(data?.grant) };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; message: string }> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", data.email)
      .maybeSingle();

    if (!profile) throw new Error("No FreshTrack account uses that email address.");
    if (data.email === OWNER_EMAIL && !data.grant) {
      throw new Error("The owner account cannot lose admin access.");
    }

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: profile.id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error("Could not grant admin access.");
      return { ok: true, message: `${data.email} is now an admin.` };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", profile.id)
      .eq("role", "admin");
    if (error) throw new Error("Could not remove admin access.");
    return { ok: true, message: `${data.email} is no longer an admin.` };
  });


/** Owner-only, read-only detail view of a single user's account and pantry. */
export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => {
    if (!data?.userId || typeof data.userId !== "string") throw new Error("userId required");
    return { userId: data.userId };
  })
  .handler(async ({ data, context }): Promise<AdminUserDetail> => {
    // Another person's account contents are owner-only, never general-admin.
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.userId;

    const [profile, pantry, shopping, scans, products, ai] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, created_at").eq("id", uid).maybeSingle(),
      supabaseAdmin
        .from("pantry_items")
        .select("id, name, brand, category, quantity, unit, storage, purchase_date, expiry_date")
        .eq("user_id", uid)
        .order("expiry_date", { ascending: true }),
      supabaseAdmin
        .from("shopping_items")
        .select("id, name, quantity, unit, checked")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("scan_history")
        .select("id, method, items_added, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("products")
        .select("id, barcode, name, brand, created_at")
        .eq("created_by", uid)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("ai_usage_log").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);

    return {
      profile: {
        user_id: uid,
        email: profile.data?.email ?? null,
        full_name: profile.data?.full_name ?? null,
        created_at: profile.data?.created_at ?? null,
      },
      pantry: (pantry.data ?? []) as AdminPantryRow[],
      shopping: shopping.data ?? [],
      scans: scans.data ?? [],
      products: products.data ?? [],
      aiCalls: ai.count ?? 0,
    };
  });

export interface AdminProductRow {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  size: string | null;
  storage: string;
  shelf_life_days: number;
  source: string;
  created_by: string | null;
  created_at: string;
}

/** Owner-only, read-only list of the global barcode/product database. */
export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string } | undefined) => ({ search: data?.search ?? "" }))
  .handler(async ({ data, context }): Promise<{ total: number; rows: AdminProductRow[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const term = data.search.trim();
    let query = supabaseAdmin
      .from("products")
      .select("id, barcode, name, brand, category, size, storage, shelf_life_days, source, created_by, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(200);
    if (term) query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%,brand.ilike.%${term}%`);

    const { data: rows, count, error } = await query;
    if (error) throw error;
    return { total: count ?? rows?.length ?? 0, rows: (rows ?? []) as AdminProductRow[] };
  });

export interface PendingProductRow {
  id: string;
  barcode: string;
  name: string;
  quantity: string | null;
  image_url: string | null;
  back_image_url: string | null;
  shelf_life_days: number | null;
  submitted_by: string | null;
  submitter_email: string | null;
  status: string;
  created_at: string;
}

/** Owner-only queue of user-submitted barcodes awaiting approval. */
export const getPendingProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string } | undefined) => ({ status: data?.status ?? "pending" }))
  .handler(async ({ data, context }): Promise<{ rows: PendingProductRow[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("pending_products")
      .select(
        "id, barcode, name, quantity, image_url, back_image_url, shelf_life_days, submitted_by, status, created_at",
      )
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = [...new Set((rows ?? []).map((r) => r.submitted_by).filter(Boolean))] as string[];
    const emails = new Map<string, string | null>();
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email").in("id", ids);
      for (const p of profiles ?? []) emails.set(p.id, p.email);
    }

    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        submitter_email: r.submitted_by ? (emails.get(r.submitted_by) ?? null) : null,
      })) as PendingProductRow[],
    };
  });

/** Approve a submission: move it into the global products catalog. */
export const approvePendingProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      name?: string;
      quantity?: string | null;
      brand?: string | null;
      category?: string | null;
      storage?: string | null;
      shelfLifeDays?: number | null;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<{ ok: true; barcode: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { brandForName, categoryForName, shelfDaysForCategory, storageForCategory } =
      await import("@/lib/product-meta");

    const { data: row, error } = await supabaseAdmin
      .from("pending_products")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Submission not found");

    const name = (data.name ?? row.name).trim();
    const size = (data.quantity ?? row.quantity)?.trim() || null;
    const category = data.category?.trim() || categoryForName(name);
    const brand = data.brand?.trim() || brandForName(name);
    const storage = data.storage?.trim() || storageForCategory(category, name);
    const submittedShelf = (row as { shelf_life_days?: number | null }).shelf_life_days ?? null;
    const shelf =
      data.shelfLifeDays && data.shelfLifeDays > 0
        ? data.shelfLifeDays
        : submittedShelf && submittedShelf > 0
          ? submittedShelf
          : shelfDaysForCategory(category, name);


    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("barcode")
      .eq("barcode", row.barcode)
      .maybeSingle();

    if (existing) {
      const { error: upErr } = await supabaseAdmin
        .from("products")
        .update({ name, brand, category, size, storage, shelf_life_days: shelf })
        .eq("barcode", row.barcode);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabaseAdmin.from("products").insert({
        barcode: row.barcode,
        name,
        brand,
        category,
        size,
        image_url: row.image_url,
        storage,
        shelf_life_days: shelf,
        source: "Community",
        created_by: row.submitted_by,
      });
      if (insErr) throw insErr;
    }

    const { error: stErr } = await supabaseAdmin
      .from("pending_products")
      .update({ status: "approved", reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (stErr) throw stErr;

    return { ok: true, barcode: row.barcode };
  });

/** Reject a submission with an optional reason. */
export const rejectPendingProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; note?: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pending_products")
      .update({
        status: "rejected",
        note: data.note ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export interface AdminProductInput {
  id?: string | null;
  barcode: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  size?: string | null;
  storage?: string | null;
  shelfLifeDays?: number | null;
}

/** Owner-only: add a new barcode or edit an existing one in the global catalog. */
export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AdminProductInput) => {
    const barcode = (data?.barcode ?? "").replace(/\D/g, "");
    if (!barcode) throw new Error("A numeric barcode is required");
    if (!data?.name?.trim()) throw new Error("A product name is required");
    return { ...data, barcode, name: data.name.trim() };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; id: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { brandForName, categoryForName, shelfDaysForCategory, storageForCategory } =
      await import("@/lib/product-meta");

    const category = data.category?.trim() || categoryForName(data.name);
    const row = {
      barcode: data.barcode,
      name: data.name,
      brand: data.brand?.trim() || brandForName(data.name),
      category,
      size: data.size?.trim() || null,
      storage: data.storage?.trim() || storageForCategory(category, data.name),
      shelf_life_days:
        data.shelfLifeDays && data.shelfLifeDays > 0
          ? Math.round(data.shelfLifeDays)
          : shelfDaysForCategory(category, data.name),
      source: "Admin",
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("products").update(row).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const { data: saved, error } = await supabaseAdmin
      .from("products")
      .upsert({ ...row, created_by: context.userId }, { onConflict: "barcode" })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: saved.id };
  });

/** Owner-only: delete a single barcode from the global catalog. */
export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id required");
    return { id: data.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
