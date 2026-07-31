import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  ChefHat,
  Home,
  Loader2,
  ScanLine,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile } from "@/lib/data";

const STEPS = [
  {
    icon: Home,
    title: "Your home screen",
    body: "One calm view that answers what needs attention today: your pantry health score, what is expiring and what you still need to buy.",
    why: "So nothing quietly rots at the back of the fridge.",
  },
  {
    icon: ScanLine,
    title: "Scan anything",
    body: "Scan a barcode, photograph fruits and vegetables, or snap a receipt. FreshTrack reads the label dates and fills in storage and shelf life for you.",
    why: "Adding groceries takes seconds instead of typing every field.",
  },
  {
    icon: Sparkles,
    title: "Ask FreshTrack",
    body: "Chat with the assistant in plain language: \"what expires this week?\", \"add milk and eggs to my list\", \"plan 3 days of meals\".",
    why: "It can see your real pantry, so answers and list changes are always accurate.",
  },
  {
    icon: ChefHat,
    title: "Recipes from your pantry",
    body: "Get complete recipes — measurements, timings, steps and tips — built only from ingredients you already own, starting with what expires first.",
    why: "Cook first, shop later. That is where the savings come from.",
  },
  {
    icon: ShoppingCart,
    title: "Shopping list",
    body: "A categorised, tickable list that lives right next to your pantry and never duplicates something you already have.",
    why: "Fewer forgotten items, fewer double buys.",
  },
  {
    icon: Bell,
    title: "Expiry reminders",
    body: "Turn on notifications and FreshTrack alerts you on your phone before food goes bad.",
    why: "The reminder arrives while the food is still usable.",
  },
];

function storageKey(userId: string) {
  return `freshtrack.onboarded.${userId}`;
}

/**
 * First-run experience: asks for a first name, then walks through what the app
 * does and why. Shown once per account; the tutorial can be skipped.
 */
export function OnboardingDialog() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1); // -1 = name step
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user || isLoading) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey(user.id)) === "1") return;
    setName((profile?.full_name ?? "").split(" ")[0] ?? "");
    setOpen(true);
  }, [user, isLoading, profile?.full_name]);

  function finish() {
    if (user) window.localStorage.setItem(storageKey(user.id), "1");
    setOpen(false);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      await updateProfile.mutateAsync({ full_name: trimmed.slice(0, 40) });
    }
    setStep(0);
  }

  const current = step >= 0 ? STEPS[step] : null;
  const Icon = current?.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <DialogContent className="max-w-sm rounded-3xl">
        {step < 0 ? (
          <div>
            <h2 className="text-xl font-bold tracking-tight">Welcome to FreshTrack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What should we call you? We use your first name to greet you on the home screen.
            </p>
            <Input
              autoFocus
              value={name}
              maxLength={40}
              placeholder="Your first name"
              className="mt-4 h-12 rounded-2xl"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveName();
              }}
            />
            <div className="mt-5 flex items-center gap-2">
              <Button
                className="press h-11 flex-1 rounded-2xl"
                disabled={name.trim().length === 0 || updateProfile.isPending}
                onClick={() => void saveName()}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Continue
              </Button>
            </div>
            <button
              type="button"
              onClick={finish}
              className="mt-3 w-full text-center text-xs font-medium text-muted-foreground"
            >
              Skip tutorial
            </button>
          </div>
        ) : (
          current && (
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Step {step + 1} of {STEPS.length}
                  </p>
                  <h2 className="text-lg font-bold tracking-tight">{current.title}</h2>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{current.body}</p>
              <p className="mt-2 rounded-2xl bg-muted/60 px-3 py-2 text-xs font-medium">
                Why it matters: {current.why}
              </p>

              <div className="mt-5 flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="secondary"
                    className="press h-11 rounded-2xl"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  className="press h-11 flex-1 rounded-2xl"
                  onClick={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
                >
                  {step === STEPS.length - 1 ? "Start using FreshTrack" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <button
                type="button"
                onClick={finish}
                className="mt-3 w-full text-center text-xs font-medium text-muted-foreground"
              >
                Skip tutorial
              </button>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
