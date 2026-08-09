import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { freshtrackAuth } from "@/integrations/auth/index";
import { friendlyMessage } from "@/lib/errors";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Shared sign-in / sign-up card used by the landing page and the /auth route. */
export function AuthForm({ idPrefix = "af" }: { idPrefix?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

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
      navigate({ to: "/home", replace: true });
    } catch {
      toast.error("Google sign-in unavailable — use email and password below.");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent — check your inbox (and spam).");
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not send the reset email"));
    } finally {
      setResetBusy(false);
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
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) {
          if (/already registered|already exists|user_already_exists/i.test(error.message)) {
            toast.error("An account with this email already exists — sign in instead.");
            return;
          }
          throw error;
        }
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          toast.error("An account with this email already exists — sign in instead.");
          return;
        }
        if (!data.session) {
          toast.success("Check your inbox — we sent a link to verify your email.");
          return;
        }
        toast.success("Account created. You're all set!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (/invalid login credentials/i.test(error.message)) {
            toast.error("That email and password don't match an account. Check both and retry.");
            return;
          }
          if (/email not confirmed/i.test(error.message)) {
            toast.error("Please confirm your email from the link we sent, then sign in.");
            return;
          }
          throw error;
        }
      }
      navigate({ to: "/home", replace: true });
    } catch (e) {
      toast.error(friendlyMessage(e, "Authentication failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
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
            <Label htmlFor={`${idPrefix}-si-email`}>Email</Label>
            <Input
              id={`${idPrefix}-si-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-si-pass`}>Password</Label>
            <PasswordInput
              id={`${idPrefix}-si-pass`}
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
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
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetBusy}
            className="mx-auto mt-1 text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
          >
            {resetBusy ? "Sending reset link…" : "Forgot password?"}
          </button>
        </TabsContent>

        <TabsContent value="signup" className="mt-4 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-su-name`}>Name</Label>
            <Input
              id={`${idPrefix}-su-name`}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-su-email`}>Email</Label>
            <Input
              id={`${idPrefix}-su-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-su-pass`}>Password</Label>
            <PasswordInput
              id={`${idPrefix}-su-pass`}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
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
          <p className="text-center text-xs text-muted-foreground">
            We'll email you a verification link to confirm your address.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
