import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily expiry digest push.
 * Call it from any scheduler (cron-job.org, GitHub Actions, Cloud scheduler) with:
 *   POST /api/public/push-digest   header: x-cron-secret: <PUSH_CRON_SECRET>
 */
export const Route = createFileRoute("/api/public/push-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PUSH_CRON_SECRET;
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPush } = await import("@/lib/webpush.server");

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("user_id, endpoint, p256dh, auth");
        if (!subs || subs.length === 0) return Response.json({ sent: 0, users: 0 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = (d: string) =>
          Math.round((new Date(`${d}T00:00:00`).getTime() - today.getTime()) / 86_400_000);

        const byUser = new Map<string, typeof subs>();
        for (const sub of subs) {
          const list = byUser.get(sub.user_id) ?? [];
          list.push(sub);
          byUser.set(sub.user_id, list);
        }

        let sent = 0;
        for (const [userId, devices] of byUser) {
          const [{ data: items }, { data: settings }] = await Promise.all([
            supabaseAdmin
              .from("pantry_items")
              .select("name, expiry_date")
              .eq("user_id", userId)
              .order("expiry_date", { ascending: true }),
            supabaseAdmin
              .from("user_settings")
              .select(
                "expiry_reminder_days, notifications_enabled, notify_expiry, notify_expired",
              )
              .eq("user_id", userId)
              .maybeSingle(),
          ]);

          if (settings && settings.notifications_enabled === false) continue;
          const window = settings?.expiry_reminder_days ?? 3;
          const wantsSoon = settings?.notify_expiry ?? true;
          const wantsExpired = settings?.notify_expired ?? true;

          const rows = (items ?? []).map((i) => ({ ...i, left: daysUntil(i.expiry_date) }));
          const expired = wantsExpired ? rows.filter((r) => r.left < 0) : [];
          const soon = wantsSoon ? rows.filter((r) => r.left >= 0 && r.left <= window) : [];
          if (expired.length === 0 && soon.length === 0) continue;


          const headline = soon[0] ?? expired[0];
          const body =
            soon.length > 0
              ? `${headline.name} ${headline.left === 0 ? "expires today" : `expires in ${headline.left} day${headline.left === 1 ? "" : "s"}`}` +
                (soon.length > 1 ? ` · ${soon.length - 1} more item${soon.length > 2 ? "s" : ""} need attention` : "")
              : `${expired.length} item${expired.length === 1 ? "" : "s"} in your pantry have expired.`;

          for (const device of devices) {
            const result = await sendPush(device, {
              title: soon.length > 0 ? "Use it before you lose it" : "Pantry check-in",
              body,
              url: "/pantry",
              tag: "freshtrack-digest",
            });
            if (result.ok) {
              sent++;
              await supabaseAdmin
                .from("push_subscriptions")
                .update({ last_sent_at: new Date().toISOString() })
                .eq("endpoint", device.endpoint);
            } else if (result.gone) {
              await supabaseAdmin
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", device.endpoint);
            }
          }
        }

        return Response.json({ sent, users: byUser.size });
      },
    },
  },
});
