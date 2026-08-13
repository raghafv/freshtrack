import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAllowedPushEndpoint } from "./push-endpoints";

const SubscriptionInput = z.object({
  endpoint: z
    .string()
    .url()
    .max(1000)
    // Only real push services — the server later POSTs to this URL with a
    // signed VAPID header, so an arbitrary host would be an SSRF vector.
    .refine(isAllowedPushEndpoint, "Unsupported push service endpoint"),
  p256dh: z.string().min(10).max(400),
  auth: z.string().min(4).max(200),
  userAgent: z.string().max(400).optional(),
});

/** Public: the VAPID application-server key the browser needs to subscribe. */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ key: string | null }> => ({ key: process.env.VAPID_PUBLIC_KEY ?? null }),
);

/** Stores (or refreshes) this device's push subscription for the signed-in user. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubscriptionInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Removes one device subscription (used when the user turns notifications off). */
export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().max(1000) }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

/** Sends a live notification to every device this user has registered. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sent: number; failed: number }> => {
    const { sendPush } = await import("./webpush.server");
    const { data: subs } = await context.supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    let sent = 0;
    let failed = 0;
    for (const sub of subs ?? []) {
      const result = await sendPush(sub, {
        title: "Notifications are on",
        body: "FreshTrack will nudge you before anything in your pantry goes bad.",
        url: "/",
        tag: "freshtrack-test",
      });
      if (result.ok) sent++;
      else {
        failed++;
        if (result.gone)
          await context.supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
    return { sent, failed };
  });
