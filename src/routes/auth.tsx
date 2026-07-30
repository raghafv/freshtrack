import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { freshtrackAuth } from "@/integrations/auth/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to FreshTrack — Smart Pantry Tracker" },
      {
        name: "description",
        content:
          "Sign in to FreshTrack to track your groceries, expiry dates, shopping list and pantry health.",
      },
      { property: "og:title", content: "Sign in to FreshTrack" },
      {
        property: "og:description",
        content: "Track groceries, expiry dates and shopping lists with FreshTrack.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    try {
      const result = await freshtrackAuth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in unavailable — use email and password below.");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Google sign-in unavailable — use email and password below.");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleEmailAuth(mode: "signin" | "signup") {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're all set!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="gradient-hero pointer-events-none absolute -top-40 h-96 w-[140%] rounded-full opacity-25 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <span className="gradient-hero mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl text-primary-foreground shadow-lift">
            <Leaf className="h-8 w-8" />
          </span>
          <h1 className="text-3xl font-bold">FreshTrack</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your smart pantry. Know what you own, use it before it spoils.
          </p>
        </div>

        <div className="surface-card p-6">
          <Button
            onClick={signInWithGoogle}
            disabled={googleBusy}
            className="press w-full rounded-2xl"
            size="lg"
          >
            {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl">
              <TabsTrigger value="signin" className="rounded-xl">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="si-email">Email</Label>
                <Input
                  id="si-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="si-pass">Password</Label>
                <Input
                  id="si-pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                className="press mt-1 w-full rounded-2xl"
                disabled={busy}
                onClick={() => handleEmailAuth("signin")}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="su-name">Name</Label>
                <Input
                  id="su-name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-pass">Password</Label>
                <Input
                  id="su-pass"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <Button
                className="press mt-1 w-full rounded-2xl"
                disabled={busy}
                onClick={() => handleEmailAuth("signup")}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Built for households that buy in bulk — track expiry, cut waste, save money.
        </p>
      </div>
    </main>
  );
}
