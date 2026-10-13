import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const DEMO_SOURCE = "demo";

export function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const DEMO_ITEMS = [
  { name: "Milk", brand: "Amul Taaza", category: "Dairy", quantity: 500, unit: "mL", storage: "Fridge", p: -4, e: -1, price: 28 },
  { name: "Paneer", brand: "Amul Malai", category: "Dairy", quantity: 200, unit: "g", storage: "Fridge", p: -3, e: 1, price: 90 },
  { name: "Tomato", brand: null, category: "Vegetables", quantity: 500, unit: "g", storage: "Fridge", p: -4, e: 2, price: 20 },
  { name: "Atta", brand: "Aashirvaad", category: "Grains & Pasta", quantity: 5, unit: "kg", storage: "Pantry", p: -10, e: 120, price: 260 },
  { name: "Basmati Rice", brand: "India Gate", category: "Grains & Pasta", quantity: 1, unit: "kg", storage: "Pantry", p: -10, e: 300, price: 150 },
  { name: "Toor Dal", brand: "Tata Sampann", category: "Grains & Pasta", quantity: 1, unit: "kg", storage: "Pantry", p: -10, e: 180, price: 170 },
  { name: "Onion", brand: null, category: "Vegetables", quantity: 1, unit: "kg", storage: "Pantry", p: -2, e: 20, price: 40 },
];

export function DemoModeCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"load" | "clear" | null>(null);

  async function clear(silent = false) {
    const { error } = await supabase.from("pantry_items").delete().eq("source", DEMO_SOURCE);
    if (error) throw error;
    if (!silent) toast.success("Demo pantry cleared");
  }

  async function load() {
    if (!user) return;
    setBusy("load");
    try {
      await clear(true);
      const rows = DEMO_ITEMS.map(({ p, e, ...i }) => ({
        ...i,
        purchase_date: day(p),
        expiry_date: day(e),
        source: DEMO_SOURCE,
        user_id: user.id,
      }));
      const { error } = await supabase.from("pantry_items").insert(rows);
      if (error) throw error;
      toast.success("Demo pantry loaded — check Home and Recipes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load demo");
    } finally {
      setBusy(null);
      qc.invalidateQueries();
    }
  }

  async function onClear() {
    setBusy("clear");
    try { await clear(); } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear demo");
    } finally { setBusy(null); qc.invalidateQueries(); }
  }

  return (
    <section className="surface-card mb-4 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Presentation className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Evaluator demo mode</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Fills your pantry with a sample Indian kitchen — one expired, two expiring soon and four
        staples — so the health score, alerts and recipes light up instantly. Clearing removes only
        these sample items.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button className="press rounded-2xl" disabled={!!busy} onClick={load}>
          {busy === "load" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Load demo
        </Button>
        <Button variant="outline" className="press rounded-2xl" disabled={!!busy} onClick={onClear}>
          {busy === "clear" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Clear demo
        </Button>
      </div>
    </section>
  );
}
