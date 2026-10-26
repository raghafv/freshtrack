import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
    route: "/" as const,
    title: "Your home screen",
    body: "One calm view that answers what needs attention today: your pantry health score, what is expiring and what you still need to buy.",
    why: "So nothing quietly rots at the back of the fridge.",
  },
  {
    icon: ScanLine,
    route: "/scanner" as const,
    title: "Scan anything",
    body: "Scan a barcode, photograph fruits and vegetables, or snap a receipt. FreshTrack reads the label dates and fills in storage and shelf life for you.",
    why: "Adding groceries takes seconds instead of typing every field.",
  },
  {
    icon: Sparkles,
    route: "/assistant" as const,
    title: "Ask FreshTrack",
    body: "Chat with the assistant in plain language: \"what expires this week?\", \"add milk and eggs to my list\", \"plan 3 days of meals\".",
    why: "It can see your real pantry, so answers and list changes are always accurate.",
  },
  {
    icon: ChefHat,
    route: "/recipes" as const,
    title: "Recipes from your pantry",
    body: "Get complete recipes — measurements, timings, steps and tips — built only from ingredients you already own, starting with what expires first.",
    why: "Cook first, shop later. That is where the savings come from.",
  },
  {
    icon: ShoppingCart,
    route: "/shopping" as const,
    title: "Shopping list",
    body: "A categorised, tickable list that lives right next to your pantry and never duplicates something you already have.",
    why: "Fewer forgotten items, fewer double buys.",
  },
  {
    icon: Bell,
    route: "/notifications" as const,
    title: "Expiry reminders",
    body: "Turn on notifications and FreshTrack alerts you on your phone before food goes bad.",
    why: "The reminder arrives while the food is still usable.",
  },
];

/**
 * First-run experience: asks for a first name, then walks the user through the
 * real screens of the app — each step navigates to the page it describes.
 * Shown once per account, tracked server-side on the profile so signing out
 * and back in never replays it.
 */
export function OnboardingDialog() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1); // -1 = name step
  const [name, setName] = useState("");
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // `profile` is null for a brand-new account whose row has not landed yet —
    // that is exactly the case the tour is for, so only bail while loading.
    if (!user || isLoading || closed) return;
    if (profile?.onboarded_at) return;
    setName((profile?.full_name ?? "").split(" ")[0] ?? "");
    setOpen(true);
  }, [user, isLoading, profile, closed]);


  function finish() {
    setClosed(true);
    setOpen(false);
    updateProfile.mutate({ onboarded_at: new Date().toISOString() });
    void navigate({ to: "/home" });
  }

  function goToStep(next: number) {
    setStep(next);
    const target = STEPS[next];
    if (target) void navigate({ to: target.route });
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      await updateProfile.mutateAsync({ full_name: trimmed.slice(0, 40) });
    }
    goToStep(0);
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
                    onClick={() => goToStep(step - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  className="press h-11 flex-1 rounded-2xl"
                  onClick={() => (step === STEPS.length - 1 ? finish() : goToStep(step + 1))}
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
