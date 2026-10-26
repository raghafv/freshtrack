import { createServerFn } from "@tanstack/react-start";

const EVALUATOR_EMAIL = "evaluator@fresh-track.in";

async function sha(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

/** Evaluator passcode gate: returns a one-time sign-in token for the shared demo account. */
export const evaluatorSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => ({ code: String(d?.code ?? "").trim().slice(0, 64) }))
  .handler(async ({ data }) => {
   // New:
const input = data.code.toLowerCase();
const envCode = (process.env["EVALUATOR_CODE"] || "").toLowerCase();
const allowed = envCode.split(",").map((s) => s.trim()).filter(Boolean);
if (allowed.length === 0 || !allowed.includes(input)) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { day, DEMO_ITEMS } = await import("@/components/demo-mode-card");

    let link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: EVALUATOR_EMAIL });
    if (link.error) {
      await supabaseAdmin.auth.admin.createUser({
        email: EVALUATOR_EMAIL,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { full_name: "Capstone Evaluator" },
      });
      link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: EVALUATOR_EMAIL });
    }
    if (link.error || !link.data.user) throw new Error("Evaluator access unavailable");
    const userId = link.data.user.id;

    await supabaseAdmin.from("pantry_items").delete().eq("user_id", userId).eq("source", "demo");
    await supabaseAdmin.from("pantry_items").insert(
      DEMO_ITEMS.map(({ p, e, ...i }) => ({
        ...i,
        purchase_date: day(p),
        expiry_date: day(e),
        source: "demo",
        user_id: userId,
      })),
    );

    return { ok: true as const, tokenHash: link.data.properties.hashed_token };
  });
