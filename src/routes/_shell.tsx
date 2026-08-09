import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/landing/brand-mark";
import { BottomNav } from "@/components/layout";
import { PushPrompt } from "@/components/push-prompt";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { useAuth } from "@/lib/auth";
import {useClearAssistant,useNotifications} from "@/lib/data";


export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <BrandMark className="h-14 w-14" />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AuthedShell />;
}

const CHAT_SESSION_KEY = "freshtrack.chat.session";

function AuthedShell() {
  const { data: notifications } = useNotifications();
  const clearChat = useClearAssistant();


  // The AI chat is a per-visit conversation: wipe it once whenever FreshTrack
  // is opened fresh. Generated shopping lists and recipes are stored separately
  // and stay on the home screen.
  useEffect(() => {
    if (sessionStorage.getItem(CHAT_SESSION_KEY) === "1") return;
    sessionStorage.setItem(CHAT_SESSION_KEY, "1");
    clearChat.mutate(undefined, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <OnboardingDialog />
      <PushPrompt />
      <BottomNav unread={unread} />
    </div>
  );
}
